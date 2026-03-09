# ClaudeOS Module: UI Railway Sidecar

## Module Contract
- Modules MUST export a default ClaudeOSModule from their entry point
- Modules MUST have a valid claudeos-module.json manifest
- API handlers MUST follow Next.js route handler patterns
- Middleware MUST handle Railway proxy headers correctly

## Architecture
- `src/middleware/railway-headers.ts` - Middleware to handle x-forwarded-* headers from Railway's proxy
- `src/api/sidecar/handler.ts` - Health check and config API endpoints
- `src/types.ts` - Shared TypeScript types
- `src/index.ts` - Module entry point with auto-detected Railway configuration

## Railway Environment Auto-Detection
The module automatically reads these environment variables:
- `RAILWAY_PUBLIC_DOMAIN` - Sets the public URL for the sidecar
- `RAILWAY_ENVIRONMENT` - Sets the environment name
- `PORT` - Binds to the correct port (Railway assigns this)
- `RAILWAY_ENVIRONMENT_ID` - Environment identifier
- `RAILWAY_SERVICE_ID` - Service identifier

## Pre-Commit Checklist
- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] claudeos-module.json is valid
- [ ] No hardcoded secrets or URLs
- [ ] AGENTS.md is updated

## Testing
- All API handlers must test: happy path, error handling
- Middleware must test header forwarding and CORS
- Run: `npm test` before every commit
