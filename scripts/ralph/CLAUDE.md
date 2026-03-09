# Ralph Agent Instructions - ClaudeOS v4 Build

You are an autonomous coding agent working on ClaudeOS v4 — a self-expanding agent OS built on Claude Code.

## Project Context

- **Working directory**: This repo root (cd up from scripts/ralph/)
- **GitHub**: claude-nix-os/railway-template (main branch for deploy)
- **Production URL**: https://renewed-spirit-production.up.railway.app/
- **Project spec**: See PROJECT.md at https://github.com/claude-nix-os/ClaudeOS/blob/v4-plan/PROJECT.md
- **Current state**: 7 modules load, custom React UI works, deployed on Railway
- **Goal**: Replace custom React UI with VS Code fork, build all feature panels as extensions

## Your Task

1. Read the PRD at `scripts/ralph/prd.json`
2. Read the progress log at `scripts/ralph/progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false`
5. **Use the Agent tool to spawn subagents** for parallel research and implementation
6. Run quality checks: `npm run build`
7. Update AGENTS.md files if you discover reusable patterns
8. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
9. Update the PRD to set `passes: true` for the completed story
10. Push and deploy to Railway: `railway up --detach`
11. Append your progress to `scripts/ralph/progress.txt`

## Agent Strategy — USE TEAMS AND SUBAGENTS

**CRITICAL: Use the Agent tool to spawn subagents for parallel work on each story.**

For each user story, follow this pattern:

### 1. Research Phase (spawn parallel agents)
```
Agent(subagent_type="Explore", prompt="Search codebase for [relevant code]...")
Agent(subagent_type="general-purpose", prompt="Research [npm package/API/approach]...")
```

### 2. Implementation Phase (spawn parallel agents for independent work)
```
Agent(subagent_type="general-purpose", prompt="Create [file/component]...", mode="bypassPermissions")
Agent(subagent_type="general-purpose", prompt="Modify [existing file]...", mode="bypassPermissions")
```

### 3. Integration & Verification
- Wire everything together yourself (the orchestrator)
- Run `npm run build` to verify
- Deploy with `railway up --detach`

## Key Architecture Details

- **Kernel server**: `kernel/server.ts` — HTTP/WS server with Next.js, module loading
- **Module loader**: `kernel/module-loader.ts` — discovers modules from `./modules/`
- **Module manifest**: `claudeos-module.json` — requires `name`, `version`, `description`, `main`
- **UI module**: `modules/module-ui/` — current React-based VS Code-inspired UI
- **All modules use**: `"main": "src/index.ts"` (loaded via tsx, no compile step)
- **Docker**: `Dockerfile` — multi-stage Node.js 22 slim build
- **Railway**: `railway.toml` — healthcheck at `/`, 300s timeout, single volume at /data

## Progress Report Format

APPEND to scripts/ralph/progress.txt (never replace, always append):
```
## [Date/Time] - [Story ID]
- What was implemented
- Subagents used and their roles
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
---
```

## Consolidate Patterns

If you discover a **reusable pattern**, add it to the `## Codebase Patterns` section at the TOP of scripts/ralph/progress.txt.

## Quality Requirements

- ALL commits must pass: `npm run build`
- Do NOT commit broken code
- Follow existing code patterns
- Deploy to Railway after each completed story

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete, reply with:
<promise>COMPLETE</promise>

## Important

- Work on ONE story per iteration
- **Spawn subagents for parallel work** — don't do everything sequentially
- Commit and push frequently
- Deploy to Railway after each story
- Read Codebase Patterns in progress.txt before starting
