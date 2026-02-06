// Test bundle with intentional error
const { View, Text, StyleSheet } = ReactNative;

function App() {
  // This will cause an error - referencing undefined variable
  const broken = undefinedVariable.property;

  return React.createElement(
    View,
    { style: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' } },
    React.createElement(Text, { style: { color: '#fff', fontSize: 24 } }, 'This should not appear')
  );
}

console.log('About to cause an error...');
