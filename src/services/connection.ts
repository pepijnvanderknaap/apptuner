/**
 * Connection service for managing WebSocket connection to Cloudflare relay
 */

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type MessageHandler = (data: any) => void;

export class ConnectionManager {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<(status: ConnectionStatus) => void> = new Set();

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

    this.updateStatus('connecting');

    try {
      this.ws = new WebSocket(`${relayUrl}/desktop/${this.sessionId}`);

      this.ws.onopen = () => {
        console.log('Connected to relay');
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
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
        this.updateStatus('disconnected');
        this.attemptReconnect(relayUrl);
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

  private attemptReconnect(relayUrl: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.updateStatus('error');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect(relayUrl).catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
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
