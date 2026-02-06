/**
 * React Externalization Polyfill
 * This runs BEFORE the bundle loads and hooks into Metro's module system
 * to replace React and React Native with globals from Expo
 */

(function() {
  console.log('[Polyfill] Installing React externalization hooks...');

  // Track which modules are React/ReactNative so we can skip them
  const externalModules = new Map();

  // Save original __d (module define) function
  const originalDefine = global.__d;

  // Override __d to intercept React and React Native modules
  global.__d = function(factory, moduleId, dependencyMap) {
    // Call original first to get the module defined
    originalDefine(factory, moduleId, dependencyMap);

    // Check if we can identify this module
    // Metro doesn't give us module names directly, so we need to check the factory
    const factoryStr = factory.toString();

    // Detect React module (looks for hooks like useState, useEffect)
    if (factoryStr.includes('useState') && factoryStr.includes('useEffect') && factoryStr.includes('createElement')) {
      if (factoryStr.length < 50000) { // React module itself is large
        // This is likely importing from React, not React itself
        return;
      }
      console.log('[Polyfill] Found React module:', moduleId);
      externalModules.set(moduleId, 'react');
    }

    // Detect React Native module (looks for View, Text, etc.)
    if (factoryStr.includes('requireNativeComponent') ||
        (factoryStr.includes('"View"') && factoryStr.includes('"Text"'))) {
      console.log('[Polyfill] Found ReactNative module:', moduleId);
      externalModules.set(moduleId, 'react-native');
    }
  };

  // Save original __r (module require) function
  const originalRequire = global.__r;

  // Override __r to return globals for external modules
  global.__r = function(moduleId) {
    if (externalModules.has(moduleId)) {
      const moduleName = externalModules.get(moduleId);
      console.log('[Polyfill] Returning global for:', moduleName, 'moduleId:', moduleId);

      if (moduleName === 'react') {
        return global.React;
      }
      if (moduleName === 'react-native') {
        return global.ReactNative;
      }
    }

    return originalRequire(moduleId);
  };

  console.log('[Polyfill] React externalization hooks installed');
})();
