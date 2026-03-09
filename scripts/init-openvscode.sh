#!/bin/bash
# Initialize OpenVSCode Server with ClaudeOS branding

set -e

# Create user data directory if it doesn't exist
mkdir -p /data/.openvscode/User
mkdir -p /data/.openvscode/extensions

# Copy ClaudeOS settings to OpenVSCode Server user settings
if [ -f /app/config/vscode-settings.json ]; then
  echo "[ClaudeOS] Applying ClaudeOS branding settings to OpenVSCode Server..."
  cp /app/config/vscode-settings.json /data/.openvscode/User/settings.json
  echo "[ClaudeOS] Settings applied successfully"
else
  echo "[ClaudeOS] Warning: vscode-settings.json not found at /app/config/vscode-settings.json"
fi

# Ensure proper permissions
chmod -R 755 /data/.openvscode

echo "[ClaudeOS] OpenVSCode Server initialization complete"
