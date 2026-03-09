# ── Stage 1: Builder ──────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Copy all source
COPY . .

# Build
RUN npm run build

# Build ClaudeOS Chat extension
WORKDIR /app/extensions/claudeos-chat
RUN npm ci
RUN npm run compile

# Build ClaudeOS Sessions extension
WORKDIR /app/extensions/claudeos-sessions
RUN npm ci
RUN npm run build

# Build ClaudeOS Memory extension
WORKDIR /app/extensions/claudeos-memory
RUN npm ci
RUN npm run compile

# Build ClaudeOS n8n extension
WORKDIR /app/extensions/claudeos-n8n
RUN npm ci
RUN npm run build

# Build ClaudeOS Browser Sessions extension
WORKDIR /app/extensions/claudeos-browser-sessions
RUN npm ci
RUN npm run build

# Build ClaudeOS Settings extension
WORKDIR /app/extensions/claudeos-settings
RUN npm ci
RUN npm run build

# Build ClaudeOS Tasks extension
WORKDIR /app/extensions/claudeos-tasks
RUN npm ci
RUN npm run compile

# ── Stage 2: Production (slim - just Node.js) ─────────────────
FROM node:22-slim

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000

# Install system dependencies including Playwright dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    supervisor \
    wget \
    tar \
    # Playwright dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g tsx

# Download and install OpenVSCode Server (latest stable version)
RUN OPENVSCODE_VERSION=$(wget -qO- https://api.github.com/repos/gitpod/openvscode-server/releases/latest | grep -oP '"tag_name": "\K(.*)(?=")' | sed 's/^openvscode-server-v//') \
    && wget -O /tmp/openvscode-server.tar.gz "https://github.com/gitpod/openvscode-server/releases/latest/download/openvscode-server-v${OPENVSCODE_VERSION}-linux-x64.tar.gz" \
    && mkdir -p /opt/openvscode-server \
    && tar -xzf /tmp/openvscode-server.tar.gz -C /opt/openvscode-server --strip-components=1 \
    && rm /tmp/openvscode-server.tar.gz

# Create data directory
RUN mkdir -p /data

# Copy built application
COPY --from=builder /app/.next /app/.next
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/kernel /app/kernel
COPY --from=builder /app/src /app/src
COPY --from=builder /app/public /app/public
COPY --from=builder /app/next.config.ts /app/next.config.ts
COPY --from=builder /app/tsconfig.json /app/tsconfig.json
COPY --from=builder /app/tailwind.config.ts /app/tailwind.config.ts
COPY --from=builder /app/postcss.config.js /app/postcss.config.js

# Copy modules and module config (VS Code-inspired UI, memory, file explorer, etc.)
COPY --from=builder /app/modules /app/modules
COPY --from=builder /app/modules.json /app/modules.json

# Install Playwright browsers (only Chromium for efficiency)
WORKDIR /app/modules/module-browser
RUN npm ci && npx playwright install chromium --with-deps
WORKDIR /app

# Copy built ClaudeOS extensions
COPY --from=builder /app/extensions /app/extensions

# Copy config
COPY config/ /app/config/

# Copy supervisord configuration
COPY supervisord.conf /etc/supervisor/supervisord.conf

# Copy initialization scripts
COPY scripts/init-openvscode.sh /app/scripts/init-openvscode.sh
RUN chmod +x /app/scripts/init-openvscode.sh

WORKDIR /app
EXPOSE 3000
EXPOSE 8000

# Start directly as root (volume mount requires root access)
CMD ["/bin/bash", "-c", "/app/scripts/init-openvscode.sh && /usr/bin/supervisord -c /etc/supervisor/supervisord.conf"]
