import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Build CLI with esbuild
await build({
  entryPoints: ['src-cli/cli.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/cli.js',
  external: [
    'chalk',
    'ora',
    'commander',
    'ws',
    'qrcode-terminal'
  ],
  sourcemap: true,
});

// Make CLI executable
fs.chmodSync(join(__dirname, 'dist/cli.js'), 0o755);

console.log('✅ CLI built successfully');
