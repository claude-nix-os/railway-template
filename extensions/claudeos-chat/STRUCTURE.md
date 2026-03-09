# ClaudeOS Chat Extension - Directory Structure

This document outlines the expected directory structure for the ClaudeOS Chat extension.

## Current Structure (Configuration Only)

```
extensions/claudeos-chat/
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript configuration
├── esbuild.js               # Build script for bundling
├── .vscodeignore            # Files to exclude from package
├── .gitignore               # Git ignore rules
├── README.md                # Extension documentation
└── STRUCTURE.md             # This file
```

## Full Structure (To Be Implemented)

```
extensions/claudeos-chat/
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript configuration
├── esbuild.js               # Build script for bundling
├── .vscodeignore            # Files to exclude from package
├── .gitignore               # Git ignore rules
├── README.md                # Extension documentation
├── STRUCTURE.md             # This file
├── icon.png                 # Extension icon (128x128)
├── resources/               # Static resources
│   └── chat-icon.svg       # Activity bar icon
├── src/                     # Source code
│   ├── extension.ts        # Extension entry point
│   ├── chatViewProvider.ts # Webview view provider
│   ├── websocket/          # WebSocket client
│   │   ├── client.ts       # WebSocket connection handler
│   │   └── types.ts        # WebSocket message types
│   └── webview/            # Webview UI
│       ├── index.html      # Webview HTML template
│       ├── main.ts         # Webview script entry
│       ├── styles.css      # Webview styles
│       └── components/     # UI components
│           ├── ChatMessage.ts
│           ├── ThoughtChain.ts
│           └── ToolCall.ts
└── out/                     # Compiled output (generated)
    └── extension.js        # Bundled extension
```

## Key Files

### package.json
- Extension manifest with metadata, activation events, contributions, and dependencies
- Defines viewsContainer for activity bar integration
- Registers webview view "claudeos.chatView"
- Declares commands for opening panel and managing sessions

### tsconfig.json
- TypeScript configuration targeting ES2020
- Module system: CommonJS (required for VS Code extensions)
- Output directory: out/
- Strict type checking enabled

### esbuild.js
- Build script using esbuild for fast bundling
- Supports watch mode for development
- Bundles src/extension.ts → out/extension.js
- Externalizes 'vscode' module

### src/extension.ts (To Be Implemented)
- Extension activation/deactivation lifecycle
- Registers chat view provider
- Registers commands (openChatInEditor, newSession, clearChat)
- Manages WebSocket connection to kernel server

### src/chatViewProvider.ts (To Be Implemented)
- WebviewViewProvider implementation
- Handles webview creation and HTML content
- Manages message passing between extension and webview
- Coordinates with WebSocket client

### src/webview/ (To Be Implemented)
- Frontend code for the chat panel UI
- Uses vanilla TypeScript (no framework dependencies)
- Communicates with extension host via postMessage API
- Renders chat messages, thought chains, and tool calls

## Build Process

1. `npm run compile` - Bundles TypeScript to out/extension.js
2. `npm run watch` - Watches for changes and rebuilds
3. `npm run package` - Creates .vsix package for distribution

## Notes

- The extension does not bundle React or any UI framework
- Webview UI uses vanilla JS/TS with VS Code's webview API
- All dependencies are bundled except 'vscode' module
- Icon files (icon.png, chat-icon.svg) need to be created
