#!/bin/bash

# Create a simple icon using ImageMagick (if available) or system tools
# For now, let's create a simple text-based icon

echo "Creating app icon..."

# Create icon directory
mkdir -p "Time Tracker.app/Contents/Resources"

# If you have an icon file, copy it here:
# cp your-icon.png "Time Tracker.app/Contents/Resources/app-icon.png"

# Update Info.plist to reference the icon
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
    <key>CFBundleIconFile</key>
    <string>app-icon</string>
</dict>
</plist>
EOF

echo "Icon setup complete! Place your icon file as 'Time Tracker.app/Contents/Resources/app-icon.png'"