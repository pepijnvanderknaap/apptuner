/**
 * Relay Connection Service
 *
 * Manages WebSocket connection to Cloudflare relay with auto-reconnect
 */

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
type StatusHandler = (status: ConnectionStatus) => void;
type BundleUpdateHandler = (bundle: {code: string; sourceMap?: string}) => void;

export class RelayConnection {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private relayUrl: string;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // Increased from 5
  private statusHandlers: Set<StatusHandler> = new Set();
  private bundleHandlers: Set<BundleUpdateHandler> = new Set();

  // Heartbeat/ping-pong for connection health
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  private lastPingTime = 0;
  private latency = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(sessionId: string, relayUrl: string) {
    this.sessionId = sessionId;
    this.relayUrl = relayUrl;
  }

  /**
   * Connect to relay
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[Relay] Already connected');
      return;
    }

    this.updateStatus('connecting');

    try {
      const url = `${this.relayUrl}/mobile/${this.sessionId}`;
      console.log('[Relay] Connecting to:', url);

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[Relay] Connected');
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
        this.startHeartbeat();
      };

      this.ws.onmessage = event => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[Relay] Failed to parse message:', error);
        }
      };

      this.ws.onerror = error => {
        console.error('[Relay] WebSocket error:', error);
        this.updateStatus('error');
      };

      this.ws.onclose = () => {
        console.log('[Relay] Disconnected');
        this.updateStatus('disconnected');
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('[Relay] Connection error:', error);
      this.updateStatus('error');
      throw error;
    }
  }

  /**
   * Disconnect from relay
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimeout();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus('disconnected');
  }

  /**
   * Send acknowledgment to desktop
   */
  sendAck(success: boolean, error?: string): void {
    this.send({
      type: 'bundle_ack',
      success,
      error,
      timestamp: Date.now(),
    });
  }

  /**
   * Send console log to desktop
   */
  sendLog(level: 'log' | 'info' | 'warn' | 'error' | 'debug', args: any[]): void {
    this.send({
      type: 'console_log',
      payload: {
        level,
        args,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => this.statusHandlers.delete(handler);
  }

  /**
   * Subscribe to bundle updates
   */
  onBundleUpdate(handler: BundleUpdateHandler): () => void {
    this.bundleHandlers.add(handler);
    return () => this.bundleHandlers.delete(handler);
  }

  /**
   * Get current status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Send message to relay
   */
  private send(message: any): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      // Silently ignore if not connected (common during initial connection)
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('[Relay] Failed to send message:', error);
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: any): void {
    console.log('[Relay] Received message:', message.type);

    switch (message.type) {
      case 'connected':
        console.log('[Relay] Welcome message received');
        break;

      case 'desktop_connected':
        console.log('[Relay] Desktop connected');
        break;

      case 'desktop_disconnected':
        console.log('[Relay] Desktop disconnected');
        break;

      case 'bundle_update':
        console.log('[Relay] Bundle update received');
        this.bundleHandlers.forEach(handler => {
          try {
            handler(message.payload);
          } catch (error) {
            console.error('[Relay] Error in bundle handler:', error);
          }
        });
        break;

      case 'pong':
        // Calculate latency from ping/pong
        if (this.pongTimeout) {
          clearTimeout(this.pongTimeout);
          this.pongTimeout = null;
        }

        if (this.lastPingTime > 0) {
          this.latency = Date.now() - this.lastPingTime;
          console.log(`[Relay] Latency: ${this.latency}ms`);
        }
        break;

      case 'error':
        console.error('[Relay] Error from relay:', message.error);
        break;

      default:
        console.log('[Relay] Unknown message type:', message.type);
    }
  }

  /**
   * Update connection status
   */
  private updateStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusHandlers.forEach(handler => {
      try {
        handler(status);
      } catch (error) {
        console.error('[Relay] Error in status handler:', error);
      }
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[Relay] Max reconnection attempts reached');
      this.updateStatus('error');
      return;
    }

    this.updateStatus('reconnecting');
    this.reconnectAttempts++;

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
    const baseDelay = 1000;
    const exponentialDelay = baseDelay * Math.pow(2, this.reconnectAttempts - 1);
    const delay = Math.min(exponentialDelay, 30000); // Max 30 seconds

    console.log(
      `[Relay] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(error => {
        console.error('[Relay] Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Start heartbeat ping/pong
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    // Send ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();
        this.send({ type: 'ping', timestamp: this.lastPingTime });

        // Expect pong within 5 seconds
        this.pongTimeout = setTimeout(() => {
          console.warn('[Relay] Pong timeout - connection may be dead');
          this.ws?.close(); // Triggers reconnect
        }, 5000);
      }
    }, 30000);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  /**
   * Clear reconnect timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Get current latency in milliseconds
   */
  getLatency(): number {
    return this.latency;
  }

  /**
   * Get connection quality based on latency
   * Returns 'good' (<100ms), 'fair' (100-500ms), or 'poor' (>500ms)
   */
  getConnectionQuality(): 'good' | 'fair' | 'poor' | 'unknown' {
    if (this.status !== 'connected') {
      return 'unknown';
    }

    if (this.latency === 0) {
      return 'unknown'; // No ping/pong yet
    }

    if (this.latency < 100) {
      return 'good';
    } else if (this.latency < 500) {
      return 'fair';
    } else {
      return 'poor';
    }
  }
}
