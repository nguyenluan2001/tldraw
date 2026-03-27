#!/bin/bash

# =============================================================================
# Tldraw Snapshots - Development Start Script
# =============================================================================
# This script starts both the backend server and frontend development server.
# 
# Configuration:
# - Copy .env.example to .env and customize the values
# - SERVER_URL: The full server URL (default: http://localhost:3002)
# - VITE_PORT: The port for the frontend dev server (default: 5173)
# =============================================================================

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    # Export variables while preserving the format
    set -a
    source .env
    set +a
fi

# Set defaults if not configured
export SERVER_URL=${SERVER_URL:-http://localhost:3002}
export VITE_PORT=${VITE_PORT:-5173}
export VITE_SERVER_URL=${SERVER_URL}

# Extract host and port from SERVER_URL for the server process
# Parse URL like http://localhost:3002 -> host=localhost, port=3002
if [[ $SERVER_URL =~ ^https?://([^:]+):([0-9]+)$ ]]; then
    export SERVER_HOST="${BASH_REMATCH[1]}"
    export SERVER_PORT="${BASH_REMATCH[2]}"
else
    export SERVER_HOST="localhost"
    export SERVER_PORT="3002"
fi

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Tldraw Snapshots Development Server${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo -e "  Server URL: ${YELLOW}${SERVER_URL}${NC}"
echo -e "  Client Port: ${YELLOW}${VITE_PORT}${NC}"
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
    fi
    if [ ! -z "$CLIENT_PID" ]; then
        kill $CLIENT_PID 2>/dev/null
    fi
    echo -e "${GREEN}Servers stopped.${NC}"
    exit 0
}

# Trap Ctrl+C and other termination signals
trap cleanup SIGINT SIGTERM

# Start the backend server
echo -e "${BLUE}Starting backend server...${NC}"
node server.js &
SERVER_PID=$!
echo -e "${GREEN}Backend server started (PID: ${SERVER_PID})${NC}"
echo ""

# Wait a moment for the server to start
sleep 1

# Start the frontend development server
echo -e "${BLUE}Starting frontend development server...${NC}"
npx vite --port $VITE_PORT &
CLIENT_PID=$!
echo -e "${GREEN}Frontend server started (PID: ${CLIENT_PID})${NC}"
echo ""

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  All servers are running!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  ${BLUE}Frontend:${NC}  http://localhost:${VITE_PORT}"
echo -e "  ${BLUE}Backend API:${NC} ${SERVER_URL}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Wait for either process to exit
wait $SERVER_PID $CLIENT_PID
