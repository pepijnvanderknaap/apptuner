/**
 * Bundle Executor
 *
 * Executes JavaScript bundles from desktop app in a safe environment
 */

import React from 'react';
import * as ReactNative from 'react-native';

// Global NativeEventEmitter patch - applied once when module loads
const OriginalNativeEventEmitter = ReactNative.NativeEventEmitter;

// Create a patched version that handles null modules
class SafeNativeEventEmitter extends OriginalNativeEventEmitter {
  constructor(nativeModule?: any) {
    // If nativeModule is null/undefined, provide a mock to avoid crash
    if (!nativeModule) {
      console.warn('[SafeNativeEventEmitter] Created with null module, using mock');
      const mockModule = {
        addListener: () => {},
        removeListeners: () => {},
      };
      super(mockModule as any);
      return;
    }
    super(nativeModule);
  }
}

// Replace globally so all code uses the safe version
(ReactNative as any).NativeEventEmitter = SafeNativeEventEmitter;

console.log('[Executor Module] NativeEventEmitter globally patched');

export class BundleExecutor {
  private lastBundle: string | null = null;

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
      // The bundle should define a function called App and expose it
      const wrappedCode = `
        ${bundleCode}
        return App;
      `;

      // Use Function constructor with React and ReactNative as parameters
      // This makes them available in the bundle's scope
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
  }
}
