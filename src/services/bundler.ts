/**
 * Bundler service for processing React Native code with esbuild
 * TODO: Move this to Rust backend - esbuild cannot run in browser
 */

// import * as esbuild from 'esbuild';

export interface BundleResult {
  code: string;
  sourceMap?: string;
  assets?: string[];
  error?: string;
}

export class Bundler {
  private projectPath: string;
  private entryPoint: string | null = null;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Find the entry point for the React Native app
   */
  private async findEntryPoint(): Promise<string> {
    if (this.entryPoint) {
      return this.entryPoint;
    }

    // Check common entry points in order of preference
    const possibleEntries = [
      'index.js',
      'index.tsx',
      'index.ts',
      'App.tsx',
      'App.ts',
      'App.jsx',
      'App.js',
      'src/index.js',
      'src/index.tsx',
      'src/App.tsx',
      'src/App.js',
    ];

    // For now, we'll use a simple check - in production we'd use the file system
    // This will be called from Tauri, so we'll need to check which file exists
    this.entryPoint = possibleEntries[0]; // Default to index.js
    return this.entryPoint;
  }

  /**
   * Bundle the React Native project using esbuild
   */
  async bundle(): Promise<BundleResult> {
    try {
      console.log(`Bundling project at ${this.projectPath}`);

      const entryPoint = await this.findEntryPoint();
      // Use simple path joining (works in browser context)
      const entryPath = `${this.projectPath}/${entryPoint}`.replace(/\/+/g, '/');

      // esbuild configuration for React Native
      // @ts-ignore - esbuild not available in browser, this code path not used
      const result = await esbuild.build({
        entryPoints: [entryPath],
        bundle: true,
        platform: 'browser', // React Native uses a JS runtime similar to browser
        target: 'es2020',
        format: 'iife', // Immediately Invoked Function Expression
        globalName: 'ApptunerBundle',

        // Source maps for debugging
        sourcemap: 'inline',

        // JSX/React configuration
        jsx: 'automatic',
        jsxDev: true,

        // Resolve configuration
        resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],

        // Define environment variables
        define: {
          'process.env.NODE_ENV': '"development"',
          '__DEV__': 'true',
          'global': 'globalThis',
        },

        // Don't minify for development (easier debugging)
        minify: false,

        // Write to memory instead of disk
        write: false,

        // Handle external modules (React Native core modules)
        external: [
          'react-native',
          'react',
          'react-dom',
        ],

        // Loader configuration
        loader: {
          '.js': 'jsx',
          '.jsx': 'jsx',
          '.ts': 'tsx',
          '.tsx': 'tsx',
          '.json': 'json',
          '.png': 'dataurl',
          '.jpg': 'dataurl',
          '.jpeg': 'dataurl',
          '.svg': 'dataurl',
        },

        logLevel: 'warning',
      });

      // Check for errors
      if (result.errors.length > 0) {
        const errorMessages = result.errors.map((e: any) => e.text).join('\n');
        return {
          code: '',
          error: `Build errors:\n${errorMessages}`,
        };
      }

      // Get the bundled code
      const outputFile = result.outputFiles?.[0];
      if (!outputFile) {
        return {
          code: '',
          error: 'No output generated from build',
        };
      }

      const bundledCode = new TextDecoder().decode(outputFile.contents);

      // Wrap the bundle with React Native polyfills and setup
      const wrappedCode = this.wrapBundleWithPolyfills(bundledCode);

      console.log(`Bundle complete: ${(outputFile.contents.length / 1024).toFixed(2)} KB`);

      return {
        code: wrappedCode,
        sourceMap: undefined, // Source map is inline
        assets: [],
      };
    } catch (error) {
      console.error('Bundle error:', error);

      // Provide detailed error information
      if (error instanceof Error) {
        return {
          code: '',
          error: `${error.name}: ${error.message}`,
        };
      }

      return {
        code: '',
        error: 'Unknown bundling error',
      };
    }
  }

  /**
   * Wrap the bundle with React Native polyfills and runtime setup
   */
  private wrapBundleWithPolyfills(bundleCode: string): string {
    return `
// Apptuner React Native Bundle
// Generated: ${new Date().toISOString()}

(function(global) {
  'use strict';

  // Basic polyfills for React Native environment
  if (typeof global.process === 'undefined') {
    global.process = {
      env: { NODE_ENV: 'development' },
      version: 'v18.0.0',
    };
  }

  if (typeof global.Buffer === 'undefined') {
    global.Buffer = { isBuffer: () => false };
  }

  // Console polyfill (will be captured and sent to desktop app)
  const originalConsole = global.console;
  global.console = {
    log: (...args) => {
      originalConsole.log('[App]', ...args);
      // TODO: Send to desktop app via WebSocket
    },
    warn: (...args) => {
      originalConsole.warn('[App]', ...args);
    },
    error: (...args) => {
      originalConsole.error('[App]', ...args);
    },
    info: (...args) => {
      originalConsole.info('[App]', ...args);
    },
    debug: (...args) => {
      originalConsole.debug('[App]', ...args);
    },
  };

  // Error boundary for runtime errors
  global.addEventListener('error', (event) => {
    console.error('Runtime error:', event.error);
    // TODO: Show error overlay on mobile app
  });

  global.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });

  // Bundle execution starts here
  try {
    ${bundleCode}
    console.log('✅ Bundle loaded successfully');
  } catch (error) {
    console.error('❌ Bundle execution error:', error);
    throw error;
  }

})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
    `.trim();
  }

  /**
   * Watch for file changes and trigger rebuilds
   */
  async watch(_onChange: (result: BundleResult) => void): Promise<() => void> {
    console.log('Starting file watcher...');

    // TODO: Implement file watching
    // This will be handled by the Rust backend using notify crate

    // Return cleanup function
    return () => {
      console.log('Stopping file watcher...');
    };
  }
}

/**
 * File watcher configuration
 */
export interface WatcherConfig {
  ignored?: string[];
  extensions?: string[];
  debounceMs?: number;
}

export const DEFAULT_WATCHER_CONFIG: WatcherConfig = {
  ignored: [
    'node_modules',
    '.git',
    'ios',
    'android',
    'dist',
    'build',
    '.expo',
  ],
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  debounceMs: 300,
};
