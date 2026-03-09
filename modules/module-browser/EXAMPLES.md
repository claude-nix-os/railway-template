# Browser Module Examples

## Basic Usage

### Create and Navigate

```typescript
import { useBrowser } from '@claude-nix-os/module-browser';

function MyComponent() {
  const browser = useBrowser({ authToken: 'your-token' });

  async function runAutomation() {
    // Create a new browser session
    const session = await browser.createSession({
      headless: true,
      viewport: { width: 1920, height: 1080 },
      screenshotInterval: 5000, // Auto-capture every 5 seconds
    });

    if (!session) return;

    // Navigate to a URL
    await browser.navigate(session.id, 'https://example.com', 'networkidle');

    // Capture a screenshot
    await browser.screenshot(session.id, true);

    // Interact with the page
    await browser.type(session.id, 'input[name="search"]', 'Hello World');
    await browser.click(session.id, 'button[type="submit"]');

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Close the session
    await browser.closeSession(session.id);
  }

  return (
    <button onClick={runAutomation}>
      Run Automation
    </button>
  );
}
```

## Web Scraping Example

```typescript
async function scrapeWebsite() {
  const browser = useBrowser({ authToken: 'your-token' });

  // Create session
  const session = await browser.createSession({
    headless: true,
    viewport: { width: 1920, height: 1080 },
  });

  if (!session) return;

  // Navigate to target
  await browser.navigate(session.id, 'https://example.com/products', 'load');

  // Capture screenshot for visual verification
  await browser.screenshot(session.id, true);

  // In a real scenario, you would also implement evaluate() or extractData()
  // methods to extract content from the page

  // Clean up
  await browser.closeSession(session.id);
}
```

## Form Automation Example

```typescript
async function fillForm() {
  const browser = useBrowser({ authToken: 'your-token' });

  const session = await browser.createSession();
  if (!session) return;

  // Navigate to form
  await browser.navigate(session.id, 'https://example.com/contact', 'load');

  // Fill out form fields
  await browser.type(session.id, 'input[name="name"]', 'John Doe');
  await browser.type(session.id, 'input[name="email"]', 'john@example.com');
  await browser.type(session.id, 'textarea[name="message"]', 'Hello!');

  // Capture screenshot before submission
  await browser.screenshot(session.id, false);

  // Submit form
  await browser.click(session.id, 'button[type="submit"]');

  // Wait for redirect
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Capture final screenshot
  await browser.screenshot(session.id, false);

  // Close session
  await browser.closeSession(session.id);
}
```

## Multi-Session Example

```typescript
async function runParallelTasks() {
  const browser = useBrowser({ authToken: 'your-token' });

  // Create multiple sessions
  const sessions = await Promise.all([
    browser.createSession({ viewport: { width: 1920, height: 1080 } }),
    browser.createSession({ viewport: { width: 1280, height: 720 } }),
    browser.createSession({ viewport: { width: 768, height: 1024 } }),
  ]);

  // Navigate all sessions in parallel
  await Promise.all(
    sessions
      .filter(s => s !== null)
      .map(session =>
        browser.navigate(session!.id, 'https://example.com', 'load')
      )
  );

  // Capture screenshots from all sessions
  await Promise.all(
    sessions
      .filter(s => s !== null)
      .map(session =>
        browser.screenshot(session!.id, true)
      )
  );

  // Close all sessions
  await Promise.all(
    sessions
      .filter(s => s !== null)
      .map(session =>
        browser.closeSession(session!.id)
      )
  );
}
```

## Session Control Example

```typescript
async function collaborativeSession() {
  const browser = useBrowser({ authToken: 'your-token' });

  const session = await browser.createSession();
  if (!session) return;

  // User 1 takes control
  await fetch(`/api/browser/sessions/${session.id}/control`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer user-1-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'take',
      userId: 'user-1',
    }),
  });

  // Navigate while in control
  await browser.navigate(session.id, 'https://example.com');

  // Release control
  await fetch(`/api/browser/sessions/${session.id}/control`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer user-1-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'release',
      userId: 'user-1',
    }),
  });

  // User 2 can now take control
  await fetch(`/api/browser/sessions/${session.id}/control`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer user-2-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'take',
      userId: 'user-2',
    }),
  });
}
```

## WebSocket Streaming Example

```typescript
function setupWebSocket() {
  const ws = new WebSocket('ws://localhost:3000/ws');

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'browser:screenshot') {
      console.log('Screenshot captured:', message.screenshot);
      // Display the screenshot in your UI
      displayScreenshot(message.screenshot);
    }

    if (message.type === 'browser:interaction') {
      console.log('Interaction event:', message.action, message.details);
      // Update UI to show interaction
      showInteraction(message.action, message.details);
    }
  };

  return ws;
}

function displayScreenshot(screenshot: Screenshot) {
  // In a real app, you would fetch and display the image
  const img = document.createElement('img');
  img.src = `/files/browser-sessions/${screenshot.sessionId}/screenshots/${screenshot.id}.png`;
  document.getElementById('preview')?.appendChild(img);
}

function showInteraction(action: string, details: Record<string, unknown>) {
  const log = document.getElementById('interaction-log');
  if (log) {
    log.innerHTML += `<div>${action}: ${JSON.stringify(details)}</div>`;
  }
}
```

## Custom Viewport Sizes

```typescript
// Mobile viewport
const mobileSession = await browser.createSession({
  viewport: { width: 375, height: 812 }, // iPhone X
});

// Tablet viewport
const tabletSession = await browser.createSession({
  viewport: { width: 768, height: 1024 }, // iPad
});

// Desktop viewport
const desktopSession = await browser.createSession({
  viewport: { width: 1920, height: 1080 }, // Full HD
});

// 4K viewport
const fourKSession = await browser.createSession({
  viewport: { width: 3840, height: 2160 }, // 4K
});
```

## Screenshot Interval

```typescript
// Auto-capture screenshots every 10 seconds
const session = await browser.createSession({
  screenshotInterval: 10000, // 10 seconds
});

// This will automatically capture screenshots in the background
// and store them to /data/browser-sessions/{sessionId}/screenshots/

// List sessions to see screenshot count
const sessions = await browser.listSessions();
console.log(`Session ${session.id} has ${sessions[0].screenshotCount} screenshots`);
```

## Error Handling

```typescript
async function robustAutomation() {
  const browser = useBrowser({ authToken: 'your-token' });

  try {
    const session = await browser.createSession();
    if (!session) {
      throw new Error('Failed to create session');
    }

    try {
      await browser.navigate(session.id, 'https://example.com');
      await browser.click(session.id, '#my-button');
    } catch (error) {
      console.error('Navigation or interaction failed:', error);
      // Capture error screenshot
      await browser.screenshot(session.id, true);
    } finally {
      // Always clean up
      await browser.closeSession(session.id);
    }
  } catch (error) {
    console.error('Session creation failed:', error);
  }

  if (browser.error) {
    console.error('Browser error:', browser.error);
  }
}
```

## Direct API Usage (without hooks)

```typescript
async function directApiCall() {
  // Create session
  const createResponse = await fetch('/api/browser/sessions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config: {
        headless: true,
        viewport: { width: 1920, height: 1080 },
      },
    }),
  });

  const { session } = await createResponse.json();

  // Navigate
  await fetch(`/api/browser/sessions/${session.id}/navigate`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https://example.com',
      waitUntil: 'networkidle',
    }),
  });

  // Capture screenshot
  const screenshotResponse = await fetch(
    `/api/browser/sessions/${session.id}/screenshot`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer your-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fullPage: true }),
    }
  );

  const { screenshot } = await screenshotResponse.json();
  console.log('Screenshot saved to:', screenshot.filePath);

  // Close session
  await fetch(`/api/browser/sessions/${session.id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer your-token',
    },
  });
}
```
