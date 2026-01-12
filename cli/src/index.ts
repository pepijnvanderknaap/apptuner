#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createViewerApp } from './create-viewer.js';

const program = new Command();

program
  .name('create-apptuner-viewer')
  .description('Create a custom Apptuner viewer app for your React Native project')
  .version('0.1.0')
  .argument('[project-path]', 'Path to your React Native project', '.')
  .option('-o, --output <path>', 'Output directory for viewer app', './apptuner-viewer')
  .option('-n, --name <name>', 'Name for the viewer app', 'ApptunerViewer')
  .action(async (projectPath: string, options) => {
    console.log(chalk.blue.bold('\n🚀 Apptuner Viewer Generator\n'));

    try {
      await createViewerApp(projectPath, options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
