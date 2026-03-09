# ClaudeOS Memory Graph Extension

A VS Code extension that provides an interactive memory graph visualizer for Mem0. This extension displays memory relationships in a force-directed graph layout, making it easy to explore and understand how memories are connected across sessions.

## Features

- **Interactive Memory Graph**: Force-directed graph visualization powered by force-graph
- **Scope Filtering**: View memories at session, user, or global scope
- **Real-time Updates**: Automatic refresh of memory graph as new memories are created
- **WebSocket Integration**: Live updates via WebSocket connection to the ClaudeOS kernel
- **Export Functionality**: Export memory graph data for external analysis
- **Visual Exploration**: Pan, zoom, and interact with the memory graph

## Usage

1. Click the ClaudeOS Chat icon in the Activity Bar
2. Select the "Memory Graph" view within the sidebar
3. The memory graph will load automatically from the configured Mem0 API
4. Use the refresh button to manually update the graph
5. Use the filter button to change the memory scope (session/user/global)
6. Click nodes to view memory details
7. Drag nodes to rearrange the graph layout

## Commands

- `ClaudeOS Memory: Refresh Memory Graph` - Manually refresh the memory graph from the API
- `ClaudeOS Memory: Change Memory Scope` - Switch between session, user, or global memory scope
- `ClaudeOS Memory: Export Memory Graph` - Export the current memory graph as JSON

## Requirements

- VS Code 1.85.0 or higher
- ClaudeOS kernel server running with Mem0 integration
- Mem0 API endpoint accessible

## Extension Settings

This extension contributes the following settings:

- `claudeos.memory.apiUrl`: Mem0 API URL for fetching memory graph data (default: `http://localhost:3000/api/memory`)
- `claudeos.memory.autoRefresh`: Automatically refresh memory graph on changes (default: true)
- `claudeos.memory.refreshInterval`: Auto-refresh interval in milliseconds (default: 30000)
- `claudeos.memory.defaultScope`: Default scope for memory graph visualization (default: "session")

## Development

This extension is part of the ClaudeOS v4 project. For development instructions, see the main ClaudeOS repository.

### Building

```bash
npm install
npm run compile
```

### Watching for Changes

```bash
npm run watch
```

## Architecture

The extension consists of two main components:

1. **Extension Host** (`src/extension.ts`): Manages VS Code integration, commands, and WebSocket connections
2. **Webview** (`src/webview/main.ts`): Renders the interactive force-graph visualization

## License

MIT
