// External React Native module - references ReactNative from 'this' context
// In React Native eval(), 'this' is the context where ReactNative is provided

// Access ReactNative from the context it will be evaluated in
const ReactNative = this.ReactNative;

// Export everything from ReactNative
module.exports = ReactNative;
module.exports.default = ReactNative;
