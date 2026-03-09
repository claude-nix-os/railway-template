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

# ── Stage 2: Production ──────────────────────────────────────
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000

# System packages (minimal - no python, no n8n for lighter image)
RUN apt-get update && apt-get install -y \
    curl wget git openssh-client \
    supervisor \
    ca-certificates gnupg \
    && rm -rf /var/lib/apt/lists/*

# Node.js 22 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Global Node.js tools (tsx only - n8n and claude-code disabled for lighter startup)
RUN npm install -g tsx

# Create non-root user (required for Claude Code --dangerously-skip-permissions)
RUN useradd -m -s /bin/bash claude \
    && mkdir -p /data /home/claude/.claude /home/claude/.npm-global \
    && chown -R claude:claude /data /home/claude

# Symlinks for persistent config
RUN ln -sf /data/.claude /home/claude/.claude \
    && ln -sf /data/.npm-global /home/claude/.npm-global

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

# Copy config and scripts
COPY config/ /app/config/
COPY supervisord.conf /etc/supervisor/conf.d/claudeos.conf
COPY entrypoint.sh /usr/local/bin/entrypoint

RUN chmod +x /usr/local/bin/entrypoint

WORKDIR /app
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint"]
