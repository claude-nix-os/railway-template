# Browser Module - Agent Guide

This guide helps AI agents understand and work with the ClaudeOS Browser Module.

## Module Overview

The Browser Module provides Playwright-based browser automation for ClaudeOS, enabling:
- Creation and management of headless/headed browser sessions
- Web page navigation and interaction (click, type, etc.)
- Automatic screenshot capture at configurable intervals
- Multi-session support with session control/locking
- WebSocket streaming of screenshots and interaction events

## Key Components

### 1. BrowserSessionManager (`src/services/BrowserSessionManager.ts`)
The core service that manages Playwright browser instances.

**Responsibilities:**
- Initialize Chromium browser on module load
- Create and track multiple browser sessions
- Handle navigation, screenshots, and interactions
- Store session metadata to `/data/browser-sessions/{sessionId}/`
- Manage screenshot intervals and session lifecycle

**Key Methods:**
- `initialize()`: Start the browser
- `createSession(config)`: Create a new session
- `navigate(sessionId, url)`: Navigate to URL
- `captureScreenshot(sessionId)`: Take screenshot
- `click(sessionId, selector)`: Click element
- `type(sessionId, selector, text)`: Type text
- `takeControl/releaseControl`: Session locking
- `closeSession(sessionId)`: Close session
- `shutdown()`: Clean up all sessions

### 2. API Handler (`src/api/browser/handler.ts`)
Next.js API route handler for all browser operations.

**Routes:**
- `POST /api/browser/sessions` - Create session
- `GET /api/browser/sessions` - List sessions
- `GET /api/browser/sessions/{id}` - Get session
- `POST /api/browser/sessions/{id}/navigate` - Navigate
- `POST /api/browser/sessions/{id}/screenshot` - Screenshot
- `POST /api/browser/sessions/{id}/click` - Click
- `POST /api/browser/sessions/{id}/type` - Type
- `POST /api/browser/sessions/{id}/control` - Control
- `DELETE /api/browser/sessions/{id}` - Close

**Auth:** All routes require Bearer token except health checks.

### 3. WebSocket Handlers
- `ws/screenshot-handler.ts`: Broadcasts screenshot events
- `ws/interaction-handler.ts`: Broadcasts interaction events

## Data Storage

```
/data/browser-sessions/
  └── session_<timestamp>_<id>/
      ├── metadata.json          # Session state & config
      ├── screenshots/           # All captured screenshots
      │   ├── screenshot_1.png
      │   └── screenshot_2.png
      └── videos/               # Optional video recording
          └── video.webm
```

## Session States

- `active`: Session running, accepts interactions
- `idle`: Session inactive but not closed
- `closed`: Session terminated, no longer usable

## Configuration

Session config options:
```typescript
{
  headless: boolean;              // Headless mode (default: true)
  viewport: { width, height };    // Browser viewport size
  screenshotInterval: number;     // Auto-capture interval (ms, 0 = disabled)
  userAgent: string;              // Custom user agent
  recordVideo: boolean;           // Enable video recording
}
```

## Agent Usage Patterns

### Pattern 1: Web Automation Task
```
1. Create session with appropriate config
2. Navigate to target URL
3. Wait for page load (use waitUntil option)
4. Interact with page (click, type)
5. Capture screenshots for verification
6. Close session when done
```

### Pattern 2: Web Scraping
```
1. Create session (headless: true)
2. Navigate to target
3. Capture screenshot for verification
4. Extract data (note: evaluate() would need to be added)
5. Navigate to next page
6. Repeat as needed
7. Close session
```

### Pattern 3: Visual Testing
```
1. Create multiple sessions with different viewports
2. Navigate all to same URL
3. Capture screenshots from each
4. Compare screenshots
5. Close all sessions
```

### Pattern 4: Collaborative Session
```
1. Create session
2. User A takes control
3. User A performs actions
4. User A releases control
5. User B takes control
6. User B performs actions
7. Close session
```

## API Usage Examples

### Create Session
```bash
curl -X POST http://localhost:3000/api/browser/sessions \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "headless": true,
      "viewport": {"width": 1920, "height": 1080},
      "screenshotInterval": 5000
    }
  }'
```

### Navigate
```bash
curl -X POST http://localhost:3000/api/browser/sessions/SESSION_ID/navigate \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "waitUntil": "networkidle"
  }'
```

### Capture Screenshot
```bash
curl -X POST http://localhost:3000/api/browser/sessions/SESSION_ID/screenshot \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"fullPage": true}'
```

## Common Issues

### Issue: Session Not Found
- **Cause**: Session was closed or ID is incorrect
- **Fix**: List sessions to get valid IDs

### Issue: Element Not Found (click/type)
- **Cause**: Selector doesn't match any element
- **Fix**: Wait for page load, verify selector with screenshot

### Issue: Navigation Timeout
- **Cause**: Page taking too long to load
- **Fix**: Use waitUntil: 'domcontentloaded' instead of 'networkidle'

### Issue: Screenshot Interval Too Frequent
- **Cause**: High interval frequency causes disk/performance issues
- **Fix**: Use intervals >= 5000ms or disable (0)

## TypeScript Types

All types exported from `src/types.ts`:
- `BrowserSession`: Session metadata
- `BrowserSessionConfig`: Session configuration
- `Screenshot`: Screenshot metadata
- `CreateSessionRequest/Response`
- `NavigateRequest/Response`
- `ScreenshotRequest/Response`
- `ClickRequest/Response`
- `TypeRequest/Response`
- `ControlRequest/Response`

## Testing

Run tests with:
```bash
npm test
```

Test files in `__tests__/api/browser.test.ts`

## Module Integration

This module follows ClaudeOS module conventions:
- Exports `ClaudeOSModule` from `src/index.ts`
- Registers API routes via `apiRoutes`
- Registers WebSocket handlers via `wsHandlers`
- Implements `onLoad` and `onUnload` lifecycle hooks
- Provides cleanup on unload

## Agent Tips

1. **Always close sessions**: Memory leaks if sessions aren't closed
2. **Use appropriate waitUntil**: 'load' for most cases, 'networkidle' for SPAs
3. **Capture screenshots liberally**: Helps debug automation issues
4. **Check session state**: Verify session is 'active' before operations
5. **Handle errors gracefully**: Network issues, timeouts, etc.
6. **Use session control**: Prevents concurrent access conflicts
7. **Set realistic intervals**: Don't capture screenshots too frequently

## Future Enhancements

Potential additions:
- Page evaluation (execute JavaScript)
- Cookie management
- Network request interception
- Performance metrics
- Browser console log capture
- PDF generation
- Element waiting utilities
- Retry logic for failed interactions
