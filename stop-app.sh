#!/bin/bash

echo "Stopping all servers..."

# Kill processes from .pids file if it exists
if [ -f .pids ]; then
    while read pid; do
        kill $pid 2>/dev/null && echo "Killed process $pid"
    done < .pids
    rm .pids
fi

# Also kill any process on these ports
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo "All servers stopped"
