/**
 * Bundle Executor
 *
 * Executes JavaScript bundles from desktop app in a safe environment
 */

import * as React from 'react';
import * as ReactNative from 'react-native';

// Metro bundler module registry
const moduleRegistry: { [key: number]: any } = {};
const moduleCache: { [key: number]: any } = {};

// Metro require implementation
function metroRequire(moduleId: number | string): any {
  // Handle string module names (like 'react', 'react-native')
  if (typeof moduleId === 'string') {
    if (moduleId === 'react') return React;
    if (moduleId === 'react-native') return ReactNative;
    throw new Error(`Module not found: ${moduleId}`);
  }

  // Check cache first
  if (moduleCache[moduleId]) {
    return moduleCache[moduleId].exports;
  }

  // Get module factory
  const moduleFactory = moduleRegistry[moduleId];
  if (!moduleFactory) {
    throw new Error(`Module ${moduleId} not found in registry`);
  }

  // Create module object
  const module = {
    exports: {},
    id: moduleId,
    loaded: false,
  };

  // Cache it before execution (handles circular deps)
  moduleCache[moduleId] = module;

  // Execute factory
  moduleFactory(
    module,
    module.exports,
    metroRequire
  );

  module.loaded = true;
  return module.exports;
}

// Metro define function
function metroDefine(moduleId: number, factory: Function): void {
  moduleRegistry[moduleId] = factory;
}

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

      // Inject Metro runtime into global scope
      // Metro bundles expect these to be available globally
      (global as any).__d = metroDefine;
      (global as any).__r = metroRequire;
      (global as any).require = metroRequire;
      (global as any).__DEV__ = __DEV__;
      (global as any).React = React;
      (global as any).ReactNative = ReactNative;

      // Create a wrapper function that provides Metro runtime in local scope
      const executeBundle = new Function(
        '__d',
        '__r',
        'require',
        '__DEV__',
        'React',
        'ReactNative',
        'global',
        'console',
        bundleCode
      );

      // Execute with Metro runtime functions passed as arguments
      const result = executeBundle(
        metroDefine,
        metroRequire,
        metroRequire,
        __DEV__,
        React,
        ReactNative,
        global,
        console
      );

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
