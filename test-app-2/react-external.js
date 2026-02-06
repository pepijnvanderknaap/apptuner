// External React module - references React from 'this' context (not global)
// In React Native eval(), 'this' is the context where React is provided

// Use a getter pattern that accesses 'this' at runtime
// We can't use 'this' directly here because this file is loaded at bundle time
// Instead, we'll make the executor provide it via a well-known location

// Access React from the context it will be evaluated in
const React = this.React;

// Export everything from React
module.exports = React;
module.exports.default = React;
