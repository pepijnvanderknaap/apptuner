// Ultra-simple test bundle - just text, no state
const { View, Text } = ReactNative;

function App() {
  return React.createElement(
    View,
    { style: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' } },
    React.createElement(Text, { style: { color: '#fff', fontSize: 24 } }, 'IT WORKS!')
  );
}

// The executor will return this App component
console.log('Bundle code executed, App defined');
