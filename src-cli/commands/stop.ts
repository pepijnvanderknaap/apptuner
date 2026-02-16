import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

export async function stopCommand() {
  console.log(chalk.yellow('\n⏹️  Stopping AppTuner...\n'));

  const pidFile = path.join(process.cwd(), '.apptuner-pids.json');

  try {
    const pidsData = await fs.readFile(pidFile, 'utf-8');
    const pids = JSON.parse(pidsData);

    if (pids.metro) {
      try {
        process.kill(-pids.metro, 'SIGTERM');
        console.log(chalk.gray('✓ Metro server stopped'));
      } catch (error) {
        console.log(chalk.gray('✓ Metro server already stopped'));
      }
    }

    if (pids.watcher) {
      try {
        process.kill(-pids.watcher, 'SIGTERM');
        console.log(chalk.gray('✓ File watcher stopped'));
      } catch (error) {
        console.log(chalk.gray('✓ File watcher already stopped'));
      }
    }

    await fs.unlink(pidFile);

    console.log(chalk.green('\n✅ All services stopped\n'));
  } catch (error) {
    console.log(chalk.gray('No running AppTuner services found.\n'));
  }
}
