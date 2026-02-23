#!/usr/bin/env node

/**
 * AppTuner Relay Server - Standalone Node.js version
 * Converts Cloudflare Workers relay to run on VPS
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import crypto from 'crypto';

const PORT = process.env.PORT || 3000;
const MAX_MESSAGE_SIZE = 10 * 1024 * 1024; // 10MB

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

    // Route message based on source (matching Cloudflare relay logic)
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

// Create HTTP server
const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', sessions: sessions.size }));
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
