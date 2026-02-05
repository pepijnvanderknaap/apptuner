import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  publicDir: 'public',
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**', '**/test-app/**', '**/mobile/**', '**/relay/**', '**/public/test-bundle.js'],
    },
    fs: {
      // Allow serving files from test-app directory
      allow: ['..'],
    },
  },
  define: {
    'process.env': {},
    'process.versions': {},
    'process.versions.node': JSON.stringify('18.0.0'),
  },
  optimizeDeps: {
    exclude: ['esbuild'],
  },
});
