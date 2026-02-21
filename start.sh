#!/bin/bash
cd "$(dirname "$0")"

echo "========================================"
echo "  TIDAL Playlist Merger - Startup"
echo "========================================"
echo

# Check Python
echo "[1/4] Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python not found. Please install Python 3.9+ from https://www.python.org/downloads/"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
REQUIRED_VERSION="3.9"

if [[ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]]; then
    echo "[ERROR] Python 3.9+ required. Found Python $PYTHON_VERSION"
    exit 1
fi
echo "       Python $PYTHON_VERSION found."

# Check Node.js
echo "[2/4] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "       Node.js $NODE_VERSION found."

# Install Python dependencies
echo "[3/4] Installing Python dependencies..."
cd server-python
if [ ! -d "venv" ]; then
    echo "       Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install Python dependencies."
    exit 1
fi
echo "       Python dependencies installed."

# Build frontend if needed
echo "[4/4] Checking frontend..."
cd ../client
if [ ! -d "dist" ]; then
    echo "       Installing frontend dependencies..."
    npm install --silent
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install npm dependencies."
        exit 1
    fi
    echo "       Building frontend..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to build frontend."
        exit 1
    fi
else
    echo "       Frontend already built."
fi

# Start server
echo
echo "========================================"
echo "  Starting server..."
echo "  Open http://localhost:8000 in browser"
echo "  Press Ctrl+C to stop"
echo "========================================"
echo

cd ../server-python
source venv/bin/activate

# Open browser (platform-specific)
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8000 &
elif command -v open &> /dev/null; then
    open http://localhost:8000 &
fi

python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
