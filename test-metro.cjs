#!/usr/bin/env node
/**
 * Test Metro bundler independently
 * This script connects to Metro server and requests a bundle for test-app
 */

const WebSocket = require('ws');

const METRO_URL = 'ws://localhost:3031';
const PROJECT_PATH = 'test-app';
const ENTRY_POINT = 'App.tsx';

console.log('🧪 Testing Metro bundler...');
console.log(`📦 Project: ${PROJECT_PATH}`);
console.log(`📄 Entry: ${ENTRY_POINT}`);
console.log(`🔌 Connecting to ${METRO_URL}...`);

const ws = new WebSocket(METRO_URL);

ws.on('open', () => {
  console.log('✅ Connected to Metro server');
  console.log('📤 Requesting bundle...');

  ws.send(JSON.stringify({
    type: 'bundle',
    projectPath: PROJECT_PATH,
    entryPoint: ENTRY_POINT,
  }));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);

    if (message.type === 'bundle_ready') {
      const bundleSize = Math.round(message.code.length / 1024);
      console.log(`✅ Bundle received: ${bundleSize} KB`);

      // Check for common issues
      const hasReact = message.code.includes('React');
      const hasApp = message.code.includes('App');
      const hasNativeEventEmitter = message.code.includes('NativeEventEmitter');
      const hasErrors = message.code.includes('Error') || message.code.includes('ErrorOverlay');

      console.log('\n📊 Bundle analysis:');
      console.log(`  - Contains React: ${hasReact ? '✅' : '❌'}`);
      console.log(`  - Contains App: ${hasApp ? '✅' : '❌'}`);
      console.log(`  - Has NativeEventEmitter: ${hasNativeEventEmitter ? '⚠️  YES' : '✅ No'}`);
      console.log(`  - Is error bundle: ${hasErrors ? '❌ YES' : '✅ No'}`);

      // Save bundle to file for inspection
      const fs = require('fs');
      const outputPath = 'test-metro-bundle-output.js';
      fs.writeFileSync(outputPath, message.code);
      console.log(`\n💾 Bundle saved to: ${outputPath}`);
      console.log('You can inspect it to see what Metro produced.');

      if (hasErrors) {
        console.log('\n❌ Bundle appears to be an error bundle.');
        console.log('Check Metro server logs for the actual error.');
      } else if (hasNativeEventEmitter) {
        console.log('\n⚠️  Bundle contains NativeEventEmitter - this caused problems before.');
      } else {
        console.log('\n✅ Bundle looks good!');
      }

      ws.close();
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error parsing message:', error);
    ws.close();
    process.exit(1);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('🔌 Disconnected from Metro server');
});

// Timeout after 30 seconds
setTimeout(() => {
  console.error('❌ Timeout: Bundle took too long');
  ws.close();
  process.exit(1);
}, 30000);
