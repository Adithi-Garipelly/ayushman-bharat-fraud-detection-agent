#!/bin/bash

# Kill background processes on script exit
trap 'kill 0' SIGINT

echo "Starting Ayushman Bharat Backend..."
# Install requirements quietly
pip install -r requirements.txt -q

# Start FastAPI server in the background
python main.py &
FASTAPI_PID=$!

echo "Starting Vigilant AB Guard Frontend..."
cd vigilant-ab-guard

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start Vite dev server
npm run dev &
VITE_PID=$!

echo "========================================================"
echo "Backend running at http://localhost:8000"
echo "Frontend running at http://localhost:5173"
echo "Press Ctrl+C to stop both servers"
echo "========================================================"

# Wait for both processes
wait $FASTAPI_PID $VITE_PID
