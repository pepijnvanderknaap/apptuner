import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import { WebSocket } from 'ws';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StartOptions {
  project: string;
  qr: boolean;
}

// Generate random 6-character session ID
function generateSessionId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Adapter that wraps the relay WebSocket for sending bundles - supports hot-swapping on reconnect
class RelayAdapter {
  private ws: WebSocket | null = null;

  updateWebSocket(ws: WebSocket): void {
    this.ws = ws;
  }

  sendBundleUpdate(bundleCode: string): void {
    if (!this.ws || this.ws.readyState !== this.ws.OPEN) {
      console.warn(chalk.yellow('⚠️  Cannot send bundle - relay not connected'));
      return;
    }
    this.ws.send(JSON.stringify({
      type: 'bundle_update',
      payload: { code: bundleCode },
      timestamp: Date.now(),
    }));
  }
}

export async function startCommand(options: StartOptions) {
  const spinner = ora();

  console.log(chalk.blue.bold('\n🚀 AppTuner\n'));

  // Step 1: Validate project
  spinner.start('Validating React Native project...');
  const projectPath = path.resolve(options.project);
  const packageJsonPath = path.join(projectPath, 'package.json');

  try {
    await fs.access(packageJsonPath);
  } catch {
    spinner.fail('No package.json found');
    console.error(chalk.red(`\n❌ Could not find package.json at ${projectPath}`));
    console.log(chalk.gray('\nMake sure you\'re in a React Native project directory.\n'));
    process.exit(1);
  }

  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

  if (!packageJson.dependencies?.['react-native']) {
    spinner.fail('Not a React Native project');
    console.error(chalk.red('\n❌ This is not a React Native project'));
    console.log(chalk.gray('No react-native dependency found in package.json\n'));
    process.exit(1);
  }

  spinner.succeed(`Project validated: ${chalk.cyan(packageJson.name || 'Unnamed Project')}`);

  // Step 2: Generate session ID (stays the same across reconnects)
  const sessionId = generateSessionId();
  spinner.succeed(`Session ID: ${chalk.cyan(sessionId)}`);

  // Step 3: Start local services
  console.log(chalk.white('\nStarting local services...\n'));

  // __dirname in compiled dist/cli.js is the dist/ folder, so go up one level to project root
  const rootDir = path.join(__dirname, '..');

  // Start Metro bundler
  spinner.start('Starting Metro bundler...');
  const metroProcess = spawn('node', [path.join(rootDir, 'metro-server.cjs')], {
    cwd: projectPath,
    stdio: 'inherit',
    detached: false,
  });
  await new Promise(resolve => setTimeout(resolve, 2000));
  spinner.succeed('Metro bundler started (port 3031)');

  // Start file watcher
  spinner.start('Starting file watcher...');
  const watcherProcess = spawn('node', [path.join(rootDir, 'watcher-server.cjs')], {
    cwd: projectPath,
    stdio: 'inherit',
    detached: false,
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
  spinner.succeed('File watcher started (port 3030)');

  // Step 4: Connect to relay with auto-reconnect
  const relayUrl = process.env.APPTUNER_RELAY_URL || 'wss://relay.apptuner.io';
  const isLocalTesting = relayUrl.includes('localhost') || relayUrl.includes('127.0.0.1');
  const dashboardUrl = isLocalTesting
    ? `http://localhost:1420/?session=${sessionId}`
    : `https://apptuner.io/?session=${sessionId}`;

  let isShuttingDown = false;
  let isFirstConnect = true;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let currentWs: WebSocket | null = null;
  const relayAdapter = new RelayAdapter();

  // Step 5: Setup direct connections to local watcher + metro servers
  let autoReloadStarted = false;

  async function startAutoReload() {
    if (autoReloadStarted) return;
    autoReloadStarted = true;

    let isBundling = false;
    let pendingBundle = false;

    async function requestBundle(): Promise<void> {
      if (isBundling) {
        pendingBundle = true;
        return;
      }
      isBundling = true;
      pendingBundle = false;

      const startTime = Date.now();
      console.log(chalk.gray('📦 Bundling...'));

      try {
        const code = await new Promise<string>((resolve, reject) => {
          const metroWs = new WebSocket('ws://localhost:3031');

          metroWs.on('open', () => {
            metroWs.send(JSON.stringify({
              type: 'bundle',
              projectPath,
              entryPoint: 'App.tsx',
            }));
          });

          metroWs.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'bundle_ready') {
              metroWs.close();
              if (msg.fromCache) {
                console.log(chalk.gray('⚡ No changes — using cached bundle'));
              }
              resolve(msg.code);
            } else if (msg.type === 'bundle_error') {
              metroWs.close();
              reject(new Error(
                typeof msg.error === 'object' ? msg.error.message : (msg.error || 'Bundle failed')
              ));
            }
          });

          metroWs.on('error', (err) => reject(err));

          // 60s timeout for large projects
          setTimeout(() => reject(new Error('Bundle timeout (60s)')), 60000);
        });

        const sizeKB = Math.round(code.length / 1024);
        const timeMs = Date.now() - startTime;
        relayAdapter.sendBundleUpdate(code);
        console.log(chalk.cyan(`📦 Bundle sent: ${chalk.white(sizeKB + ' KB')} in ${chalk.white(timeMs + 'ms')}`));
      } catch (error: any) {
        console.error(chalk.red('❌ Bundle error:'), error.message);
      }

      isBundling = false;

      // If another change came in while bundling, run again
      if (pendingBundle) {
        requestBundle();
      }
    }

    // Connect to watcher server
    const watcherWs = new WebSocket('ws://localhost:3030');

    watcherWs.on('open', () => {
      // Tell watcher to watch the project directory
      watcherWs.send(JSON.stringify({
        type: 'watch',
        path: projectPath,
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      }));
    });

    watcherWs.on('message', async (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'watcher_ready') {
        console.log(chalk.green('✅ Auto-reload active - edit your files to see changes!\n'));
        // Send initial bundle
        requestBundle();
      } else if (msg.type === 'file_changed') {
        console.log(chalk.yellow(`📝 ${msg.relativePath} changed`));
        requestBundle();
      }
    });

    watcherWs.on('error', (err) => {
      console.error(chalk.red('Watcher error:'), err.message);
    });

    watcherWs.on('close', () => {
      if (!isShuttingDown) {
        console.log(chalk.yellow('Watcher disconnected'));
      }
    });
  }

  function connectToRelay() {
    if (isShuttingDown) return;

    spinner.start('Connecting to relay server...');
    const ws = new WebSocket(`${relayUrl}/cli/${sessionId}`);
    currentWs = ws;

    let pingInterval: ReturnType<typeof setInterval> | null = null;

    ws.on('open', async () => {
      relayAdapter.updateWebSocket(ws);

      if (isFirstConnect) {
        spinner.succeed('Connected to relay');
        isFirstConnect = false;

        console.log(chalk.green.bold('\n✅ AppTuner is running!\n'));
        console.log(chalk.white(`Dashboard: ${chalk.cyan(dashboardUrl)}`));
        console.log(chalk.gray('\nOpening browser...\n'));

        const openCommand = process.platform === 'darwin' ? 'open' :
                           process.platform === 'win32' ? 'start' : 'xdg-open';
        exec(`${openCommand} "${dashboardUrl}"`);

        await startAutoReload();
      } else {
        spinner.succeed('Reconnected to relay');
        console.log(chalk.green('✅ Relay reconnected\n'));
      }

      // Keepalive pings every 20s (Cloudflare drops idle WS after ~30s)
      pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        }
      }, 20000);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'mobile_connected') {
          console.log(chalk.green(`\n📱 Mobile device connected: ${message.deviceName || 'Unknown'}`));
        }
        if (message.type === 'mobile_disconnected') {
          console.log(chalk.yellow(`\n📱 Mobile device disconnected`));
        }
      } catch (error) {
        console.error('Error parsing relay message:', error);
      }
    });

    ws.on('error', (error) => {
      if (isFirstConnect) {
        spinner.fail('Relay connection failed');
        console.error(chalk.red('\n❌ Could not connect to relay server'));
        console.error(chalk.gray(error.message));
      }
      // close event fires after error, triggering reconnect
    });

    ws.on('close', (code) => {
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }

      if (isShuttingDown) return;

      if (isFirstConnect) {
        console.error(chalk.red(`\n❌ Failed to connect to relay (code ${code})`));
        process.exit(1);
      }

      console.log(chalk.yellow(`\n⚠️  Relay disconnected (code ${code}), reconnecting in 5s...`));
      reconnectTimeout = setTimeout(connectToRelay, 5000);
    });
  }

  // Start relay connection
  connectToRelay();

  // Save PIDs for cleanup
  const pidFile = path.join(process.cwd(), '.apptuner-pids.json');
  await fs.writeFile(pidFile, JSON.stringify({
    metro: metroProcess.pid,
    watcher: watcherProcess.pid,
    sessionId,
  }, null, 2));

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\n⏹️  Stopping AppTuner...'));

    isShuttingDown = true;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (currentWs) {
      currentWs.close();
    }

    if (metroProcess.pid) {
      process.kill(metroProcess.pid, 'SIGTERM');
    }

    if (watcherProcess.pid) {
      process.kill(watcherProcess.pid, 'SIGTERM');
    }

    await fs.unlink(pidFile).catch(() => {});

    console.log(chalk.gray('All services stopped.\n'));
    process.exit(0);
  });
}
