/**
 * Metro Bundler Client
 * Communicates with the Metro bundler server to bundle React Native projects
 */

export interface MetroConfig {
  projectPath: string;
  entryPoint?: string;
}

export class MetroClient {
  private ws: WebSocket | null = null;
  private config: MetroConfig;
  private pendingRequests: Map<string, {
    resolve: (code: string) => void;
    reject: (error: Error) => void;
  }> = new Map();

  constructor(config: MetroConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket('ws://localhost:3031');

        this.ws.onopen = () => {
          console.log('✅ Connected to Metro server');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('[Metro] Message parse error:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[Metro] WebSocket error:', error);
          reject(new Error('Failed to connect to Metro server'));
        };

        this.ws.onclose = () => {
          console.log('[Metro] Connection closed');
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: any) {
    const { type, projectPath, code, error } = message;

    const pending = this.pendingRequests.get(projectPath);
    if (!pending) {
      return;
    }

    if (type === 'bundle_ready') {
      console.log('[Metro] 📦 Bundle received from Metro server');

      let modifiedCode = code;

      // No modifications needed - Metro server sends clean bundles
      // Warnings come from React Native runtime, not the bundle itself
      pending.resolve(modifiedCode);
      this.pendingRequests.delete(projectPath);
    } else if (type === 'bundle_error') {
      // Create a rich error object with all the details
      const bundleError: any = new Error(
        (typeof error === 'object' ? error.message : error) || 'Bundling failed'
      );

      // Attach error details if available
      if (typeof error === 'object') {
        bundleError.stack = error.stack;
        bundleError.filename = error.filename;
        bundleError.lineNumber = error.lineNumber;
        bundleError.column = error.column;
      }

      pending.reject(bundleError);
      this.pendingRequests.delete(projectPath);
    }
  }

  async bundle(): Promise<string> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Metro server not connected');
    }

    return new Promise((resolve, reject) => {
      const { projectPath, entryPoint = 'App.tsx' } = this.config;

      // Store the promise handlers
      this.pendingRequests.set(projectPath, { resolve, reject });

      // Send bundle request
      this.ws!.send(JSON.stringify({
        type: 'bundle',
        projectPath,
        entryPoint,
      }));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(projectPath)) {
          this.pendingRequests.delete(projectPath);
          reject(new Error('Bundling timeout'));
        }
      }, 30000);
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingRequests.clear();
  }

  updateConfig(config: MetroConfig) {
    this.config = config;
  }
}
