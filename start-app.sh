#!/bin/bash

# Complete Application Startup Script
# This will start both servers in the background

echo "================================"
echo "Starting Rental Billing System"
echo "================================"
echo ""

# Kill any existing servers on these ports
echo "Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 2

# Start PHP API server in background
echo "Starting PHP API server on port 8000..."
php -S localhost:8000 -t app/api > api.log 2>&1 &
API_PID=$!
echo "PHP API started (PID: $API_PID)"

# Wait for API to be ready
sleep 3

# Test API
echo "Testing API connection..."
if curl -s http://localhost:8000/test > /dev/null 2>&1; then
    echo "✓ API is responding"
else
    echo "✗ API failed to start - check api.log"
    exit 1
fi

# Start Next.js dev server in background
echo ""
echo "Starting Next.js dev server on port 3000..."
npm run dev > next.log 2>&1 &
NEXT_PID=$!
echo "Next.js started (PID: $NEXT_PID)"

# Wait for Next.js to be ready
echo "Waiting for Next.js to compile..."
sleep 10

# Test Next.js
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✓ Next.js is responding"
else
    echo "✗ Next.js failed to start - check next.log"
    kill $API_PID 2>/dev/null
    exit 1
fi

echo ""
echo "================================"
echo "✓ All servers running!"
echo "================================"
echo ""
echo "Access the application:"
echo "  Frontend: http://localhost:3000"
echo "  API:      http://localhost:8000"
echo ""
echo "Logs:"
echo "  API:      tail -f api.log"
echo "  Next.js:  tail -f next.log"
echo ""
echo "To stop servers:"
echo "  kill $API_PID $NEXT_PID"
echo ""
echo "Or run: ./stop-app.sh"
echo ""
echo "Process IDs saved to .pids"
echo "$API_PID $NEXT_PID" > .pids
