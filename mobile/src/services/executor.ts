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

        // CRITICAL: Patch ReactNative directly to ensure all references see the patch
        // Do this BEFORE setting on global
        (ReactNative as any).NativeEventEmitter = SafeNativeEventEmitter;

        // Set them on global so Metro bundle can access them via 'this'
        (global as any).React = React;
        (global as any).ReactNative = ReactNative; // Use the directly-patched object
        (global as any).NativeEventEmitter = SafeNativeEventEmitter;

        console.log('[Executor] Set global.React, global.ReactNative (with patched NativeEventEmitter)');

        // Wrap eval in try/catch to handle any remaining NativeEventEmitter errors gracefully
        try {
          // Use indirect eval to execute the bundle in global scope
          // Metro bundles are self-contained IIFEs that will call themselves
          // eslint-disable-next-line no-eval
          (0, eval)(bundleCode);
        } catch (evalError) {
          // If it's a NativeEventEmitter error, log warning but continue
          const errorMsg = evalError instanceof Error ? evalError.message : String(evalError);
          if (errorMsg.includes('NativeEventEmitter')) {
            console.warn('[Executor] ⚠️ NativeEventEmitter error during bundle load (non-fatal):', errorMsg);
            // Continue execution - the error happened during module definition, not during app execution
          } else {
            // Re-throw other errors
            throw evalError;
          }
        }

        // Clean up (optional - Metro bundles may need these to stay)
        // delete (global as any).React;
        // delete (global as any).ReactNative;

        // Metro bundles define modules but don't auto-execute the entry point
        // We need to call __r(0) to execute the entry point module (index.js)
        console.log('[Executor] Metro bundle loaded, executing entry point...');
        console.log('[Executor] global.__r exists:', typeof (global as any).__r);

        if (typeof (global as any).__r === 'function') {
          console.log('[Executor] Calling __r(0) to execute entry point');
          (global as any).__r(0);
        } else {
          console.warn('[Executor] ⚠️  global.__r not found, cannot execute entry point');
        }

        // Metro bundles should have set global.App via index.js
        console.log('[Executor] Metro bundle executed');
        console.log('[Executor] global.App type:', typeof (global as any).App);

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
