import React from 'react';
import AppComponent from './App';

// Wrap the component to ensure it's properly executable
function App() {
  return React.createElement(AppComponent);
}

// Export for Metro's module system
export default App;

// Also expose globally for non-Metro bundles
// Check if global exists (it should in React Native)
if (typeof global !== 'undefined') {
  global.App = App;
  console.log('[Bundle] App component exposed via global.App');
} else if (typeof window !== 'undefined') {
  window.App = App;
  console.log('[Bundle] App component exposed via window.App');
}
