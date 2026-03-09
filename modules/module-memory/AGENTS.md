# Module: @claude-nix-os/module-memory

## Overview
Memory system providing SQLite-backed storage, search via TF-IDF + SequenceMatcher, a graph edge system for relating memories, and visualization UI components (force-directed graph and UMAP projection).

## Architecture

### Python Service (`services/mem0/server.py`)
- FastAPI on port 8100
- SQLite at `/data/memories/mem0.db`
- Tables: `memories`, `graph_edges`
- Search: TF-IDF cosine similarity combined with difflib.SequenceMatcher
- Run tests: `cd services/mem0 && python3 -m pytest test_server.py -v`

### API Proxy (`src/api/memory/handler.ts`)
- Next.js route handler proxying to mem0 at http://127.0.0.1:8100
- Requires Bearer JWT auth (except /health)
- GET: /health, /all, /graph, /get/:id
- POST: /add, /search, /graph/edge
- DELETE: /delete/:id, /graph/edge/:id

### React Components
- `MemoryGraph.tsx`: Force-directed graph with sidebar (search, add, delete)
- `MemoryProjection.tsx`: UMAP scatter plot with interactive controls

### React Hook (`hooks/useMemory.ts`)
- Wraps all API calls with loading/error state management
- Functions: fetchHealth, fetchAll, fetchGraph, addMemory, deleteMemory, searchMemories, addEdge, deleteEdge

## Conventions
- All API routes require Bearer auth except health checks
- Default user_id is "global"
- Metadata is stored as JSON in SQLite TEXT column
- Graph edges have foreign keys to memories with CASCADE delete
- TypeScript tests: vitest with jsdom
- Python tests: pytest with FastAPI TestClient

## Testing
```bash
npm test              # TypeScript tests
npm run test:python   # Python service tests
```
