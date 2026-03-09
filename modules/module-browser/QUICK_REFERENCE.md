# Quick Reference

## API Endpoints

```
POST   /api/browser/sessions              Create session
GET    /api/browser/sessions              List sessions
GET    /api/browser/sessions/{id}         Get session
POST   /api/browser/sessions/{id}/navigate    Navigate
POST   /api/browser/sessions/{id}/screenshot  Screenshot
POST   /api/browser/sessions/{id}/click       Click
POST   /api/browser/sessions/{id}/type        Type
POST   /api/browser/sessions/{id}/control     Control
DELETE /api/browser/sessions/{id}         Close session
```

## WebSocket Events

```
browser:screenshot     Screenshot captured
browser:interaction    User interaction occurred
```

## TypeScript Types

```typescript
import type {
  BrowserSession,
  BrowserSessionConfig,
  Screenshot,
  CreateSessionRequest,
  CreateSessionResponse,
  NavigateRequest,
  NavigateResponse,
  ScreenshotRequest,
  ScreenshotResponse,
  ClickRequest,
  ClickResponse,
  TypeRequest,
  TypeResponse,
  ControlRequest,
  ControlResponse,
} from '@claude-nix-os/module-browser';
```

## React Hook

```typescript
import { useBrowser } from '@claude-nix-os/module-browser';

const {
  loading,
  error,
  createSession,
  listSessions,
  getSession,
  navigate,
  screenshot,
  click,
  type,
  closeSession,
} = useBrowser({ authToken: 'your-token' });
```

## CLI Commands

```bash
ts-node scripts/test-browser.ts create
ts-node scripts/test-browser.ts list
ts-node scripts/test-browser.ts navigate SESSION_ID URL
ts-node scripts/test-browser.ts screenshot SESSION_ID
ts-node scripts/test-browser.ts close SESSION_ID
```

## Session Config

```typescript
{
  headless: true,                    // Headless mode
  viewport: { width: 1920, height: 1080 },  // Viewport size
  screenshotInterval: 5000,          // Auto-screenshot (ms)
  userAgent: 'Custom/1.0',           // User agent
  recordVideo: false,                // Video recording
}
```

## Session States

```
active  - Running, accepts interactions
idle    - Inactive but open
closed  - Terminated
```

## File Locations

```
/data/browser-sessions/
  └── session_{timestamp}_{id}/
      ├── metadata.json
      ├── screenshots/
      │   └── *.png
      └── videos/
          └── video.webm
```

## Example: Create & Navigate

```typescript
// Create
const session = await createSession({
  headless: true,
  viewport: { width: 1920, height: 1080 },
});

// Navigate
await navigate(session.id, 'https://example.com', 'load');

// Screenshot
await screenshot(session.id, true);

// Close
await closeSession(session.id);
```

## Example: Form Automation

```typescript
// Navigate to form
await navigate(sessionId, 'https://example.com/form');

// Fill fields
await type(sessionId, 'input[name="email"]', 'user@example.com');
await type(sessionId, 'input[name="password"]', 'password123');

// Submit
await click(sessionId, 'button[type="submit"]');

// Screenshot result
await screenshot(sessionId, false);
```

## Example: Multiple Sessions

```typescript
const sessions = await Promise.all([
  createSession({ viewport: { width: 1920, height: 1080 } }),
  createSession({ viewport: { width: 1280, height: 720 } }),
  createSession({ viewport: { width: 768, height: 1024 } }),
]);

await Promise.all(
  sessions.map(s => navigate(s.id, 'https://example.com'))
);

await Promise.all(
  sessions.map(s => closeSession(s.id))
);
```

## Environment Variables

```bash
BROWSER_DATA_DIR=/data/browser-sessions
AUTH_TOKEN=your-token
API_URL=http://localhost:3000/api/browser
```

## Common Selectors

```
#id                    By ID
.class                 By class
element                By tag
[attribute=value]      By attribute
parent > child         Direct child
element:first-child    First child
element:nth-child(n)   Nth child
```

## Wait Conditions

```
load              - Wait for load event
domcontentloaded  - Wait for DOM content
networkidle       - Wait for network idle
```

## Error Handling

```typescript
try {
  const session = await createSession();
  await navigate(session.id, url);
} catch (error) {
  console.error('Error:', error);
  if (session) await closeSession(session.id);
}
```

## Testing

```bash
npm test                    # Run tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage
npm run typecheck          # Type check
```

## Module Lifecycle

```typescript
onLoad()    - Module loaded, browser initialized
onUnload()  - Module unloading, cleanup sessions
```

## Best Practices

✓ Always close sessions
✓ Use appropriate wait conditions
✓ Capture screenshots for debugging
✓ Handle errors gracefully
✓ Set realistic screenshot intervals
✓ Use session control for collaboration
✓ Check session state before operations
✗ Don't create too many sessions
✗ Don't use very frequent intervals
✗ Don't forget error handling
✗ Don't leave sessions open
