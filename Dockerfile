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

# Install tsx globally and openssl for secret generation
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/* \
    && npm install -g tsx

# Create data directory (writable by node user which exists in node:22-slim)
RUN mkdir -p /data && chown -R node:node /data

# Copy built application
COPY --from=builder --chown=node:node /app/.next /app/.next
COPY --from=builder --chown=node:node /app/node_modules /app/node_modules
COPY --from=builder --chown=node:node /app/package.json /app/package.json
COPY --from=builder --chown=node:node /app/kernel /app/kernel
COPY --from=builder --chown=node:node /app/src /app/src
COPY --from=builder --chown=node:node /app/public /app/public
COPY --from=builder --chown=node:node /app/next.config.ts /app/next.config.ts
COPY --from=builder --chown=node:node /app/tsconfig.json /app/tsconfig.json
COPY --from=builder --chown=node:node /app/tailwind.config.ts /app/tailwind.config.ts
COPY --from=builder --chown=node:node /app/postcss.config.js /app/postcss.config.js

# Copy config
COPY --chown=node:node config/ /app/config/

WORKDIR /app
EXPOSE 3000

# Run as the built-in node user (no su needed)
USER node

# Start directly - no entrypoint script, no bash needed
CMD ["tsx", "kernel/server.ts"]
