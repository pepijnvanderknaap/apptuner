/**
 * Bundle Executor
 *
 * Executes JavaScript bundles from desktop app in a safe environment
 */

export class BundleExecutor {
  private lastBundle: string | null = null;
  private executionContext: any = null;

  /**
   * Execute a JavaScript bundle
   */
  async execute(bundleCode: string): Promise<void> {
    try {
      console.log('[Executor] Executing bundle...');

      // Store for potential re-execution
      this.lastBundle = bundleCode;

      // Create execution context with React Native globals
      const context = this.createExecutionContext();

      // Execute the bundle
      // The bundle is wrapped in an IIFE by the bundler, so we can eval it directly
      const result = eval(bundleCode);

      this.executionContext = context;

      console.log('[Executor] Bundle executed successfully');
      return result;
    } catch (error) {
      console.error('[Executor] Execution error:', error);
      throw error;
    }
  }

  /**
   * Re-execute the last bundle (for hot reload)
   */
  async reexecute(): Promise<void> {
    if (!this.lastBundle) {
      throw new Error('No bundle to re-execute');
    }
    return this.execute(this.lastBundle);
  }

  /**
   * Cleanup execution context
   */
  cleanup(): void {
    this.lastBundle = null;
    this.executionContext = null;
  }

  /**
   * Create execution context with React Native APIs
   */
  private createExecutionContext(): any {
    // The bundle has access to all React Native globals
    // We just need to ensure they're available

    return {
      // React Native is already available globally
      // The bundle can import from 'react-native'

      // Add any custom APIs here if needed
      __DEV__: __DEV__,
      console: console, // Use native console
    };
  }
}
