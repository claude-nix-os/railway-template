# ClaudeOS Railway Template - Development Rules

## Deployment Rules
- README.md MUST have "Deploy on Railway" button at top
- NEVER hardcode deployment URLs (*.up.railway.app) in source
- railway.toml contains only template-level config, not instance settings
- All instance-specific config goes through env vars or /data volume

## Core Principles
- No test/mock data in production code
- TDD: write tests before implementation
- All changes must pass: `npm test && npm run typecheck && npm run build`
- Never delete existing features without explicit approval

## Pre-Commit Checklist
- [ ] `npm test` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] No hardcoded URLs or secrets
- [ ] Dockerfile builds successfully
- [ ] AGENTS.md is up to date

## Volume Requirements
- /data MUST be a persistent Railway volume
- All user data stored in /data/
- Container restart must not lose data
- First boot auto-initializes all directories

## Security
- Auth token auto-generated and persisted
- JWT secrets persisted across restarts
- Non-root user for Claude Code execution
- File permissions: 600 for secrets, 644 for configs
