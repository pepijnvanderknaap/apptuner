// External React Native module - references ReactNative from execution context
// IMPORTANT: Only export what test-app actually uses to avoid bundling problematic modules

// Access ReactNative from 'this' context (set by executor's Function.call)
const ReactNative = this.ReactNative || (typeof global !== 'undefined' && global.ReactNative);

if (!ReactNative) {
  throw new Error('[react-native-external] ReactNative not found in execution context');
}

// Only export the specific components that test-app uses
// This prevents Metro from bundling unused modules like PushNotificationIOS, Clipboard, etc.
module.exports = {
  View: ReactNative.View,
  Text: ReactNative.Text,
  StyleSheet: ReactNative.StyleSheet,
  TouchableOpacity: ReactNative.TouchableOpacity,
  // Add any other components your app actually uses
};
