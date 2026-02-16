import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import qrcode from 'qrcode-terminal';
import { WebSocket } from 'ws';

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

  // Step 4: Display QR code
  if (options.qr) {
    const qrData = `apptuner://connect/${sessionId}`;
    console.log(chalk.white('\n📱 Scan this QR code with AppTuner mobile app:\n'));
    qrcode.generate(qrData, { small: true });
    console.log(chalk.gray(`\nOr enter code manually: ${chalk.white(sessionId)}\n`));
  }

  // Step 5: Start services
  console.log(chalk.white('Starting services...\n'));

  // Start Metro server
  spinner.start('Starting Metro bundler...');
  const metroProcess = spawn('node', [path.join(__dirname, '../../metro-server.cjs')], {
    cwd: projectPath,
    stdio: 'pipe',
    detached: true,
  });

  metroProcess.unref();

  // Give Metro a moment to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  spinner.succeed('Metro bundler started (port 3031)');

  // Start file watcher
  spinner.start('Starting file watcher...');
  const watcherProcess = spawn('node', [path.join(__dirname, '../../watcher-server.cjs')], {
    cwd: projectPath,
    stdio: 'pipe',
    detached: true,
  });

  watcherProcess.unref();

  await new Promise(resolve => setTimeout(resolve, 1000));
  spinner.succeed('File watcher started (port 3030)');

  // Step 6: Connect to relay
  spinner.start('Connecting to relay server...');

  const relayUrl = process.env.APPTUNER_RELAY_URL || 'wss://relay.apptuner.io';
  const ws = new WebSocket(`${relayUrl}/desktop/${sessionId}`);

  ws.on('open', () => {
    spinner.succeed('Connected to relay');

    console.log(chalk.green.bold('\n✅ AppTuner is running!\n'));
    console.log(chalk.white('Waiting for mobile connection...'));
    console.log(chalk.gray('\nPress Ctrl+C to stop\n'));
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
      process.kill(-metroProcess.pid, 'SIGTERM');
    }

    if (watcherProcess.pid) {
      process.kill(-watcherProcess.pid, 'SIGTERM');
    }

    await fs.unlink(pidFile).catch(() => {});

    console.log(chalk.gray('All services stopped.\n'));
    process.exit(0);
  });
}
