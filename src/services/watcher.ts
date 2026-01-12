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

    // TODO: Implement actual file watching
    // For now, this is a placeholder that will be implemented when we move to Tauri
    // In Tauri, we'll use the Rust notify crate for efficient file watching
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

    this.isWatching = false;
    this.onChange = null;

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
