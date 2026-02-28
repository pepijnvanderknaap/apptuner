import { WebSocket } from 'ws';

const relayUrl = 'wss://relay.apptuner.io/cli/TEST123';
console.log(`Testing connection to: ${relayUrl}`);

const ws = new WebSocket(relayUrl);

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully!');
  console.log('Sending ping...');
  ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));

  setTimeout(() => {
    console.log('Closing connection...');
    ws.close();
  }, 2000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📩 Received message:', message);
  } catch (error) {
    console.log('📩 Received:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`Connection closed: ${code} ${reason || ''}`);
  process.exit(code === 1000 ? 0 : 1);
});

// Timeout after 5 seconds
setTimeout(() => {
  console.error('⏱️  Connection timeout');
  ws.close();
  process.exit(1);
}, 5000);
