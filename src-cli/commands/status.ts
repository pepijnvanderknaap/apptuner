import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

export async function statusCommand() {
  console.log(chalk.blue.bold('\n📊 AppTuner Status\n'));

  const pidFile = path.join(process.cwd(), '.apptuner-pids.json');

  try {
    const pidsData = await fs.readFile(pidFile, 'utf-8');
    const pids = JSON.parse(pidsData);

    console.log(chalk.white('Services:'));

    // Check if processes are actually running
    let metroRunning = false;
    let watcherRunning = false;

    if (pids.metro) {
      try {
        process.kill(pids.metro, 0); // Check if process exists
        metroRunning = true;
      } catch {
        metroRunning = false;
      }
    }

    if (pids.watcher) {
      try {
        process.kill(pids.watcher, 0);
        watcherRunning = true;
      } catch {
        watcherRunning = false;
      }
    }

    console.log(
      `  ${metroRunning ? chalk.green('●') : chalk.red('●')} Metro bundler ${
        metroRunning ? chalk.gray('(port 3031)') : chalk.gray('(stopped)')
      }`
    );

    console.log(
      `  ${watcherRunning ? chalk.green('●') : chalk.red('●')} File watcher ${
        watcherRunning ? chalk.gray('(port 3030)') : chalk.gray('(stopped)')
      }`
    );

    if (pids.sessionId) {
      console.log(chalk.white(`\nSession: ${chalk.cyan(pids.sessionId)}`));
    }

    if (metroRunning && watcherRunning) {
      console.log(chalk.green('\n✅ AppTuner is running\n'));
    } else {
      console.log(chalk.yellow('\n⚠️  Some services are not running\n'));
    }
  } catch (error) {
    console.log(chalk.gray('  No running services\n'));
    console.log(chalk.gray('Run `apptuner start` to begin.\n'));
  }
}
