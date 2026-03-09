# ClaudeOS Module: Railway Tools

## Module Contract
- Modules MUST export a default ClaudeOSModule from their entry point
- Modules MUST have a valid claudeos-module.json manifest
- All UI components MUST be React functional components
- API handlers MUST follow Next.js route handler patterns
- Skills MUST be valid markdown files with frontmatter

## Architecture
- `src/api/railway/handler.ts` - API route handler for /api/railway/* endpoints
- `src/components/RailwayPanel.tsx` - Full panel showing Railway deployment info
- `src/components/RailwayStatusBar.tsx` - Compact status bar indicator
- `src/skills/` - Claude Code slash commands for Railway operations
- `src/types.ts` - Shared TypeScript types

## Environment Variables
- `RAILWAY_TOKEN` - API token for Railway API access (required for logs)
- `RAILWAY_PROJECT_ID` - Current project ID
- `RAILWAY_SERVICE_ID` - Current service ID
- `RAILWAY_ENVIRONMENT_ID` - Current environment ID
- `RAILWAY_ENVIRONMENT` - Environment name (production, staging, etc.)
- `RAILWAY_PUBLIC_DOMAIN` - Public domain for the deployment
- `RAILWAY_DEPLOYMENT_ID` - Current deployment ID

## Pre-Commit Checklist
- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] claudeos-module.json is valid
- [ ] No hardcoded secrets or URLs
- [ ] AGENTS.md is updated

## Testing
- All API handlers must test: auth, happy path, error handling
- All UI components must have rendering tests
- Run: `npm test` before every commit
