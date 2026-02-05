/**
 * File watcher service
 * Watches a project directory for changes and triggers callbacks
 */

export interface WatcherConfig {
  projectPath: string;
  ignored?: string[];
  extensions?: string[];
  debounceMs?: number;
}

export const DEFAULT_WATCHER_CONFIG = {
  ignored: [
    'node_modules',
    '.git',
    'ios',
    'android',
    'dist',
    'build',
    '.expo',
    '__tests__',
    'coverage',
  ],
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  debounceMs: 300,
};

export class FileWatcher {
  private config: WatcherConfig;
  private onChange: ((filePath: string) => void) | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private isWatching = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastContent: string | null = null;

  constructor(config: WatcherConfig) {
    this.config = {
      ...DEFAULT_WATCHER_CONFIG,
      ...config,
    };
  }

  /**
   * Start watching the project directory
   */
  async start(onChange: (filePath: string) => void): Promise<void> {
    if (this.isWatching) {
      console.warn('File watcher already running');
      return;
    }

    this.onChange = onChange;
    this.isWatching = true;

    console.log(`📁 Watching: ${this.config.projectPath}`);
    console.log(`🔍 Extensions: ${this.config.extensions?.join(', ')}`);

    // Start polling for changes (browser-based polling)
    this.startPolling();
  }

  /**
   * Start polling for file changes
   */
  private startPolling(): void {
    // Poll every 2 seconds
    this.pollInterval = setInterval(() => {
      this.checkForChanges();
    }, 2000);

    // Do initial check
    this.checkForChanges();
  }

  /**
   * Check if file has changed
   */
  private async checkForChanges(): Promise<void> {
    try {
      // For browser environment, we'll watch a specific file
      // In the future with Tauri, this will be proper file system watching
      // Remove 'public/' prefix since Vite serves public files at root
      let filePath = `/${this.config.projectPath}`;
      if (filePath.startsWith('/public/')) {
        filePath = filePath.replace('/public/', '/');
      }
      const response = await fetch(filePath + '?t=' + Date.now()); // Cache bust

      if (!response.ok) {
        return;
      }

      const content = await response.text();

      if (this.lastContent === null) {
        // First read, just store it
        this.lastContent = content;
        return;
      }

      if (content !== this.lastContent) {
        console.log(`📝 File changed: ${filePath}`);
        this.lastContent = content;
        this.handleChange(filePath);
      }
    } catch (error) {
      // Silently fail - file might not exist yet
    }
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (!this.isWatching) {
      return;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.isWatching = false;
    this.onChange = null;
    this.lastContent = null;

    console.log('📁 File watcher stopped');
  }

  /**
   * Handle file change with debouncing
   */
  private handleChange(filePath: string): void {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce the change event
    this.debounceTimer = setTimeout(() => {
      if (this.onChange && this.shouldProcessFile(filePath)) {
        console.log(`📝 File changed: ${filePath}`);
        this.onChange(filePath);
      }
    }, this.config.debounceMs);
  }

  /**
   * Check if a file should be processed based on config
   */
  private shouldProcessFile(filePath: string): boolean {
    // Check if file is in ignored directory
    const ignored = this.config.ignored || [];
    for (const pattern of ignored) {
      if (filePath.includes(pattern)) {
        return false;
      }
    }

    // Check if file has allowed extension
    const extensions = this.config.extensions || [];
    if (extensions.length > 0) {
      const hasValidExtension = extensions.some(ext => filePath.endsWith(ext));
      if (!hasValidExtension) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get current watching status
   */
  isActive(): boolean {
    return this.isWatching;
  }
}
