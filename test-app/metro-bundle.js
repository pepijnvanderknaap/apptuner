#!/usr/bin/env node

// This script runs Metro bundler from within the test-app directory
// This ensures Metro finds all dependencies in test-app/node_modules

const Metro = require('metro');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

async function bundle() {
  const entryFile = path.join(__dirname, 'index.js');

  console.log('📦 Bundling from test-app directory...');
  console.log('📁 Project root:', __dirname);
  console.log('📄 Entry file:', entryFile);

  // CRITICAL: Manually clear Metro cache to ensure fresh bundles
  // Metro's resetCache: true doesn't always work reliably
  const metroCacheDir = path.join(__dirname, '.metro');
  const tmpMetroCache = path.join(require('os').tmpdir(), 'metro-*');

  try {
    if (fs.existsSync(metroCacheDir)) {
      console.log('🗑️  Clearing Metro cache directory:', metroCacheDir);
      fs.rmSync(metroCacheDir, { recursive: true, force: true });
    }
    // Also try to clear system temp cache
    try {
      execSync(`rm -rf ${tmpMetroCache}`, { stdio: 'ignore' });
      console.log('🗑️  Cleared Metro temp cache');
    } catch (e) {
      // Ignore errors from rm command
    }
  } catch (e) {
    console.warn('⚠️  Failed to clear Metro cache:', e.message);
  }

  // Load config from current directory (test-app)
  // IMPORTANT: Always reset cache to ensure fresh bundles with correct dependencies
  const config = await Metro.loadConfig({
    cwd: __dirname,
    resetCache: true,
  });

  // Bundle the project
  let code;
  let assetData = []; // Declare outside try block so it's accessible later

  try {
    const result = await Metro.runBuild(config, {
      entry: entryFile,
      dev: true,
      minify: false,
      platform: 'ios',
      sourceMap: false,
    });
    code = result.code;

    // Extract asset data from bundle code BEFORE wrapping
    console.log('🔍 Extracting asset data from bundle...');
    const assetRegex = /registerAsset\(\{([^}]+(?:\}[^}]*)*)\}\)/g;
    let match;

    while ((match = assetRegex.exec(code)) !== null) {
      try {
        // Extract asset properties
        const assetStr = match[1];
        const nameMatch = assetStr.match(/"name":\s*"([^"]+)"/);
        const uriMatch = assetStr.match(/"uri":\s*"data:([^"]+)"/);
        const typeMatch = assetStr.match(/"type":\s*"([^"]+)"/);

        if (nameMatch && uriMatch) {
          assetData.push({
            name: nameMatch[1],
            uri: 'data:' + uriMatch[1], // Re-add data: prefix
            type: typeMatch ? typeMatch[1] : 'unknown'
          });
          console.log(`✅ Found asset: ${nameMatch[1]}.${typeMatch ? typeMatch[1] : 'unknown'}`);
        }
      } catch (e) {
        console.warn('⚠️ Failed to parse asset:', e.message);
      }
    }

    console.log(`📦 Extracted ${assetData.length} assets from bundle`);
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

  // CRITICAL FIX: Patch NativeEventEmitter constructor to handle null modules
  // This prevents crashes when NativeEventEmitter is instantiated with null
  console.log('[Bundle] Patching NativeEventEmitter invariant checks...');
  console.log('[Bundle] Original bundle size:', code.length, 'bytes');

  // The invariant check is wrapped in Platform.OS check and spans multiple lines:
  // if (Platform.OS === 'ios') {
  //   invariant(
  //     nativeModule != null,
  //     '`new NativeEventEmitter()` requires a non-null argument.'
  //   );
  // }

  // Strategy: Replace the entire if statement with a null check that provides a mock
  const originalCode = code;

  // Match the Platform.OS === 'ios' check with the invariant inside (multiline)
  code = code.replace(
    /if\s*\(\s*Platform\.OS\s*===\s*['"]ios['"]\s*\)\s*\{[\s\S]{0,200}?invariant\s*\([\s\S]{0,200}?nativeModule[\s\S]{0,200}?\);[\s\S]{0,50}?\}/g,
    `if (Platform.OS === 'ios' && !nativeModule) {
      console.warn('[NativeEventEmitter] Created with null module, using mock');
      nativeModule = { addListener: function(){}, removeListeners: function(){} };
    }`
  );

  const wasPatched = code !== originalCode;
  console.log('[Bundle] NativeEventEmitter invariant checks', wasPatched ? 'PATCHED' : 'NOT FOUND');
  console.log('[Bundle] Patched bundle size:', code.length, 'bytes');

  // HOT RELOAD FIX: Patch Metro's __d (define) function to:
  // 1. Track module redefinitions
  // 2. Reset the isInitialized flag so __r re-runs the factory function
  console.log('[Bundle] Patching Metro __d to allow hot reload with cache invalidation...');

  let hotReloadCode = code;

  // Pattern 1: Newer Metro with modules.has()
  // Replace the entire if block to add hot reload tracking AND reset isInitialized
  const newMetroPattern = /if\s*\(\s*modules\.has\(moduleId\)\s*\)\s*\{[\s\S]{1,300}?return;\s*\}/g;
  const matches1 = (hotReloadCode.match(newMetroPattern) || []).length;
  hotReloadCode = hotReloadCode.replace(
    newMetroPattern,
    `if (modules.has(moduleId)) {
      // HOT RELOAD: Track redefinition and reset initialized flag
      const existingMod = modules.get(moduleId);
      if (existingMod) {
        // CRITICAL: Access true global - SAME pattern as bundle wrapper
        // This works in all contexts (strict mode, non-strict, RN, browser)
        const _realGlobal = (typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this)));
        const _g = _realGlobal && _realGlobal.__APPTUNER_GLOBAL ? _realGlobal.__APPTUNER_GLOBAL : _realGlobal;
        console.log('[HotReload] Module ' + moduleId + ' redefinition - checking cache clear...');
        console.log('[HotReload] _g exists:', !!_g, '__APPTUNER_GLOBAL:', !!_realGlobal.__APPTUNER_GLOBAL, '__c:', typeof (_g && _g.__c));
        // Mark as dirty for cache clearing
        if (_g && _g.__dirtyModules) {
          console.log('[HotReload] 🔥 Module ' + moduleId + ' REDEFINED - marking dirty');
          _g.__dirtyModules.add(moduleId);
        }
        console.log('[Metro __d] Redefining module', moduleId, '- resetting isInitialized');
        existingMod.isInitialized = false;
        // Clear cache immediately
        if (_g && typeof _g.__c === 'function') {
          try {
            _g.__c(moduleId);
            console.log('[HotReload] ✅ Cache cleared for module ' + moduleId);
          } catch (e) {
            console.warn('[HotReload] Cache clear failed:', e);
          }
        } else {
          console.warn('[HotReload] ⚠️ __c function not found! _g:', typeof _g, '__c:', typeof (_g && _g.__c));
        }
      }
      // Continue with redefinition instead of returning
    }`
  );
  console.log('[Bundle] New Metro pattern (modules.has) replaced:', matches1, 'occurrences');

  // Pattern 2: Older Metro with modules[moduleId]
  const oldMetroPattern = /if\s*\(\s*modules\[moduleId\]\s*!=\s*null\s*\)\s*\{[\s\S]{1,300}?\/\/\s*prevent[\s\S]{1,100}?return;\s*\}/g;
  const matches2 = (hotReloadCode.match(oldMetroPattern) || []).length;
  hotReloadCode = hotReloadCode.replace(
    oldMetroPattern,
    `if (modules[moduleId] != null) {
      // HOT RELOAD: Reset initialized flag to force re-execution
      console.log('[Metro __d] Redefining module', moduleId, '- resetting isInitialized');
      modules[moduleId].isInitialized = false;
      // Continue with redefinition instead of returning
    }`
  );
  console.log('[Bundle] Old Metro pattern (!=) replaced:', matches2, 'occurrences');

  // CRITICAL: Patch Metro's modules Map to use global storage
  // Metro uses: var modules = clear(); where clear() returns a fresh Map
  console.log('[Bundle] Patching Metro modules Map to use global storage...');

  let modulesPatched = 0;
  const modulesPattern = /(\bvar\s+modules\s*=\s*clear\(\);)/g;

  if (modulesPattern.test(hotReloadCode)) {
    hotReloadCode = hotReloadCode.replace(modulesPattern,
      'var _g = (typeof __APPTUNER_GLOBAL !== "undefined" ? __APPTUNER_GLOBAL : (typeof globalThis !== "undefined" ? globalThis : global)); ' +
      'var modules = (_g && _g.__metroModules) || clear(); ' +
      'if (_g) { _g.__metroModules = modules; console.log("[Metro] Using global modules Map from", typeof __APPTUNER_GLOBAL !== "undefined" ? "APPTUNER" : "fallback"); } ' +
      'if (_g && !_g.__dirtyModules) { _g.__dirtyModules = new Set(); console.log("[HotReload] Initialized dirty tracking"); }'
    );
    modulesPatched++;
    console.log('[Bundle] Patched: var modules = clear()');
  } else {
    console.warn('[Bundle] Could not find "var modules = clear()" pattern');
  }

  console.log('[Bundle] Modules Map patching:', modulesPatched, 'patterns matched');

  // CRITICAL: Comment out standalone __r(0) calls from the bundle
  // These would set isInitialized=true before our executor calls __r(0)
  console.log('[Bundle] Commenting out standalone __r(0) calls...');

  // Pattern: Newline followed by __r(0); (standalone statement)
  const requireCallPattern = /\n\s*__r\(0\);/g;
  const removedCalls = (hotReloadCode.match(requireCallPattern) || []).length;
  hotReloadCode = hotReloadCode.replace(requireCallPattern, '\n// __r(0); // Commented out for hot reload');

  console.log('[Bundle] Commented out', removedCalls, 'standalone __r(0) calls');

  code = hotReloadCode;
  console.log('[Bundle] Hot reload patching complete with wrapper injection');

  // Wrap the bundle with initialization code
  // Use .call(this) to ensure 'this' context is available to the bundle
  // IMPORTANT: Use string concatenation instead of template literals to avoid
  // syntax errors when the bundle contains backticks or ${} expressions
  const wrappedCode =
'// AppTuner Metro Bundle Wrapper\n' +
'// Provides React and ReactNative via \'this\' context\n' +
'\n' +
'(function() {\n' +
'  console.log(\'[Metro Bundle] Starting...\');\n' +
'  console.log(\'[Metro Bundle] this.React exists:\', !!this.React);\n' +
'  console.log(\'[Metro Bundle] this.ReactNative exists:\', !!this.ReactNative);\n' +
'\n' +
'  // Get global object (works in both contexts)\n' +
'  const globalObj = typeof global !== \'undefined\' ? global : (typeof window !== \'undefined\' ? window : this);\n' +
'\n' +
'  // CRITICAL: Define __APPTUNER_GLOBAL to bypass Metro\'s global parameter\n' +
'  // Metro\'s bundle uses (function(global) {...}) which shadows the real global\n' +
'  // We set this on the actual global object so the bundle can access it\n' +
'  if (!globalObj.__APPTUNER_GLOBAL) {\n' +
'    globalObj.__APPTUNER_GLOBAL = globalObj;\n' +
'    console.log(\'[Metro Bundle] Set __APPTUNER_GLOBAL for hot reload\');\n' +
'  }\n' +
'\n' +
'  // CRITICAL: Define cache clearing function that patched __d code calls\n' +
'  globalObj.__APPTUNER_GLOBAL.__c = function(moduleId) {\n' +
'    const metroRequire = globalObj.__r;\n' +
'    if (metroRequire && metroRequire.c) {\n' +
'      console.log(\'[HotReload] __c called to clear module\', moduleId);\n' +
'      metroRequire.c.delete(moduleId);\n' +
'      console.log(\'[HotReload] Module\', moduleId, \'cleared from cache\');\n' +
'    }\n' +
'  };\n' +
'  console.log(\'[Metro Bundle] Cache clearing function __c installed\');\n' +
'\n' +
'  // CRITICAL: Patch NativeEventEmitter IMMEDIATELY, before any modules load\n' +
'  // This must happen before ANY Metro code executes\n' +
'  if (this.ReactNative && this.ReactNative.NativeEventEmitter) {\n' +
'    const OriginalNativeEventEmitter = this.ReactNative.NativeEventEmitter;\n' +
'\n' +
'    const SafeNativeEventEmitter = function(nativeModule) {\n' +
'      console.log(\'[Bundle] NativeEventEmitter constructor called, nativeModule:\', !!nativeModule);\n' +
'      // If nativeModule is null/undefined, return a complete mock EventEmitter\n' +
'      // DO NOT call the original constructor - it has an invariant that will crash\n' +
'      if (!nativeModule) {\n' +
'        console.warn(\'[Bundle] ⚠️ NativeEventEmitter created with null module, returning mock EventEmitter\');\n' +
'        // Return a mock EventEmitter that won\'t crash\n' +
'        this.addListener = function() { console.log(\'[Mock EventEmitter] addListener called\'); return { remove: function() {} }; };\n' +
'        this.removeListener = function() { console.log(\'[Mock EventEmitter] removeListener called\'); };\n' +
'        this.removeAllListeners = function() { console.log(\'[Mock EventEmitter] removeAllListeners called\'); };\n' +
'        this.emit = function() { console.log(\'[Mock EventEmitter] emit called\'); };\n' +
'        return this;\n' +
'      }\n' +
'      // Call original constructor with real native module\n' +
'      return OriginalNativeEventEmitter.call(this, nativeModule);\n' +
'    };\n' +
'\n' +
'    // Copy prototype and static properties\n' +
'    SafeNativeEventEmitter.prototype = OriginalNativeEventEmitter.prototype;\n' +
'    Object.setPrototypeOf(SafeNativeEventEmitter, OriginalNativeEventEmitter);\n' +
'\n' +
'    // Replace in both this.ReactNative and global\n' +
'    this.ReactNative.NativeEventEmitter = SafeNativeEventEmitter;\n' +
'    globalObj.NativeEventEmitter = SafeNativeEventEmitter;\n' +
'    console.log(\'[Bundle] ✅ NativeEventEmitter patched to handle null modules\');\n' +
'  }\n' +
'\n' +
'  // ASSET HANDLING: Set up AssetRegistry before bundle executes\n' +
'\n' +
'  // Track registered assets\n' +
'  const assetMap = new Map();\n' +
'\n' +
'  // Set up enhanced AssetRegistry BEFORE bundle execution\n' +
'  const enhancedRegistry = {\n' +
'    registerAsset: function(asset) {\n' +
'      console.log(\'[Bundle] Registering asset:\', asset.name, \'with URI:\', !!asset.uri);\n' +
'      const assetId = assetMap.size + 1;\n' +
'      assetMap.set(assetId, asset);\n' +
'      return assetId;\n' +
'    },\n' +
'    getAssetByID: function(assetId) {\n' +
'      return assetMap.get(assetId) || null;\n' +
'    }\n' +
'  };\n' +
'  globalObj.AssetRegistry = enhancedRegistry;\n' +
'  console.log(\'[Bundle] AssetRegistry installed\');\n' +
'\n' +
'  // Pre-register assets that were extracted from bundle code\n' +
'  const extractedAssets = ' + JSON.stringify(assetData) + ';\n' +
'  console.log(\'[Bundle] Pre-registering\', extractedAssets.length, \'extracted assets...\');\n' +
'  extractedAssets.forEach(asset => {\n' +
'    const assetId = enhancedRegistry.registerAsset(asset);\n' +
'    console.log(\'[Bundle] Pre-registered:\', asset.name, \'as ID:\', assetId);\n' +
'  });\n' +
'\n' +
'  // Provide resolveAssetSource globally - React Native Image uses this\n' +
'  const resolveAssetSource = function(source) {\n' +
'    console.log(\'[Bundle] resolveAssetSource called with:\', source);\n' +
'\n' +
'    // If source is a number (asset ID), resolve to our registered asset\n' +
'    if (typeof source === \'number\') {\n' +
'      const asset = assetMap.get(source);\n' +
'      if (asset && asset.uri) {\n' +
'        console.log(\'[Bundle] Resolved asset\', source, \'to URI\');\n' +
'        // Return in the format React Native expects\n' +
'        return { uri: asset.uri };\n' +
'      }\n' +
'    }\n' +
'\n' +
'    // Otherwise return as-is\n' +
'    return source;\n' +
'  };\n' +
'\n' +
'  // Set resolveAssetSource globally\n' +
'  globalObj.resolveAssetSource = resolveAssetSource;\n' +
'  this.resolveAssetSource = resolveAssetSource;\n' +
'  console.log(\'[Bundle] resolveAssetSource installed globally\');\n' +
'\n' +
'  // INTERCEPT require() to wrap Image when it\'s imported\n' +
'  console.log(\'[Bundle] Setting up require() interceptor for Image...\');\n' +
'\n' +
'  const React = this.React;\n' +
'  const OriginalImage = this.ReactNative.Image;\n' +
'\n' +
'  // Create wrapped Image component\n' +
'  const WrappedImage = React.forwardRef(function WrappedImage(props, ref) {\n' +
'    console.log(\'[Bundle] Image rendering with source:\', props.source);\n' +
'\n' +
'    let resolvedSource = props.source;\n' +
'\n' +
'    // If source is a number (asset ID), resolve it to URI\n' +
'    if (typeof props.source === \'number\') {\n' +
'      const asset = assetMap.get(props.source);\n' +
'      if (asset && asset.uri) {\n' +
'        console.log(\'[Bundle] ✅ Resolved asset\', props.source, \'to base64 URI\');\n' +
'        resolvedSource = { uri: asset.uri };\n' +
'      } else {\n' +
'        console.warn(\'[Bundle] ⚠️ Asset\', props.source, \'not found or has no URI\');\n' +
'      }\n' +
'    }\n' +
'\n' +
'    return React.createElement(OriginalImage, { ...props, source: resolvedSource, ref });\n' +
'  });\n' +
'\n' +
'  // Create a modified ReactNative object with our wrapped Image\n' +
'  const WrappedReactNative = { ...this.ReactNative, Image: WrappedImage };\n' +
'\n' +
'  // Store original require function (Metro uses __r)\n' +
'  const originalRequire = globalObj.__r;\n' +
'\n' +
'  if (originalRequire) {\n' +
'    console.log(\'[Bundle] Intercepting Metro require (__r)...\');\n' +
'\n' +
'    globalObj.__r = function(moduleId) {\n' +
'      const module = originalRequire(moduleId);\n' +
'\n' +
'      // If this is react-native module, return our wrapped version\n' +
'      // Metro\'s require returns the module\'s exports\n' +
'      if (module && module.Image === OriginalImage) {\n' +
'        console.log(\'[Bundle] 🎯 Intercepted react-native import, returning wrapped Image\');\n' +
'        return WrappedReactNative;\n' +
'      }\n' +
'\n' +
'      return module;\n' +
'    };\n' +
'\n' +
'    // CRITICAL: Forward .c property access to original require\n' +
'    // Metro creates .c cache during bundle execution, so we use a getter\n' +
'    Object.defineProperty(globalObj.__r, \'c\', {\n' +
'      get: function() {\n' +
'        return originalRequire.c;\n' +
'      },\n' +
'      set: function(value) {\n' +
'        originalRequire.c = value;\n' +
'      },\n' +
'      configurable: true,\n' +
'      enumerable: true\n' +
'    });\n' +
'    console.log(\'[Bundle] ✅ Forwarding .c property to original require\');\n' +
'\n' +
'    console.log(\'[Bundle] ✅ Metro require interceptor installed!\');\n' +
'  } else {\n' +
'    console.warn(\'[Bundle] ⚠️ Metro __r not found, falling back to global replacement\');\n' +
'    // Fallback: replace in global objects\n' +
'    this.ReactNative.Image = WrappedImage;\n' +
'    globalObj.ReactNative.Image = WrappedImage;\n' +
'  }\n' +
'\n' +
'  // CRITICAL: Clear module 0 cache BEFORE executing bundle\n' +
'  // This must run before __r(0) is called\n' +
'  // We copied .c to the wrapper, so use globalObj.__r.c\n' +
'  console.log(\'[Bundle] 🔍 Cache clearing check - globalObj.__r:\', !!globalObj.__r);\n' +
'  if (globalObj.__r) {\n' +
'    console.log(\'[Bundle] 🔍 globalObj.__r.c exists:\', !!globalObj.__r.c);\n' +
'    console.log(\'[Bundle] 🔍 globalObj.__r.c type:\', typeof globalObj.__r.c);\n' +
'    if (globalObj.__r.c) {\n' +
'      console.log(\'[Bundle] 🔍 globalObj.__r.c.get exists:\', !!globalObj.__r.c.get);\n' +
'      console.log(\'[Bundle] 🔍 globalObj.__r.c.size:\', globalObj.__r.c.size);\n' +
'    }\n' +
'  }\n' +
'  if (globalObj.__r && globalObj.__r.c && globalObj.__r.c.get) {\n' +
'    const mod0 = globalObj.__r.c.get(0);\n' +
'    if (mod0) {\n' +
'      console.log(\'[Bundle] 🔥 Module 0 cache status - isInitialized:\', mod0.isInitialized);\n' +
'      if (mod0.isInitialized) {\n' +
'        console.log(\'[Bundle] ⚡ Clearing module 0 cache for hot reload!\');\n' +
'        mod0.isInitialized = false;\n' +
'        console.log(\'[Bundle] ✅ Module 0 cache cleared!\');\n' +
'      } else {\n' +
'        console.log(\'[Bundle] Module 0 not initialized yet (first load)\');\n' +
'      }\n' +
'    } else {\n' +
'      console.log(\'[Bundle] Module 0 not in cache yet (first load)\');\n' +
'    }\n' +
'  } else {\n' +
'    console.log(\'[Bundle] ⚠️ Cache clearing SKIPPED - globalObj.__r.c not available\');\n' +
'  }\n' +
'\n' +
'  // Execute the Metro bundle in this context\n' +
'  // (Hot reload wrappers are now INJECTED into the bundle itself)\n' +
code +
'\n' +
'}.call(this));\n';

  // Output to stdout so metro-server can capture it
  console.log('__BUNDLE_START__');
  process.stdout.write(wrappedCode);
  console.log('\n__BUNDLE_END__');
}

bundle().catch(error => {
  console.error('Bundle error:', error);
  process.exit(1);
});
