/**
 * React Runtime Polyfill
 * This module is loaded BEFORE the main app bundle
 * It makes React and ReactNative available to the bundle
 */

// These will be provided by Expo Go / the executor
// We just need to ensure they're accessible to the bundle's module system

if (typeof global.React === 'undefined') {
  console.warn('[Polyfill] React not found on global! Bundle may fail.');
}

if (typeof global.ReactNative === 'undefined') {
  console.warn('[Polyfill] ReactNative not found on global! Bundle may fail.');
}

// Export React and ReactNative so Metro can reference them
// Even though we told Metro these are "empty", other modules will try to import them
// So we need to make them available
module.exports = {
  React: global.React,
  ReactNative: global.ReactNative,
};

console.log('[Polyfill] React runtime polyfill loaded');
