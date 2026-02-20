const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const WebSocket = require('ws');

const PORT = 3031;
const wss = new WebSocket.Server({ port: PORT });

console.log(`📦 Metro bundler server running on ws://localhost:${PORT}`);

const clients = new Set();

// Bundle cache: cacheKey -> { bundle, sourceHash }
// sourceHash is a hash of all source file mtimes - if files haven't changed, we skip rebuild
const bundleCache = new Map();

/**
 * Compute a hash of source file modification times in a project directory.
 * If no source files have been modified since last build, the hash will be identical.
 */
function getSourceHash(projectPath) {
  const sourceExts = ['.js', '.jsx', '.ts', '.tsx', '.json'];
  const hash = crypto.createHash('md5');

  function scanDir(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' ||
          entry.name === 'ios' || entry.name === 'android' ||
          entry.name === 'dist' || entry.name === 'build') continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (sourceExts.includes(path.extname(entry.name))) {
        try {
          const stat = fs.statSync(fullPath);
          hash.update(`${fullPath}:${stat.mtimeMs}`);
        } catch {
          // ignore
        }
      }
    }
  }

  scanDir(path.resolve(projectPath));
  return hash.digest('hex');
}

wss.on('connection', (ws) => {
  console.log('✅ Browser connected to Metro server');
  clients.add(ws);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'bundle') {
        const { projectPath, entryPoint = 'App.tsx' } = data;
        console.log(`📦 Bundle request for: ${projectPath}/${entryPoint}`);

        const cacheKey = `${projectPath}::${entryPoint}`;
        const currentHash = getSourceHash(projectPath);
        const cached = bundleCache.get(cacheKey);

        if (cached && cached.sourceHash === currentHash) {
          console.log(`⚡ Cache hit - no source changes detected, skipping rebuild`);
          ws.send(JSON.stringify({
            type: 'bundle_ready',
            code: cached.bundle,
            projectPath,
            fromCache: true,
          }));
          console.log(`✅ Cached bundle served (${Math.round(cached.bundle.length / 1024)} KB)`);
          return;
        }

        try {
          const bundle = await bundleProject(projectPath, entryPoint);

          // Cache the result with the source hash
          bundleCache.set(cacheKey, { bundle, sourceHash: currentHash });

          ws.send(JSON.stringify({
            type: 'bundle_ready',
            code: bundle,
            projectPath,
          }));

          console.log(`✅ Bundle ready (${Math.round(bundle.length / 1024)} KB)`);
        } catch (error) {
          console.error('❌ Bundling error:', error);

          // Create an error bundle - a JavaScript bundle that displays the error
          const errorBundle = createErrorBundle(error);

          // Send the error bundle as a regular bundle
          // The phone will execute it and show the error screen
          ws.send(JSON.stringify({
            type: 'bundle_ready',
            code: errorBundle,
            projectPath,
          }));

          console.log('📦 Error bundle sent to display error on device');
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Browser disconnected from Metro server');
    clients.delete(ws);
  });
});

async function bundleProject(projectPath, entryPoint) {
  const absoluteProjectPath = path.resolve(projectPath);
  // metro-bundle.cjs lives alongside metro-server.cjs in the AppTuner installation.
  // This works both in local dev (project root) and when installed globally via npm.
  const bundleScript = path.join(__dirname, 'metro-bundle.cjs');

  console.log(`📁 Project path: ${absoluteProjectPath}`);
  console.log(`📄 Entry point: ${entryPoint}`);
  console.log(`🚀 Spawning Metro bundler...`);

  return new Promise((resolve, reject) => {
    // Pass projectPath and entryPoint as arguments so metro-bundle.js can find
    // the project's metro.config.js and entry file regardless of where it's installed.
    const proc = spawn('node', [bundleScript, absoluteProjectPath, entryPoint], {
      cwd: absoluteProjectPath,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    let bundleCode = '';
    let capturing = false;

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;

      if (text.includes('__BUNDLE_START__')) {
        capturing = true;
        return;
      }
      if (text.includes('__BUNDLE_END__')) {
        capturing = false;
        return;
      }
      if (capturing) {
        bundleCode += text;
      } else {
        // Log Metro output
        console.log(text.trim());
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(data.toString());
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        // Try to parse JSON error from stderr
        try {
          const lines = stderr.split('\n');
          for (const line of lines) {
            if (line.startsWith('{')) {
              const errorInfo = JSON.parse(line);
              // Create error with proper structure
              const error = new Error(errorInfo.message || 'Metro bundling error');
              error.filename = errorInfo.filename;
              error.lineNumber = errorInfo.lineNumber;
              error.column = errorInfo.column;
              error.stack = errorInfo.stack;
              reject(error);
              return;
            }
          }
        } catch (parseError) {
          // If JSON parsing fails, fall back to regular error
        }
        reject(new Error(`Metro bundler exited with code ${code}\n${stderr}`));
      } else {
        console.log(`✅ Bundle ready (${Math.round(bundleCode.length / 1024)} KB)`);
        resolve(bundleCode);
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

function createErrorBundle(error) {
  // Extract error details
  const message = error.message || 'Unknown bundling error';
  const stack = error.stack || '';
  const filename = error.filename || 'Unknown file';
  const lineNumber = error.lineNumber || 0;
  const column = error.column || 0;

  // Create a bundle that renders an error screen
  // This will be executed on the phone just like a normal bundle
  const errorBundle = `
// Error overlay bundle - match normal bundle structure
console.log('[ErrorBundle] Starting...');

// Access React and ReactNative exactly like normal bundles do
const React = global.React;
const ReactNative = global.ReactNative;

console.log('[ErrorBundle] React:', !!React);
console.log('[ErrorBundle] ReactNative:', !!ReactNative);

if (!React || !ReactNative) {
  console.error('[ErrorBundle] ERROR: Cannot find React/ReactNative!');
  return;
}

  const { View, Text, StyleSheet, ScrollView, TouchableOpacity } = ReactNative;

  // ErrorOverlay component embedded in the bundle
  function ErrorOverlay() {
    const error = ${JSON.stringify({ message, stack, filename, lineNumber, column })};

    return React.createElement(View, { style: styles.overlay },
      React.createElement(View, { style: styles.header },
        React.createElement(Text, { style: styles.headerTitle }, 'Bundle Error'),
        React.createElement(TouchableOpacity,
          {
            style: styles.dismissButton,
            onPress: () => console.log('Error overlay dismissed')
          },
          React.createElement(Text, { style: styles.dismissText }, '✕')
        )
      ),
      React.createElement(ScrollView, { style: styles.content },
        error.filename && React.createElement(View, { style: styles.locationBox },
          React.createElement(Text, { style: styles.filename }, error.filename),
          error.lineNumber !== undefined && React.createElement(Text, { style: styles.location },
            'Line ' + error.lineNumber + (error.column !== undefined ? ':' + error.column : '')
          )
        ),
        React.createElement(View, { style: styles.errorBox },
          React.createElement(Text, { style: styles.errorLabel }, 'Error Message:'),
          React.createElement(Text, { style: styles.errorMessage }, error.message)
        ),
        error.stack && React.createElement(View, { style: styles.stackBox },
          React.createElement(Text, { style: styles.stackLabel }, 'Stack Trace:'),
          React.createElement(Text, { style: styles.stackTrace }, error.stack)
        ),
        React.createElement(View, { style: styles.helpBox },
          React.createElement(Text, { style: styles.helpText },
            '💡 Fix the error in your code and save. The app will automatically reload.'
          )
        )
      )
    );
  }

  const styles = StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#1a1a1a',
      zIndex: 9999,
    },
    header: {
      backgroundColor: '#d32f2f',
      padding: 20,
      paddingTop: 60,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      color: '#fff',
      fontSize: 24,
      fontWeight: 'bold',
    },
    dismissButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    dismissText: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
    },
    content: {
      flex: 1,
      padding: 20,
    },
    locationBox: {
      backgroundColor: '#2a2a2a',
      padding: 16,
      borderRadius: 8,
      marginBottom: 16,
    },
    filename: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'Courier',
      marginBottom: 4,
    },
    location: {
      color: '#ff9800',
      fontSize: 14,
      fontFamily: 'Courier',
    },
    errorBox: {
      backgroundColor: '#2a2a2a',
      padding: 16,
      borderRadius: 8,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: '#d32f2f',
    },
    errorLabel: {
      color: '#999',
      fontSize: 12,
      textTransform: 'uppercase',
      marginBottom: 8,
      fontWeight: '600',
    },
    errorMessage: {
      color: '#fff',
      fontSize: 15,
      lineHeight: 22,
      fontFamily: 'Courier',
    },
    stackBox: {
      backgroundColor: '#2a2a2a',
      padding: 16,
      borderRadius: 8,
      marginBottom: 16,
    },
    stackLabel: {
      color: '#999',
      fontSize: 12,
      textTransform: 'uppercase',
      marginBottom: 8,
      fontWeight: '600',
    },
    stackTrace: {
      color: '#aaa',
      fontSize: 12,
      lineHeight: 18,
      fontFamily: 'Courier',
    },
    helpBox: {
      backgroundColor: '#1e3a5f',
      padding: 16,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: '#2196f3',
    },
    helpText: {
      color: '#90caf9',
      fontSize: 14,
      lineHeight: 20,
    },
  });

  // Export the ErrorOverlay as the app - try multiple ways
  if (typeof global !== 'undefined') {
    global.App = ErrorOverlay;
    console.log('[ErrorBundle] Set global.App');
  }
  if (typeof window !== 'undefined') {
    window.App = ErrorOverlay;
    console.log('[ErrorBundle] Set window.App');
  }
  this.App = ErrorOverlay;
  console.log('[ErrorBundle] Set this.App');

  console.log('[ErrorBundle] Error overlay ready to display');
}.call(this, (typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : this))));
`;

  return errorBundle;
}

console.log('Ready to bundle projects!');
