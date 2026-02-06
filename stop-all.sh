#!/bin/bash

# Stop all AppTuner services

echo "🛑 Stopping AppTuner services..."

# Kill by PIDs if file exists
if [ -f logs/pids.txt ]; then
    while read pid; do
        kill -9 $pid 2>/dev/null && echo "  Killed process $pid"
    done < logs/pids.txt
    rm logs/pids.txt
fi

# Also kill by port (backup)
echo "Cleaning up ports..."
lsof -ti:1420 | xargs kill -9 2>/dev/null
lsof -ti:3030 | xargs kill -9 2>/dev/null
lsof -ti:3031 | xargs kill -9 2>/dev/null
lsof -ti:8787 | xargs kill -9 2>/dev/null

echo "✅ All services stopped"
