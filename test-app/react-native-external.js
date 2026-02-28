// External React Native module - references ReactNative from execution context

// Access ReactNative from 'this' context (set by executor's Function.call)
const ReactNative = this.ReactNative || (typeof global !== 'undefined' && global.ReactNative);

if (!ReactNative) {
  throw new Error('[react-native-external] ReactNative not found in execution context');
}

// Pass through the full host ReactNative object — it's already loaded in the host,
// so there's no bundling cost. This ensures AppRegistry and any other API is available.
module.exports = ReactNative;
