#!/bin/bash

# Create app bundle structure
mkdir -p "Time Tracker.app/Contents/MacOS"
mkdir -p "Time Tracker.app/Contents/Resources"

# Create Info.plist
cat > "Time Tracker.app/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launch-app</string>
    <key>CFBundleIdentifier</key>
    <string>com.timetracker.app</string>
    <key>CFBundleName</key>
    <string>Time Tracker</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
</dict>
</plist>
EOF

# Copy launch script
cp launch-app.sh "Time Tracker.app/Contents/MacOS/launch-app"
chmod +x "Time Tracker.app/Contents/MacOS/launch-app"

echo "Created Time Tracker.app - you can now double-click it to launch!"