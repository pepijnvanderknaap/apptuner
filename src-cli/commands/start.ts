import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import net from 'net';
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

// Find a free port starting from the given port number
function findFreePort(start: number): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(start, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
    server.on('error', () => resolve(findFreePort(start + 1)));
  });
}

// Generate random 6-character ID
function generateId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Get or create a stable project ID stored in .apptuner.json
async function getOrCreateProjectId(projectPath: string): Promise<string> {
  const configPath = path.join(projectPath, '.apptuner.json');
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(raw);
    if (config.projectId) return config.projectId;
  } catch {
    // File doesn't exist or is invalid — create it
  }
  const projectId = generateId();
  await fs.writeFile(configPath, JSON.stringify({ projectId }, null, 2));
  return projectId;
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

  // Step 2: Get or create stable project ID (persisted in .apptuner.json)
  const sessionId = await getOrCreateProjectId(projectPath);
  spinner.succeed(`Project ID: ${chalk.cyan(sessionId)}`);

  // Step 3: Start local services
  console.log(chalk.white('\nStarting local services...\n'));

  // __dirname in compiled dist/cli.js is the dist/ folder, so go up one level to project root
  const rootDir = path.join(__dirname, '..');

  // Find free ports for Metro and Watcher
  const metroPort = await findFreePort(3031);
  const watcherPort = await findFreePort(3030);

  // Start Metro bundler
  spinner.start('Starting Metro bundler...');
  const metroProcess = spawn('node', [path.join(rootDir, 'metro-server.cjs')], {
    cwd: projectPath,
    stdio: 'inherit',
    detached: false,
    env: { ...process.env, METRO_PORT: String(metroPort) },
  });
  await new Promise(resolve => setTimeout(resolve, 2000));
  spinner.succeed(`Metro bundler started (port ${metroPort})`);

  // Start file watcher
  spinner.start('Starting file watcher...');
  const watcherProcess = spawn('node', [path.join(rootDir, 'watcher-server.cjs')], {
    cwd: projectPath,
    stdio: 'inherit',
    detached: false,
    env: { ...process.env, WATCHER_PORT: String(watcherPort) },
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
  spinner.succeed(`File watcher started (port ${watcherPort})`);

  // Step 4: Connect to relay with auto-reconnect
  const relayUrl = process.env.APPTUNER_RELAY_URL || 'wss://relay.apptuner.io';
  const isLocalTesting = relayUrl.includes('localhost') || relayUrl.includes('127.0.0.1');
  const projectName = encodeURIComponent(packageJson.name || 'Unnamed Project');
  // APPTUNER_DASHBOARD_URL lets you point at a local build (e.g. http://localhost:4173)
  // so fixes to BrowserApp take effect before the next apptuner.io deployment.
  const baseDashboardUrl = process.env.APPTUNER_DASHBOARD_URL ||
    (isLocalTesting ? 'http://localhost:1420' : 'https://apptuner.io');
  const dashboardUrl = `${baseDashboardUrl}/?session=${sessionId}&name=${projectName}`;

  let isShuttingDown = false;
  let isFirstConnect = true;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let currentWs: WebSocket | null = null;
  const relayAdapter = new RelayAdapter();

  // Step 5: Setup direct connections to local watcher + metro servers
  let autoReloadStarted = false;
  let bundleRequester: (() => void) | null = null; // Set by startAutoReload, used by relay handler

  async function startAutoReload() {
    if (autoReloadStarted) return;
    autoReloadStarted = true;

    // Clear Metro's cache for this project when starting a new session
    console.log(chalk.gray('🗑️  Clearing Metro cache for fresh session...'));
    try {
      await new Promise<void>((resolve, reject) => {
        const clearWs = new WebSocket(`ws://localhost:${metroPort}`);
        clearWs.on('open', () => {
          clearWs.send(JSON.stringify({
            type: 'clear_cache',
            projectPath,
          }));
        });
        clearWs.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'cache_cleared') {
            console.log(chalk.gray(`✓ Cleared ${msg.count} cached bundles`));
            clearWs.close();
            resolve();
          }
        });
        clearWs.on('error', () => reject());
        setTimeout(() => reject(new Error('Cache clear timeout')), 5000);
      });
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not clear Metro cache, continuing...'));
    }

    let isBundling = false;
    let pendingBundle = false;

    async function requestBundle(): Promise<void> {
      // also exposed via bundleRequester for external callers (e.g. mobile_connected)
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
          const metroWs = new WebSocket(`ws://localhost:${metroPort}`);

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

    // Expose requestBundle to relay handler so mobile_connected can trigger a fresh bundle
    bundleRequester = requestBundle;

    // Connect to watcher server
    const watcherWs = new WebSocket(`ws://localhost:${watcherPort}`);
    let watcherPingInterval: ReturnType<typeof setInterval> | null = null;

    watcherWs.on('open', () => {
      // Tell watcher to watch the project directory
      watcherWs.send(JSON.stringify({
        type: 'watch',
        path: projectPath,
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      }));

      // Keepalive pings every 20s to prevent idle timeout
      watcherPingInterval = setInterval(() => {
        if (watcherWs.readyState === watcherWs.OPEN) {
          watcherWs.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        }
      }, 20000);
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
      if (watcherPingInterval) {
        clearInterval(watcherPingInterval);
        watcherPingInterval = null;
      }
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
          // Send bundle to the newly connected device
          if (bundleRequester) {
            console.log(chalk.gray('📦 Sending bundle to new device...'));
            bundleRequester();
          }
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

    // Kill Metro and Watcher processes forcefully
    if (metroProcess.pid) {
      try {
        process.kill(metroProcess.pid, 'SIGKILL');
      } catch (e) {
        // Process might already be dead
      }
    }

    if (watcherProcess.pid) {
      try {
        process.kill(watcherProcess.pid, 'SIGKILL');
      } catch (e) {
        // Process might already be dead
      }
    }

    // Give processes time to die before exiting
    await new Promise(resolve => setTimeout(resolve, 500));

    await fs.unlink(pidFile).catch(() => {});

    console.log(chalk.gray('All services stopped.\n'));
    process.exit(0);
  });
}
