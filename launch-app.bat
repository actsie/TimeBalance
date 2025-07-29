@echo off
cd /d "%~dp0"

echo Starting Freelance Time ^& Payment Tracker...

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm is not installed. Please install Node.js and npm first.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

echo Launching desktop application...
npm run start