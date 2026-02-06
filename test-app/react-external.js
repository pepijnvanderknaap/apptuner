// External React module - references React from execution context
// The executor provides React via 'this' context

// Access React from 'this' context (set by executor's Function.call)
const React = this.React || (typeof global !== 'undefined' && global.React);

if (!React) {
  throw new Error('[react-external] React not found in execution context');
}

// Export React
module.exports = React;
module.exports.default = React;
