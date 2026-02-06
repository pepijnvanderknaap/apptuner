#!/bin/bash

# Start all AppTuner services in the background
# This keeps everything running in one terminal

echo "🚀 Starting AppTuner services..."

# Kill any existing processes on our ports
echo "Cleaning up existing processes..."
lsof -ti:1420 | xargs kill -9 2>/dev/null
lsof -ti:3030 | xargs kill -9 2>/dev/null
lsof -ti:3031 | xargs kill -9 2>/dev/null
lsof -ti:8787 | xargs kill -9 2>/dev/null
sleep 2

# Create logs directory
mkdir -p logs

# Start desktop app
echo "Starting desktop app (port 1420)..."
npm run dev > logs/desktop.log 2>&1 &
DESKTOP_PID=$!

# Start watcher server
echo "Starting watcher server (port 3030)..."
node watcher-server.cjs > logs/watcher.log 2>&1 &
WATCHER_PID=$!

# Start metro server
echo "Starting metro server (port 3031)..."
node metro-server.cjs > logs/metro.log 2>&1 &
METRO_PID=$!

# Start relay server
echo "Starting relay server (port 8787)..."
cd relay && npm run dev > ../logs/relay.log 2>&1 &
RELAY_PID=$!
cd ..

sleep 3

echo ""
echo "✅ All services started!"
echo ""
echo "📊 Process IDs:"
echo "  Desktop: $DESKTOP_PID"
echo "  Watcher: $WATCHER_PID"
echo "  Metro: $METRO_PID"
echo "  Relay: $RELAY_PID"
echo ""
echo "🌐 URLs:"
echo "  Desktop: http://localhost:1420"
echo "  Watcher: ws://localhost:3030"
echo "  Metro: ws://localhost:3031"
echo "  Relay: http://192.168.178.157:8787"
echo ""
echo "📝 Logs are in the logs/ directory"
echo "   tail -f logs/desktop.log"
echo "   tail -f logs/watcher.log"
echo "   tail -f logs/metro.log"
echo "   tail -f logs/relay.log"
echo ""
echo "🛑 To stop all services, run: ./stop-all.sh"
echo ""

# Save PIDs to file for stop script
echo "$DESKTOP_PID" > logs/pids.txt
echo "$WATCHER_PID" >> logs/pids.txt
echo "$METRO_PID" >> logs/pids.txt
echo "$RELAY_PID" >> logs/pids.txt

# Keep script running
wait
