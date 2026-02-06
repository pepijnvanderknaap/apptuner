#!/usr/bin/env node

// Watch test-app and auto-bundle to public/test-bundle.js on changes
// This lets you edit test-app/App.tsx and see changes on your phone!

const Metro = require('metro');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');

const OUTPUT_PATH = path.join(__dirname, '../public/test-bundle.js');

/**
 * Post-process Metro bundle to use global React and ReactNative
 * instead of bundled versions
 */
function externalizeReact(bundleCode) {
  console.log('🔧 Externalizing React and ReactNative...');

  // Instead of prepending, we append code that waits for Metro to load
  // then hooks into it
  const hookCode = `
;(function() {
  // Wait for Metro's module system to be ready
  var checkInterval = setInterval(function() {
    if (typeof global.__d !== 'undefined' && typeof global.__r !== 'undefined') {
      clearInterval(checkInterval);
      installExternalizationHooks();
    }
  }, 10);

  function installExternalizationHooks() {
    console.log('[External] Installing React externalization hooks...');

    var moduleOverrides = {};
    var originalDefine = global.__d;
    var originalRequire = global.__r;

    // Override __d to detect React and ReactNative modules
    global.__d = function(factory, moduleId, dependencyMap) {
      // Call original first
      originalDefine(factory, moduleId, dependencyMap);

      // Try to detect if this is React or ReactNative
      try {
        var factoryStr = factory.toString();

        // Detect React: has createElement, useState, useEffect, etc.
        if (factoryStr.includes('createElement') &&
            factoryStr.includes('useState') &&
            factoryStr.includes('Component') &&
            factoryStr.length > 100000) { // React is large
          console.log('[External] Detected React module:', moduleId);
          moduleOverrides[moduleId] = global.React;
          return;
        }

        // Detect React Native: has View, Text, StyleSheet, etc.
        if (factoryStr.includes('requireNativeComponent') &&
            factoryStr.includes('StyleSheet') &&
            factoryStr.length > 50000) { // React Native is large
          console.log('[External] Detected ReactNative module:', moduleId);
          moduleOverrides[moduleId] = global.ReactNative;
          return;
        }
      } catch (e) {
        // Ignore detection errors
      }
    };

    // Override __r to return globals for React/ReactNative
    global.__r = function(moduleId) {
      if (moduleOverrides[moduleId]) {
        console.log('[External] Using global for module:', moduleId);
        return moduleOverrides[moduleId];
      }
      return originalRequire(moduleId);
    };

    console.log('[External] Hooks installed successfully');
  }
})();
`;

  return bundleCode + hookCode;
}

async function bundle() {
  const entryFile = path.join(__dirname, 'index.js');

  console.log('\n📦 Bundling test-app...');

  try {
    // Load config from current directory (test-app)
    const config = await Metro.loadConfig({
      cwd: __dirname,
    });

    // Build the bundle
    const { code } = await Metro.runBuild(config, {
      entry: entryFile,
      dev: true,
      minify: false,
      platform: 'ios',
      sourceMap: false,
    });

    // Note: We're now using Metro's resolver to skip React/ReactNative
    // So we don't need post-processing externalization

    // Write to public/test-bundle.js
    fs.writeFileSync(OUTPUT_PATH, code);

    const sizeKB = Math.round(code.length / 1024);
    console.log(`✅ Bundle written to public/test-bundle.js (${sizeKB} KB)`);
    console.log('💡 AppTuner will detect the change and auto-send to your phone!\n');
  } catch (error) {
    console.error('❌ Bundle error:', error.message);
  }
}

// Do initial bundle
console.log('🚀 Starting test-app watcher...\n');
bundle();

// Watch for changes
const watchPaths = [
  path.join(__dirname, 'App.tsx'),
  path.join(__dirname, 'index.js'),
];

console.log('👀 Setting up file watcher for:');
watchPaths.forEach(p => console.log(`   - ${p}`));

const watcher = chokidar.watch(watchPaths, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  ignoreInitial: true, // Don't trigger on initial scan
});

watcher.on('ready', () => {
  console.log('✅ Watcher is ready and monitoring files');
});

watcher.on('change', (filePath) => {
  console.log(`\n🔥 File changed: ${path.basename(filePath)}`);
  bundle();
});

watcher.on('error', (error) => {
  console.error('❌ Watcher error:', error);
});

console.log('📝 Edit App.tsx to see live updates on your phone!\n');
