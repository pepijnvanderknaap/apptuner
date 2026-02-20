/**
 * Apptuner WebSocket Relay
 *
 * Routes messages between desktop app and mobile device using Durable Objects.
 * Each session gets a unique Durable Object instance that manages the connection.
 */

export interface Env {
  SESSIONS: DurableObjectNamespace;
}

/**
 * Main worker entry point
 * Routes requests to appropriate Durable Object sessions
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'apptuner-relay',
        version: '0.1.0',
        timestamp: Date.now(),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // WebSocket upgrade check
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Parse path: /cli/{sessionId}, /dashboard/{sessionId}, /desktop/{sessionId}, or /mobile/{sessionId}
    const pathMatch = url.pathname.match(/^\/(cli|dashboard|desktop|mobile)\/([a-zA-Z0-9]+)$/);

    if (!pathMatch) {
      return new Response('Invalid path. Use /cli/{sessionId}, /dashboard/{sessionId}, /desktop/{sessionId}, or /mobile/{sessionId}', {
        status: 400,
      });
    }

    const [, clientType, sessionId] = pathMatch;

    // Get or create Durable Object for this session
    const id = env.SESSIONS.idFromName(sessionId);
    const session = env.SESSIONS.get(id);

    // Forward the request to the Durable Object
    // Add client type as a header
    const headers = new Headers(request.headers);
    headers.set('X-Client-Type', clientType);

    const newRequest = new Request(request.url, {
      method: request.method,
      headers,
      body: request.body,
    });

    return session.fetch(newRequest);
  },
};

/**
 * Durable Object that manages a single session
 * Handles CLI, dashboard, desktop, and mobile connections, routing messages between them
 */
export class RelaySession {
  private state: DurableObjectState;
  private cliWs: WebSocket | null = null;
  private dashboardWs: WebSocket | null = null;
  private desktopWs: WebSocket | null = null;
  private mobileWs: WebSocket | null = null;
  private sessionId: string;
  private createdAt: number;
  private lastActivity: number;

  // Rate limiting: track message counts per second
  private messageCount: number = 0;
  private messageCountResetTime: number = Date.now();
  private readonly MAX_MESSAGES_PER_SECOND = 100;
  private readonly MAX_MESSAGE_SIZE = 10 * 1024 * 1024; // 10MB

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.sessionId = state.id.toString();
    this.createdAt = Date.now();
    this.lastActivity = Date.now();

    // Note: Alarm disabled to stay within free tier CPU limits
    // Cloudflare will automatically evict inactive Durable Objects
  }

  async fetch(request: Request): Promise<Response> {
    // Get client type from header
    const clientType = request.headers.get('X-Client-Type');

    if (!clientType || !['cli', 'dashboard', 'desktop', 'mobile'].includes(clientType)) {
      return new Response('Invalid client type', { status: 400 });
    }

    // Create WebSocket pair
    const [client, server] = Object.values(new WebSocketPair());

    // Handle the WebSocket connection
    await this.handleWebSocket(server, clientType as 'cli' | 'dashboard' | 'desktop' | 'mobile');

    // Accept the WebSocket connection
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handle incoming WebSocket connection
   */
  private async handleWebSocket(ws: WebSocket, clientType: 'cli' | 'dashboard' | 'desktop' | 'mobile') {
    // Accept the connection
    ws.accept();

    // Store the connection
    if (clientType === 'cli') {
      // Close existing CLI connection if any
      if (this.cliWs) {
        this.cliWs.close(1000, 'New CLI connection');
      }
      this.cliWs = ws;
      console.log(`CLI connected to session ${this.sessionId}`);

      // Notify CLI if mobile is already connected
      if (this.mobileWs) {
        this.sendToCli({
          type: 'mobile_connected',
          timestamp: Date.now(),
        });
      }
    } else if (clientType === 'dashboard') {
      // Close existing dashboard connection if any
      if (this.dashboardWs) {
        this.dashboardWs.close(1000, 'New dashboard connection');
      }
      this.dashboardWs = ws;
      console.log(`Dashboard connected to session ${this.sessionId}`);

      // Notify dashboard if mobile is already connected
      if (this.mobileWs) {
        this.sendToDashboard({
          type: 'mobile_connected',
          timestamp: Date.now(),
        });
      }
    } else if (clientType === 'desktop') {
      // Close existing desktop connection if any
      if (this.desktopWs) {
        this.desktopWs.close(1000, 'New desktop connection');
      }
      this.desktopWs = ws;
      console.log(`Desktop connected to session ${this.sessionId}`);

      // Notify desktop if mobile is already connected
      if (this.mobileWs) {
        this.sendToDesktop({
          type: 'mobile_connected',
          timestamp: Date.now(),
        });
      }
    } else {
      // Mobile connection
      // Close existing mobile connection if any
      if (this.mobileWs) {
        this.mobileWs.close(1000, 'New mobile connection');
      }
      this.mobileWs = ws;
      console.log(`Mobile connected to session ${this.sessionId}`);

      // Notify all desktop-side clients (CLI, dashboard, desktop) that mobile is connected
      this.notifyDesktopSide({
        type: 'mobile_connected',
        timestamp: Date.now(),
      });
    }

    // Set up message handler
    ws.addEventListener('message', (event) => {
      this.handleMessage(event.data, clientType);
    });

    // Set up close handler
    ws.addEventListener('close', (event) => {
      this.handleClose(ws, clientType, event.code, event.reason);
    });

    // Set up error handler
    ws.addEventListener('error', (event) => {
      console.error(`WebSocket error (${clientType}):`, event);
    });

    // Send welcome message
    this.sendTo(ws, {
      type: 'connected',
      clientType,
      sessionId: this.sessionId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(data: string | ArrayBuffer, from: 'cli' | 'dashboard' | 'desktop' | 'mobile') {
    this.lastActivity = Date.now();

    try {
      // Validate message size
      const messageSize = typeof data === 'string' ? data.length : data.byteLength;
      if (messageSize > this.MAX_MESSAGE_SIZE) {
        console.error(`Message too large: ${messageSize} bytes`);
        const source = this.getWebSocket(from);
        if (source) {
          this.sendTo(source, {
            type: 'error',
            error: `Message too large (${messageSize} bytes, max ${this.MAX_MESSAGE_SIZE})`,
            timestamp: Date.now(),
          });
        }
        return;
      }

      // Rate limiting: check messages per second
      const now = Date.now();
      if (now - this.messageCountResetTime > 1000) {
        // Reset counter every second
        this.messageCount = 0;
        this.messageCountResetTime = now;
      }
      this.messageCount++;

      if (this.messageCount > this.MAX_MESSAGES_PER_SECOND) {
        console.warn(`Rate limit exceeded from ${from}`);
        const source = this.getWebSocket(from);
        if (source) {
          this.sendTo(source, {
            type: 'error',
            error: 'Rate limit exceeded (max 100 messages/sec)',
            timestamp: Date.now(),
          });
        }
        return;
      }

      // Parse message
      const message = typeof data === 'string' ? JSON.parse(data) : null;

      if (!message) {
        console.error('Received non-string message');
        return;
      }

      // Handle ping/pong for health monitoring
      if (message.type === 'ping') {
        const source = this.getWebSocket(from);
        if (source && source.readyState === WebSocket.OPEN) {
          this.sendTo(source, {
            type: 'pong',
            timestamp: Date.now(),
          });
        }
        return; // Don't route ping messages
      }

      // Route message based on source
      if (from === 'mobile') {
        // Mobile → All desktop-side clients (CLI, dashboard, desktop)
        this.notifyDesktopSide(message);
      } else {
        // Desktop-side (CLI, dashboard, desktop) → Mobile
        if (this.mobileWs && this.mobileWs.readyState === WebSocket.OPEN) {
          this.sendToMobile(message);
        } else {
          // Mobile not connected, send error back to source
          const source = this.getWebSocket(from);
          if (source) {
            this.sendTo(source, {
              type: 'error',
              error: 'Mobile device not connected',
              timestamp: Date.now(),
            });
          }
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(ws: WebSocket, clientType: 'cli' | 'dashboard' | 'desktop' | 'mobile', code: number, reason: string) {
    console.log(`${clientType} disconnected: ${code} ${reason}`);

    if (clientType === 'cli') {
      if (this.cliWs === ws) {
        this.cliWs = null;
      }
    } else if (clientType === 'dashboard') {
      if (this.dashboardWs === ws) {
        this.dashboardWs = null;
      }
    } else if (clientType === 'desktop') {
      if (this.desktopWs === ws) {
        this.desktopWs = null;
      }
    } else if (clientType === 'mobile') {
      if (this.mobileWs === ws) {
        this.mobileWs = null;
        // Notify all desktop-side clients that mobile disconnected
        this.notifyDesktopSide({
          type: 'mobile_disconnected',
          timestamp: Date.now(),
        });
      }
    }

    // If all clients disconnected, Cloudflare will automatically evict the Durable Object
    if (!this.cliWs && !this.dashboardWs && !this.desktopWs && !this.mobileWs) {
      console.log(`All clients disconnected from session ${this.sessionId}`);
    }
  }

  /**
   * Send message to specific WebSocket
   */
  private sendTo(ws: WebSocket, message: any) {
    if (ws && ws.readyState === 1) { // 1 = OPEN state
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }

  /**
   * Get WebSocket for a client type
   */
  private getWebSocket(clientType: 'cli' | 'dashboard' | 'desktop' | 'mobile'): WebSocket | null {
    switch (clientType) {
      case 'cli': return this.cliWs;
      case 'dashboard': return this.dashboardWs;
      case 'desktop': return this.desktopWs;
      case 'mobile': return this.mobileWs;
    }
  }

  /**
   * Send message to CLI
   */
  private sendToCli(message: any) {
    if (this.cliWs) {
      this.sendTo(this.cliWs, message);
    }
  }

  /**
   * Send message to dashboard
   */
  private sendToDashboard(message: any) {
    if (this.dashboardWs) {
      this.sendTo(this.dashboardWs, message);
    }
  }

  /**
   * Send message to desktop
   */
  private sendToDesktop(message: any) {
    if (this.desktopWs) {
      this.sendTo(this.desktopWs, message);
    }
  }

  /**
   * Send message to mobile
   */
  private sendToMobile(message: any) {
    if (this.mobileWs) {
      this.sendTo(this.mobileWs, message);
    }
  }

  /**
   * Notify all desktop-side clients (CLI, dashboard, desktop)
   */
  private notifyDesktopSide(message: any) {
    this.sendToCli(message);
    this.sendToDashboard(message);
    this.sendToDesktop(message);
  }

  /**
   * Handle alarm (cleanup after inactivity)
   */
  async alarm() {
    const inactiveTime = Date.now() - this.lastActivity;
    const fiveMinutes = 5 * 60 * 1000;

    if (inactiveTime > fiveMinutes) {
      console.log(`Session ${this.sessionId} inactive for ${inactiveTime}ms, cleaning up`);

      // Close any remaining connections
      if (this.cliWs) {
        this.cliWs.close(1000, 'Session timeout');
        this.cliWs = null;
      }
      if (this.dashboardWs) {
        this.dashboardWs.close(1000, 'Session timeout');
        this.dashboardWs = null;
      }
      if (this.desktopWs) {
        this.desktopWs.close(1000, 'Session timeout');
        this.desktopWs = null;
      }
      if (this.mobileWs) {
        this.mobileWs.close(1000, 'Session timeout');
        this.mobileWs = null;
      }

      // Clear storage
      await this.state.storage.deleteAll();
    }
  }
}
