# ClaudeOS Railway Template

Deploy ClaudeOS v3 on Railway with one click.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/claudeos)

## What's Included

ClaudeOS v3 is a modular agent OS built on Nix flakes. This template includes:

- **Kernel**: Core module system, HTTP/WebSocket server, session management
- **UI Module**: VSCode-inspired web interface with tabs, panels, split views
- **Memory Module**: Mem0 memory service with graph visualization
- **N8n Module**: Workflow automation with embedded n8n
- **Passkey Auth**: WebAuthn passkey authentication
- **Railway Tools**: Railway management commands and UI
- **File Explorer**: Filesystem browser and task management

## Setup

1. Click "Deploy on Railway" above
2. Add a persistent volume mounted at `/data`
3. Set environment variables (optional):
   - `ANTHROPIC_API_KEY` - Your Anthropic API key
   - `CLAUDE_OS_AUTH_TOKEN` - Custom auth token (auto-generated if not set)
4. Access your instance at the Railway-provided URL
5. Login with the auth token shown in deployment logs

## Architecture

```
┌─────────────────────────────────────────┐
│              Railway Container           │
│                                          │
│  ┌──────────┐  ┌──────┐  ┌───────────┐ │
│  │ Next.js  │  │ mem0 │  │    n8n    │ │
│  │ + Kernel │  │ :8100│  │   :5678   │ │
│  │  :3000   │  └──────┘  └───────────┘ │
│  └──────────┘                           │
│       │                                  │
│  supervisord (process manager)           │
│                                          │
│  /data (persistent volume)               │
│   ├── workspace/                         │
│   ├── sessions/                          │
│   ├── memories/                          │
│   ├── n8n/                               │
│   ├── .claude/                           │
│   └── .auth_token                        │
└─────────────────────────────────────────┘
```

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Modules

Modules can be added/removed via the `modules.json` file:

```json
{
  "modules": {
    "@claude-nix-os/module-ui": { "enabled": true },
    "@claude-nix-os/module-memory": { "enabled": true }
  }
}
```

## License

MIT
