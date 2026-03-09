# Quick Start Guide - ClaudeOS Chat Extension

This is a quick reference for getting started with the ClaudeOS Chat extension development.

## Installation

```bash
cd extensions/claudeos-chat
npm install
```

## Development Commands

```bash
# Build once
npm run compile

# Watch mode (auto-rebuild on changes)
npm run watch

# Create .vsix package
npm run package

# Lint code
npm run lint
```

## Running in VS Code

### Method 1: Press F5
1. Open this directory in VS Code
2. Press `F5` to launch Extension Development Host
3. A new VS Code window opens with the extension loaded

### Method 2: Debug Panel
1. Open Debug view (`Ctrl+Shift+D` / `Cmd+Shift+D`)
2. Select "Run Extension"
3. Press `F5`

## Testing the Extension

Once the Extension Development Host is running:

1. Click the ClaudeOS Chat icon in the Activity Bar (left sidebar)
2. The chat panel should appear
3. Test commands via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):
   - "ClaudeOS: Open Chat in Editor"
   - "ClaudeOS: New Chat Session"
   - "ClaudeOS: Clear Chat History"

## Debugging

### Extension Code
- Set breakpoints in `src/extension.ts`
- Launch with F5
- Breakpoints hit in main VS Code window

### Webview Code
1. Open Developer Tools: `Help > Toggle Developer Tools`
2. In Console: `Developer: Open Webview Developer Tools`
3. Debug webview in separate DevTools window

## Configuration

Extension settings (accessible via Settings UI or settings.json):

```json
{
  "claudeos.chat.wsUrl": "ws://localhost:3000/ws",
  "claudeos.chat.autoConnect": true,
  "claudeos.chat.theme": "auto"
}
```

## File Structure

```
extensions/claudeos-chat/
├── package.json           # Extension manifest
├── tsconfig.json          # TypeScript config
├── esbuild.js             # Build script
├── src/                   # Source code (to be created)
│   ├── extension.ts       # Entry point
│   ├── chatViewProvider.ts
│   ├── websocket/
│   └── webview/
├── out/                   # Compiled output (generated)
│   └── extension.js
└── resources/             # Icons (to be created)
```

## Key Extension API Points

```typescript
// Extension activation
export function activate(context: vscode.ExtensionContext) {
  // Register view provider
  const provider = new ChatViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'claudeos.chatView',
      provider
    )
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.newSession', () => {
      // Command implementation
    })
  );
}

// Extension deactivation
export function deactivate() {
  // Cleanup
}
```

## Webview Communication

Extension → Webview:
```typescript
webview.postMessage({ type: 'message', data: {...} });
```

Webview → Extension:
```typescript
// In webview script
vscode.postMessage({ type: 'action', data: {...} });
```

## Common Issues

**Extension doesn't activate**
- Check `activationEvents` in package.json
- Look for errors in Output > Log (Extension Host)

**Webview doesn't render**
- Check Content Security Policy
- Verify resource URIs use webview scheme
- Check DevTools console

**Build errors**
- Run `npm install` to ensure dependencies are installed
- Check TypeScript version matches `package.json`
- Verify `esbuild` is installed

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Webview Guide](https://code.visualstudio.com/api/extension-guides/webview)
- [Extension Samples](https://github.com/microsoft/vscode-extension-samples)

## Next Steps

1. Implement `src/extension.ts` - Extension entry point
2. Implement `src/chatViewProvider.ts` - Webview provider
3. Create WebSocket client for ClaudeOS kernel connection
4. Build webview UI components
5. Add icons and branding assets
