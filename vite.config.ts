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
    // Explicitly inject Supabase environment variables from Coolify
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
  },
  optimizeDeps: {
    exclude: ['esbuild', 'react-native'],
    entries: ['src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}', '!test-app/**', '!mobile/**'],
  },
});
