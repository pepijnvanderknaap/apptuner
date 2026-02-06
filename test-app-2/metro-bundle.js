#!/usr/bin/env node

// This script runs Metro bundler from within the test-app directory
// This ensures Metro finds all dependencies in test-app/node_modules

const Metro = require('metro');
const path = require('path');

async function bundle() {
  const entryFile = path.join(__dirname, 'index.js');

  console.log('📦 Bundling from test-app directory...');
  console.log('📁 Project root:', __dirname);
  console.log('📄 Entry file:', entryFile);

  // Load config from current directory (test-app)
  // IMPORTANT: Always reset cache to ensure fresh bundles with correct dependencies
  const config = await Metro.loadConfig({
    cwd: __dirname,
    resetCache: true,
  });

  // Bundle the project
  let code;
  try {
    const result = await Metro.runBuild(config, {
      entry: entryFile,
      dev: true,
      minify: false,
      platform: 'ios',
      sourceMap: false,
    });
    code = result.code;
  } catch (error) {
    // Metro transform errors - extract details and exit with error
    console.error('Metro build error:', error);
    if (error.type === 'TransformError' || error.message) {
      const errorInfo = {
        type: error.type || 'BuildError',
        message: error.message,
        filename: error.filename,
        lineNumber: error.lineNumber,
        column: error.column,
        stack: error.stack
      };
      // Write error to stderr in JSON format for metro-server to parse
      process.stderr.write(JSON.stringify(errorInfo) + '\n');
    }
    process.exit(1);
  }

  // Wrap the bundle with initialization code
  // Use .call(this) to ensure 'this' context is available to the bundle
  const wrappedCode = `
// AppTuner Metro Bundle Wrapper
// Provides React and ReactNative via 'this' context

(function() {
  console.log('[Metro Bundle] Starting...');
  console.log('[Metro Bundle] this.React exists:', !!this.React);
  console.log('[Metro Bundle] this.ReactNative exists:', !!this.ReactNative);

  // Execute the Metro bundle in this context
  ${code}

  // Extract the App component from Metro's module system
  if (typeof __r === 'function') {
    try {
      const module = __r(0);
      if (module && module.default) {
        this.App = module.default;
        console.log('[Metro Bundle] Set this.App from module.default');
      } else if (module) {
        this.App = module;
        console.log('[Metro Bundle] Set this.App from module');
      }
    } catch (e) {
      console.error('[Metro Bundle] Failed to extract App from module:', e);
    }
  }
}.call(this));
`;

  // Output to stdout so metro-server can capture it
  console.log('__BUNDLE_START__');
  process.stdout.write(wrappedCode);
  console.log('\n__BUNDLE_END__');
}

bundle().catch(error => {
  console.error('Bundle error:', error);
  process.exit(1);
});
