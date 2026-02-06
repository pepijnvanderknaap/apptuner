import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function ErrorTest() {
  const [testType, setTestType] = useState<string | null>(null);

  const triggerReferenceError = () => {
    // @ts-ignore - intentional error for testing
    console.log(undefinedVariable);
  };

  const triggerTypeError = () => {
    const obj: any = null;
    console.log(obj.property);
  };

  const triggerRenderError = () => {
    const obj = { name: 'test' };
    // @ts-ignore - intentional error for testing
    return <Text>{obj}</Text>; // Can't render objects
  };

  const triggerStateError = () => {
    setTestType('infinite-loop');
  };

  // This will cause infinite re-renders
  if (testType === 'infinite-loop') {
    setTestType('triggered');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Error Test Suite</Text>
      <Text style={styles.subtitle}>
        Test the error overlay with different error types
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={triggerReferenceError}
      >
        <Text style={styles.buttonText}>1. Reference Error</Text>
        <Text style={styles.hint}>Variable not defined</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={triggerTypeError}
      >
        <Text style={styles.buttonText}>2. Type Error</Text>
        <Text style={styles.hint}>Null property access</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => setTestType('render')}
      >
        <Text style={styles.buttonText}>3. Render Error</Text>
        <Text style={styles.hint}>Invalid React child</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={triggerStateError}
      >
        <Text style={styles.buttonText}>4. State Error</Text>
        <Text style={styles.hint}>Infinite re-render</Text>
      </TouchableOpacity>

      {testType === 'render' && triggerRenderError()}

      <View style={styles.info}>
        <Text style={styles.infoText}>
          Each button triggers a different error type.{'\n'}
          The error overlay should show details and help you debug.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#86868b',
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007aff',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: '#86868b',
  },
  info: {
    marginTop: 24,
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoText: {
    fontSize: 13,
    color: '#1976d2',
    lineHeight: 20,
  },
});
