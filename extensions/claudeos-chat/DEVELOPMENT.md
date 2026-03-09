# ClaudeOS Chat Extension - Development Guide

This guide covers the development workflow for the ClaudeOS Chat extension.

## Prerequisites

- Node.js 18+ (22 recommended)
- VS Code 1.60.0 or higher
- npm or yarn

## Setup

1. Navigate to the extension directory:
```bash
cd extensions/claudeos-chat
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run compile
```

## Development Workflow

### Running the Extension in Development Mode

1. Open the extension directory in VS Code:
```bash
code .
```

2. Press `F5` to launch the Extension Development Host
   - This opens a new VS Code window with the extension loaded
   - The extension will automatically rebuild on file changes if you run `npm run watch`

3. Alternatively, use the VS Code debugger:
   - Open the Debug view (Ctrl+Shift+D / Cmd+Shift+D)
   - Select "Run Extension" from the dropdown
   - Press F5 to start debugging

### Watch Mode for Active Development

Run the watch script to automatically rebuild on changes:
```bash
npm run watch
```

This will:
- Watch for file changes in `src/`
- Automatically rebuild `out/extension.js`
- Enable hot reload in the Extension Development Host (reload with Ctrl+R / Cmd+R)

## Build Scripts

- `npm run compile` - One-time build of the extension
- `npm run watch` - Watch mode for active development
- `npm run package` - Create a .vsix package for distribution
- `npm run lint` - Run ESLint on source files

## Extension Architecture

### Entry Point
- `src/extension.ts` - Main extension file that VS Code loads
  - Exports `activate()` and `deactivate()` functions
  - Registers commands and view providers
  - Manages extension lifecycle

### Key Components (To Be Implemented)

1. **ChatViewProvider** (`src/chatViewProvider.ts`)
   - Implements `vscode.WebviewViewProvider`
   - Creates and manages the webview
   - Handles message passing between extension and webview

2. **WebSocket Client** (`src/websocket/client.ts`)
   - Connects to ClaudeOS kernel server
   - Manages WebSocket connection lifecycle
   - Handles message serialization/deserialization

3. **Webview UI** (`src/webview/`)
   - Vanilla TypeScript (no React/framework)
   - Uses VS Code Webview API
   - Communicates with extension via `postMessage`

## VS Code Extension API

### Key APIs Used

- `vscode.window.registerWebviewViewProvider()` - Register chat panel view
- `vscode.commands.registerCommand()` - Register commands
- `vscode.workspace.getConfiguration()` - Access settings
- `vscode.window.createWebviewPanel()` - Open chat in editor

### Webview Communication

Extension → Webview:
```typescript
webview.postMessage({ type: 'message', data: {...} });
```

Webview → Extension:
```typescript
vscode.postMessage({ type: 'action', data: {...} });
```

## Configuration

Extension settings are defined in `package.json` under `contributes.configuration`:

- `claudeos.chat.wsUrl` - WebSocket URL for kernel server
- `claudeos.chat.autoConnect` - Auto-connect on activation
- `claudeos.chat.theme` - Chat panel theme

Access settings in code:
```typescript
const config = vscode.workspace.getConfiguration('claudeos.chat');
const wsUrl = config.get<string>('wsUrl');
```

## Testing

### Manual Testing
1. Run the extension in Development Host (F5)
2. Open the ClaudeOS Chat panel from the Activity Bar
3. Test commands via Command Palette (Ctrl+Shift+P / Cmd+Shift+P)

### Unit Testing (To Be Added)
- Extension tests go in `src/test/`
- Use VS Code's extension testing framework

## Debugging

### Extension Host Debugging
- Set breakpoints in `src/extension.ts` or other extension code
- Launch with F5
- Breakpoints will be hit in the main VS Code window

### Webview Debugging
- Open Developer Tools: `Help > Toggle Developer Tools`
- In the DevTools Console, run: `Ctrl+Shift+P > Developer: Open Webview Developer Tools`
- Debug webview code in the separate DevTools window

## Packaging

Create a .vsix package for distribution:
```bash
npm run package
```

This creates `claudeos-chat-0.1.0.vsix` in the extension directory.

Install the packaged extension:
```bash
code --install-extension claudeos-chat-0.1.0.vsix
```

## Publishing (Future)

To publish to the VS Code Marketplace:
1. Create a publisher account at https://marketplace.visualstudio.com/
2. Update `publisher` field in package.json
3. Generate a personal access token
4. Run `vsce publish`

## Troubleshooting

### Extension doesn't activate
- Check that `activationEvents` includes the correct event
- Look for errors in Output > Log (Extension Host)

### Webview doesn't render
- Check Content Security Policy in HTML
- Ensure webview URI scheme is used for resources
- Check DevTools console for errors

### WebSocket connection fails
- Verify ClaudeOS kernel server is running
- Check `claudeos.chat.wsUrl` setting
- Look for connection errors in Extension Host logs

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Webview API Guide](https://code.visualstudio.com/api/extension-guides/webview)
- [Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
