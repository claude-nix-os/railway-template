# ClaudeOS n8n Workflows Extension

Embeds the n8n workflow editor directly within VS Code, providing seamless access to workflow automation tools without leaving your development environment.

## Features

- **Embedded n8n Editor**: Full n8n workflow editor embedded in a VS Code webview panel
- **Seamless Integration**: Access n8n workflows from the ClaudeOS sidebar
- **Quick Actions**: Refresh workflows and open n8n in external browser
- **Automatic Configuration**: Connects to n8n server proxied through ClaudeOS kernel (port 3000)

## Requirements

- VS Code 1.80.0 or higher
- ClaudeOS kernel server running on port 3000
- n8n instance accessible at `/n8n/` endpoint (proxied by kernel server)

## Extension Settings

This extension contributes the following settings:

* `claudeos.n8n.serverUrl`: n8n server URL (default: `http://localhost:3000/n8n`)
* `claudeos.n8n.autoRefresh`: Automatically refresh the n8n iframe on changes (default: `false`)

## Usage

1. Open the ClaudeOS sidebar in VS Code
2. Navigate to the "n8n Workflows" panel
3. The n8n editor will load automatically
4. Use the toolbar buttons to:
   - Refresh the workflow view
   - Open n8n in your default browser

## Architecture

The extension uses an iframe-based webview to embed the n8n web interface. All communication with n8n happens through the ClaudeOS kernel server, which acts as a reverse proxy to the n8n instance running on port 5678.

## Development

### Building

```bash
npm install
npm run compile
```

### Watching

```bash
npm run watch
```

### Packaging

```bash
npm run package
```

## Known Issues

- Iframe may require reload if n8n server restarts
- Some n8n features requiring popups may not work within the embedded view

## Release Notes

### 1.0.0

Initial release of ClaudeOS n8n Workflows extension:
- Embedded n8n workflow editor
- Refresh and open in browser commands
- Configurable server URL
