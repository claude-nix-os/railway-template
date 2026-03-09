# Development Guide

Guide for developers working on the Browser Module.

## Prerequisites

- Node.js 20+
- TypeScript 5.3+
- Playwright browsers installed
- ClaudeOS runtime environment

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install chromium
```

3. Build the module:
```bash
npm run typecheck
```

## Project Structure

```
module-browser/
├── src/
│   ├── api/
│   │   └── browser/
│   │       └── handler.ts           # Next.js API route handler
│   ├── components/
│   │   └── BrowserSessions.tsx      # Optional React UI component
│   ├── hooks/
│   │   └── useBrowser.ts            # React hook for API
│   ├── services/
│   │   └── BrowserSessionManager.ts # Core Playwright service
│   ├── utils/
│   │   └── websocket.ts             # WebSocket utilities
│   ├── ws/
│   │   ├── screenshot-handler.ts    # WebSocket handler
│   │   └── interaction-handler.ts   # WebSocket handler
│   ├── types.ts                     # TypeScript types
│   └── index.ts                     # Module entry point
├── __tests__/
│   └── api/
│       └── browser.test.ts          # Unit tests
├── scripts/
│   └── test-browser.ts              # CLI testing utility
├── claudeos-module.json             # Module manifest
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Development Workflow

### 1. Local Development

Start the ClaudeOS development server:
```bash
cd /path/to/claudeos
npm run dev
```

The module will be automatically loaded if present in the `modules/` directory.

### 2. Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm test -- --watch
```

Run tests with coverage:
```bash
npm test -- --coverage
```

### 3. Manual Testing

Use the CLI utility:
```bash
# Create a session
ts-node scripts/test-browser.ts create

# List sessions
ts-node scripts/test-browser.ts list

# Navigate
ts-node scripts/test-browser.ts navigate SESSION_ID https://example.com

# Screenshot
ts-node scripts/test-browser.ts screenshot SESSION_ID

# Close session
ts-node scripts/test-browser.ts close SESSION_ID
```

### 4. Type Checking

Check TypeScript types:
```bash
npm run typecheck
```

## Adding New Features

### Adding a New API Endpoint

1. Add route handler in `src/api/browser/handler.ts`:
```typescript
// In GET, POST, DELETE, or PATCH handler
if (subPath === '/my-new-endpoint') {
  // Handle the request
  return NextResponse.json({ result: 'success' });
}
```

2. Add request/response types in `src/types.ts`:
```typescript
export interface MyNewRequest {
  param: string;
}

export interface MyNewResponse {
  result: string;
}
```

3. Update the hook in `src/hooks/useBrowser.ts`:
```typescript
const myNewAction = useCallback(
  async (param: string): Promise<MyNewResponse | null> => {
    const response = await fetch(`${apiUrl}/my-new-endpoint`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ param }),
    });
    return await response.json();
  },
  [apiUrl, getHeaders]
);
```

4. Add tests in `__tests__/api/browser.test.ts`:
```typescript
it('should handle my new endpoint', async () => {
  // Test implementation
});
```

### Adding a New Browser Action

1. Add method to `BrowserSessionManager`:
```typescript
async myNewAction(
  sessionId: string,
  params: MyParams
): Promise<Result> {
  const sessionData = this.getSessionData(sessionId);

  // Implement action using sessionData.page
  const result = await sessionData.page.myAction(params);

  // Update session metadata
  sessionData.session.lastActivityAt = new Date().toISOString();
  await this.saveSessionMetadata(sessionId);

  return result;
}
```

2. Add API endpoint (see above)

3. Add types (see above)

4. Add tests

### Adding a New WebSocket Handler

1. Create handler in `src/ws/my-handler.ts`:
```typescript
export async function handleMyMessage(
  message: MyMessage,
  ws: WebSocket,
  broadcast: (message: unknown) => void
): Promise<void> {
  console.log('[WS:my-handler]', message);
  broadcast(message);
}
```

2. Register in `src/index.ts`:
```typescript
wsHandlers: [
  {
    messageType: 'browser:my-message',
    handler: 'ws/my-handler',
  },
],
```

3. Add message type in `src/types.ts`:
```typescript
export interface WsMyMessage {
  type: 'browser:my-message';
  sessionId: string;
  data: unknown;
}
```

## Code Style

### TypeScript

- Use explicit types, avoid `any`
- Use interfaces for object shapes
- Export types that consumers need
- Use JSDoc comments for public APIs

### Error Handling

- Catch and log errors appropriately
- Return meaningful error messages
- Use try-catch in async functions
- Clean up resources in finally blocks

### Logging

- Use descriptive log messages
- Include context (session ID, action, etc.)
- Log errors with full stack traces
- Use appropriate log levels

### Testing

- Test happy paths and error cases
- Mock external dependencies
- Clean up test resources (sessions, files)
- Use descriptive test names

## Debugging

### Debug Browser Sessions

Enable headed mode:
```typescript
const session = await manager.createSession({
  headless: false, // Browser window will be visible
});
```

### Debug Screenshots

Screenshots are saved to:
```
/data/browser-sessions/{sessionId}/screenshots/
```

View them to debug visual issues.

### Debug Network Issues

Check Playwright logs:
```bash
DEBUG=pw:api npm test
```

### Debug API Requests

Enable verbose logging:
```typescript
console.log('[Browser API] Request:', {
  method: request.method,
  url: request.url,
  body: await request.json(),
});
```

## Performance Considerations

### Memory Management

- Close sessions when done
- Don't create too many concurrent sessions
- Use reasonable screenshot intervals (>= 5000ms)
- Clean up old screenshots periodically

### Optimization

- Use headless mode in production
- Set appropriate viewport sizes
- Use selective screenshots (not full page every time)
- Consider disabling video recording if not needed

## Common Pitfalls

1. **Forgetting to close sessions**: Memory leaks
2. **Not waiting for navigation**: Interactions fail
3. **Using wrong selectors**: Element not found errors
4. **Screenshot interval too frequent**: Disk space issues
5. **Not handling errors**: Unhandled promise rejections

## Release Process

1. Update CHANGELOG.md
2. Bump version in package.json and claudeos-module.json
3. Run tests: `npm test`
4. Type check: `npm run typecheck`
5. Commit changes
6. Tag release: `git tag v1.x.x`
7. Push: `git push && git push --tags`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit a pull request

## Resources

- [Playwright Documentation](https://playwright.dev)
- [ClaudeOS Module System](https://github.com/claude-nix-os/claudeos)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Support

- GitHub Issues: [Report bugs and request features]
- Discussions: [Ask questions and share ideas]
- Discord: [Join the ClaudeOS community]
