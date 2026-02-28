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
  execute(bundleCode: string): void {
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

        // CRITICAL: Clear Metro's module cache BEFORE eval.
        // This ensures the bundle's __d factories replace old ones cleanly.
        // We do NOT clear again after eval — so a second __r(0) call below
        // just returns the already-cached result without re-running factories.
        // This prevents the "two React instances" problem that caused
        // "Objects are not valid as a React child" with a clear-AFTER approach.
        if ((global as any).__r && (global as any).__r.c) {
          console.log('[Executor] 🔥 Clearing Metro module cache before eval');
          const cacheSize = (global as any).__r.c.size;
          (global as any).__r.c.clear();
          console.log(`[Executor] ✅ Cleared ${cacheSize} cached modules`);
        }

        // Patch TurboModuleRegistry BEFORE eval so missing native modules get
        // stubs from the very first require (covers RNHapticFeedback, etc.)
        const TRM = (global as any).TurboModuleRegistry;
        if (TRM && typeof TRM.getEnforcing === 'function') {
          const origGetEnforcing = TRM.getEnforcing.bind(TRM);
          const origGet = TRM.get ? TRM.get.bind(TRM) : null;
          const makeStub = (name: string) => new Proxy({} as any, {
            get(_: any, prop: string) {
              if (prop === 'then') return undefined; // not a Promise
              if (prop === '__esModule') return false;
              return (..._args: any[]) => {
                console.warn(`[AppTuner] Stub: ${name}.${prop}() called`);
                return null;
              };
            },
          });
          TRM.getEnforcing = function(name: string) {
            try { return origGetEnforcing(name); } catch (_e) {
              console.warn(`[AppTuner] Missing native module "${name}" — using stub`);
              return makeStub(name);
            }
          };
          if (origGet) {
            TRM.get = function(name: string) {
              const result = origGet(name);
              return result ?? makeStub(name);
            };
          }
          console.log('[Executor] TurboModuleRegistry patched for missing native modules');
        }

        // eval the bundle — the Metro IIFE registers __d factories AND calls
        // __r(0) internally at the end (setting global.App via AppRegistry interception).
        console.log('[Executor] Running eval — bundle will call __r(0) internally');
        try {
          // Use indirect eval to execute the bundle in global scope
          // eslint-disable-next-line no-eval
          (0, eval)(bundleCode);
        } catch (evalError) {
          // Some errors during eval are non-fatal (polyfill conflicts on re-execution)
          const errorMsg = evalError instanceof Error ? evalError.message : String(evalError);
          if (
            errorMsg.includes('NativeEventEmitter') ||
            errorMsg.includes('not writable') ||
            errorMsg.includes('Cannot assign to read only') ||
            errorMsg.includes('read-only')
          ) {
            console.warn('[Executor] ⚠️ Non-fatal eval error (polyfill conflict on re-run):', errorMsg);
            // Continue - __d registrations and __r(0) likely succeeded before the error
          } else {
            // Re-throw other errors
            throw evalError;
          }
        }

        // Fallback: if the bundle didn't call __r(0) itself (some Metro versions don't),
        // call it now. Since we did NOT clear __r.c after eval, if the bundle already
        // called __r(0), this just returns the cached result — no second React instance.
        console.log('[Executor] Metro bundle loaded, executing entry point...');
        console.log('[Executor] global.__r exists:', typeof (global as any).__r);

        if (typeof (global as any).__r === 'function') {
          console.log('[Executor] Calling __r(0) — returns cached result if bundle already ran it');
          try {
            (global as any).__r(0);
          } catch (rError) {
            const rMsg = rError instanceof Error ? rError.message : String(rError);
            if ((global as any).App) {
              console.warn('[Executor] ⚠️ Non-fatal error during __r(0) (App already captured):', rMsg);
            } else {
              throw rError;
            }
          }
        } else {
          console.warn('[Executor] ⚠️  global.__r not found, cannot execute entry point');
        }

        // Metro bundles should have set global.App via index.js
        console.log('[Executor] Metro bundle executed');
        console.log('[Executor] global.App type:', typeof (global as any).App);
        console.log('[Executor] Bundle ID:', (global as any).BUNDLE_ID);
        console.log('[Executor] Bundle time:', (global as any).BUNDLE_TIME);

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
  reexecute(): void {
    if (!this.lastBundle) {
      throw new Error('No bundle to re-execute');
    }
    this.execute(this.lastBundle);
  }

  /**
   * Cleanup execution context
   */
  cleanup(): void {
    this.lastBundle = null;
  }
}
