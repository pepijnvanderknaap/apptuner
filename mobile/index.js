/**
 * Apptuner Mobile App Entry Point
 */

// CRITICAL: Patch NativeEventEmitter BEFORE any other imports
// This must be the very first code that runs
import { NativeEventEmitter } from 'react-native';

const OriginalNativeEventEmitter = NativeEventEmitter;

// Create safe version that handles null modules
class SafeNativeEventEmitter extends OriginalNativeEventEmitter {
  constructor(nativeModule) {
    // If module is null/undefined, provide a mock to prevent crash
    if (!nativeModule) {
      console.warn('[SafeNativeEventEmitter] Created with null module, using mock');
      const mockModule = {
        addListener: () => {},
        removeListeners: () => {},
      };
      super(mockModule);
      return;
    }
    super(nativeModule);
  }
}

// Replace globally
const ReactNative = require('react-native');
ReactNative.NativeEventEmitter = SafeNativeEventEmitter;

console.log('[index.js] NativeEventEmitter globally patched at app entry point');

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
