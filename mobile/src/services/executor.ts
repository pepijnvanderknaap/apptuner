/**
 * Bundle Executor
 *
 * Executes JavaScript bundles from desktop app in a safe environment
 */

import React from 'react';
import * as ReactNative from 'react-native';

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

      console.log('[Executor] Bundle code length:', bundleCode.length);

      // Create a function that executes the bundle with React and ReactNative in scope
      // The bundle should define a function called App and return it
      const wrappedCode = `
        ${bundleCode}
        return App;
      `;

      // Use Function constructor instead of eval for better scope control
      const executorFn = new Function('React', 'ReactNative', wrappedCode);

      // Execute and get the App component
      const AppComponent = executorFn(React, ReactNative);

      // Store on global so the mobile app can access it
      (global as any).App = AppComponent;

      console.log('[Executor] Bundle executed successfully');
      console.log('[Executor] App component type:', typeof AppComponent);

    } catch (error) {
      console.error('[Executor] Execution error:', error);
      console.error('[Executor] Error type:', typeof error);
      console.error('[Executor] Error message:', error instanceof Error ? error.message : String(error));
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
