import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Build MCP server with esbuild — bundle everything (runs via npx, nothing pre-installed)
await build({
  entryPoints: ['src-mcp/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist-mcp/mcp.js',
  banner: { js: '#!/usr/bin/env node' },
  sourcemap: true,
});

fs.chmodSync(join(__dirname, 'dist-mcp/mcp.js'), 0o755);
console.log('✅ MCP server built successfully → dist-mcp/mcp.js');
