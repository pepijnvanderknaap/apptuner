import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { detectNativeModules } from './detect-modules.js';
import { generateViewerApp } from './generate-app.js';

interface CreateViewerOptions {
  output: string;
  name: string;
}

export async function createViewerApp(projectPath: string, options: CreateViewerOptions) {
  const spinner = ora();

  // Step 1: Validate project
  spinner.start('Validating React Native project...');
  const packageJsonPath = path.join(projectPath, 'package.json');

  try {
    await fs.access(packageJsonPath);
  } catch {
    spinner.fail('No package.json found in project directory');
    throw new Error(`Could not find package.json at ${projectPath}`);
  }

  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

  if (!packageJson.dependencies?.['react-native']) {
    spinner.fail('Not a React Native project');
    throw new Error('This does not appear to be a React Native project (no react-native dependency)');
  }

  spinner.succeed('Project validated');

  // Step 2: Detect native modules
  spinner.start('Detecting native modules...');
  const nativeModules = await detectNativeModules(packageJson);
  spinner.succeed(`Found ${nativeModules.length} native module(s)`);

  if (nativeModules.length > 0) {
    console.log(chalk.cyan('\n📦 Native modules detected:'));
    nativeModules.forEach(mod => {
      console.log(chalk.gray(`  • ${mod.name} ${chalk.dim(`(${mod.version})`)}`));
    });
  } else {
    console.log(chalk.yellow('\n⚠️  No native modules detected. Viewer will use base React Native only.'));
  }

  // Step 3: Generate viewer app
  spinner.start('Generating viewer app...');
  await generateViewerApp({
    outputPath: options.output,
    appName: options.name,
    nativeModules,
    reactNativeVersion: packageJson.dependencies['react-native'],
  });
  spinner.succeed('Viewer app generated');

  // Step 4: Show next steps
  console.log(chalk.green.bold('\n✅ Viewer app created successfully!\n'));
  console.log(chalk.white('Next steps:\n'));
  console.log(chalk.cyan(`  1. cd ${options.output}`));
  console.log(chalk.cyan('  2. npm install'));
  console.log(chalk.cyan('  3. cd ios && pod install && cd ..'));
  console.log(chalk.cyan('  4. npm run ios'));
  console.log(chalk.gray('\n  Once installed on your device, you can use it to hot-reload your app!'));
}
