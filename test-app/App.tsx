import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// Temporarily remove Image to test Metro bundle without assets
// const logoImage = require('./assets/logo.png');

// console.log('[App] logoImage:', logoImage);
// console.log('[App] logoImage type:', typeof logoImage);

export default function App() {
  const [count, setCount] = useState(333333); // SIXTH TEST - Triple consecutive!

  console.log('🔥🔥🔥 APP.TSX LOADED - COUNT:', 333333, '🔥🔥🔥');

  useEffect(() => {
    console.log('🚀 App mounted! Console logging is working!');
    console.log('✅ If you see this in the desktop console panel, everything is working!');
  }, []);

  console.log('🎯 App component rendered with count:', count);

  const handleIncrement = () => {
    console.log('📈 Incrementing counter from', count, 'to', count + 1);
    setCount(count + 1);
  };

  const handleReset = () => {
    console.warn('⚠️ Resetting counter to 0');
    setCount(0);
  };

  // Debug: Check what logoImage contains
  // useEffect(() => {
  //   console.log('[App] Logo image source:', JSON.stringify(logoImage));
  // }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔥</Text>
      <Text style={styles.title}>METRO AUTO-RELOAD! 🚀</Text>

      <Text style={styles.subtitle}>
        If you see 66666, NativeEventEmitter fix WORKS! ⚡️
      </Text>

      <View style={styles.counterBox}>
        <Text style={styles.counterLabel}>Counter:</Text>
        <Text style={styles.counterValue}>{count}</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleIncrement}
      >
        <Text style={styles.buttonText}>Hit me!</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.resetButton]}
        onPress={handleReset}
      >
        <Text style={styles.buttonText}>Resetter</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#34C759' }]}
        onPress={() => {
          console.info('ℹ️ Testing different log types');
          console.error('❌ This is a test error (not real!)');
          console.debug('🐛 Debug info: count =', count);
        }}
      >
        <Text style={styles.buttonText}>Test Console Logs</Text>
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
  emoji: {
    fontSize: 80,
    marginBottom: 20,
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
