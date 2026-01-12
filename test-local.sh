#!/bin/bash

# Apptuner Local Testing Script
# Starts all components for local testing

set -e

echo "🚀 Starting Apptuner Local Test Environment"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if test project exists
if [ ! -d "/tmp/test-rn-app" ]; then
    echo -e "${YELLOW}⚠️  Test project not found. Creating...${NC}"
    mkdir -p /tmp/test-rn-app

    cat > /tmp/test-rn-app/package.json << 'EOF'
{
  "name": "test-rn-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-native": "^0.72.0"
  }
}
EOF

    cat > /tmp/test-rn-app/App.tsx << 'EOF'
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello from Apptuner!</Text>
      <Text style={styles.subtitle}>Edit this file to see live updates</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#86868b',
  },
});
EOF
    echo -e "${GREEN}✓ Test project created at /tmp/test-rn-app${NC}"
fi

# Check dependencies
echo ""
echo -e "${BLUE}📦 Checking dependencies...${NC}"

if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
fi

if [ ! -d "relay/node_modules" ]; then
    echo "Installing relay dependencies..."
    cd relay && npm install && cd ..
fi

echo -e "${GREEN}✓ Dependencies ready${NC}"

# Start relay in background
echo ""
echo -e "${BLUE}🌐 Starting Cloudflare Workers relay...${NC}"
cd relay
npm run dev > ../relay.log 2>&1 &
RELAY_PID=$!
cd ..

# Wait for relay to start
echo "Waiting for relay to start..."
sleep 3

# Check relay health
if curl -s http://localhost:8787/health > /dev/null; then
    echo -e "${GREEN}✓ Relay running at http://localhost:8787${NC}"
    echo "  View logs: tail -f relay.log"
else
    echo -e "${YELLOW}⚠️  Relay may not have started. Check relay.log${NC}"
fi

# Instructions
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Apptuner Test Environment Ready!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo "1️⃣  Start Desktop App:"
echo "   npm run tauri dev"
echo ""
echo "2️⃣  Start Mobile App (separate terminal):"
echo "   cd mobile"
echo "   npm run ios    # or npm run android"
echo ""
echo "3️⃣  Test the flow:"
echo "   • Desktop: Select /tmp/test-rn-app"
echo "   • Mobile: Scan QR code (or use test button)"
echo "   • Edit: Open /tmp/test-rn-app/App.tsx"
echo "   • Watch: Changes appear on mobile!"
echo ""
echo -e "${YELLOW}📝 See TESTING.md for detailed testing guide${NC}"
echo ""
echo -e "${BLUE}To stop relay:${NC}"
echo "   kill $RELAY_PID"
echo ""

# Save PID for cleanup
echo $RELAY_PID > .relay.pid

echo -e "${GREEN}Happy testing! 🚀${NC}"
