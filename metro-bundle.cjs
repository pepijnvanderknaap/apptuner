#!/usr/bin/env node

// AppTuner Metro Bundle Script
// Bundles a React Native project using Metro bundler.
//
// Usage: node metro-bundle.js /path/to/react-native-project [entryPoint]
//
// This script is part of the AppTuner installation and is called by metro-server.cjs.
// It uses Metro from AppTuner's own node_modules, but loads metro.config.js from
// the target project directory so the user's configuration is respected.

const Metro = require('metro');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Project root is passed as first argument; falls back to cwd
const projectRoot = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

// Detect the entry file: prefer index.js/ts/tsx (standard RN convention).
// The entryPoint arg from the CLI may be 'App.tsx' but Metro should be pointed at
// index.js which registers the component and sets global.App.
function detectEntryFile() {
  const candidates = ['index.js', 'index.ts', 'index.tsx', process.argv[3]].filter(Boolean);
  for (const name of candidates) {
    const full = path.join(projectRoot, name);
    if (fs.existsSync(full)) return name;
  }
  return process.argv[3] || 'index.js';
}
const entryFileName = detectEntryFile();

async function bundle() {
  const entryFile = path.join(projectRoot, entryFileName);

  console.log('📦 Bundling from project directory...');
  console.log('📁 Project root:', projectRoot);
  console.log('📄 Entry file:', entryFile);

  // Clear Metro cache to ensure fresh bundles
  const metroCacheDir = path.join(projectRoot, '.metro');
  try {
    if (fs.existsSync(metroCacheDir)) {
      console.log('🗑️  Clearing Metro cache directory:', metroCacheDir);
      fs.rmSync(metroCacheDir, { recursive: true, force: true });
    }
    try {
      execSync(`rm -rf /tmp/metro-*`, { stdio: 'ignore' });
      console.log('🗑️  Cleared Metro temp cache');
    } catch (e) {
      // Ignore rm errors
    }
  } catch (e) {
    console.warn('⚠️  Failed to clear Metro cache:', e.message);
  }

  // Load config from the target project directory
  // This respects the project's own metro.config.js if it exists
  const config = await Metro.loadConfig({
    cwd: projectRoot,
    resetCache: true,
  });

  // Bundle the project
  let code;
  let assetData = [];

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
        const assetStr = match[1];
        const nameMatch = assetStr.match(/"name":\s*"([^"]+)"/);
        const uriMatch = assetStr.match(/"uri":\s*"data:([^"]+)"/);
        const typeMatch = assetStr.match(/"type":\s*"([^"]+)"/);

        if (nameMatch && uriMatch) {
          assetData.push({
            name: nameMatch[1],
            uri: 'data:' + uriMatch[1],
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
      process.stderr.write(JSON.stringify(errorInfo) + '\n');
    }
    process.exit(1);
  }

  // CRITICAL FIX: Patch NativeEventEmitter constructor to handle null modules
  console.log('[Bundle] Patching NativeEventEmitter invariant checks...');
  console.log('[Bundle] Original bundle size:', code.length, 'bytes');

  const originalCode = code;

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

  // HOT RELOAD FIX: Patch Metro's __d to allow hot reload with cache invalidation
  console.log('[Bundle] Patching Metro __d to allow hot reload with cache invalidation...');

  let hotReloadCode = code;

  // Pattern 1: Newer Metro with modules.has()
  const newMetroPattern = /if\s*\(\s*modules\.has\(moduleId\)\s*\)\s*\{[\s\S]{1,300}?return;\s*\}/g;
  const matches1 = (hotReloadCode.match(newMetroPattern) || []).length;
  hotReloadCode = hotReloadCode.replace(
    newMetroPattern,
    `if (modules.has(moduleId)) {
      // HOT RELOAD: Track redefinition and reset initialized flag
      const existingMod = modules.get(moduleId);
      if (existingMod) {
        const _realGlobal = (typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this)));
        const _g = _realGlobal && _realGlobal.__APPTUNER_GLOBAL ? _realGlobal.__APPTUNER_GLOBAL : _realGlobal;
        if (_g && _g.__dirtyModules) {
          _g.__dirtyModules.add(moduleId);
        }
        existingMod.isInitialized = false;
        if (_g && typeof _g.__c === 'function') {
          try {
            _g.__c(moduleId);
          } catch (e) {
            console.warn('[HotReload] Cache clear failed:', e);
          }
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
      modules[moduleId].isInitialized = false;
      // Continue with redefinition instead of returning
    }`
  );
  console.log('[Bundle] Old Metro pattern (!=) replaced:', matches2, 'occurrences');

  code = hotReloadCode;

  // Generate bundle ID before wrapper
  const bundleId = Date.now();
  const bundleTime = new Date().toISOString();

  // Wrap the bundle with initialization code
  const wrappedCode =
'// AppTuner Metro Bundle Wrapper\n' +
'(function() {\n' +
'  console.log(\'[Metro Bundle] Starting...\');\n' +
'\n' +
'  const globalObj = (typeof global !== \'undefined\' ? global : (typeof window !== \'undefined\' ? window : this));\n' +
'  const originalDefine = globalObj.__d;\n' +
'\n' +
'  // Install __d hijack to patch react-native module at definition time\n' +
'  if (originalDefine) {\n' +
'    globalObj.__d = function(factory, moduleId, dependencyMap) {\n' +
'      const wrappedFactory = function(g, require, importDefault, importAll, moduleObject, exports, dependencyMap) {\n' +
'        factory(g, require, importDefault, importAll, moduleObject, exports, dependencyMap);\n' +
'        if (moduleObject.exports && moduleObject.exports.NativeEventEmitter) {\n' +
'          const OriginalNE = moduleObject.exports.NativeEventEmitter;\n' +
'          const PatchedNE = function(nativeModule) {\n' +
'            if (!nativeModule) {\n' +
'              console.warn(\'[Bundle __d] NativeEventEmitter null arg blocked, using mock\');\n' +
'              return OriginalNE.call(this, { addListener: function(){}, removeListeners: function(){} });\n' +
'            }\n' +
'            return OriginalNE.call(this, nativeModule);\n' +
'          };\n' +
'          PatchedNE.prototype = OriginalNE.prototype;\n' +
'          for (var key in OriginalNE) {\n' +
'            if (OriginalNE.hasOwnProperty(key)) { PatchedNE[key] = OriginalNE[key]; }\n' +
'          }\n' +
'          moduleObject.exports.NativeEventEmitter = PatchedNE;\n' +
'        }\n' +
'      };\n' +
'      return originalDefine(wrappedFactory, moduleId, dependencyMap);\n' +
'    };\n' +
'  }\n' +
'\n' +
'  // Set __APPTUNER_GLOBAL for hot reload module tracking\n' +
'  if (!globalObj.__APPTUNER_GLOBAL) {\n' +
'    globalObj.__APPTUNER_GLOBAL = globalObj;\n' +
'  }\n' +
'\n' +
'  // Cache clearing function used by patched __d\n' +
'  globalObj.__APPTUNER_GLOBAL.__c = function(moduleId) {\n' +
'    const metroRequire = globalObj.__r;\n' +
'    if (metroRequire && metroRequire.c) {\n' +
'      metroRequire.c.delete(moduleId);\n' +
'    }\n' +
'  };\n' +
'\n' +
'  // Patch NativeEventEmitter before any modules load\n' +
'  if (this.ReactNative && this.ReactNative.NativeEventEmitter) {\n' +
'    const OrigNE = this.ReactNative.NativeEventEmitter;\n' +
'    const SafeNE = function(nativeModule) {\n' +
'      if (!nativeModule) {\n' +
'        console.warn(\'[Bundle] NativeEventEmitter created with null module, returning mock\');\n' +
'        this.addListener = function() { return { remove: function() {} }; };\n' +
'        this.removeListener = function() {};\n' +
'        this.removeAllListeners = function() {};\n' +
'        this.emit = function() {};\n' +
'        this.listenerCount = function() { return 0; };\n' +
'        return this;\n' +
'      }\n' +
'      return OrigNE.call(this, nativeModule);\n' +
'    };\n' +
'    SafeNE.prototype = OrigNE.prototype;\n' +
'    Object.setPrototypeOf(SafeNE, OrigNE);\n' +
'    this.ReactNative.NativeEventEmitter = SafeNE;\n' +
'    if (globalObj && globalObj.ReactNative) { globalObj.ReactNative.NativeEventEmitter = SafeNE; }\n' +
'  }\n' +
'\n' +
'  // Set up AssetRegistry before bundle executes\n' +
'  const assetMap = new Map();\n' +
'  const enhancedRegistry = {\n' +
'    registerAsset: function(asset) {\n' +
'      const assetId = assetMap.size + 1;\n' +
'      assetMap.set(assetId, asset);\n' +
'      return assetId;\n' +
'    },\n' +
'    getAssetByID: function(assetId) { return assetMap.get(assetId) || null; }\n' +
'  };\n' +
'  globalObj.AssetRegistry = enhancedRegistry;\n' +
'\n' +
'  const extractedAssets = ' + JSON.stringify(assetData) + ';\n' +
'  extractedAssets.forEach(asset => enhancedRegistry.registerAsset(asset));\n' +
'\n' +
'  const resolveAssetSource = function(source) {\n' +
'    if (typeof source === \'number\') {\n' +
'      const asset = assetMap.get(source);\n' +
'      if (asset && asset.uri) { return { uri: asset.uri }; }\n' +
'    }\n' +
'    return source;\n' +
'  };\n' +
'  globalObj.resolveAssetSource = resolveAssetSource;\n' +
'  this.resolveAssetSource = resolveAssetSource;\n' +
'\n' +
'  // Clear module 0 cache for hot reload if this is a re-bundle\n' +
'  if (globalObj.__r && globalObj.__r.c && globalObj.__r.c.get) {\n' +
'    const mod0 = globalObj.__r.c.get(0);\n' +
'    if (mod0 && mod0.isInitialized) {\n' +
'      mod0.isInitialized = false;\n' +
'    }\n' +
'  }\n' +
'\n' +
'  // Execute the Metro bundle\n' +
code +
'\n' +
'\n' +
'  globalObj.BUNDLE_ID = ' + bundleId + ';\n' +
'  globalObj.BUNDLE_TIME = "' + bundleTime + '";\n' +
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
