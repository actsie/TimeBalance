#!/bin/bash

cd "$(dirname "$0")"

echo "Starting Freelance Time & Payment Tracker..."

if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js and npm first."
    read -p "Press any key to exit..."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Launching desktop application..."
export NODE_ENV=development
npm run start