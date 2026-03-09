# module-n8n

ClaudeOS module for n8n workflow automation integration.

## Architecture

This module integrates n8n (workflow automation platform) into ClaudeOS by:

1. **Service Definition** - Declares n8n as a supervised service on port 5678
2. **HTTP Proxy** - Reverse proxies `/n8n/*` to the internal n8n instance with HTML rewriting for iframe embedding
3. **WebSocket Proxy** - Forwards WebSocket upgrade requests for n8n's real-time push functionality
4. **Bootstrap Script** - Auto-creates the n8n owner account and API key on first boot
5. **API Handler** - Exposes `/api/n8n` for fetching workflow/execution data from the sidebar
6. **UI Components** - N8nPanel (iframe) and WorkflowsSidebar (workflow/execution list)

## Key Files

- `src/proxy/http-proxy.ts` - HTTP reverse proxy with HTML rewriting, CSP stripping, and root-level asset proxying
- `src/proxy/ws-proxy.ts` - WebSocket upgrade proxy for n8n push notifications
- `src/setup/n8n-bootstrap.ts` - First-boot setup: creates owner account, logs in, creates API key
- `src/api/n8n/handler.ts` - Next.js route handler for `/api/n8n?resource=workflows|executions`
- `src/components/N8nPanel.tsx` - Full-page iframe embedding n8n
- `src/components/WorkflowsSidebar.tsx` - Sidebar with workflow list, execution history, auto-refresh

## Important Patterns

- The proxy strips `/n8n` prefix before forwarding to upstream
- HTML responses are rewritten to add `/n8n/` prefix to absolute paths
- Root-level asset paths (`/assets/*`, `/static/*`, `/rest/*`, etc.) are proxied directly for Vite dynamic imports
- Special handler for `/n8n/static/base-path.js` overrides n8n's base path
- API key is cached in memory and re-read from disk on 401 errors
- Sidebar auto-refreshes every 15 seconds

## Testing

Run tests with `npm test`. Tests cover:
- HTTP proxy URL rewriting and header manipulation
- HTML content rewriting logic
- API handler authentication and n8n communication patterns
