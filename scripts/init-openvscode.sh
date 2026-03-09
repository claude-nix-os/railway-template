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

# Install ClaudeOS Chat extension
if [ -d /app/extensions/claudeos-chat ]; then
  echo "[ClaudeOS] Installing ClaudeOS Chat extension..."
  /opt/openvscode-server/bin/openvscode-server --install-extension /app/extensions/claudeos-chat --extensions-dir /data/.openvscode/extensions
  echo "[ClaudeOS] ClaudeOS Chat extension installed successfully"
else
  echo "[ClaudeOS] Warning: ClaudeOS Chat extension not found at /app/extensions/claudeos-chat"
fi

# Install ClaudeOS Sessions extension
if [ -d /app/extensions/claudeos-sessions ]; then
  echo "[ClaudeOS] Installing ClaudeOS Sessions extension..."
  /opt/openvscode-server/bin/openvscode-server --install-extension /app/extensions/claudeos-sessions --extensions-dir /data/.openvscode/extensions
  echo "[ClaudeOS] ClaudeOS Sessions extension installed successfully"
else
  echo "[ClaudeOS] Warning: ClaudeOS Sessions extension not found at /app/extensions/claudeos-sessions"
fi

# Install ClaudeOS Memory extension
if [ -d /app/extensions/claudeos-memory ]; then
  echo "[ClaudeOS] Installing ClaudeOS Memory extension..."
  /opt/openvscode-server/bin/openvscode-server --install-extension /app/extensions/claudeos-memory --extensions-dir /data/.openvscode/extensions
  echo "[ClaudeOS] ClaudeOS Memory extension installed successfully"
else
  echo "[ClaudeOS] Warning: ClaudeOS Memory extension not found at /app/extensions/claudeos-memory"
fi

# Install ClaudeOS n8n extension
if [ -d /app/extensions/claudeos-n8n ]; then
  echo "[ClaudeOS] Installing ClaudeOS n8n extension..."
  /opt/openvscode-server/bin/openvscode-server --install-extension /app/extensions/claudeos-n8n --extensions-dir /data/.openvscode/extensions
  echo "[ClaudeOS] ClaudeOS n8n extension installed successfully"
else
  echo "[ClaudeOS] Warning: ClaudeOS n8n extension not found at /app/extensions/claudeos-n8n"
fi

# Install ClaudeOS Browser Sessions extension
if [ -d /app/extensions/claudeos-browser-sessions ]; then
  echo "[ClaudeOS] Installing ClaudeOS Browser Sessions extension..."
  /opt/openvscode-server/bin/openvscode-server --install-extension /app/extensions/claudeos-browser-sessions --extensions-dir /data/.openvscode/extensions
  echo "[ClaudeOS] ClaudeOS Browser Sessions extension installed successfully"
else
  echo "[ClaudeOS] Warning: ClaudeOS Browser Sessions extension not found at /app/extensions/claudeos-browser-sessions"
fi

# Install ClaudeOS Settings extension
if [ -d /app/extensions/claudeos-settings ]; then
  echo "[ClaudeOS] Installing ClaudeOS Settings extension..."
  /opt/openvscode-server/bin/openvscode-server --install-extension /app/extensions/claudeos-settings --extensions-dir /data/.openvscode/extensions
  echo "[ClaudeOS] ClaudeOS Settings extension installed successfully"
else
  echo "[ClaudeOS] Warning: ClaudeOS Settings extension not found at /app/extensions/claudeos-settings"
fi

# Create browser sessions data directory
mkdir -p /data/browser-sessions

echo "[ClaudeOS] OpenVSCode Server initialization complete"
