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

      // Detect if this is a Metro bundle (contains Metro wrapper signature)
      const isMetroBundle = bundleCode.includes('[Metro Bundle] Starting');

      if (isMetroBundle) {
        console.log('[Executor] Detected Metro bundle, using global scope execution');

        // Metro bundles are complete IIFEs: (function() {...}).call(this)
        // They expect React and ReactNative on the 'this' context
        // Set them on global temporarily so the bundle can access them
        (global as any).React = React;
        (global as any).ReactNative = ReactNative;

        console.log('[Executor] Set global.React and global.ReactNative');

        // Use indirect eval to execute the bundle in global scope
        // Metro bundles are self-contained IIFEs that will call themselves
        // eslint-disable-next-line no-eval
        (0, eval)(bundleCode);

        // Clean up (optional - Metro bundles may need these to stay)
        // delete (global as any).React;
        // delete (global as any).ReactNative;

        // Metro bundles set global.App themselves
        console.log('[Executor] Metro bundle executed, App set by bundle');

      } else {
        console.log('[Executor] Detected simple bundle, using parameter execution');

        // Simple bundles (test-bundle.js) need React/ReactNative as parameters
        const wrappedCode = `
          ${bundleCode}
          return App;
        `;

        const executorFn = new Function('React', 'ReactNative', wrappedCode);
        const AppComponent = executorFn(React, ReactNative);

        // Store on global so the mobile app can access it
        (global as any).App = AppComponent;

        console.log('[Executor] Simple bundle executed successfully');
      }

      console.log('[Executor] Bundle executed successfully');
      console.log('[Executor] App component type:', typeof (global as any).App);

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
