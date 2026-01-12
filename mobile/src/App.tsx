/**
 * Apptuner Mobile App
 *
 * Scans QR code from desktop app, connects to relay, and executes bundles
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import QRCodeScanner from './components/QRCodeScanner';
import ConnectionStatus from './components/ConnectionStatus';
import {RelayConnection} from './services/relay';
import {BundleExecutor} from './services/executor';

type AppState = 'scanning' | 'connecting' | 'connected' | 'error';

export default function App() {
  const [appState, setAppState] = useState<AppState>('scanning');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [bundleLoaded, setBundleLoaded] = useState(false);

  const connectionRef = useRef<RelayConnection | null>(null);
  const executorRef = useRef<BundleExecutor | null>(null);

  // Handle QR code scan
  const handleQRScan = async (data: string) => {
    try {
      // Parse QR code: apptuner://connect/{sessionId}
      const match = data.match(/^apptuner:\/\/connect\/([a-zA-Z0-9]+)$/);

      if (!match) {
        setErrorMessage('Invalid QR code format');
        setAppState('error');
        return;
      }

      const scannedSessionId = match[1];
      setSessionId(scannedSessionId);
      setAppState('connecting');

      // Connect to relay
      await connectToRelay(scannedSessionId);
    } catch (error) {
      console.error('QR scan error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setAppState('error');
    }
  };

  // Connect to Cloudflare relay
  const connectToRelay = async (sid: string) => {
    try {
      // Use production relay URL (or localhost for development)
      const relayUrl =
        __DEV__
          ? 'ws://localhost:8787'
          : 'wss://apptuner-relay.your-subdomain.workers.dev';

      const connection = new RelayConnection(sid, relayUrl);
      connectionRef.current = connection;

      // Initialize bundle executor
      const executor = new BundleExecutor();
      executorRef.current = executor;

      // Subscribe to connection status
      connection.onStatusChange(status => {
        if (status === 'connected') {
          setAppState('connected');
        } else if (status === 'error') {
          setAppState('error');
          setErrorMessage('Failed to connect to relay');
        }
      });

      // Subscribe to bundle updates
      connection.onBundleUpdate(async bundle => {
        try {
          console.log('Received bundle update:', bundle.code.length, 'bytes');

          // Execute the bundle
          await executor.execute(bundle.code);

          setBundleLoaded(true);

          // Send acknowledgment
          connection.sendAck(true);
        } catch (error) {
          console.error('Bundle execution error:', error);
          setErrorMessage(
            error instanceof Error ? error.message : 'Bundle execution failed',
          );
          connection.sendAck(false, error instanceof Error ? error.message : undefined);
        }
      });

      // Connect
      await connection.connect();
    } catch (error) {
      console.error('Connection error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Connection failed');
      setAppState('error');
    }
  };

  // Disconnect and go back to scanning
  const handleDisconnect = () => {
    if (connectionRef.current) {
      connectionRef.current.disconnect();
      connectionRef.current = null;
    }
    if (executorRef.current) {
      executorRef.current.cleanup();
      executorRef.current = null;
    }
    setAppState('scanning');
    setSessionId(null);
    setBundleLoaded(false);
    setErrorMessage('');
  };

  // Render based on app state
  const renderContent = () => {
    switch (appState) {
      case 'scanning':
        return (
          <View style={styles.container}>
            <Text style={styles.title}>Apptuner</Text>
            <Text style={styles.subtitle}>Scan QR code to connect</Text>
            <QRCodeScanner onScan={handleQRScan} />
          </View>
        );

      case 'connecting':
        return (
          <View style={styles.container}>
            <ActivityIndicator size="large" color="#007aff" />
            <Text style={styles.connectingText}>Connecting to relay...</Text>
            <Text style={styles.sessionId}>Session: {sessionId}</Text>
          </View>
        );

      case 'connected':
        return (
          <View style={styles.container}>
            <ConnectionStatus
              status="connected"
              sessionId={sessionId!}
              bundleLoaded={bundleLoaded}
            />

            {!bundleLoaded && (
              <View style={styles.waitingContainer}>
                <ActivityIndicator size="small" color="#007aff" />
                <Text style={styles.waitingText}>Waiting for bundle...</Text>
              </View>
            )}

            {bundleLoaded && (
              <View style={styles.bundleContainer}>
                {/* Bundle renders here */}
                <Text style={styles.bundleLoadedText}>
                  ✓ Bundle loaded and running
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={handleDisconnect}>
              <Text style={styles.disconnectButtonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        );

      case 'error':
        return (
          <View style={styles.container}>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => setAppState('scanning')}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
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
    marginBottom: 32,
  },
  connectingText: {
    fontSize: 18,
    color: '#1d1d1f',
    marginTop: 24,
  },
  sessionId: {
    fontSize: 14,
    color: '#86868b',
    marginTop: 8,
    fontFamily: 'Courier',
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  waitingText: {
    fontSize: 16,
    color: '#86868b',
    marginLeft: 12,
  },
  bundleContainer: {
    flex: 1,
    width: '100%',
    marginTop: 24,
  },
  bundleLoadedText: {
    fontSize: 16,
    color: '#34c759',
    textAlign: 'center',
  },
  disconnectButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#f5f5f7',
    borderRadius: 8,
  },
  disconnectButtonText: {
    fontSize: 16,
    color: '#007aff',
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ff3b30',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#86868b',
    textAlign: 'center',
    marginBottom: 32,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#007aff',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
});
