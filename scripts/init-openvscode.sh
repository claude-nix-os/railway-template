#!/bin/bash
# Initialize OpenVSCode Server with ClaudeOS branding
# NOTE: Do NOT use set -e — extension installation is best-effort

echo "[ClaudeOS] Starting OpenVSCode Server initialization..."

# Create data directories
mkdir -p /data/.openvscode/User
mkdir -p /data/.openvscode/extensions
mkdir -p /data/workspace
mkdir -p /data/browser-sessions
mkdir -p /data/n8n
mkdir -p /data/memories

# Copy ClaudeOS settings to OpenVSCode Server user settings
if [ -f /app/config/vscode-settings.json ]; then
  echo "[ClaudeOS] Applying ClaudeOS branding settings..."
  cp /app/config/vscode-settings.json /data/.openvscode/User/settings.json
else
  echo "[ClaudeOS] Warning: vscode-settings.json not found"
fi

# Install extensions by symlinking into the extensions directory
# This is more reliable than --install-extension which expects .vsix files
EXTENSIONS_DIR="/data/.openvscode/extensions"

for ext_dir in /app/extensions/claudeos-*; do
  if [ -d "$ext_dir" ]; then
    ext_name=$(basename "$ext_dir")
    target="$EXTENSIONS_DIR/$ext_name"

    # Remove existing symlink/directory if present
    rm -rf "$target" 2>/dev/null

    # Symlink the extension
    ln -sf "$ext_dir" "$target"
    echo "[ClaudeOS] Installed extension: $ext_name"
  fi
done

# Ensure proper permissions
chmod -R 755 /data/.openvscode 2>/dev/null || true

echo "[ClaudeOS] OpenVSCode Server initialization complete"
echo "[ClaudeOS] Extensions installed: $(ls -1 $EXTENSIONS_DIR | wc -l)"
