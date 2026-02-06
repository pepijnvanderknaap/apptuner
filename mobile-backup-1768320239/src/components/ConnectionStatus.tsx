/**
 * Connection Status Component
 *
 * Shows connection status and session info
 */

import React from 'react';
import {StyleSheet, View, Text} from 'react';

interface Props {
  status: 'connected' | 'disconnected' | 'error';
  sessionId: string;
  bundleLoaded: boolean;
}

export default function ConnectionStatus({
  status,
  sessionId,
  bundleLoaded,
}: Props) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return '#34c759';
      case 'error':
        return '#ff3b30';
      default:
        return '#86868b';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View
          style={[styles.statusDot, {backgroundColor: getStatusColor()}]}
        />
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>

      <Text style={styles.sessionText}>Session: {sessionId}</Text>

      {bundleLoaded && (
        <View style={styles.bundleStatus}>
          <Text style={styles.bundleStatusText}>✓ App Running</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  sessionText: {
    fontSize: 12,
    color: '#86868b',
    fontFamily: 'Courier',
  },
  bundleStatus: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 6,
  },
  bundleStatusText: {
    fontSize: 14,
    color: '#34c759',
    fontWeight: '500',
  },
});
