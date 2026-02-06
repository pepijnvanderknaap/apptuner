// Simple React Native test bundle
// React and ReactNative are injected as function parameters
const { View, Text, StyleSheet, TouchableOpacity, ScrollView } = ReactNative;

function App() {
  const [count, setCount] = React.useState(0);

  return React.createElement(
    ScrollView,
    { style: styles.container, contentContainerStyle: styles.contentContainer },
    React.createElement(Text, { style: styles.title }, 'AUTO-MAGIC UPDATE! 🪄✨'),
    React.createElement(
      Text,
      { style: styles.subtitle },
      'Watch this change happen automatically! ⚡️'
    ),
    React.createElement(
      View,
      { style: styles.counterBox },
      React.createElement(Text, { style: styles.counterLabel }, 'Counter:'),
      React.createElement(Text, { style: styles.counterValue }, String(count))
    ),
    React.createElement(
      TouchableOpacity,
      {
        style: styles.button,
        onPress: () => setCount(count + 1)
      },
      React.createElement(Text, { style: styles.buttonText }, 'Tap me!')
    ),
    React.createElement(
      TouchableOpacity,
      {
        style: [styles.button, styles.resetButton],
        onPress: () => setCount(0)
      },
      React.createElement(Text, { style: styles.buttonText }, 'Reset')
    )
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  contentContainer: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  counterBox: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 30,
    marginBottom: 30,
    minWidth: 200,
    alignItems: 'center',
  },
  counterLabel: {
    fontSize: 18,
    color: '#999',
    marginBottom: 10,
  },
  counterValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 15,
    minWidth: 200,
  },
  resetButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

// The executor will return this App component
console.log('Bundle code executed, App defined');
