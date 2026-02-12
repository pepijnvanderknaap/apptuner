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

    // Parse path: /desktop/{sessionId} or /mobile/{sessionId}
    const pathMatch = url.pathname.match(/^\/(desktop|mobile)\/([a-zA-Z0-9]+)$/);

    if (!pathMatch) {
      return new Response('Invalid path. Use /desktop/{sessionId} or /mobile/{sessionId}', {
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
 * Handles both desktop and mobile connections, routing messages between them
 */
export class RelaySession {
  private state: DurableObjectState;
  private desktopWs: WebSocket | null = null;
  private mobileWs: WebSocket | null = null;
  private sessionId: string;
  private createdAt: number;
  private lastActivity: number;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.sessionId = state.id.toString();
    this.createdAt = Date.now();
    this.lastActivity = Date.now();

    // Set up alarm for session cleanup (30 minutes of inactivity)
    this.state.storage.setAlarm(Date.now() + 30 * 60 * 1000);
  }

  async fetch(request: Request): Promise<Response> {
    // Get client type from header
    const clientType = request.headers.get('X-Client-Type');

    if (!clientType || !['desktop', 'mobile'].includes(clientType)) {
      return new Response('Invalid client type', { status: 400 });
    }

    // Create WebSocket pair
    const [client, server] = Object.values(new WebSocketPair());

    // Handle the WebSocket connection
    await this.handleWebSocket(server, clientType as 'desktop' | 'mobile');

    // Accept the WebSocket connection
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handle incoming WebSocket connection
   */
  private async handleWebSocket(ws: WebSocket, clientType: 'desktop' | 'mobile') {
    // Accept the connection
    ws.accept();

    // Store the connection
    if (clientType === 'desktop') {
      // Close existing desktop connection if any
      if (this.desktopWs) {
        this.desktopWs.close(1000, 'New desktop connection');
      }
      this.desktopWs = ws;
      console.log(`Desktop connected to session ${this.sessionId}`);

      // Notify mobile that desktop is connected
      if (this.mobileWs) {
        this.sendToMobile({
          type: 'desktop_connected',
          timestamp: Date.now(),
        });
      }
    } else {
      // Close existing mobile connection if any
      if (this.mobileWs) {
        this.mobileWs.close(1000, 'New mobile connection');
      }
      this.mobileWs = ws;
      console.log(`Mobile connected to session ${this.sessionId}`);

      // Notify desktop that mobile is connected
      if (this.desktopWs) {
        this.sendToDesktop({
          type: 'mobile_connected',
          timestamp: Date.now(),
        });
      }
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
  private handleMessage(data: string | ArrayBuffer, from: 'desktop' | 'mobile') {
    this.lastActivity = Date.now();

    try {
      // Parse message
      const message = typeof data === 'string' ? JSON.parse(data) : null;

      if (!message) {
        console.error('Received non-string message');
        return;
      }

      // Handle ping/pong for health monitoring (disabled on desktop, but handle if received)
      if (message.type === 'ping') {
        const source = from === 'desktop' ? this.desktopWs : this.mobileWs;
        if (source && source.readyState === WebSocket.READY_STATE_OPEN) {
          this.sendTo(source, {
            type: 'pong',
            timestamp: Date.now(),
          });
        }
        return; // Don't route ping messages
      }

      // Route message to the other client
      if (from === 'desktop') {
        // Desktop → Mobile
        if (this.mobileWs && this.mobileWs.readyState === WebSocket.READY_STATE_OPEN) {
          this.sendToMobile(message);
        } else {
          // Mobile not connected, send error back to desktop
          this.sendToDesktop({
            type: 'error',
            error: 'Mobile device not connected',
            timestamp: Date.now(),
          });
        }
      } else {
        // Mobile → Desktop
        if (this.desktopWs && this.desktopWs.readyState === WebSocket.READY_STATE_OPEN) {
          this.sendToDesktop(message);
        } else {
          // Desktop not connected, send error back to mobile
          this.sendToMobile({
            type: 'error',
            error: 'Desktop not connected',
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(ws: WebSocket, clientType: 'desktop' | 'mobile', code: number, reason: string) {
    console.log(`${clientType} disconnected: ${code} ${reason}`);

    if (clientType === 'desktop') {
      // Only clear if this is the current desktop connection
      if (this.desktopWs === ws) {
        this.desktopWs = null;
        // Notify mobile
        if (this.mobileWs) {
          this.sendToMobile({
            type: 'desktop_disconnected',
            timestamp: Date.now(),
          });
        }
      }
    } else {
      // Only clear if this is the current mobile connection
      if (this.mobileWs === ws) {
        this.mobileWs = null;
        // Notify desktop
        if (this.desktopWs) {
          this.sendToDesktop({
            type: 'mobile_disconnected',
            timestamp: Date.now(),
          });
        }
      }
    }

    // If both disconnected, schedule cleanup
    if (!this.desktopWs && !this.mobileWs) {
      console.log(`Both clients disconnected from session ${this.sessionId}, scheduling cleanup`);
      this.state.storage.setAlarm(Date.now() + 5 * 60 * 1000); // 5 minutes
    }
  }

  /**
   * Send message to specific WebSocket
   */
  private sendTo(ws: WebSocket, message: any) {
    if (ws && ws.readyState === WebSocket.READY_STATE_OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message:', error);
      }
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
   * Handle alarm (cleanup after inactivity)
   */
  async alarm() {
    const inactiveTime = Date.now() - this.lastActivity;
    const thirtyMinutes = 30 * 60 * 1000;

    if (inactiveTime > thirtyMinutes) {
      console.log(`Session ${this.sessionId} inactive for ${inactiveTime}ms, cleaning up`);

      // Close any remaining connections
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
    } else {
      // Still active, reset alarm
      this.state.storage.setAlarm(Date.now() + 30 * 60 * 1000);
    }
  }
}
