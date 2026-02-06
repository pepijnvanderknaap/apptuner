// Manual bundle - no Metro, just plain JS that uses global React
// This proves the concept works before dealing with Metro complexity

(function() {
  console.log('[Manual Bundle] Starting...');
  console.log('[Manual Bundle] global.React exists:', !!global.React);
  console.log('[Manual Bundle] global.ReactNative exists:', !!global.ReactNative);

  // Get React and React Native from global
  const React = global.React;
  const { View, Text, StyleSheet, TouchableOpacity } = global.ReactNative;

  // Define the App component
  function App() {
    const [count, setCount] = React.useState(0);

    return React.createElement(
      View,
      { style: styles.container },
      React.createElement(Text, { style: styles.title }, '🎉 MANUAL BUNDLE WORKS! 🎉'),
      React.createElement(
        Text,
        { style: styles.subtitle },
        'This component uses global.React and global.ReactNative directly'
      ),
      React.createElement(
        View,
        { style: styles.counterBox },
        React.createElement(Text, { style: styles.counterLabel }, 'Counter:'),
        React.createElement(Text, { style: styles.counterValue }, count.toString())
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
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
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

  // Export the component
  global.App = App;
  console.log('[Manual Bundle] App component set on global.App');
})();
