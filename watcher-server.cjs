/**
 * File Watcher Server
 * Watches project files and notifies the browser via WebSocket when changes occur
 */

const chokidar = require('chokidar');
const WebSocket = require('ws');
const path = require('path');

const PORT = 3030;
const wss = new WebSocket.Server({ port: PORT });

console.log(`🔍 File watcher server running on ws://localhost:${PORT}`);

const clients = new Set();

wss.on('connection', (ws) => {
  console.log('✅ Browser connected to file watcher');
  clients.add(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'watch') {
        const projectPath = data.path;
        const customIgnored = data.ignored || [];
        const customExtensions = data.extensions || ['.js', '.jsx', '.ts', '.tsx', '.json'];

        console.log(`\n📁 Starting watch on: ${projectPath}`);
        console.log(`🔍 Watching extensions: ${customExtensions.join(', ')}`);

        // Default ignore patterns + custom ones
        const defaultIgnored = [
          '**/node_modules/**',
          '**/.git/**',
          '**/ios/**',
          '**/android/**',
          '**/dist/**',
          '**/build/**',
          '**/.expo/**',
          '**/__tests__/**',
          '**/coverage/**',
          '**/.next/**',
          '**/.cache/**',
          '**/*.log',
          '**/.DS_Store',
          '**/package-lock.json',
          '**/yarn.lock',
          '**/pnpm-lock.yaml',
          '**/.expo-shared/**',
          '**/metro-cache/**',
          '**/.bundle/**',
        ];

        const ignoredPatterns = [...defaultIgnored, ...customIgnored];
        console.log(`🚫 Ignoring ${ignoredPatterns.length} patterns`);

        // Create file watcher
        const watcher = chokidar.watch(projectPath, {
          ignored: ignoredPatterns,
          persistent: true,
          ignoreInitial: true,
          awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 50,
          },
        });

        let fileCount = 0;

        watcher.on('change', (filePath) => {
          const ext = path.extname(filePath);

          if (customExtensions.includes(ext)) {
            fileCount++;
            const relativePath = path.relative(projectPath, filePath);
            console.log(`📝 [${fileCount}] ${relativePath}`);

            ws.send(JSON.stringify({
              type: 'file_changed',
              path: filePath,
              relativePath: relativePath,
              extension: ext,
            }));
          }
        });

        watcher.on('ready', () => {
          console.log('✅ File watcher ready');
          ws.send(JSON.stringify({ type: 'watcher_ready' }));
        });

        watcher.on('error', (error) => {
          console.error('❌ Watcher error:', error);
          ws.send(JSON.stringify({
            type: 'watcher_error',
            error: error.message,
          }));
        });

        // Clean up watcher when client disconnects
        ws.on('close', () => {
          console.log('🔌 Browser disconnected, stopping watcher');
          watcher.close();
          clients.delete(ws);
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
});

console.log('Ready to watch files!');
