import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function App() {
  const [count, setCount] = React.useState(0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello from Apptuner! 🚀</Text>

      <Text style={styles.subtitle}>
        This component was sent from your desktop and is running on your phone
      </Text>

      <View style={styles.counterBox}>
        <Text style={styles.counterLabel}>Counter:</Text>
        <Text style={styles.counterValue}>{count}</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => setCount(count + 1)}
      >
        <Text style={styles.buttonText}>Tap me!</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.resetButton]}
        onPress={() => setCount(0)}
      >
        <Text style={styles.buttonText}>Reset</Text>
      </TouchableOpacity>
    </View>
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
