#!/bin/bash
# Don't use set -e so we get diagnostics on failure
DATA_DIR="${DATA_DIR:-/data}"

echo "[ClaudeOS] Starting initialization..."
echo "[ClaudeOS] Memory: $(free -m 2>/dev/null | head -2 || echo 'N/A')"
echo "[ClaudeOS] Disk: $(df -h / 2>/dev/null | tail -1 || echo 'N/A')"

# ── Create persistent directories ─────────────────────────────
for dir in workspace memories .claude .npm-global logs sessions n8n; do
  mkdir -p "$DATA_DIR/$dir"
done

# Fix ownership
chown -R claude:claude "$DATA_DIR" /home/claude 2>/dev/null || true

# ── Generate/load auth token ──────────────────────────────────
if [ -z "$CLAUDE_OS_AUTH_TOKEN" ]; then
  if [ -f "$DATA_DIR/.auth_token" ]; then
    export CLAUDE_OS_AUTH_TOKEN=$(cat "$DATA_DIR/.auth_token")
    echo "[ClaudeOS] Auth token: loaded from persistent storage"
  else
    export CLAUDE_OS_AUTH_TOKEN=$(openssl rand -hex 24)
    echo "$CLAUDE_OS_AUTH_TOKEN" > "$DATA_DIR/.auth_token"
    chmod 600 "$DATA_DIR/.auth_token"
    echo "[ClaudeOS] Auth token: generated new"
  fi
fi
echo "[ClaudeOS] Auth token: $CLAUDE_OS_AUTH_TOKEN"

# ── Generate/load JWT secret ─────────────────────────────────
if [ -z "$JWT_SECRET" ]; then
  if [ -f "$DATA_DIR/.jwt_secret" ]; then
    export JWT_SECRET=$(cat "$DATA_DIR/.jwt_secret")
  else
    export JWT_SECRET=$(openssl rand -hex 32)
    echo "$JWT_SECRET" > "$DATA_DIR/.jwt_secret"
    chmod 600 "$DATA_DIR/.jwt_secret"
  fi
fi

# ── Generate/load n8n encryption key ─────────────────────────
if [ -f "$DATA_DIR/n8n/.encryption_key" ]; then
  export N8N_ENCRYPTION_KEY=$(cat "$DATA_DIR/n8n/.encryption_key")
else
  export N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
  echo "$N8N_ENCRYPTION_KEY" > "$DATA_DIR/n8n/.encryption_key"
  chmod 600 "$DATA_DIR/n8n/.encryption_key"
fi

# ── Load persisted env vars ───────────────────────────────────
if [ -f "$DATA_DIR/.env" ]; then
  echo "[ClaudeOS] Loading persisted env vars..."
  set -a
  source "$DATA_DIR/.env"
  set +a
fi

# ── Seed default configs ──────────────────────────────────────
if [ ! -f "$DATA_DIR/.claude/CLAUDE.md" ] && [ -f /app/config/CLAUDE.md ]; then
  cp /app/config/CLAUDE.md "$DATA_DIR/.claude/CLAUDE.md"
fi
if [ ! -f "$DATA_DIR/.claude/settings.json" ] && [ -f /app/config/settings.json ]; then
  cp /app/config/settings.json "$DATA_DIR/.claude/settings.json"
fi

# ── Skip Claude Code onboarding wizard ────────────────────────
cat > /home/claude/.claude.json <<'EOF'
{"completedOnboarding":true,"hasBeenUpdated":true}
EOF
chown claude:claude /home/claude/.claude.json

# ── N8n auto-setup (background) ──────────────────────────────
(
  echo "[n8n-setup] Waiting for n8n to start..."
  for i in $(seq 1 60); do
    if curl -sf http://127.0.0.1:5678/healthz > /dev/null 2>&1; then
      echo "[n8n-setup] n8n is healthy"
      break
    fi
    sleep 2
  done

  # Create owner account if needed
  AUTH_TOKEN_SHORT="${CLAUDE_OS_AUTH_TOKEN:0:8}"
  N8N_PASSWORD="ClaudeOS${AUTH_TOKEN_SHORT}!"

  # Try to create owner
  curl -sf -X POST http://127.0.0.1:5678/rest/owner/setup \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"admin@claudeos.local\",\"firstName\":\"Claude\",\"lastName\":\"OS\",\"password\":\"${N8N_PASSWORD}\"}" \
    > /dev/null 2>&1 || true

  # Bootstrap API key if not exists
  if [ ! -f "$DATA_DIR/n8n/.api_key" ]; then
    echo "[n8n-setup] Bootstrapping API key..."
    # Login
    LOGIN_RESP=$(curl -sf -X POST http://127.0.0.1:5678/rest/login \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"admin@claudeos.local\",\"password\":\"${N8N_PASSWORD}\"}" \
      -c /tmp/n8n_cookies 2>/dev/null || echo "")

    if [ -n "$LOGIN_RESP" ]; then
      # Create API key
      API_RESP=$(curl -sf -X POST http://127.0.0.1:5678/rest/api-keys \
        -H "Content-Type: application/json" \
        -b /tmp/n8n_cookies \
        -d '{"label":"ClaudeOS","scopes":["workflow:read","workflow:list","execution:read","execution:list"]}' \
        2>/dev/null || echo "")

      if [ -n "$API_RESP" ]; then
        echo "$API_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('apiKey',''))" > "$DATA_DIR/n8n/.api_key"
        chmod 600 "$DATA_DIR/n8n/.api_key"
        echo "[n8n-setup] API key created"
      fi
    fi
    rm -f /tmp/n8n_cookies
  fi
  echo "[n8n-setup] Setup complete"
) &

# ── Export env vars for supervisor ────────────────────────────
export CLAUDE_OS_AUTH_TOKEN
export N8N_ENCRYPTION_KEY
export JWT_SECRET
export DATA_DIR
export PORT="${PORT:-3000}"

echo "[ClaudeOS] Starting services via supervisord..."
exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/claudeos.conf
