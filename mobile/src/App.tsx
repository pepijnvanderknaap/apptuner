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
  LogBox,
  AppState,
  Linking,
} from 'react-native';
import KeepAwake from 'react-native-keep-awake';
import QRCodeScanner from './components/QRCodeScanner';
import ManualEntry from './components/ManualEntry';
import ConnectionStatus from './components/ConnectionStatus';
import ErrorOverlay from './components/ErrorOverlay';
import {RelayConnection} from './services/relay';
import {BundleExecutor} from './services/executor';
import {ConsoleInterceptor} from './services/console-interceptor';

// Suppress all deprecation warnings and errors from dependencies
LogBox.ignoreLogs([
  // PropTypes deprecations
  'ViewPropTypes will be removed from React Native',
  'ColorPropType will be removed from React Native',
  'EdgeInsetsPropType will be removed from React Native',
  'PointPropType will be removed from React Native',

  // NativeEventEmitter warnings
  'new NativeEventEmitter',
  'EventEmitter.removeListener',
  'Sending `onAnimatedValueUpdate` with no listeners registered',

  // Module deprecations
  'Clipboard has been extracted',
  'PushNotificationIOS has been merged',
  'ProgressBarAndroid has been merged',

  // Other common warnings
  'Remote debugger',
  'Require cycle',
]);

// Also suppress all yellow box warnings globally
LogBox.ignoreAllLogs(true);

type AppState = 'scanning' | 'connecting' | 'connected' | 'error';

export default function App() {
  const [appState, setAppState] = useState<AppState>('scanning');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [bundleLoaded, setBundleLoaded] = useState(false);
  const [bundleVersion, setBundleVersion] = useState(0);
  const [showErrorOverlay, setShowErrorOverlay] = useState(false);
  const [errorStack, setErrorStack] = useState<string>('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  const connectionRef = useRef<RelayConnection | null>(null);
  const executorRef = useRef<BundleExecutor | null>(null);
  const consoleInterceptorRef = useRef<ConsoleInterceptor | null>(null);
  const unsubscribeStatusRef = useRef<(() => void) | null>(null);
  const unsubscribeBundleRef = useRef<(() => void) | null>(null);
  const shouldReconnectRef = useRef<boolean>(true);

  // Handle deep links (when app is opened via apptuner:// URL)
  useEffect(() => {
    // Handle initial URL (when app is launched via deep link)
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('App opened with deep link:', url);
        handleQRScan(url);
      }
    });

    // Handle URL when app is already running and receives a deep link
    const linkingSubscription = Linking.addEventListener('url', ({url}) => {
      console.log('Received deep link while running:', url);
      handleQRScan(url);
    });

    return () => {
      linkingSubscription.remove();
    };
  }, []);

  // Monitor app state changes for auto-reconnection
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log('App state changed to:', nextAppState);

      // When app comes to foreground, attempt to reconnect if we have a session
      if (nextAppState === 'active' && sessionId && shouldReconnectRef.current) {
        // Only reconnect if we're not already connected
        const currentStatus = connectionRef.current?.getStatus();
        if (!connectionRef.current || currentStatus === 'disconnected' || currentStatus === 'error') {
          console.log('App returned to foreground, attempting to reconnect...');
          connectToRelay(sessionId).catch(error => {
            console.error('Auto-reconnect failed:', error);
          });
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [sessionId]);

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

  // Handle manual code entry
  const handleManualEntry = (code: string) => {
    // Construct the URL format that handleQRScan expects
    const qrData = `apptuner://connect/${code}`;
    handleQRScan(qrData);
  };

  // Connect to Cloudflare relay
  const connectToRelay = async (sid: string) => {
    try {
      // Enable auto-reconnection for this session
      shouldReconnectRef.current = true;

      // Use production relay URL (or local network IP for development)
      const relayUrl =
        __DEV__
          ? 'ws://192.168.178.48:8787'
          : 'wss://apptuner-relay.your-subdomain.workers.dev';

      const connection = new RelayConnection(sid, relayUrl);
      connectionRef.current = connection;

      // Initialize bundle executor
      const executor = new BundleExecutor();
      executorRef.current = executor;

      // Initialize console interceptor
      const interceptor = new ConsoleInterceptor();
      consoleInterceptorRef.current = interceptor;
      interceptor.start((entry) => {
        // Send console logs to desktop via relay
        connection.sendLog(entry.level as any, entry.args);
      });

      // Subscribe to connection status
      unsubscribeStatusRef.current = connection.onStatusChange(status => {
        if (status === 'connected') {
          setAppState('connected');
        } else if (status === 'error') {
          setAppState('error');
          setErrorMessage('Failed to connect to relay');
        }
      });

      // Subscribe to bundle updates
      unsubscribeBundleRef.current = connection.onBundleUpdate(async bundle => {
        try {
          console.log('Received bundle update:', bundle.code.length, 'bytes');

          // Execute the bundle
          await executor.execute(bundle.code);

          setBundleLoaded(true);
          setBundleVersion(v => v + 1); // Force re-render with new bundle

          // Send acknowledgment
          connection.sendAck(true);
        } catch (error) {
          console.error('Bundle execution error:', error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          const stack = error instanceof Error ? error.stack || '' : '';

          // Show error overlay
          setErrorMessage(errorMsg);
          setErrorStack(stack);
          setShowErrorOverlay(true);

          connection.sendAck(false, errorMsg);
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
    // Prevent auto-reconnection after explicit disconnect
    shouldReconnectRef.current = false;

    // Clean up subscriptions
    if (unsubscribeStatusRef.current) {
      unsubscribeStatusRef.current();
      unsubscribeStatusRef.current = null;
    }
    if (unsubscribeBundleRef.current) {
      unsubscribeBundleRef.current();
      unsubscribeBundleRef.current = null;
    }

    if (connectionRef.current) {
      connectionRef.current.disconnect();
      connectionRef.current = null;
    }
    if (executorRef.current) {
      executorRef.current.cleanup();
      executorRef.current = null;
    }
    if (consoleInterceptorRef.current) {
      consoleInterceptorRef.current.stop();
      consoleInterceptorRef.current = null;
    }
    setAppState('scanning');
    setSessionId(null);
    setBundleLoaded(false);
    setErrorMessage('');
    setShowErrorOverlay(false);
    setErrorStack('');
    setShowManualEntry(false);
  };

  // Render based on app state
  const renderContent = () => {
    switch (appState) {
      case 'scanning':
        if (showManualEntry) {
          return (
            <ManualEntry
              onSubmit={handleManualEntry}
              onBack={() => setShowManualEntry(false)}
            />
          );
        }

        return (
          <View style={styles.container}>
            <Text style={styles.title}>AppTuner</Text>
            <Text style={styles.subtitle}>Scan QR code to connect</Text>
            <QRCodeScanner onScan={handleQRScan} />
            <View style={styles.skipButtonContainer}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => setShowManualEntry(true)}>
                <Text style={styles.skipButtonText}>Enter Code Manually</Text>
              </TouchableOpacity>
            </View>
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
        // Full-screen mode when bundle is loaded
        if (bundleLoaded) {
          return (
            <View style={styles.fullScreenContainer}>
              {/* Bundled app takes full screen */}
              {(() => {
                try {
                  const BundledApp = (global as any).App;
                  if (!BundledApp) {
                    return <Text style={{color: 'red'}}>Error: global.App not found</Text>;
                  }
                  return <BundledApp key={bundleVersion} />;
                } catch (err) {
                  return <Text style={{color: 'red'}}>Render error: {String(err)}</Text>;
                }
              })()}

              {/* Small floating disconnect button */}
              <TouchableOpacity
                style={styles.floatingDisconnectButton}
                onPress={handleDisconnect}>
                <Text style={styles.floatingDisconnectText}>✕</Text>
              </TouchableOpacity>
            </View>
          );
        }

        // Waiting for bundle
        return (
          <View style={styles.container}>
            <ConnectionStatus
              status="connected"
              sessionId={sessionId!}
              bundleLoaded={bundleLoaded}
            />

            <View style={styles.waitingContainer}>
              <ActivityIndicator size="small" color="#007aff" />
              <Text style={styles.waitingText}>Waiting for bundle...</Text>
            </View>

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
    <SafeAreaView style={bundleLoaded ? styles.fullScreenSafeArea : styles.safeArea}>
      {/* Keep screen awake when connected to prevent iOS from suspending the app */}
      {appState === 'connected' && <KeepAwake />}

      <StatusBar
        barStyle={bundleLoaded ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent={bundleLoaded}
      />
      {renderContent()}

      {/* Error Overlay */}
      {showErrorOverlay && (
        <ErrorOverlay
          error={errorMessage}
          stack={errorStack}
          onDismiss={() => setShowErrorOverlay(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  fullScreenSafeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  fullScreenContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  floatingDisconnectButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  floatingDisconnectText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#86868b',
    marginBottom: 48,
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
  skipButtonContainer: {
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingTop: 16,
    paddingBottom: 16,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#f5f5f7',
    borderRadius: 8,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#007aff',
    fontWeight: '500',
  },
});
