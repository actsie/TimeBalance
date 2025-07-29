# Freelance Time & Payment Tracker

A desktop application for freelancers to track time and calculate payments with ease.

## Features

- 📅 Date range selection with intuitive date pickers
- ⏱️ Flexible time input (accepts both `hh:mm:ss` and decimal formats)
- 💰 Automatic payment calculations
- 📋 Copy summary to clipboard for easy sharing
- 🖥️ Native desktop application (no browser required)
- 📱 Responsive design that works on all screen sizes

## Quick Start (GUI Launch)

### Option 1: Double-click Launch (Recommended)

**macOS/Linux:**
1. Double-click `launch-app.sh` to start the application

**Windows:**
1. Double-click `launch-app.bat` to start the application

### Option 2: Manual Launch

1. Open Terminal (macOS/Linux) or Command Prompt (Windows)
2. Navigate to the project folder
3. Run: `npm run start`

## First Time Setup

The launch scripts will automatically:
1. Check if Node.js and npm are installed
2. Install dependencies if needed
3. Launch the desktop application

## Requirements

- Node.js (version 16 or higher)
- npm (comes with Node.js)

## Usage

1. **Start Date**: Select when you started working
2. **End Date**: Select when you finished (optional)
3. **Total Hours**: Enter time as `80:05:43` or decimal `80.1`
4. **Rate per Hour**: Enter your hourly rate (e.g., `7.50`)
5. **Prepaid Amount**: Enter any prepaid amount (optional)

The app will automatically calculate:
- Total earnings
- Remaining balance (if prepaid amount entered)
- Professional summary ready to copy and send

## Building for Distribution

To create installable packages:

```bash
# Build for current platform
npm run electron-dist

# The installer will be created in dist-electron/
```

## Development

```bash
# Install dependencies
npm install

# Run development mode
npm run electron-dev

# Build web version only
npm run build
```

## Supported Platforms

- macOS (`.dmg` installer)
- Windows (`.exe` installer)
- Linux (`.AppImage` installer)

## Troubleshooting

**Application won't start:**
1. Make sure Node.js is installed: `node --version`
2. Install dependencies: `npm install`
3. Try manual launch: `npm run start`

**Port conflict error:**
- Close other applications using port 5173
- Or restart your computer and try again
