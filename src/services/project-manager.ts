/**
 * Project Manager
 * Manages a React Native project: watching files, bundling, and sending updates
 */

import { FileWatcher, WatcherConfig } from './watcher';
import { ConnectionManager } from './connection';
import { MetroClient } from './metro';

export interface ProjectConfig {
  path: string;
  name: string;
  entryPoint?: string;
  useMetro?: boolean; // If true, use Metro bundler; if false, use simple file reading
}

export class ProjectManager {
  private config: ProjectConfig;
  private watcher: FileWatcher | null = null;
  private connection: ConnectionManager | null = null;
  private metro: MetroClient | null = null;
  private isActive = false;

  constructor(config: ProjectConfig) {
    this.config = config;
  }

  /**
   * Start managing the project: watch files and auto-send bundles
   */
  async start(connection: ConnectionManager): Promise<void> {
    if (this.isActive) {
      console.warn('Project manager already active');
      return;
    }

    this.connection = connection;
    this.isActive = true;

    console.log(`🚀 Starting project manager for: ${this.config.name}`);

    // Initialize Metro if enabled
    if (this.config.useMetro) {
      try {
        console.log('📦 Initializing Metro bundler...');
        this.metro = new MetroClient({
          projectPath: this.config.path,
          entryPoint: this.config.entryPoint || 'App.tsx',
        });
        await this.metro.connect();
        console.log('✅ Metro bundler ready');
      } catch (error) {
        console.warn('⚠️  Metro connection failed, will fall back to simple file reading:', error);
        this.metro = null;
      }
    }

    // Create file watcher
    const watcherConfig: WatcherConfig = {
      projectPath: `${this.config.path}/${this.config.entryPoint || 'index.js'}`,
    };

    this.watcher = new FileWatcher(watcherConfig);

    // Start watching and auto-bundle on changes
    await this.watcher.start(async (filePath) => {
      console.log(`📝 File changed: ${filePath}`);
      await this.bundleAndSend();
    });

    // Do initial bundle
    await this.bundleAndSend();
  }

  /**
   * Stop managing the project
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    if (this.watcher) {
      this.watcher.stop();
      this.watcher = null;
    }

    if (this.metro) {
      this.metro.disconnect();
      this.metro = null;
    }

    this.connection = null;
    this.isActive = false;

    console.log(`🛑 Stopped project manager for: ${this.config.name}`);
  }

  /**
   * Bundle the project and send to connected devices
   */
  private async bundleAndSend(): Promise<void> {
    if (!this.connection) {
      console.error('No connection available');
      return;
    }

    try {
      console.log('📦 Bundling project...');

      let bundleCode: string | null = null;

      // Try Metro bundler first if available
      if (this.metro) {
        try {
          console.log('📦 Using Metro bundler...');
          bundleCode = await this.metro.bundle();
          console.log('✅ Metro bundle ready');
        } catch (metroError) {
          console.warn('⚠️  Metro bundling failed, falling back to simple file reading:', metroError);
          // Fall through to simple file reading
        }
      }

      // Fall back to simple file reading if Metro not available or failed
      if (!bundleCode) {
        console.log('📄 Using simple file reading...');
        bundleCode = await this.readProjectEntry();
      }

      if (bundleCode) {
        const sizeKB = Math.round(bundleCode.length / 1024);
        console.log(`📤 Sending bundle (${sizeKB} KB)...`);

        this.connection.sendBundleUpdate(bundleCode);

        console.log('✅ Bundle sent successfully');
      }
    } catch (error) {
      console.error('❌ Bundle error:', error);
    }
  }

  /**
   * Read the project entry point
   */
  private async readProjectEntry(): Promise<string | null> {
    try {
      const entryPoint = this.config.entryPoint || 'App.tsx';
      let filePath = `/${this.config.path}/${entryPoint}`;

      // Remove 'public/' prefix since Vite serves public files at root
      if (filePath.startsWith('/public/')) {
        filePath = filePath.replace('/public/', '/');
      }

      // Add cache buster to ensure we get latest content
      const response = await fetch(filePath + '?t=' + Date.now());
      if (!response.ok) {
        throw new Error(`Failed to read ${filePath}`);
      }

      return await response.text();
    } catch (error) {
      console.error('Failed to read project entry:', error);
      return null;
    }
  }

  /**
   * Manually trigger a bundle and send
   */
  async triggerUpdate(): Promise<void> {
    await this.bundleAndSend();
  }

  /**
   * Get project info
   */
  getInfo(): ProjectConfig {
    return { ...this.config };
  }

  /**
   * Check if project manager is active
   */
  isRunning(): boolean {
    return this.isActive;
  }
}
