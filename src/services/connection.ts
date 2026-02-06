/**
 * Connection service for managing WebSocket connection to Cloudflare relay with auto-reconnect
 */

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
type MessageHandler = (data: any) => void;

export class ConnectionManager {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // Increased from 5
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<(status: ConnectionStatus) => void> = new Set();

  // Heartbeat/ping-pong for connection health
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private pongTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastPingTime = 0;
  private latency = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private savedRelayUrl: string = '';

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Connect to the Cloudflare Workers relay
   */
  async connect(relayUrl: string = 'ws://localhost:8787'): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('Already connected');
      return;
    }

    // Save relay URL for reconnection
    this.savedRelayUrl = relayUrl;
    this.updateStatus('connecting');

    try {
      this.ws = new WebSocket(`${relayUrl}/desktop/${this.sessionId}`);

      this.ws.onopen = () => {
        console.log('Connected to relay');
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateStatus('error');
      };

      this.ws.onclose = () => {
        console.log('Disconnected from relay');
        this.stopHeartbeat();
        this.updateStatus('disconnected');
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Connection error:', error);
      this.updateStatus('error');
      throw error;
    }
  }

  /**
   * Send data to the connected mobile device
   */
  send(type: string, payload: any): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: not connected');
      return;
    }

    const message = {
      type,
      payload,
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send bundle update to mobile device
   */
  sendBundleUpdate(bundleCode: string, sourceMap?: string): void {
    this.send('bundle_update', {
      code: bundleCode,
      sourceMap,
    });
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
   * Subscribe to connection status changes
   */
  onStatusChange(handler: (status: ConnectionStatus) => void): () => void {
    this.statusHandlers.add(handler);
    // Call immediately with current status
    handler(this.status);
    // Return unsubscribe function
    return () => this.statusHandlers.delete(handler);
  }

  /**
   * Subscribe to incoming messages
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  private handleMessage(data: any): void {
    // Handle ping/pong internally first
    if (data.type === 'pong') {
      if (this.pongTimeout) {
        clearTimeout(this.pongTimeout);
        this.pongTimeout = null;
      }

      if (this.lastPingTime > 0) {
        this.latency = Date.now() - this.lastPingTime;
        console.log(`Latency: ${this.latency}ms`);
      }
      return; // Don't propagate pong to message handlers
    }

    // Notify all message handlers
    this.messageHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });

    // Handle specific message types
    switch (data.type) {
      case 'mobile_connected':
        console.log('Mobile device connected');
        break;
      case 'mobile_disconnected':
        console.log('Mobile device disconnected');
        break;
      case 'error':
        console.error('Received error:', data.payload);
        break;
    }
  }

  private updateStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusHandlers.forEach(handler => {
      try {
        handler(status);
      } catch (error) {
        console.error('Error in status handler:', error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.updateStatus('error');
      return;
    }

    this.updateStatus('reconnecting');
    this.reconnectAttempts++;

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
    const baseDelay = 1000;
    const exponentialDelay = baseDelay * Math.pow(2, this.reconnectAttempts - 1);
    const delay = Math.min(exponentialDelay, 30000); // Max 30 seconds

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect(this.savedRelayUrl).catch(error => {
        console.error('Reconnection failed:', error);
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
        this.send('ping', { timestamp: this.lastPingTime });

        // Expect pong within 5 seconds
        this.pongTimeout = setTimeout(() => {
          console.warn('Pong timeout - connection may be dead');
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

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return Array.from({ length: 2 }, () =>
    Math.random().toString(36).substring(2, 15)
  ).join('');
}
