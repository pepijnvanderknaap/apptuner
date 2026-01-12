/**
 * Project Manager
 * Manages a React Native project: watching files, bundling, and sending updates
 */

import { FileWatcher, WatcherConfig } from './watcher';
import { ConnectionManager } from './connection';

export interface ProjectConfig {
  path: string;
  name: string;
  entryPoint?: string;
}

export class ProjectManager {
  private config: ProjectConfig;
  private watcher: FileWatcher | null = null;
  private connection: ConnectionManager | null = null;
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

    // Create file watcher
    const watcherConfig: WatcherConfig = {
      projectPath: this.config.path,
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

      // For now, we'll read a file directly
      // In production, this would use Metro bundler
      const bundleCode = await this.readProjectEntry();

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
   * TODO: Replace with actual Metro bundler
   */
  private async readProjectEntry(): Promise<string | null> {
    try {
      // For now, read from the test-app directory
      // In production, this would bundle the actual project
      const entryPoint = this.config.entryPoint || 'App.tsx';
      const filePath = `${this.config.path}/${entryPoint}`;

      const response = await fetch(filePath);
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
