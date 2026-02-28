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

// Detect if this is an Expo project (has expo in dependencies)
let isExpoProject = false;
try {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  isExpoProject = !!(pkgJson.dependencies?.expo || pkgJson.devDependencies?.expo);
} catch (e) {}

if (isExpoProject) {
  console.log('📱 Expo project detected — using Expo Metro configuration');
} else {
  console.log('📱 Bare React Native project detected');
}

// Read .env file from project root so EXPO_PUBLIC_* and other env vars are available at runtime
let dotEnvVars = {};
try {
  const dotEnvPath = path.join(projectRoot, '.env');
  if (fs.existsSync(dotEnvPath)) {
    fs.readFileSync(dotEnvPath, 'utf-8').split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) return;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key) dotEnvVars[key] = val;
    });
    console.log('📋 Loaded', Object.keys(dotEnvVars).length, 'env vars from .env file');
  }
} catch (e) {
  console.warn('⚠️  Failed to read .env file:', e.message);
}

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

  // For Expo projects without metro.config.js, generate a minimal Expo config
  let tempConfigPath = null;
  const metroConfigPath = path.join(projectRoot, 'metro.config.js');
  if (isExpoProject && !fs.existsSync(metroConfigPath)) {
    console.log('📦 No metro.config.js found — generating Expo Metro config...');
    tempConfigPath = path.join(projectRoot, '.apptuner-metro.config.tmp.js');
    try {
      fs.writeFileSync(tempConfigPath, [
        "const { getDefaultConfig } = require('expo/metro-config');",
        'const config = getDefaultConfig(__dirname);',
        'module.exports = config;',
      ].join('\n'));
    } catch (e) {
      console.warn('⚠️  Could not write temp Expo metro config:', e.message);
      tempConfigPath = null;
    }
  }

  // Load config from the target project directory
  // This respects the project's own metro.config.js if it exists
  let config;
  try {
    config = await Metro.loadConfig({
      cwd: projectRoot,
      config: tempConfigPath || undefined,
      resetCache: true,
    });
  } finally {
    if (tempConfigPath) {
      try { fs.unlinkSync(tempConfigPath); } catch {}
    }
  }

  // CRITICAL: AppTuner's Metro runtime lives outside the project root, so Metro
  // can't compute SHA-1 hashes for its own polyfill files. Add AppTuner's
  // node_modules to watchFolders so Metro can watch and hash those files.
  const appTunerNodeModules = path.join(__dirname, 'node_modules');
  const existingWatchFolders = config.watchFolders || [];
  if (!existingWatchFolders.includes(appTunerNodeModules)) {
    console.log('📁 Adding AppTuner node_modules to Metro watchFolders:', appTunerNodeModules);
    config = {
      ...config,
      watchFolders: [...existingWatchFolders, appTunerNodeModules],
    };
  }

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

  // Hot reload is handled in executor.ts by clearing __r.c before calling __r(0).
  // Regex-based patches on the bundle source are unreliable (can't match balanced
  // braces with regex) and caused SyntaxErrors in RN 0.81 bundles.
  console.log('[Bundle] Skipping hot-reload source patch (handled by executor cache-clear).');

  // Generate bundle ID before wrapper
  const bundleId = Date.now();
  const bundleTime = new Date().toISOString();

  // Wrap the bundle with initialization code
  const wrappedCode =
'// AppTuner Metro Bundle Wrapper\n' +
'(function(global) {\n' +
'  console.log(\'[Metro Bundle] Starting...\');\n' +
'\n' +
'  // global is passed as a parameter so it is always in scope for the bundle code,\n' +
'  // even when Expo SDK 54+ modules use \'global\' in strict mode (Hermes RN 0.73+)\n' +
'  const globalObj = global;\n' +
'\n' +
'  // Clear previous App capture so each new bundle execution can set fresh\n' +
'  globalObj.App = null;\n' +
'\n' +
'  // REACT INSTANCE FIX: Capture host React + synthesize jsx-runtime so every module\n' +
'  // factory in the eval\'d bundle uses the SAME React instance as AppTuner Mobile.\n' +
'  // Without this, bundled React and host React are separate objects — hooks fail because\n' +
'  // the current dispatcher (set by host React) is on a different ReactSharedInternals.\n' +
'  (function() {\n' +
'    var _hR = globalObj.React;\n' +
'    if (!_hR || typeof _hR.createElement !== \'function\') return;\n' +
'    globalObj.__HOST_REACT__ = _hR;\n' +
'    console.log(\'[AppTuner] Host React captured — bundled modules will use host React instance\');\n' +
'    // Pre-create shared context for react-native-safe-area-context JS stub\n' +
'    var _saInsets = { top: 44, bottom: 34, left: 0, right: 0 };\n' +
'    globalObj.__APPTUNER_SA_INSETS__ = _saInsets;\n' +
'    globalObj.__APPTUNER_SA_FRAME__ = { x: 0, y: 0, width: 390, height: 844 };\n' +
'    // createContext with the SAME React that will render components (host React)\n' +
'    // so useSafeAreaInsets() can call useContext() from within host-React-rendered trees.\n' +
'    if (typeof _hR.createContext === \'function\') {\n' +
'      globalObj.__APPTUNER_SA_CTX__ = _hR.createContext(_saInsets);\n' +
'    }\n' +
'  })();\n' +
'\n' +
'  // Inject .env vars into process.env so EXPO_PUBLIC_* and other env vars are available\n' +
'  (function() {\n' +
'    var _envVars = ' + JSON.stringify(dotEnvVars) + ';\n' +
'    if (!globalObj.process) globalObj.process = {};\n' +
'    if (!globalObj.process.env) globalObj.process.env = {};\n' +
'    Object.keys(_envVars).forEach(function(k) {\n' +
'      if (globalObj.process.env[k] === undefined || globalObj.process.env[k] === \'\') {\n' +
'        globalObj.process.env[k] = _envVars[k];\n' +
'      }\n' +
'    });\n' +
'    console.log(\'[AppTuner] Injected \' + Object.keys(_envVars).length + \' env vars from .env file\');\n' +
'  })();\n' +
'\n' +
'  // In-memory AsyncStorage stub — bridges async-storage v2 (callback API, "RNCAsyncStorage")\n' +
'  // to an in-memory store. AppTuner Mobile has v3 (promise API, "RNAsyncStorage") so\n' +
'  // bundled apps using v2 JS find no native module and their getItem callbacks never fire.\n' +
'  if (!globalObj.__APPTUNER_ASYNC_STORE__) { globalObj.__APPTUNER_ASYNC_STORE__ = {}; }\n' +
'  globalObj.__APPTUNER_ASYNC_STUB__ = (function() {\n' +
'    return {\n' +
'      multiGet: function(keys, callback) {\n' +
'        var _s = globalObj.__APPTUNER_ASYNC_STORE__;\n' +
'        var result = keys.map(function(k) { return [k, _s[k] != null ? _s[k] : null]; });\n' +
'        setTimeout(function() { callback(null, result); }, 0);\n' +
'      },\n' +
'      multiSet: function(kvPairs, callback) {\n' +
'        var _s = globalObj.__APPTUNER_ASYNC_STORE__;\n' +
'        kvPairs.forEach(function(kv) { _s[kv[0]] = kv[1]; });\n' +
'        setTimeout(function() { callback(null); }, 0);\n' +
'      },\n' +
'      multiRemove: function(keys, callback) {\n' +
'        var _s = globalObj.__APPTUNER_ASYNC_STORE__;\n' +
'        keys.forEach(function(k) { delete _s[k]; });\n' +
'        setTimeout(function() { callback(null); }, 0);\n' +
'      },\n' +
'      getAllKeys: function(callback) {\n' +
'        var _s = globalObj.__APPTUNER_ASYNC_STORE__;\n' +
'        setTimeout(function() { callback(null, Object.keys(_s)); }, 0);\n' +
'      },\n' +
'      clear: function(callback) {\n' +
'        globalObj.__APPTUNER_ASYNC_STORE__ = {};\n' +
'        setTimeout(function() { callback(null); }, 0);\n' +
'      },\n' +
'      multiMerge: function(kvPairs, callback) {\n' +
'        var _s = globalObj.__APPTUNER_ASYNC_STORE__;\n' +
'        kvPairs.forEach(function(kv) {\n' +
'          try {\n' +
'            var ex = _s[kv[0]] ? JSON.parse(_s[kv[0]]) : {};\n' +
'            Object.assign(ex, JSON.parse(kv[1]));\n' +
'            _s[kv[0]] = JSON.stringify(ex);\n' +
'          } catch(e) { _s[kv[0]] = kv[1]; }\n' +
'        });\n' +
'        setTimeout(function() { callback(null); }, 0);\n' +
'      },\n' +
'    };\n' +
'  })();\n' +
'  console.log(\'[AppTuner] AsyncStorage in-memory stub ready\');\n' +
'\n' +
'  // Install __d hijack using Object.defineProperty getter/setter so our interceptor\n' +
'  // survives Metro\'s polyfill doing global.__d = realDefine (which would overwrite a direct assignment).\n' +
'  (function() {\n' +
'    function makeWrappedDefine(realDefine) {\n' +
'      return function(factory, moduleId, dependencyMap) {\n' +
'        var wrappedFactory = function(g, require, importDefault, importAll, moduleObject, exports, dependencyMap) {\n' +
'          // Redirect React requires to host instance (fixes duplicate React hook errors)\n' +
'          // jsx-runtime is NOT redirected — it creates elements fine; hooks need only React to match.\n' +
'          var _r = function(id) {\n' +
'            var m = require(id);\n' +
'            var hR = globalObj.__HOST_REACT__;\n' +
'            if (hR && m && m !== hR && typeof m.createElement === \'function\' && typeof m.useState === \'function\') return hR;\n' +
'            return m;\n' +
'          };\n' +
'          var _id = function(id) { var m = _r(id); return m && m.__esModule ? m : { default: m }; };\n' +
'          var _ia = function(id) {\n' +
'            var m = importAll(id);\n' +
'            var hR = globalObj.__HOST_REACT__;\n' +
'            if (hR && m && m !== hR && typeof m.createElement === \'function\' && typeof m.useState === \'function\') return hR;\n' +
'            return m;\n' +
'          };\n' +
'          // Wrap factory to suppress polyfill conflicts:\n' +
'          // AppTuner Mobile already set some global properties as configurable:false.\n' +
'          // If bundled polyfills try to redefine them, that throws — but the property\n' +
'          // already has the correct value so it\'s safe to ignore.\n' +
'          try {\n' +
'            factory(g, _r, _id, _ia, moduleObject, exports, dependencyMap);\n' +
'          } catch(_fe) {\n' +
'            var _fm = _fe && (_fe.message || String(_fe));\n' +
'            if (_fm && (_fm.indexOf(\'not configurable\') !== -1 || _fm.indexOf(\'Cannot redefine\') !== -1)) {\n' +
'              console.warn(\'[AppTuner] ⚠️ Polyfill conflict (non-fatal):\', _fm);\n' +
'            } else {\n' +
'              throw _fe;\n' +
'            }\n' +
'          }\n' +
'          if (moduleObject.exports && moduleObject.exports.NativeEventEmitter) {\n' +
'            var OriginalNE = moduleObject.exports.NativeEventEmitter;\n' +
'            var PatchedNE = function(nativeModule) {\n' +
'              if (!nativeModule) {\n' +
'                console.warn(\'[Bundle __d] NativeEventEmitter null arg blocked, using mock\');\n' +
'                return OriginalNE.call(this, { addListener: function(){}, removeListeners: function(){} });\n' +
'              }\n' +
'              return OriginalNE.call(this, nativeModule);\n' +
'            };\n' +
'            PatchedNE.prototype = OriginalNE.prototype;\n' +
'            for (var key in OriginalNE) {\n' +
'              if (OriginalNE.hasOwnProperty(key)) { PatchedNE[key] = OriginalNE[key]; }\n' +
'            }\n' +
'            moduleObject.exports.NativeEventEmitter = PatchedNE;\n' +
'          }\n' +
'          // AppTuner: intercept AppRegistry.registerComponent so standard RN and Expo apps\n' +
'          // automatically expose their root component as global.App (without a custom index.js)\n' +
'          if (moduleObject.exports && moduleObject.exports.AppRegistry &&\n' +
'              typeof moduleObject.exports.AppRegistry.registerComponent === "function") {\n' +
'            var _regFn = moduleObject.exports.AppRegistry.registerComponent;\n' +
'            moduleObject.exports.AppRegistry.registerComponent = function(appKey, componentProvider) {\n' +
'              try {\n' +
'                var C = typeof componentProvider === "function" ? componentProvider() : componentProvider;\n' +
'                // Unwrap ES module default export: {default: Component} → Component\n' +
'                if (C && typeof C === "object" && typeof C.default === "function") { C = C.default; }\n' +
'                // Skip known RN-internal system components; capture everything else.\n' +
'                // Always overwrite so the LAST registration (the real app) wins.\n' +
'                var _skip = ["LogBox","HMRClient","DevSettings","ReactDevTools"];\n' +
'                if (C && _skip.indexOf(appKey) === -1) {\n' +
'                  globalObj.App = C;\n' +
'                  console.log("[AppTuner] App captured via AppRegistry:", appKey, "type:", typeof C);\n' +
'                }\n' +
'              } catch(e) {\n' +
'                console.warn("[AppTuner] AppRegistry capture error:", e && e.message);\n' +
'              }\n' +
'              return _regFn.call(this, appKey, componentProvider);\n' +
'            };\n' +
'          }\n' +
'          // Also catch direct AppRegistry module imports\n' +
'          if (moduleObject.exports && typeof moduleObject.exports.registerComponent === "function" &&\n' +
'              typeof moduleObject.exports.registerRunnable === "function") {\n' +
'            var _regFn2 = moduleObject.exports.registerComponent;\n' +
'            moduleObject.exports.registerComponent = function(appKey, componentProvider) {\n' +
'              try {\n' +
'                var C = typeof componentProvider === "function" ? componentProvider() : componentProvider;\n' +
'                // Unwrap ES module default export: {default: Component} → Component\n' +
'                if (C && typeof C === "object" && typeof C.default === "function") { C = C.default; }\n' +
'                // Skip known RN-internal system components; always overwrite so real app wins.\n' +
'                var _skip2 = ["LogBox","HMRClient","DevSettings","ReactDevTools"];\n' +
'                if (C && _skip2.indexOf(appKey) === -1) {\n' +
'                  globalObj.App = C;\n' +
'                  console.log("[AppTuner] App captured via AppRegistry (direct):", appKey, "type:", typeof C);\n' +
'                }\n' +
'              } catch(e) {\n' +
'                console.warn("[AppTuner] AppRegistry direct capture error:", e && e.message);\n' +
'              }\n' +
'              return _regFn2.call(this, appKey, componentProvider);\n' +
'            };\n' +
'          }\n' +
'          // Expo compatibility: inject EXNativeModulesProxy and other stubs when NativeModules is exported\n' +
'          // Wrapped in try-catch: NativeModules is a read-only JSI HostObject in RN 0.76+ New Architecture\n' +
'          try {\n' +
'          if (moduleObject.exports && moduleObject.exports.NativeModules &&\n' +
'              typeof moduleObject.exports.NativeModules === \'object\' &&\n' +
'              moduleObject.exports.NativeModules !== null) {\n' +
'            var _nm = moduleObject.exports.NativeModules;\n' +
'            if (!_nm.EXNativeModulesProxy) {\n' +
'              _nm.EXNativeModulesProxy = {\n' +
'                callMethod: function() { return Promise.resolve(null); },\n' +
'                viewManagersNames: [], modulesConstants: {}, exportedMethods: {},\n' +
'                addListener: function() {}, removeListeners: function() {},\n' +
'                startObserving: function() {}, stopObserving: function() {},\n' +
'              };\n' +
'              console.log(\'[AppTuner] ✅ EXNativeModulesProxy stub injected into NativeModules\');\n' +
'            }\n' +
'            if (!_nm.ExpoFont) {\n' +
'              _nm.ExpoFont = { loadAsync: function() { return Promise.resolve(); } };\n' +
'            }\n' +
'            if (!_nm.ExpoConstants) {\n' +
'              _nm.ExpoConstants = {\n' +
'                appOwnership: null, executionEnvironment: \'storeClient\',\n' +
'                nativeAppVersion: \'1.0.0\', nativeBuildVersion: \'1\',\n' +
'                platform: { ios: { userInterfaceIdiom: \'phone\', buildNumber: \'1\', bundleIdentifier: \'com.apptuner.mobile\' } },\n' +
'                sessionId: \'apptuner\', statusBarHeight: 44, isDetached: false, manifest: null, manifest2: null,\n' +
'              };\n' +
'            }\n' +
'            if (!_nm.ExpoApplication) {\n' +
'              _nm.ExpoApplication = {\n' +
'                applicationName: \'AppTuner\', applicationId: \'com.apptuner.mobile\',\n' +
'                nativeApplicationVersion: \'1.0.0\', nativeBuildVersion: \'1\',\n' +
'              };\n' +
'            }\n' +
'            if (!_nm.ExpoLinearGradient) {\n' +
'              _nm.ExpoLinearGradient = {};\n' +
'            }\n' +
'            if (!_nm.RNCSafeAreaProvider) {\n' +
'              _nm.RNCSafeAreaProvider = {\n' +
'                getConstants: function() { return { initialWindowMetrics: { insets: { top: 44, bottom: 34, left: 0, right: 0 }, frame: { x: 0, y: 0, width: 390, height: 844 } } }; },\n' +
'                addListener: function() {}, removeListeners: function() {},\n' +
'              };\n' +
'            }\n' +
'            if (!_nm.RNGestureHandlerModule) {\n' +
'              _nm.RNGestureHandlerModule = {\n' +
'                attachGestureHandler: function() {}, createGestureHandler: function() {},\n' +
'                dropGestureHandler: function() {}, updateGestureHandler: function() {},\n' +
'                flushOperations: function() {}, install: function() { return false; },\n' +
'                addListener: function() {}, removeListeners: function() {},\n' +
'              };\n' +
'            }\n' +
'          }\n' +
'          } catch(_nmErr) { /* NativeModules is a read-only HostObject in RN 0.76+ New Arch — stubs handled via nativeModuleProxy/__turboModuleProxy instead */ }\n' +
'\n' +
'          // Patch TurboModuleRegistry.getEnforcing/get to stub missing native modules\n' +
'          // Heuristic: TurboModuleRegistry exports getEnforcing + get but no addListener\n' +
'          if (moduleObject.exports &&\n' +
'              typeof moduleObject.exports.getEnforcing === \'function\' &&\n' +
'              typeof moduleObject.exports.get === \'function\' &&\n' +
'              !moduleObject.exports.addListener) {\n' +
'            (function(_trm) {\n' +
'              var _origGE = _trm.getEnforcing;\n' +
'              var _origG = _trm.get;\n' +
'              var _stub = function(n) {\n' +
'                return new Proxy({}, {\n' +
'                  get: function(t, p) {\n' +
'                    if (p === \'then\' || p === \'__esModule\') return undefined;\n' +
'                    return function() { return null; };\n' +
'                  }\n' +
'                });\n' +
'              };\n' +
'              _trm.getEnforcing = function(n) {\n' +
'                if (n === \'RNCAsyncStorage\' || n === \'AsyncStorage\') {\n' +
'                  console.log(\'[AppTuner] TRM: \' + n + \' → AsyncStorage in-memory stub\');\n' +
'                  return globalObj.__APPTUNER_ASYNC_STUB__;\n' +
'                }\n' +
'                try { return _origGE.call(_trm, n); } catch(e) {\n' +
'                  console.warn(\'[AppTuner] Missing native module "\' + n + \'" — using stub\');\n' +
'                  return _stub(n);\n' +
'                }\n' +
'              };\n' +
'              _trm.get = function(n) {\n' +
'                if (n === \'RNCAsyncStorage\' || n === \'AsyncStorage\') {\n' +
'                  return globalObj.__APPTUNER_ASYNC_STUB__;\n' +
'                }\n' +
'                var r = _origG.call(_trm, n);\n' +
'                return r != null ? r : _stub(n);\n' +
'              };\n' +
'              console.log(\'[AppTuner] TurboModuleRegistry patched in __d wrapper\');\n' +
'            })(moduleObject.exports);\n' +
'          }\n' +
'\n' +
'          // JS stub: @react-native-async-storage/async-storage\n' +
'          // Detects by exported shape (getItem+setItem+multiGet+flushGetRequests) and replaces\n' +
'          // with pure-JS in-memory implementation — bypasses native module entirely.\n' +
'          // AppTuner Mobile has v3 ("RNAsyncStorage", promise API) but bundled apps may use\n' +
'          // v2 ("RNCAsyncStorage", callback API) — native module not found → hangs forever.\n' +
'          (function() {\n' +
'            var ex = moduleObject.exports;\n' +
'            var AS = ex && (ex.__esModule ? (ex.default || ex) : ex);\n' +
'            if (!AS || typeof AS.getItem !== \'function\' || typeof AS.setItem !== \'function\' ||\n' +
'                typeof AS.multiGet !== \'function\' || typeof AS.flushGetRequests !== \'function\') return;\n' +
'            if (AS.__apptunerStub) return;\n' +
'            var _s = globalObj.__APPTUNER_ASYNC_STORE__ || (globalObj.__APPTUNER_ASYNC_STORE__ = {});\n' +
'            function wrapCb(p, cb) {\n' +
'              if (cb) p.then(function(r) { cb(null, r); }).catch(function(e) { cb(e); });\n' +
'              return p;\n' +
'            }\n' +
'            var stub = {\n' +
'              __apptunerStub: true,\n' +
'              getItem: function(key, cb) { return wrapCb(Promise.resolve(_s[key] != null ? _s[key] : null), cb); },\n' +
'              setItem: function(key, val, cb) { _s[key] = val; return wrapCb(Promise.resolve(), cb); },\n' +
'              removeItem: function(key, cb) { delete _s[key]; return wrapCb(Promise.resolve(), cb); },\n' +
'              mergeItem: function(key, val, cb) {\n' +
'                try{var e=_s[key]?JSON.parse(_s[key]):{};Object.assign(e,JSON.parse(val));_s[key]=JSON.stringify(e);}catch(e2){_s[key]=val;}\n' +
'                return wrapCb(Promise.resolve(), cb);\n' +
'              },\n' +
'              getAllKeys: function(cb) { return wrapCb(Promise.resolve(Object.keys(_s)), cb); },\n' +
'              clear: function(cb) { globalObj.__APPTUNER_ASYNC_STORE__={}; _s=globalObj.__APPTUNER_ASYNC_STORE__; return wrapCb(Promise.resolve(), cb); },\n' +
'              flushGetRequests: function() {},\n' +
'              multiGet: function(keys, cb) { return wrapCb(Promise.resolve(keys.map(function(k){return[k,_s[k]!=null?_s[k]:null];})), cb); },\n' +
'              multiSet: function(pairs, cb) { pairs.forEach(function(kv){_s[kv[0]]=kv[1];}); return wrapCb(Promise.resolve(), cb); },\n' +
'              multiRemove: function(keys, cb) { keys.forEach(function(k){delete _s[k];}); return wrapCb(Promise.resolve(), cb); },\n' +
'              multiMerge: function(pairs, cb) {\n' +
'                pairs.forEach(function(kv){try{var e=_s[kv[0]]?JSON.parse(_s[kv[0]]):{};Object.assign(e,JSON.parse(kv[1]));_s[kv[0]]=JSON.stringify(e);}catch(e2){_s[kv[0]]=kv[1];}});\n' +
'                return wrapCb(Promise.resolve(), cb);\n' +
'              },\n' +
'            };\n' +
'            moduleObject.exports = ex.__esModule ? Object.assign({}, ex, { default: stub }) : stub;\n' +
'            console.log(\'[AppTuner] @react-native-async-storage/async-storage → JS stub\');\n' +
'          })();\n' +
'\n' +
'          // JS stub: react-native-safe-area-context\n' +
'          // Replaces native view (RNCSafeAreaProvider) with a pure-JS context-based implementation.\n' +
'          (function() {\n' +
'            var ex = moduleObject.exports;\n' +
'            if (!ex || !ex.SafeAreaProvider || typeof ex.useSafeAreaInsets !== \'function\') return;\n' +
'            var _hR = globalObj.__HOST_REACT__;\n' +
'            var _ctx = globalObj.__APPTUNER_SA_CTX__;\n' +
'            var _ins = globalObj.__APPTUNER_SA_INSETS__ || { top: 44, bottom: 34, left: 0, right: 0 };\n' +
'            var _frm = globalObj.__APPTUNER_SA_FRAME__ || { x: 0, y: 0, width: 390, height: 844 };\n' +
'            if (!_hR || !_ctx) return;\n' +
'            var _RNView = globalObj.ReactNative && globalObj.ReactNative.View;\n' +
'            moduleObject.exports = {\n' +
'              SafeAreaProvider: function SafeAreaProvider(props) {\n' +
'                return _hR.createElement(_ctx.Provider, { value: _ins }, props.children);\n' +
'              },\n' +
'              SafeAreaView: function SafeAreaView(props) {\n' +
'                if (!_RNView) return props.children || null;\n' +
'                return _hR.createElement(_RNView, Object.assign({}, props, {\n' +
'                  style: [{ paddingTop: _ins.top, paddingBottom: _ins.bottom }, props.style]\n' +
'                }));\n' +
'              },\n' +
'              SafeAreaConsumer: _ctx.Consumer,\n' +
'              SafeAreaContext: _ctx,\n' +
'              useSafeAreaInsets: function() { return _hR.useContext(_ctx); },\n' +
'              useSafeAreaFrame: function() { return _frm; },\n' +
'              useSafeAreaInsetsWithDevMode: function() { return _hR.useContext(_ctx); },\n' +
'              withSafeAreaInsets: function(C) { return C; },\n' +
'              initialWindowMetrics: { insets: _ins, frame: _frm },\n' +
'              __esModule: true,\n' +
'            };\n' +
'            console.log(\'[AppTuner] react-native-safe-area-context → JS stub\');\n' +
'          })();\n' +
'\n' +
'        // ^^^ require/importDefault/importAll are patched above to redirect React to host instance.\n' +
'        };\n' +
'        return realDefine(wrappedFactory, moduleId, dependencyMap);\n' +
'      };\n' +
'    }\n' +
'\n' +
'    var _currentWrapped = null;\n' +
'    // If __d is already a function from a previous bundle run, wrap it immediately\n' +
'    var _existingD = globalObj.__d;\n' +
'    if (typeof _existingD === \'function\') {\n' +
'      _currentWrapped = makeWrappedDefine(_existingD);\n' +
'    }\n' +
'    // Install getter/setter so when Metro polyfill does global.__d = define, we intercept it\n' +
'    try {\n' +
'      Object.defineProperty(globalObj, \'__d\', {\n' +
'        get: function() { return _currentWrapped; },\n' +
'        set: function(newDefine) { _currentWrapped = makeWrappedDefine(newDefine); },\n' +
'        configurable: true,\n' +
'        enumerable: true,\n' +
'      });\n' +
'    } catch(e) {\n' +
'      // defineProperty failed (e.g. already non-configurable) — fall back to direct assignment\n' +
'      console.warn(\'[AppTuner] __d defineProperty failed, falling back:\', e && e.message);\n' +
'      if (_currentWrapped) globalObj.__d = _currentWrapped;\n' +
'    }\n' +
'  })();\n' +
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
'  // Persistent in-memory store for AsyncStorage stub — survives re-bundles within same app session\n' +
'  if (!globalObj.__APPTUNER_ASYNC_STORE__) { globalObj.__APPTUNER_ASYNC_STORE__ = {}; }\n' +
'\n' +
'  // Expo compatibility: patch TurboModuleProxy with stubs for missing Expo native modules\n' +
'  // This covers both old bridge (nativeModuleProxy) and new arch (__turboModuleProxy) paths\n' +
'  (function() {\n' +
'    // In-memory AsyncStorage stub implementing the v2 callback-based RNCAsyncStorage API.\n' +
'    // AppTuner Mobile has async-storage v3 (TurboModule "RNAsyncStorage", promise API) but\n' +
'    // bundled apps may use v2 (TurboModule "RNCAsyncStorage" / "AsyncStorage", callback API).\n' +
'    // Without this stub, getItem callbacks never fire → Promises never resolve → loading hangs.\n' +
'    var _makeAsyncStorageStub = function() {\n' +
'      return {\n' +
'        multiGet: function(keys, callback) {\n' +
'          var _s = globalObj.__APPTUNER_ASYNC_STORE__;\n' +
'          var result = keys.map(function(k) { return [k, _s[k] != null ? _s[k] : null]; });\n' +
'          setTimeout(function() { callback(null, result); }, 0);\n' +
'        },\n' +
'        multiSet: function(kvPairs, callback) {\n' +
'          var _s = globalObj.__APPTUNER_ASYNC_STORE__;\n' +
'          kvPairs.forEach(function(kv) { _s[kv[0]] = kv[1]; });\n' +
'          setTimeout(function() { callback(null); }, 0);\n' +
'        },\n' +
'        multiRemove: function(keys, callback) {\n' +
'          var _s = globalObj.__APPTUNER_ASYNC_STORE__;\n' +
'          keys.forEach(function(k) { delete _s[k]; });\n' +
'          setTimeout(function() { callback(null); }, 0);\n' +
'        },\n' +
'        getAllKeys: function(callback) {\n' +
'          var _s = globalObj.__APPTUNER_ASYNC_STORE__;\n' +
'          setTimeout(function() { callback(null, Object.keys(_s)); }, 0);\n' +
'        },\n' +
'        clear: function(callback) {\n' +
'          globalObj.__APPTUNER_ASYNC_STORE__ = {};\n' +
'          setTimeout(function() { callback(null); }, 0);\n' +
'        },\n' +
'        multiMerge: function(kvPairs, callback) {\n' +
'          var _s = globalObj.__APPTUNER_ASYNC_STORE__;\n' +
'          kvPairs.forEach(function(kv) {\n' +
'            try {\n' +
'              var ex = _s[kv[0]] ? JSON.parse(_s[kv[0]]) : {};\n' +
'              Object.assign(ex, JSON.parse(kv[1]));\n' +
'              _s[kv[0]] = JSON.stringify(ex);\n' +
'            } catch(e) { _s[kv[0]] = kv[1]; }\n' +
'          });\n' +
'          setTimeout(function() { callback(null); }, 0);\n' +
'        },\n' +
'      };\n' +
'    };\n' +
'    var _asyncStorageStub = _makeAsyncStorageStub();\n' +
'    var _expoStubs = {\n' +
'      RNCAsyncStorage: _asyncStorageStub,\n' +
'      AsyncStorage: _asyncStorageStub,\n' +
'      EXNativeModulesProxy: {\n' +
'        callMethod: function() { return Promise.resolve(null); },\n' +
'        viewManagersNames: [], modulesConstants: {}, exportedMethods: {},\n' +
'        addListener: function() {}, removeListeners: function() {},\n' +
'        startObserving: function() {}, stopObserving: function() {},\n' +
'      },\n' +
'      ExpoFont: { loadAsync: function() { return Promise.resolve(); } },\n' +
'      ExpoConstants: {\n' +
'        appOwnership: null, executionEnvironment: \'storeClient\',\n' +
'        nativeAppVersion: \'1.0.0\', nativeBuildVersion: \'1\',\n' +
'        platform: { ios: { userInterfaceIdiom: \'phone\' } },\n' +
'        sessionId: \'apptuner\', statusBarHeight: 44, isDetached: false, manifest: null,\n' +
'      },\n' +
'      ExpoApplication: {\n' +
'        applicationName: \'AppTuner\', applicationId: \'com.apptuner.mobile\',\n' +
'        nativeApplicationVersion: \'1.0.0\', nativeBuildVersion: \'1\',\n' +
'      },\n' +
'      RNCSafeAreaProvider: {\n' +
'        getConstants: function() { return { initialWindowMetrics: { insets: { top: 44, bottom: 34, left: 0, right: 0 }, frame: { x: 0, y: 0, width: 390, height: 844 } } }; },\n' +
'        addListener: function() {}, removeListeners: function() {},\n' +
'      },\n' +
'      RNGestureHandlerModule: {\n' +
'        attachGestureHandler: function() {}, createGestureHandler: function() {},\n' +
'        dropGestureHandler: function() {}, updateGestureHandler: function() {},\n' +
'        flushOperations: function() {}, install: function() { return false; },\n' +
'        addListener: function() {}, removeListeners: function() {},\n' +
'      },\n' +
'      ExpoLinearGradient: {},\n' +
'    };\n' +
'    // Old bridge path: nativeModuleProxy is a Proxy that maps to native modules\n' +
'    if (globalObj.nativeModuleProxy) {\n' +
'      try {\n' +
'        Object.keys(_expoStubs).forEach(function(k) {\n' +
'          if (!globalObj.nativeModuleProxy[k]) {\n' +
'            Object.defineProperty(globalObj.nativeModuleProxy, k, {\n' +
'              get: function() { return _expoStubs[k]; },\n' +
'              configurable: true, enumerable: true,\n' +
'            });\n' +
'          }\n' +
'        });\n' +
'        console.log(\'[AppTuner] Expo stubs → nativeModuleProxy (old bridge)\');\n' +
'      } catch(e) { console.warn(\'[AppTuner] nativeModuleProxy stub failed:\', e && e.message); }\n' +
'    }\n' +
'    // New arch path: __turboModuleProxy\n' +
'    var _origTMP = globalObj.__turboModuleProxy;\n' +
'    if (typeof _origTMP === \'function\') {\n' +
'      globalObj.__turboModuleProxy = function(name) {\n' +
'        return _expoStubs[name] || _origTMP(name);\n' +
'      };\n' +
'      console.log(\'[AppTuner] Expo stubs → __turboModuleProxy (new arch)\');\n' +
'    }\n' +
'  })();\n' +
'\n' +
'  // Execute the Metro bundle\n' +
code +
'\n' +
'\n' +
'  // Post-execution: if __d interceptor didn\'t capture App, scan module cache directly\n' +
'  if (!globalObj.App && globalObj.__r && globalObj.__r.c) {\n' +
'    try {\n' +
'      var _skipKeys = ["LogBox","HMRClient","DevSettings","ReactDevTools"];\n' +
'      globalObj.__r.c.forEach(function(mod) {\n' +
'        if (globalObj.App) return;\n' +
'        var ex = mod && mod.exports;\n' +
'        if (!ex) return;\n' +
'        // Detect AppRegistry by presence of _runnables + registerComponent\n' +
'        if (ex._runnables && typeof ex.registerComponent === "function") {\n' +
'          var keys = Object.keys(ex._runnables);\n' +
'          for (var i = keys.length - 1; i >= 0; i--) {\n' +
'            if (_skipKeys.indexOf(keys[i]) !== -1) continue;\n' +
'            var runnable = ex._runnables[keys[i]];\n' +
'            if (!runnable || typeof runnable.componentProvider !== "function") continue;\n' +
'            var C = runnable.componentProvider();\n' +
'            if (!C) continue;\n' +
'            if (typeof C === "object" && C !== null && (typeof C.default === "function" || (C.default && C.default.$$typeof))) C = C.default;\n' +
'            globalObj.App = C;\n' +
'            console.log("[AppTuner] App captured from _runnables:", keys[i], "type:", typeof C);\n' +
'            break;\n' +
'          }\n' +
'        }\n' +
'        // Also check react-native module which exports AppRegistry as a property\n' +
'        if (!globalObj.App && ex.AppRegistry && ex.AppRegistry._runnables && typeof ex.AppRegistry.registerComponent === "function") {\n' +
'          var ar = ex.AppRegistry;\n' +
'          var keys2 = Object.keys(ar._runnables);\n' +
'          for (var j = keys2.length - 1; j >= 0; j--) {\n' +
'            if (_skipKeys.indexOf(keys2[j]) !== -1) continue;\n' +
'            var runnable2 = ar._runnables[keys2[j]];\n' +
'            if (!runnable2 || typeof runnable2.componentProvider !== "function") continue;\n' +
'            var C2 = runnable2.componentProvider();\n' +
'            if (!C2) continue;\n' +
'            if (typeof C2 === "object" && C2 !== null && (typeof C2.default === "function" || (C2.default && C2.default.$$typeof))) C2 = C2.default;\n' +
'            globalObj.App = C2;\n' +
'            console.log("[AppTuner] App captured from AppRegistry._runnables:", keys2[j], "type:", typeof C2);\n' +
'            break;\n' +
'          }\n' +
'        }\n' +
'      });\n' +
'    } catch(e) {\n' +
'      console.warn("[AppTuner] Module cache scan failed:", e && e.message);\n' +
'    }\n' +
'  }\n' +
'\n' +
'  globalObj.BUNDLE_ID = ' + bundleId + ';\n' +
'  globalObj.BUNDLE_TIME = "' + bundleTime + '";\n' +
'}.call(this, typeof globalThis !== \'undefined\' ? globalThis : typeof global !== \'undefined\' ? global : this));\n';

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
