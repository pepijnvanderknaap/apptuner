/**
 * Manual Session ID Entry Component
 */

import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

interface Props {
  onSubmit: (sessionId: string) => void;
  onBack: () => void;
}

export default function ManualEntry({onSubmit, onBack}: Props) {
  const [sessionId, setSessionId] = useState('');

  const handleSubmit = () => {
    const trimmed = sessionId.trim().toUpperCase();
    if (trimmed.length === 6) {
      onSubmit(trimmed);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Enter Session Code</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code from your computer
      </Text>

      <TextInput
        style={styles.input}
        value={sessionId}
        onChangeText={text => setSessionId(text.toUpperCase())}
        placeholder="A7X9M2"
        placeholderTextColor="#c7c7cc"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        keyboardType="default"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />

      <TouchableOpacity
        style={[
          styles.connectButton,
          sessionId.trim().length !== 6 && styles.connectButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={sessionId.trim().length !== 6}>
        <Text style={styles.connectButtonText}>Connect</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007aff',
    fontWeight: '500',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#86868b',
    marginBottom: 48,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    maxWidth: 300,
    height: 80,
    fontSize: 48,
    fontWeight: '600',
    fontFamily: 'Courier',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#e5e5ea',
    borderRadius: 12,
    color: '#1d1d1f',
    letterSpacing: 8,
    marginBottom: 32,
  },
  connectButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    backgroundColor: '#007aff',
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  connectButtonDisabled: {
    backgroundColor: '#c7c7cc',
  },
  connectButtonText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },
});
