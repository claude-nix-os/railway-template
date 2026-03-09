#!/bin/bash
set -e
DATA_DIR="${DATA_DIR:-/data}"

echo "[ClaudeOS] Starting initialization..."
echo "[ClaudeOS] Node: $(node --version)"
echo "[ClaudeOS] Memory: $(free -m 2>/dev/null | head -2 || echo 'N/A')"

# ── Create persistent directories ─────────────────────────────
for dir in workspace memories .claude logs sessions; do
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

echo "[ClaudeOS] Starting Next.js server on port ${PORT:-3000}..."
exec su -s /bin/bash claude -c "cd /app && NODE_ENV=production PORT=${PORT:-3000} DATA_DIR=${DATA_DIR} JWT_SECRET=${JWT_SECRET} CLAUDE_OS_AUTH_TOKEN=${CLAUDE_OS_AUTH_TOKEN} tsx kernel/server.ts"
