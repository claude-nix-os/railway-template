# @claude-nix-os/module-browser

Playwright-based browser automation module for ClaudeOS with screenshot capture, interaction tracking, and multi-session support.

## Features

- **Browser Session Management**: Create and manage multiple concurrent Playwright browser sessions
- **Screenshot Capture**: Automatic screenshot capture at configurable intervals
- **Browser Interaction**: Navigate, click, type, and interact with web pages
- **Session Control**: Multi-user session control with locking mechanism
- **WebSocket Streaming**: Real-time screenshot and interaction event streaming
- **Persistent Storage**: Session metadata and screenshots stored in `/data/browser-sessions/`

## API Endpoints

### Sessions

#### Create Session
```bash
POST /api/browser/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "config": {
    "headless": true,
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "screenshotInterval": 5000,
    "userAgent": "Custom User Agent",
    "recordVideo": false
  }
}
```

#### List Sessions
```bash
GET /api/browser/sessions
Authorization: Bearer <token>
```

#### Get Session Details
```bash
GET /api/browser/sessions/{id}
Authorization: Bearer <token>
```

#### Close Session
```bash
DELETE /api/browser/sessions/{id}
Authorization: Bearer <token>
```

### Navigation

#### Navigate to URL
```bash
POST /api/browser/sessions/{id}/navigate
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://example.com",
  "waitUntil": "load"
}
```

### Screenshots

#### Capture Screenshot
```bash
POST /api/browser/sessions/{id}/screenshot
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullPage": false
}
```

### Interactions

#### Click Element
```bash
POST /api/browser/sessions/{id}/click
Authorization: Bearer <token>
Content-Type: application/json

{
  "selector": "#button",
  "button": "left",
  "clickCount": 1
}
```

#### Type Text
```bash
POST /api/browser/sessions/{id}/type
Authorization: Bearer <token>
Content-Type: application/json

{
  "selector": "input[name='search']",
  "text": "Hello World",
  "delay": 50
}
```

### Session Control

#### Take/Release Control
```bash
POST /api/browser/sessions/{id}/control
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "take",
  "userId": "user-123"
}
```

## WebSocket Events

### browser:screenshot
Streamed when a screenshot is captured (manually or via interval).

```typescript
{
  type: 'browser:screenshot',
  sessionId: 'session_123',
  screenshot: {
    id: 'screenshot_456',
    sessionId: 'session_123',
    timestamp: '2024-03-09T12:00:00Z',
    url: 'https://example.com',
    filePath: '/data/browser-sessions/session_123/screenshots/screenshot_456.png',
    width: 1920,
    height: 1080
  }
}
```

### browser:interaction
Streamed when a user interaction occurs.

```typescript
{
  type: 'browser:interaction',
  sessionId: 'session_123',
  action: 'click',
  details: {
    selector: '#button',
    button: 'left'
  },
  timestamp: '2024-03-09T12:00:00Z'
}
```

## Configuration

Environment variables:

- `BROWSER_DATA_DIR`: Directory for storing session data (default: `/data/browser-sessions`)

## Session States

- `active`: Session is running and can accept interactions
- `idle`: Session is inactive but still open
- `closed`: Session has been terminated

## Storage Structure

```
/data/browser-sessions/
  └── session_<timestamp>_<id>/
      ├── metadata.json
      ├── screenshots/
      │   ├── screenshot_<timestamp>_<id>.png
      │   └── ...
      └── videos/ (if recordVideo is enabled)
          └── video.webm
```

## Dependencies

- `playwright`: Browser automation framework
- `playwright-extra`: Enhanced Playwright with plugin support
- `puppeteer-extra-plugin-stealth`: Stealth plugin to avoid bot detection

## Usage Example

```typescript
import type { BrowserSession } from '@claude-nix-os/module-browser';

// Create session
const response = await fetch('/api/browser/sessions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    config: {
      headless: true,
      viewport: { width: 1920, height: 1080 },
      screenshotInterval: 5000
    }
  })
});

const { session } = await response.json();

// Navigate
await fetch(`/api/browser/sessions/${session.id}/navigate`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com',
    waitUntil: 'networkidle'
  })
});

// Capture screenshot
await fetch(`/api/browser/sessions/${session.id}/screenshot`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fullPage: true
  })
});

// Close session
await fetch(`/api/browser/sessions/${session.id}`, {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer token'
  }
});
```

## License

MIT
