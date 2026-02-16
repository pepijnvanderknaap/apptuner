import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import { WebSocket } from 'ws';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

  // Step 2: TODO - Check payment/subscription status
  // For now, skip auth for development

  // Step 3: Generate session ID
  const sessionId = generateSessionId();
  spinner.succeed(`Session ID: ${chalk.cyan(sessionId)}`);

  // Step 4: Start services locally
  console.log(chalk.white('\nStarting local services...\n'));

  // Find the root directory (where metro-server.cjs lives)
  const rootDir = path.join(__dirname, '../../..');

  // Start Metro server
  spinner.start('Starting Metro bundler...');
  const metroProcess = spawn('node', [path.join(rootDir, 'metro-server.cjs')], {
    cwd: projectPath,
    stdio: 'inherit',
    detached: false,
  });

  // Give Metro a moment to start
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

  // Step 5: Connect to relay as CLI client
  spinner.start('Connecting to relay server...');

  const relayUrl = process.env.APPTUNER_RELAY_URL || 'wss://relay.apptuner.io';
  const ws = new WebSocket(`${relayUrl}/cli/${sessionId}`);

  ws.on('open', () => {
    spinner.succeed('Connected to relay');

    console.log(chalk.green.bold('\n✅ AppTuner is running!\n'));
    console.log(chalk.white(`Dashboard: ${chalk.cyan(`https://apptuner.io/dashboard?session=${sessionId}`)}`));
    console.log(chalk.gray('\nOpening browser...\n'));

    // Open browser to dashboard
    const dashboardUrl = `https://apptuner.io/dashboard?session=${sessionId}`;
    const openCommand = process.platform === 'darwin' ? 'open' :
                       process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${openCommand} "${dashboardUrl}"`);
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

      // Handle commands from dashboard
      if (message.type === 'command' && message.command === 'bundle') {
        console.log(chalk.cyan('\n📦 Dashboard requested bundle...'));
        // Metro and watcher will handle this automatically
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('error', (error) => {
    spinner.fail('Relay connection failed');
    console.error(chalk.red('\n❌ Could not connect to relay server'));
    console.error(chalk.gray(error.message));
    process.exit(1);
  });

  ws.on('close', () => {
    console.log(chalk.yellow('\n⚠️  Disconnected from relay'));
  });

  // Save PIDs for cleanup
  const pidFile = path.join(process.cwd(), '.apptuner-pids.json');
  await fs.writeFile(pidFile, JSON.stringify({
    metro: metroProcess.pid,
    watcher: watcherProcess.pid,
    sessionId,
  }, null, 2));

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\n⏹️  Stopping AppTuner...'));

    ws.close();

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
