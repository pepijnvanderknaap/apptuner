import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function App() {
  const [clicks, setClicks] = useState(0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎯 PROJECT 2 - CLICKER! 🎯</Text>
      
      <Text style={styles.subtitle}>
        This is the SECOND test project to demonstrate multi-project switching!
      </Text>

      <View style={styles.clickBox}>
        <Text style={styles.clickLabel}>Total Clicks:</Text>
        <Text style={styles.clickValue}>{clicks}</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => setClicks(clicks + 1)}
      >
        <Text style={styles.buttonText}>Click Me!</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.resetButton]}
        onPress={() => setClicks(0)}
      >
        <Text style={styles.buttonText}>Reset</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D3748',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#A0AEC0',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  clickBox: {
    backgroundColor: '#4A5568',
    borderRadius: 16,
    padding: 30,
    marginBottom: 30,
    minWidth: 200,
    alignItems: 'center',
  },
  clickLabel: {
    fontSize: 18,
    color: '#A0AEC0',
    marginBottom: 10,
  },
  clickValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  button: {
    backgroundColor: '#48BB78',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 15,
    minWidth: 200,
  },
  resetButton: {
    backgroundColor: '#F56565',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
