#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { startCommand } from './commands/start.js';
import { stopCommand } from './commands/stop.js';
import { statusCommand } from './commands/status.js';

const program = new Command();

program
  .name('apptuner')
  .description('Hot reload React Native apps instantly')
  .version('0.1.0');

program
  .command('start')
  .description('Start AppTuner development server')
  .argument('[path]', 'Path to your React Native project (or use -p)')
  .option('-p, --project <path>', 'Path to your React Native project', process.cwd())
  .option('--no-qr', 'Disable QR code display')
  .action((argPath, options) => {
    // Positional arg takes priority over -p flag
    if (argPath) options.project = argPath;
    startCommand(options);
  });

program
  .command('stop')
  .description('Stop all AppTuner services')
  .action(stopCommand);

program
  .command('status')
  .description('Show AppTuner connection status')
  .action(statusCommand);

program.parse();
