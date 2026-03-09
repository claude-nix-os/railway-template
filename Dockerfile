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

# ── Stage 2: Production (slim - just Node.js) ─────────────────
FROM node:22-slim

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000

# Install tsx globally, openssl for secret generation, supervisor, wget, and tar for downloading OpenVSCode Server
RUN apt-get update && apt-get install -y openssl supervisor wget tar && rm -rf /var/lib/apt/lists/* \
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
