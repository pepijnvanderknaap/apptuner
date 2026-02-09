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

  // GHOST MODULE DISABLED - Too fragile, breaks even first load
  // Instead, we'll rely on mobile app doing full reload on bundle updates
  console.log('[Bundle] Ghost Module disabled - using app-level reload strategy');

  // Let Metro use a fresh modules Map each time - no persistence
  // This ensures old factory functions don't stick around across hot reloads
  console.log('[Bundle] Using fresh modules Map (no global persistence)');

  // Let __r(0) execute naturally - don't comment it out
  // The bundle will auto-execute and set global.App
  console.log('[Bundle] Allowing bundle to auto-execute entry point');

  code = hotReloadCode;
  console.log('[Bundle] Hot reload patching complete with wrapper injection');

  // Generate bundle ID before wrapper
  const bundleId = Date.now();
  const bundleTime = new Date().toISOString();

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
'  // NUCLEAR SOLUTION: Hijack Metro\'s __d to patch react-native module at definition time\n' +
'  // This fixes the "Shadow Module" problem where Metro caches stale exports\n' +
'  console.log(\'[Bundle] Installing __d hijack to patch react-native at definition...\');\n' +
'\n' +
'  const globalObj = (typeof global !== \'undefined\' ? global : (typeof window !== \'undefined\' ? window : this));\n' +
'  const originalDefine = globalObj.__d;\n' +
'\n' +
'  if (originalDefine) {\n' +
'    let moduleCount = 0;\n' +
'    globalObj.__d = function(factory, moduleId, dependencyMap) {\n' +
'      // Wrap factory to intercept react-native module exports\n' +
'      const wrappedFactory = function(g, require, importDefault, importAll, moduleObject, exports, dependencyMap) {\n' +
'        // Call original factory\n' +
'        factory(g, require, importDefault, importAll, moduleObject, exports, dependencyMap);\n' +
'\n' +
'        // DEBUG: Log EVERY module definition to find react-native\n' +
'        moduleCount++;\n' +
'        const exportKeys = moduleObject.exports ? Object.keys(moduleObject.exports).slice(0, 10) : [];\n' +
'        console.log(\'[Bundle __d] Module #\' + moduleCount + \' (ID:\' + moduleId + \') exports:\', exportKeys.length > 0 ? exportKeys.join(\', \') : \'(empty)\');\n' +
'\n' +
'        // Check if this is the react-native module\n' +
'        if (moduleObject.exports && moduleObject.exports.NativeEventEmitter) {\n' +
'          console.log(\'[Bundle __d] 🎯 FOUND react-native module! Patching NativeEventEmitter...\');\n' +
'          const OriginalNE = moduleObject.exports.NativeEventEmitter;\n' +
'\n' +
'          // Create patched version\n' +
'          const PatchedNE = function(nativeModule) {\n' +
'            if (!nativeModule) {\n' +
'              console.warn(\'[Bundle __d] NativeEventEmitter null arg blocked, using mock\');\n' +
'              return OriginalNE.call(this, { addListener: function(){}, removeListeners: function(){} });\n' +
'            }\n' +
'            return OriginalNE.call(this, nativeModule);\n' +
'          };\n' +
'          PatchedNE.prototype = OriginalNE.prototype;\n' +
'          for (var key in OriginalNE) {\n' +
'            if (OriginalNE.hasOwnProperty(key)) {\n' +
'              PatchedNE[key] = OriginalNE[key];\n' +
'            }\n' +
'          }\n' +
'\n' +
'          // Replace in module exports\n' +
'          moduleObject.exports.NativeEventEmitter = PatchedNE;\n' +
'          console.log(\'[Bundle __d] ✅ NativeEventEmitter patched at source!\');\n' +
'        }\n' +
'\n' +
'        // Also check for modules with Image export (to identify react-native)\n' +
'        if (moduleObject.exports && moduleObject.exports.Image) {\n' +
'          console.log(\'[Bundle __d] 📷 Found module with Image export (module #\' + moduleCount + \')\');\n' +
'        }\n' +
'      };\n' +
'\n' +
'      // Call original __d with wrapped factory\n' +
'      return originalDefine(wrappedFactory, moduleId, dependencyMap);\n' +
'    };\n' +
'    console.log(\'[Bundle] ✅ __d hijack installed!\');\n' +
'  } else {\n' +
'    console.warn(\'[Bundle] ⚠️ __d not found, cannot install hijack\');\n' +
'  }\n' +
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
'  // CRITICAL: Patch NativeEventEmitter IMMEDIATELY - BEFORE any other code\n' +
'  // Save original FIRST\n' +
'  const OriginalNativeEventEmitter = this.ReactNative.NativeEventEmitter;\n' +
'\n' +
'  // Create safe version that returns pure mock for null modules\n' +
'  const SafeNativeEventEmitterConstructor = function(nativeModule) {\n' +
'    if (!nativeModule) {\n' +
'      console.warn(\'[Bundle] NativeEventEmitter created with null module, returning pure mock (NOT calling original)\');\n' +
'      // Return pure mock without calling original constructor (which has invariant check)\n' +
'      this.addListener = function() { return { remove: function() {} }; };\n' +
'      this.removeListener = function() {};\n' +
'      this.removeAllListeners = function() {};\n' +
'      this.emit = function() {};\n' +
'      this.listenerCount = function() { return 0; };\n' +
'      return this;\n' +
'    }\n' +
'    // For real native modules, call original constructor\n' +
'    return OriginalNativeEventEmitter.call(this, nativeModule);\n' +
'  };\n' +
'  SafeNativeEventEmitterConstructor.prototype = OriginalNativeEventEmitter.prototype;\n' +
'  for (var key in OriginalNativeEventEmitter) {\n' +
'    if (OriginalNativeEventEmitter.hasOwnProperty(key)) {\n' +
'      SafeNativeEventEmitterConstructor[key] = OriginalNativeEventEmitter[key];\n' +
'    }\n' +
'  }\n' +
'\n' +
'  // Patch IMMEDIATELY before bundle code loads any modules\n' +
'  this.ReactNative.NativeEventEmitter = SafeNativeEventEmitterConstructor;\n' +
'  if (globalObj && globalObj.ReactNative) {\n' +
'    globalObj.ReactNative.NativeEventEmitter = SafeNativeEventEmitterConstructor;\n' +
'  }\n' +
'  console.log(\'[Bundle] ✅ NativeEventEmitter patched FIRST - before any module loads\');\n' +
'\n' +
'  // SKIP: Image wrapping removed - accessing this.ReactNative.Image triggers\n' +
'  // NativeEventEmitter crash before patch can help. Will revisit later.\n' +
'  console.log(\'[Bundle] ⚠️ Skipping Image wrapping to avoid NativeEventEmitter crash\');\n' +
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
'\n' +
'  // Set bundle tracking globals (using globalObj which is properly detected)\n' +
'  globalObj.BUNDLE_ID = ' + bundleId + ';\n' +
'  globalObj.BUNDLE_TIME = "' + bundleTime + '";\n' +
'  console.log("[BUNDLE_EXECUTED] ID: ' + bundleId + ', COUNT: 22222");\n' +
'  console.log("[BUNDLE_METADATA] BUNDLE_ID set to:", globalObj.BUNDLE_ID);\n' +
'}.call(this));\n';

  const finalCode = wrappedCode;

  // Output to stdout so metro-server can capture it
  console.log('__BUNDLE_START__');
  process.stdout.write(finalCode);
  console.log('\n__BUNDLE_END__');
}

bundle().catch(error => {
  console.error('Bundle error:', error);
  process.exit(1);
});
