# ClaudeOS Module: File Explorer

## Module Contract
- Modules MUST export a default ClaudeOSModule from their entry point
- Modules MUST have a valid claudeos-module.json manifest
- All UI components MUST be React functional components
- API handlers MUST follow Next.js route handler patterns

## Architecture
- `src/api/files/handler.ts` - File listing and content reading API
- `src/api/workspace/handler.ts` - Git diff and status API
- `src/api/tasks/handler.ts` - Task CRUD API with /data/tasks.json storage
- `src/components/FileBrowser.tsx` - Full panel file browser with tree view
- `src/components/FilesSidebar.tsx` - Compact sidebar file tree
- `src/components/SessionDiffs.tsx` - Git diff viewer panel
- `src/components/TaskPanel.tsx` - Task management panel
- `src/lib/file-utils.ts` - Shared filesystem utilities

## Data Files
- `/data/tasks.json` - Task storage (auto-created if missing)

## Security
- File paths are validated to prevent directory traversal
- File content is limited to 1MB reads
- Sensitive files (.env, credentials) are excluded from listings

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
