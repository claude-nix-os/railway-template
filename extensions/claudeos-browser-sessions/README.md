# ClaudeOS Browser Sessions Extension

A VS Code extension that provides a GUI panel for managing browser automation sessions with live screenshot updates and remote control capabilities.

## Features

### Grid View
- Display all browser sessions as thumbnails (3-4 per row)
- Live screenshot updates via WebSocket
- Session status indicators (active/idle/controlled)
- Click to open detail view
- "New Session" button to create sessions

### Detail View
- Large canvas showing current/selected screenshot
- Timeline scrubber bar at bottom with playback controls
- Color-coded action markers:
  - Navigate = blue
  - Click = green
  - Type = yellow
  - Screenshot = purple
- Playback controls (play/pause through screenshot history)
- "Take Control" button (enables remote control)
- "Hand Off Control" button (returns control to agent)
- Back button to grid view
- Session info (URL, viewport, timestamps)

### WebSocket Integration
- Subscribe to `browser:screenshot` events
- Update thumbnails and detail view in real-time
- Auto-reconnect on disconnect
- Show connection status in status bar

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the extension:
```bash
npm run compile
```

3. The extension will be available in the "claudeos-chat-container" view container.

## Usage

### Commands

- **Refresh Browser Sessions** (`claudeos-browser-sessions.refresh`) - Refresh the list of browser sessions
- **New Browser Session** (`claudeos-browser-sessions.newSession`) - Create a new browser session
- **Take Control** (`claudeos-browser-sessions.takeControl`) - Take control of a browser session
- **Hand Off Control** (`claudeos-browser-sessions.handOffControl`) - Release control back to agent
- **Export Session** (`claudeos-browser-sessions.exportSession`) - Export session data to JSON

### Configuration

Available settings in VS Code settings:

- `claudeos.browser.apiUrl` - Browser API URL (default: `http://localhost:3000/api/browser`)
- `claudeos.browser.wsUrl` - WebSocket URL for live updates (default: `ws://localhost:3000/ws`)
- `claudeos.browser.autoRefresh` - Automatically refresh browser sessions (default: `true`)
- `claudeos.browser.thumbnailRefreshInterval` - Refresh interval in milliseconds (default: `2000`)

## Architecture

### Extension Structure

```
src/
├── extension.ts                    # Extension activation and commands
├── BrowserSessionsViewProvider.ts  # WebviewViewProvider implementation
├── types.ts                        # TypeScript type definitions
├── services/
│   ├── BrowserApiClient.ts        # HTTP client for /api/browser/*
│   └── BrowserWebSocketClient.ts  # WebSocket client for live updates
└── webview/
    ├── main.ts                    # Main webview entry point
    ├── views/
    │   ├── GridView.ts            # Thumbnail grid view
    │   └── DetailView.ts          # Single session detail view
    ├── components/
    │   ├── SessionCard.ts         # Session thumbnail card
    │   └── Timeline.ts            # Time scrubbing bar
    └── styles.css                 # VS Code theme-aware styles
```

### Message Flow

#### Extension → Webview
- `sessionsUpdate` - Update session list
- `screenshotUpdate` - New screenshot available
- `controlStatus` - Control status changed
- `connectionStatus` - WebSocket connection status
- `error` - Error message

#### Webview → Extension
- `ready` - Webview initialized
- `createSession` - Create new session
- `openSession` - Open session detail
- `closeSession` - Close a session
- `takeControl` - Take control of session
- `handOffControl` - Release control
- `navigate` - Navigate to URL
- `scrubToFrame` - Scrub to frame index
- `exportSession` - Export session data
- `refreshSessions` - Refresh session list

## API Integration

The extension integrates with the Browser module's REST API and WebSocket events:

### REST API Endpoints

- `GET /api/browser/sessions` - List all sessions
- `GET /api/browser/sessions/{id}` - Get session details
- `POST /api/browser/sessions` - Create new session
- `DELETE /api/browser/sessions/{id}` - Close session
- `POST /api/browser/sessions/{id}/navigate` - Navigate to URL
- `POST /api/browser/sessions/{id}/screenshot` - Capture screenshot
- `POST /api/browser/sessions/{id}/click` - Click element
- `POST /api/browser/sessions/{id}/type` - Type text
- `POST /api/browser/sessions/{id}/control` - Take/release control

### WebSocket Events

- `browser:screenshot` - New screenshot captured
- `browser:interaction` - User interaction event

## Development

### Watch Mode

Run the extension in watch mode during development:

```bash
npm run watch
```

### Building

Build the extension for production:

```bash
npm run compile
```

### Packaging

Package the extension as a `.vsix` file:

```bash
npm run package
```

## License

MIT
