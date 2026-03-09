# ClaudeOS Settings Extension

A VS Code extension that provides comprehensive settings management for ClaudeOS. This extension offers a centralized interface for configuring and managing all ClaudeOS components, with support for multiple configuration sources and hierarchical settings merging.

## Features

- **Unified Settings Management**: Single interface for all ClaudeOS configuration
- **Multiple Configuration Sources**: Reads from config files, environment variables, and VS Code settings
- **Hierarchical Merging**: Workspace > User > Defaults priority system
- **Settings Validation**: Validates settings before saving
- **Import/Export**: Backup and restore settings as JSON
- **Real-time Updates**: Changes propagate immediately with event notifications
- **Activity Bar Integration**: Quick access via dedicated gear icon

## Settings Manager Service

The core `SettingsManager` service provides:

### Reading Settings

```typescript
import { SettingsManager } from 'claudeos-settings';

const settingsManager = new SettingsManager(workspaceRoot);

// Read all settings from all sources
const settings = await settingsManager.readAllSettings();

// Settings are merged from (highest to lowest priority):
// 1. VS Code workspace configuration
// 2. User-level files (/data/.claude/settings.json)
// 3. Project config files (config/settings.json, modules.json)
// 4. Environment variables (/data/.env)
// 5. Default values
```

### Writing Settings

```typescript
// Update specific settings
await settingsManager.writeSettings({
  memory: {
    apiUrl: 'http://localhost:8100',
    autoRefresh: true,
  },
  chat: {
    wsUrl: 'ws://localhost:3000/ws',
  },
});
```

### Configuration Sources

The SettingsManager reads from multiple sources:

1. **ClaudeOS Config Files**
   - `/data/.claude/settings.json` - User-level settings
   - `config/settings.json` - Project settings

2. **Module Configuration**
   - `modules.json` - Module enable/disable and config

3. **Environment Variables**
   - `/data/.env` - Environment-specific settings

4. **VS Code Workspace Configuration**
   - Settings in `.vscode/settings.json`

### Methods

#### `readAllSettings(): Promise<AllSettings>`
Read and merge all settings from all sources.

```typescript
const settings = await settingsManager.readAllSettings();
console.log(settings.memory.apiUrl);
console.log(settings.chat.wsUrl);
```

#### `writeSettings(settings: Partial<AllSettings>): Promise<void>`
Write settings to appropriate locations with validation.

```typescript
await settingsManager.writeSettings({
  memory: {
    apiUrl: 'http://localhost:8100',
    refreshInterval: 60000,
  },
});
```

#### `resetToDefaults(category?: string): Promise<void>`
Reset settings to default values.

```typescript
// Reset specific category
await settingsManager.resetToDefaults('memory');

// Reset all settings
await settingsManager.resetToDefaults();
```

#### `exportSettings(): Promise<string>`
Export all settings as JSON string.

```typescript
const json = await settingsManager.exportSettings();
await fs.writeFile('backup.json', json);
```

#### `importSettings(json: string): Promise<void>`
Import settings from JSON string.

```typescript
const json = await fs.readFile('backup.json', 'utf8');
await settingsManager.importSettings(json);
```

### Events

Listen for settings changes:

```typescript
settingsManager.onDidChangeSettings((event) => {
  console.log(`Category: ${event.category}`);
  console.log(`Changed at: ${event.timestamp}`);
  console.log('Updated settings:', event.settings);
});
```

## Settings Structure

### Memory Settings
```typescript
{
  memory: {
    apiUrl: string;           // Memory API URL
    autoRefresh: boolean;      // Auto-refresh memory graph
    refreshInterval: number;   // Refresh interval in ms
    defaultScope: 'session' | 'user' | 'global';
    authToken?: string;        // Auth token
  }
}
```

### Chat Settings
```typescript
{
  chat: {
    wsUrl: string;            // WebSocket URL
    autoConnect: boolean;      // Auto-connect on startup
    maxHistory?: number;       // Max message history
    debug?: boolean;          // Debug logging
  }
}
```

### n8n Settings
```typescript
{
  n8n: {
    serviceUrl: string;       // n8n service URL
    apiKey?: string;          // API key
    autoStart?: boolean;      // Auto-start workflows
  }
}
```

### Browser Settings
```typescript
{
  browser: {
    browserType?: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;       // Run in headless mode
    timeout?: number;         // Operation timeout in ms
  }
}
```

### Module Settings
```typescript
{
  modules: {
    modules: {
      [moduleName: string]: {
        enabled: boolean;
        config?: Record<string, unknown>;
      }
    }
  }
}
```

## Commands

- `ClaudeOS: Open Settings` - Opens the settings panel
- `ClaudeOS: Refresh Settings` - Reload settings from all sources
- `ClaudeOS: Export Settings` - Export settings to JSON file
- `ClaudeOS: Import Settings` - Import settings from JSON file
- `ClaudeOS: Reset Settings` - Reset all settings to defaults
- `ClaudeOS: Edit Settings Category` - Open VS Code settings for specific category

## File Persistence

The SettingsManager uses the VS Code Workspace FileSystem API for all file operations:

```typescript
// Reading files
const uri = vscode.Uri.file(filePath);
const content = await vscode.workspace.fs.readFile(uri);

// Writing files
const content = Buffer.from(json, 'utf8');
await vscode.workspace.fs.writeFile(uri, content);
```

## Error Handling

All methods include comprehensive error handling:

```typescript
try {
  await settingsManager.writeSettings(newSettings);
} catch (error) {
  console.error('Failed to save settings:', error.message);
}
```

Validation errors are thrown before writing:

```typescript
// This will throw a validation error
await settingsManager.writeSettings({
  memory: {
    refreshInterval: 500, // Too low, must be >= 1000ms
  },
});
```

## Requirements

- VS Code 1.60.0 or higher

## Development

### Building

```bash
npm run compile  # Build once
npm run watch    # Watch mode
```

### Testing

```bash
npm test
```

## Architecture

```
src/
├── services/
│   ├── SettingsManager.ts      # Main settings service
│   └── index.ts
├── types/
│   ├── settings.ts             # TypeScript type definitions
│   └── index.ts
├── extension.ts                # Extension entry point
├── SettingsViewProvider.ts     # Webview provider
└── index.ts                    # Public API exports
```

## Integration Example

```typescript
import * as vscode from 'vscode';
import { SettingsManager } from 'claudeos-settings';

export function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

  const settingsManager = new SettingsManager(workspaceRoot);

  // Read settings
  settingsManager.readAllSettings().then(settings => {
    console.log('Memory API:', settings.memory.apiUrl);
  });

  // Listen for changes
  context.subscriptions.push(
    settingsManager.onDidChangeSettings(event => {
      if (event.category === 'memory') {
        console.log('Memory settings changed');
      }
    })
  );

  // Clean up
  context.subscriptions.push(settingsManager);
}
```

## License

MIT
