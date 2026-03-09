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

# Only install essentials: tsx for running the kernel, openssl for secrets
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Install tsx globally
RUN npm install -g tsx

# Create non-root user
RUN useradd -m -s /bin/bash claude \
    && mkdir -p /data /home/claude/.claude \
    && chown -R claude:claude /data /home/claude

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

# Copy config
COPY config/ /app/config/

# Copy entrypoint
COPY entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

WORKDIR /app
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint"]
