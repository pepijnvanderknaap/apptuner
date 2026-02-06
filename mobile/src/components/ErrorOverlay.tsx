/**
 * Error Overlay Component
 *
 * Shows error messages with stack traces (similar to React Native Red Box)
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';

interface Props {
  error: string;
  stack: string;
  onDismiss: () => void;
}

export default function ErrorOverlay({error, stack, onDismiss}: Props) {
  const errorMessage = error;
  const errorStack = stack;

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={true}
      onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Error</Text>
            <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
              <Text style={styles.dismissButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.errorMessage}>{errorMessage}</Text>

            {errorStack && (
              <>
                <Text style={styles.stackLabel}>Stack Trace:</Text>
                <Text style={styles.stackTrace}>{errorStack}</Text>
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.reloadButton}
              onPress={onDismiss}>
              <Text style={styles.reloadButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1d1d1f',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3c',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ff3b30',
  },
  dismissButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: '300',
  },
  content: {
    padding: 16,
    maxHeight: 400,
  },
  errorMessage: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 16,
    lineHeight: 24,
  },
  stackLabel: {
    fontSize: 14,
    color: '#86868b',
    marginBottom: 8,
    fontWeight: '600',
  },
  stackTrace: {
    fontSize: 12,
    color: '#86868b',
    fontFamily: 'Courier',
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3c',
  },
  reloadButton: {
    backgroundColor: '#007aff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reloadButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
});
