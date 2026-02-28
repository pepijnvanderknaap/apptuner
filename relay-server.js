#!/usr/bin/env node

/**
 * AppTuner Relay Server — Node.js VPS edition
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import crypto from 'crypto';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const MAX_MESSAGE_SIZE = 50 * 1024 * 1024; // 50MB — large Expo bundles can exceed 10MB

// Build pipeline configuration
const BUILDS_DIR = process.env.BUILDS_DIR || '/tmp/apptuner-builds';
const SHELL_IPA_PATH = process.env.SHELL_IPA_PATH || '/opt/apptuner/AppTunerMobile.ipa';
const BUILD_TTL_MS = 24 * 60 * 60 * 1000; // Clean up builds after 24h

// In-memory build store — keyed by buildId
const builds = new Map();

// Session storage (replaces Durable Objects)
class RelaySession {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.cliWs = null;
    this.dashboardWs = null;
    this.desktopWs = null;
    this.mobileWs = null;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
  }

  handleConnection(ws, clientType) {
    console.log(`${clientType} connected to session ${this.sessionId}`);
    this.lastActivity = Date.now();

    // Store WebSocket by client type
    switch (clientType) {
      case 'cli':
        // If another CLI is already connected for this project, kick it out
        if (this.cliWs && this.cliWs.readyState === WebSocket.OPEN) {
          console.log(`Kicking old CLI from project ${this.sessionId} — new CLI taking over`);
          this.cliWs.close(1000, 'New CLI connected for this project');
        }
        this.cliWs = ws;
        break;
      case 'dashboard':
        this.dashboardWs = ws;
        break;
      case 'desktop':
        this.desktopWs = ws;
        break;
      case 'mobile':
        this.mobileWs = ws;
        // Notify all desktop-side clients that mobile is connected
        this.notifyDesktopSide({ type: 'mobile_connected', timestamp: Date.now() });
        break;
    }

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(clientType, message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    // Handle disconnect
    ws.on('close', (code, reason) => {
      console.log(`${clientType} disconnected: ${code} ${reason || ''}`);
      this.handleDisconnect(clientType);
    });

    ws.on('error', (error) => {
      console.error(`${clientType} WebSocket error:`, error);
    });

    // Send connection confirmation
    this.sendTo(ws, {
      type: 'connected',
      sessionId: this.sessionId,
      clientType,
      timestamp: Date.now(),
    });
  }

  handleMessage(fromType, message) {
    this.lastActivity = Date.now();

    // Handle ping/pong for health monitoring
    if (message.type === 'ping') {
      const sourceWs = this.getWebSocket(fromType);
      if (sourceWs && sourceWs.readyState === WebSocket.OPEN) {
        this.sendTo(sourceWs, {
          type: 'pong',
          timestamp: Date.now(),
        });
      }
      return; // Don't route ping messages
    }

    // Route message based on source
    if (fromType === 'mobile') {
      // Mobile → All desktop-side clients (CLI, dashboard, desktop)
      this.notifyDesktopSide(message);
    } else {
      // Desktop-side (CLI, dashboard, desktop) → Mobile
      this.notifyMobileSide(message);
    }
  }

  handleDisconnect(clientType) {
    // Clear the WebSocket reference
    switch (clientType) {
      case 'cli':
        this.cliWs = null;
        this.notifyDesktopSide({ type: 'cli_disconnected', timestamp: Date.now() });
        break;
      case 'dashboard':
        this.dashboardWs = null;
        break;
      case 'desktop':
        this.desktopWs = null;
        this.notifyMobileSide({ type: 'desktop_disconnected', timestamp: Date.now() });
        break;
      case 'mobile':
        this.mobileWs = null;
        this.notifyDesktopSide({ type: 'mobile_disconnected', timestamp: Date.now() });
        break;
    }

    // Check if session should be cleaned up
    if (!this.cliWs && !this.dashboardWs && !this.desktopWs && !this.mobileWs) {
      console.log(`All clients disconnected from session ${this.sessionId}`);
    }
  }

  sendTo(ws, message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }

  notifyDesktopSide(message) {
    if (this.cliWs) this.sendTo(this.cliWs, message);
    if (this.dashboardWs) this.sendTo(this.dashboardWs, message);
    if (this.desktopWs) this.sendTo(this.desktopWs, message);
  }

  notifyMobileSide(message) {
    if (this.mobileWs) this.sendTo(this.mobileWs, message);
  }

  getWebSocket(clientType) {
    switch (clientType) {
      case 'cli': return this.cliWs;
      case 'dashboard': return this.dashboardWs;
      case 'desktop': return this.desktopWs;
      case 'mobile': return this.mobileWs;
      default: return null;
    }
  }
}

// In-memory session storage
const sessions = new Map();

// Generate session ID from path
function getSessionIdFromPath(pathname) {
  // Format: /cli/ABC123 or /desktop/ABC123
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return parts[1]; // ABC123
  }
  return null;
}

// --- Build pipeline ---

async function handleCreateBuild(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return jsonResponse(res, 400, { error: 'Invalid JSON' });
  }

  const { userId, p12Base64, p12Password, mobileprovisionBase64, appName, bundleId, iconBase64 } = body;

  if (!p12Base64 || !p12Password || !mobileprovisionBase64 || !appName || !bundleId) {
    return jsonResponse(res, 400, { error: 'Missing required fields: p12Base64, p12Password, mobileprovisionBase64, appName, bundleId' });
  }

  if (!fs.existsSync(SHELL_IPA_PATH)) {
    return jsonResponse(res, 503, { error: 'Build service not available — shell IPA not found on server. Contact support@apptuner.io.' });
  }

  const buildId = crypto.randomBytes(8).toString('hex');
  const buildDir = path.join(BUILDS_DIR, buildId);
  fs.mkdirSync(buildDir, { recursive: true });

  // Write uploaded cert files to disk (will be deleted after signing)
  const p12Path = path.join(buildDir, 'cert.p12');
  const provisionPath = path.join(buildDir, 'app.mobileprovision');
  const iconPath = iconBase64 ? path.join(buildDir, 'icon.png') : '';

  fs.writeFileSync(p12Path, Buffer.from(p12Base64, 'base64'));
  fs.writeFileSync(provisionPath, Buffer.from(mobileprovisionBase64, 'base64'));
  if (iconBase64) fs.writeFileSync(iconPath, Buffer.from(iconBase64, 'base64'));

  const safeAppName = appName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const outputIpa = path.join(buildDir, `${safeAppName}.ipa`);

  builds.set(buildId, {
    id: buildId,
    userId: userId || 'anonymous',
    appName,
    bundleId,
    status: 'signing',
    createdAt: Date.now(),
    outputIpa,
    filename: `${safeAppName}.ipa`,
  });

  // Spawn signing script in background
  const signScript = path.join(__dirname, 'sign-ipa.sh');
  const proc = spawn('bash', [
    signScript, p12Path, p12Password, provisionPath,
    SHELL_IPA_PATH, appName, bundleId, outputIpa, iconPath,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let stderr = '';
  proc.stdout.on('data', d => console.log(`[build ${buildId}] ${d.toString().trim()}`));
  proc.stderr.on('data', d => { stderr += d.toString(); });

  proc.on('close', code => {
    const build = builds.get(buildId);
    if (!build) return;
    if (code === 0 && fs.existsSync(outputIpa)) {
      build.status = 'done';
      console.log(`[build ${buildId}] IPA ready: ${outputIpa}`);
    } else {
      build.status = 'error';
      build.error = stderr.trim() || `Sign script exited with code ${code}`;
      console.error(`[build ${buildId}] Failed: ${build.error}`);
    }
    // Securely delete cert files regardless of outcome
    for (const f of [p12Path, provisionPath, iconPath].filter(Boolean)) {
      try { fs.rmSync(f); } catch {}
    }
  });

  jsonResponse(res, 200, { buildId, status: 'signing' });
}

async function handleGetBuild(req, res, buildId) {
  const build = builds.get(buildId);
  if (!build) return jsonResponse(res, 404, { error: 'Build not found' });

  const resp = {
    buildId: build.id,
    appName: build.appName,
    bundleId: build.bundleId,
    status: build.status,
    createdAt: build.createdAt,
  };
  if (build.status === 'done') {
    resp.downloadUrl = `/api/builds/${buildId}/download`;
    resp.filename = build.filename;
  }
  if (build.status === 'error') resp.error = build.error;

  jsonResponse(res, 200, resp);
}

function handleDownloadBuild(req, res, buildId) {
  const build = builds.get(buildId);
  if (!build) return jsonResponse(res, 404, { error: 'Build not found' });
  if (build.status !== 'done') return jsonResponse(res, 400, { error: `Build not ready (status: ${build.status})` });
  if (!fs.existsSync(build.outputIpa)) return jsonResponse(res, 404, { error: 'IPA file missing' });

  const stat = fs.statSync(build.outputIpa);
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${build.filename}"`,
    'Content-Length': stat.size,
    'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(build.outputIpa).pipe(res);
}

// --- Stripe / payment helpers ---

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function jsonResponse(res, status, body, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...extraHeaders,
  };
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function verifyStripeSignature(payload, signature, secret) {
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const sig = parts.find(p => p.startsWith('v1='))?.split('=')[1];
  if (!timestamp || !sig) return false;
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;
  const computed = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  return computed === sig;
}

async function supabasePatch(url, serviceKey, table, filter, updates) {
  const res = await fetch(`${url}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Supabase PATCH failed: ${await res.text()}`);
}

async function supabaseGet(url, serviceKey, table, filter) {
  const res = await fetch(`${url}/rest/v1/${table}?${filter}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  return res.json();
}

async function supabaseInsert(url, serviceKey, table, row) {
  await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ ...row, created_at: new Date().toISOString() }),
  });
}

async function handleCreateCheckoutSession(req, res) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return jsonResponse(res, 500, { error: 'Stripe not configured' });

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return jsonResponse(res, 400, { error: 'Invalid JSON' });
  }

  const { priceId, userId, tier } = body;
  if (!priceId || !userId) return jsonResponse(res, 400, { error: 'Missing priceId or userId' });

  const origin = req.headers.origin || 'https://apptuner.io';
  const successUrl = `${origin}/?session_id={CHECKOUT_SESSION_ID}&payment=success`;
  const cancelUrl = `${origin}/?payment=cancelled`;

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      mode: tier === 'lifetime' ? 'payment' : 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      'metadata[userId]': userId,
      'metadata[priceId]': priceId,
      'metadata[tier]': tier,
      allow_promotion_codes: 'true',
    }),
  });

  const session = await stripeRes.json();
  if (!stripeRes.ok) return jsonResponse(res, 400, { error: session.error?.message || 'Stripe error' });
  return jsonResponse(res, 200, { sessionId: session.id, url: session.url });
}

async function handleStripeWebhook(req, res) {
  const payload = await readBody(req);
  const signature = req.headers['stripe-signature'] || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (webhookSecret) {
    if (!verifyStripeSignature(payload, signature, webhookSecret)) {
      res.writeHead(400);
      return res.end('Invalid signature');
    }
  } else {
    console.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature check');
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    res.writeHead(400);
    return res.end('Invalid JSON');
  }

  console.log(`Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId || session.client_reference_id;
        if (!userId) { console.error('No userId in checkout session'); break; }
        const tier = session.mode === 'payment' ? 'lifetime' : (session.metadata?.tier || 'monthly');
        await supabasePatch(supabaseUrl, serviceKey, 'users', `id=eq.${userId}`, {
          subscription_status: 'active',
          subscription_tier: tier,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
        });
        if (session.payment_intent) {
          await supabaseInsert(supabaseUrl, serviceKey, 'payment_history', {
            user_id: userId,
            stripe_payment_intent_id: session.payment_intent,
            amount: session.amount_total || 0,
            currency: session.currency || 'usd',
            status: 'succeeded',
            tier,
          });
        }
        console.log(`Payment successful for user ${userId}, tier: ${tier}`);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (!invoice.customer) break;
        const users = await supabaseGet(supabaseUrl, serviceKey, 'users', `stripe_customer_id=eq.${invoice.customer}&select=id`);
        if (users.length === 0) { console.error(`No user for customer ${invoice.customer}`); break; }
        await supabasePatch(supabaseUrl, serviceKey, 'users', `id=eq.${users[0].id}`, { subscription_status: 'active' });
        console.log(`Subscription renewed for customer ${invoice.customer}`);
        break;
      }
      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        const obj = event.data.object;
        if (!obj.customer) break;
        const users = await supabaseGet(supabaseUrl, serviceKey, 'users', `stripe_customer_id=eq.${obj.customer}&select=id`);
        if (users.length > 0) {
          await supabasePatch(supabaseUrl, serviceKey, 'users', `id=eq.${users[0].id}`, { subscription_status: 'cancelled' });
          console.log(`Subscription cancelled for customer ${obj.customer}`);
        }
        break;
      }
      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }
  } catch (err) {
    console.error('Webhook error:', err.message);
    return jsonResponse(res, 200, { received: true, error: err.message });
  }

  return jsonResponse(res, 200, { received: true });
}

// --- HTTP server ---

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', sessions: sessions.size }));
    return;
  }

  // Stripe: create checkout session
  if (req.method === 'POST' && req.url === '/api/create-checkout-session') {
    try {
      await handleCreateCheckoutSession(req, res);
    } catch (err) {
      console.error('Checkout error:', err);
      jsonResponse(res, 500, { error: 'Internal server error' });
    }
    return;
  }

  // Stripe: webhook
  if (req.method === 'POST' && req.url === '/api/stripe-webhook') {
    try {
      await handleStripeWebhook(req, res);
    } catch (err) {
      console.error('Webhook error:', err);
      jsonResponse(res, 500, { error: 'Internal server error' });
    }
    return;
  }

  // Build pipeline: create build
  if (req.method === 'POST' && req.url === '/api/builds') {
    try {
      await handleCreateBuild(req, res);
    } catch (err) {
      console.error('Build create error:', err);
      jsonResponse(res, 500, { error: 'Internal server error' });
    }
    return;
  }

  // Build pipeline: get status or download
  if (req.url.startsWith('/api/builds/')) {
    const parts = req.url.split('/').filter(Boolean);
    // parts: ['api', 'builds', '<buildId>'] or ['api', 'builds', '<buildId>', 'download']
    const buildId = parts[2];
    if (!buildId) { res.writeHead(400); res.end('Missing buildId'); return; }

    if (parts[3] === 'download') {
      try {
        handleDownloadBuild(req, res, buildId);
      } catch (err) {
        jsonResponse(res, 500, { error: 'Internal server error' });
      }
    } else {
      try {
        await handleGetBuild(req, res, buildId);
      } catch (err) {
        jsonResponse(res, 500, { error: 'Internal server error' });
      }
    }
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// Create WebSocket server
const wss = new WebSocketServer({
  server,
  maxPayload: MAX_MESSAGE_SIZE
});

wss.on('connection', (ws, req) => {
  const pathname = req.url;
  const sessionCode = getSessionIdFromPath(pathname);

  if (!sessionCode) {
    ws.close(1008, 'Invalid session code');
    return;
  }

  // Determine client type from path
  let clientType = null;
  if (pathname.startsWith('/cli/')) clientType = 'cli';
  else if (pathname.startsWith('/dashboard/')) clientType = 'dashboard';
  else if (pathname.startsWith('/desktop/')) clientType = 'desktop';
  else if (pathname.startsWith('/mobile/')) clientType = 'mobile';

  if (!clientType) {
    ws.close(1008, 'Invalid client type');
    return;
  }

  // Generate session ID (hash of session code for consistency)
  const sessionId = crypto.createHash('sha256').update(sessionCode).digest('hex');

  // Get or create session
  let session = sessions.get(sessionId);
  if (!session) {
    session = new RelaySession(sessionId);
    sessions.set(sessionId, session);
  }

  // Handle connection
  session.handleConnection(ws, clientType);
});

// Cleanup old builds once per hour
setInterval(() => {
  const now = Date.now();
  for (const [buildId, build] of builds.entries()) {
    if (now - build.createdAt > BUILD_TTL_MS) {
      // Delete build directory
      const buildDir = path.join(BUILDS_DIR, buildId);
      try { fs.rmSync(buildDir, { recursive: true, force: true }); } catch {}
      builds.delete(buildId);
      console.log(`[builds] Cleaned up expired build ${buildId}`);
    }
  }
}, 60 * 60 * 1000);

// Cleanup inactive sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutes

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastActivity > timeout) {
      console.log(`Cleaning up inactive session ${sessionId}`);

      // Close all connections
      if (session.cliWs) session.cliWs.close(1000, 'Session timeout');
      if (session.dashboardWs) session.dashboardWs.close(1000, 'Session timeout');
      if (session.desktopWs) session.desktopWs.close(1000, 'Session timeout');
      if (session.mobileWs) session.mobileWs.close(1000, 'Session timeout');

      sessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);

// Start server
server.listen(PORT, () => {
  console.log(`\n🚀 AppTuner Relay Server`);
  console.log(`   Running on ws://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
