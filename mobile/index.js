/**
 * Apptuner Mobile App Entry Point
 *
 * Uses CommonJS require() throughout to guarantee execution order.
 * ES6 import statements are hoisted by Babel, which breaks early setup code.
 */

// Step 1: Suppress all LogBox warnings before anything else loads
const { LogBox } = require('react-native');
LogBox.ignoreAllLogs();

// Step 2: Disable Reanimated v3 strict-mode overlay BEFORE Reanimated initialises
// (must happen before any component that uses Reanimated is imported)
const { configureReanimatedLogger, ReanimatedLogLevel } = require('react-native-reanimated');
configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

// Step 3: Patch NativeEventEmitter to handle null modules safely
const { NativeEventEmitter } = require('react-native');
const OriginalNativeEventEmitter = NativeEventEmitter;

class SafeNativeEventEmitter extends OriginalNativeEventEmitter {
  constructor(nativeModule) {
    if (!nativeModule) {
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

const ReactNative = require('react-native');
ReactNative.NativeEventEmitter = SafeNativeEventEmitter;

// Step 4: Register the app
const { AppRegistry } = require('react-native');
const App = require('./src/App').default;
const { name: appName } = require('./app.json');

AppRegistry.registerComponent(appName, () => App);
