import fs from 'fs/promises';
import path from 'path';
import { NativeModule } from './detect-modules.js';

interface GenerateOptions {
  outputPath: string;
  appName: string;
  nativeModules: NativeModule[];
  reactNativeVersion: string;
}

export async function generateViewerApp(options: GenerateOptions) {
  const { outputPath, appName, nativeModules, reactNativeVersion } = options;

  // Create output directory
  await fs.mkdir(outputPath, { recursive: true });

  // Generate package.json
  const packageJson = generatePackageJson(appName, reactNativeVersion, nativeModules);
  await fs.writeFile(
    path.join(outputPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Generate App.tsx (the viewer component)
  const appCode = generateAppCode();
  await fs.mkdir(path.join(outputPath, 'src'), { recursive: true });
  await fs.writeFile(path.join(outputPath, 'src/App.tsx'), appCode);

  // Generate index.js
  const indexCode = `import { AppRegistry } from 'react-native';
import App from './src/App';

AppRegistry.registerComponent('${appName}', () => App);
`;
  await fs.writeFile(path.join(outputPath, 'index.js'), indexCode);

  // Copy README
  const readme = generateReadme(appName);
  await fs.writeFile(path.join(outputPath, 'README.md'), readme);

  // Generate tsconfig
  const tsconfig = {
    extends: '@react-native/typescript-config/tsconfig.json',
    compilerOptions: {
      strict: true,
    },
  };
  await fs.writeFile(
    path.join(outputPath, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2)
  );
}

function generatePackageJson(
  appName: string,
  reactNativeVersion: string,
  nativeModules: NativeModule[]
): object {
  const dependencies: Record<string, string> = {
    react: '^18.2.0',
    'react-native': reactNativeVersion,
    'react-native-safe-area-context': '^4.8.0',
  };

  // Add detected native modules
  nativeModules.forEach(mod => {
    dependencies[mod.name] = mod.version;
  });

  return {
    name: appName.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    private: true,
    scripts: {
      android: 'react-native run-android',
      ios: 'react-native run-ios',
      start: 'react-native start',
    },
    dependencies,
    devDependencies: {
      '@react-native/babel-preset': '^0.74.0',
      '@react-native/eslint-config': '^0.74.0',
      '@react-native/metro-config': '^0.74.0',
      '@react-native/typescript-config': '^0.74.0',
      '@types/react': '^18.2.0',
      '@types/react-native': '^0.72.0',
      typescript: '^5.0.0',
    },
  };
}

function generateAppCode(): string {
  // This will be the same code as our ApptunerMobileExpo but for bare React Native
  return `// @refresh reset
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';

export default function App() {
  const [scanning, setScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready to connect');
  const [DynamicComponent, setDynamicComponent] = useState<React.ComponentType | null>(null);
  const [showViewer, setShowViewer] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        console.log('🧹 Cleaning up WebSocket');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Execute received bundle
  const executeBundle = (bundleCode: string) => {
    try {
      console.log('Executing bundle...');

      // Create a new component from the code
      const Component = (() => {
        // eslint-disable-next-line no-eval
        eval(bundleCode);
        return eval('App');
      })();

      setDynamicComponent(() => Component);
      setShowViewer(false);
      console.log('Component created and mounted');
    } catch (error) {
      console.error('Bundle execution error:', error);
      Alert.alert('Execution Error', error instanceof Error ? error.message : 'Failed to execute bundle');
    }
  };

  const connectToRelay = (wsUrl: string) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('Connecting to relay...');

    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('Connected to relay');
      setConnected(true);
      setStatus('Connected! Waiting for bundle...');
    };

    websocket.onmessage = (event) => {
      console.log('📦 Received message from relay');
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'bundle_update') {
          console.log('✅ Bundle received!');

          if (data.payload?.code) {
            const sizeKB = Math.round(data.payload.code.length / 1024);
            setStatus(\`Loading bundle (\${sizeKB} KB)...\`);

            try {
              executeBundle(data.payload.code);
              setStatus(\`Bundle loaded (\${sizeKB} KB)\`);
              console.log('✅ Bundle executed successfully!');
            } catch (error) {
              console.error('❌ Bundle execution error:', error);
              setStatus('Bundle execution failed');
            }
          }
        } else if (data.type === 'connected') {
          console.log('✅ Connected as mobile client');
        }
      } catch (error) {
        console.error('❌ Error parsing message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('Connection error');
      setConnected(false);
    };

    websocket.onclose = () => {
      console.log('Disconnected from relay');
      setStatus('Disconnected');
      setConnected(false);
    };

    wsRef.current = websocket;
  };

  const handleConnect = () => {
    // For now, hardcoded. Later we'll add QR scanning
    const url = 'ws://192.168.1.1:8787/mobile/test-session';
    connectToRelay(url);
  };

  // If bundle is loaded, show the dynamic component instead of viewer UI
  if (!showViewer && DynamicComponent) {
    return <DynamicComponent />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Apptuner Viewer</Text>

        <View style={styles.statusBox}>
          {connected && <View style={styles.connectedDot} />}
          <Text style={styles.statusText}>{status}</Text>
        </View>

        {!connected && (
          <TouchableOpacity style={styles.button} onPress={handleConnect}>
            <Text style={styles.buttonText}>Connect to Desktop</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.hint}>
          Scan QR code from Apptuner desktop app
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 40,
  },
  statusBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  connectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
});
`;
}

function generateReadme(appName: string): string {
  return `# ${appName}

This is your custom Apptuner viewer app. It includes all the native modules from your project, allowing you to hot-reload your React Native app instantly.

## Setup

\`\`\`bash
npm install
cd ios && pod install && cd ..
\`\`\`

## Run on Device

\`\`\`bash
npm run ios
\`\`\`

Once installed, this app will connect to your Apptuner desktop app and receive bundle updates in real-time.

## Adding More Native Modules

If you add new native modules to your main project:

1. Re-run the viewer generator
2. Rebuild this app
3. Reinstall on your device

The JavaScript hot-reload will continue working with the new modules!
`;
}
