# SettingsManager Usage Guide

This guide provides practical examples of using the SettingsManager service in your ClaudeOS extensions.

## Installation

The SettingsManager is part of the `claudeos-settings` extension. It can be imported and used by other extensions in the ClaudeOS ecosystem.

```typescript
import { SettingsManager } from './services/SettingsManager';
import type { AllSettings, MemorySettings } from './types/settings';
```

## Basic Usage

### Initialize the Settings Manager

```typescript
import * as vscode from 'vscode';
import { SettingsManager } from './services/SettingsManager';

const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

const settingsManager = new SettingsManager(workspaceRoot, {
  autoSave: true,  // Automatically save changes
  dataDir: '/data', // Optional: Override default data directory
});
```

### Read All Settings

```typescript
// Read and merge settings from all sources
const settings = await settingsManager.readAllSettings();

console.log('Memory API URL:', settings.memory.apiUrl);
console.log('Chat WebSocket URL:', settings.chat.wsUrl);
console.log('Auto-refresh enabled:', settings.memory.autoRefresh);
console.log('Enabled modules:', Object.keys(settings.modules.modules));
```

### Update Settings

```typescript
// Update memory settings
await settingsManager.writeSettings({
  memory: {
    apiUrl: 'http://localhost:8100',
    autoRefresh: true,
    refreshInterval: 60000,
    defaultScope: 'global',
  },
});

// Update multiple categories at once
await settingsManager.writeSettings({
  memory: {
    apiUrl: 'http://localhost:8100',
  },
  chat: {
    wsUrl: 'ws://localhost:3000/ws',
    autoConnect: true,
  },
  n8n: {
    serviceUrl: 'http://localhost:5678',
  },
});
```

### Update Partial Settings

You don't need to provide all fields - only the ones you want to change:

```typescript
// Only update the API URL
await settingsManager.writeSettings({
  memory: {
    apiUrl: 'http://production-server:8100',
  },
});

// Other memory settings remain unchanged
```

### Reset Settings

```typescript
// Reset specific category to defaults
await settingsManager.resetToDefaults('memory');

// Reset all settings to defaults
await settingsManager.resetToDefaults();
```

## Advanced Usage

### Listen for Settings Changes

```typescript
// Subscribe to settings change events
const disposable = settingsManager.onDidChangeSettings((event) => {
  console.log(`Settings changed: ${event.category}`);
  console.log(`Changed at: ${event.timestamp.toISOString()}`);

  if (event.category === 'memory') {
    // React to memory settings changes
    const memorySettings = event.settings.memory;
    if (memorySettings) {
      console.log('New memory API URL:', memorySettings.apiUrl);
    }
  }

  if (event.category === 'all') {
    // All settings were updated (e.g., after import)
    console.log('All settings updated');
  }
});

// Don't forget to dispose when done
disposable.dispose();
```

### Export Settings

```typescript
// Export all settings as JSON
const exportJson = await settingsManager.exportSettings();

// Save to file
const uri = vscode.Uri.file('/path/to/backup.json');
const content = Buffer.from(exportJson, 'utf8');
await vscode.workspace.fs.writeFile(uri, content);

console.log('Settings exported successfully');
```

The export format includes metadata:

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-03-09T15:30:00.000Z",
  "settings": {
    "claudeos": { ... },
    "modules": { ... },
    "memory": { ... },
    "chat": { ... },
    "n8n": { ... },
    "browser": { ... }
  },
  "metadata": {
    "workspaceRoot": "/path/to/workspace"
  }
}
```

### Import Settings

```typescript
// Read settings from file
const uri = vscode.Uri.file('/path/to/backup.json');
const content = await vscode.workspace.fs.readFile(uri);
const json = Buffer.from(content).toString('utf8');

// Import settings
await settingsManager.importSettings(json);

console.log('Settings imported successfully');
```

### Validation

The SettingsManager automatically validates settings before writing:

```typescript
try {
  await settingsManager.writeSettings({
    memory: {
      refreshInterval: 500, // Invalid: must be >= 1000ms
    },
  });
} catch (error) {
  console.error('Validation failed:', error.message);
  // Error: Settings validation failed: Refresh interval must be at least 1000ms
}
```

Validation checks include:
- URL format validation for API endpoints
- WebSocket URL format validation
- Numeric range validation
- Required field validation

## Integration Patterns

### Extension Activation

```typescript
import * as vscode from 'vscode';
import { SettingsManager } from './services/SettingsManager';

let settingsManager: SettingsManager | undefined;

export function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

  // Initialize settings manager
  settingsManager = new SettingsManager(workspaceRoot);

  // Register for cleanup
  context.subscriptions.push(settingsManager);

  // Load initial settings
  settingsManager.readAllSettings().then(settings => {
    console.log('Loaded settings:', settings);
  });

  // Listen for changes
  context.subscriptions.push(
    settingsManager.onDidChangeSettings((event) => {
      console.log('Settings changed:', event.category);
    })
  );
}

export function deactivate() {
  settingsManager?.dispose();
  settingsManager = undefined;
}
```

### Service Configuration

Use the SettingsManager to configure other services:

```typescript
import { SettingsManager } from './services/SettingsManager';
import { MemoryApiClient } from '../claudeos-memory/src/services/MemoryApiClient';

class MyService {
  private memoryClient: MemoryApiClient;
  private settingsManager: SettingsManager;

  async initialize() {
    // Read settings
    const settings = await this.settingsManager.readAllSettings();

    // Configure memory client
    this.memoryClient = new MemoryApiClient({
      baseUrl: settings.memory.apiUrl,
      authToken: settings.memory.authToken || 'default-token',
      timeout: 30000,
    });

    // Listen for settings changes and reconfigure
    this.settingsManager.onDidChangeSettings((event) => {
      if (event.category === 'memory' && event.settings.memory) {
        this.memoryClient.setBaseUrl(event.settings.memory.apiUrl);
        if (event.settings.memory.authToken) {
          this.memoryClient.setAuthToken(event.settings.memory.authToken);
        }
      }
    });
  }
}
```

### VS Code Commands

Create commands that interact with settings:

```typescript
vscode.commands.registerCommand('myext.updateMemoryUrl', async () => {
  const newUrl = await vscode.window.showInputBox({
    prompt: 'Enter new Memory API URL',
    value: 'http://localhost:8100',
    validateInput: (value) => {
      try {
        new URL(value);
        return null;
      } catch {
        return 'Invalid URL format';
      }
    },
  });

  if (newUrl) {
    await settingsManager.writeSettings({
      memory: { apiUrl: newUrl },
    });
    vscode.window.showInformationMessage('Memory API URL updated');
  }
});
```

### Status Bar Integration

Show settings status in the status bar:

```typescript
const statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  100
);

async function updateStatusBar() {
  const settings = await settingsManager.readAllSettings();

  if (settings.memory.autoRefresh) {
    statusBarItem.text = `$(sync) Memory: ${settings.memory.defaultScope}`;
  } else {
    statusBarItem.text = `$(database) Memory: ${settings.memory.defaultScope}`;
  }

  statusBarItem.show();
}

// Update on startup and when settings change
updateStatusBar();
settingsManager.onDidChangeSettings((event) => {
  if (event.category === 'memory' || event.category === 'all') {
    updateStatusBar();
  }
});
```

## Configuration Sources Priority

Settings are merged in the following priority order (highest to lowest):

1. **VS Code Workspace Configuration** (`.vscode/settings.json`)
   - Highest priority
   - User-specific, workspace-specific

2. **User-Level Settings** (`/data/.claude/settings.json`)
   - User preferences
   - Persists across workspaces

3. **Project Configuration** (`config/settings.json`)
   - Project-level settings
   - Shared across team

4. **Module Configuration** (`modules.json`)
   - Module enable/disable state
   - Module-specific config

5. **Environment Variables** (`/data/.env`)
   - Environment-specific overrides
   - Good for secrets and deployment config

6. **Default Values**
   - Lowest priority
   - Built-in defaults

### Example Priority Resolution

If you have:
- Default: `memory.apiUrl = "http://localhost:8100"`
- Project config: `memory.apiUrl = "http://project-server:8100"`
- VS Code workspace: `memory.apiUrl = "http://my-server:8100"`

The final value will be: `"http://my-server:8100"` (from VS Code workspace)

## Error Handling

Always wrap settings operations in try-catch blocks:

```typescript
try {
  const settings = await settingsManager.readAllSettings();
  // Use settings
} catch (error) {
  console.error('Failed to read settings:', error);
  vscode.window.showErrorMessage(
    `Failed to read settings: ${error instanceof Error ? error.message : 'Unknown error'}`
  );
  // Fall back to defaults or show error UI
}
```

## Type Safety

Use TypeScript types for full type safety:

```typescript
import type { AllSettings, MemorySettings, ChatSettings } from './types/settings';

// Strongly typed settings object
const settings: AllSettings = await settingsManager.readAllSettings();

// Type-safe partial updates
const memoryUpdate: Partial<MemorySettings> = {
  apiUrl: 'http://localhost:8100',
  autoRefresh: true,
};

await settingsManager.writeSettings({
  memory: memoryUpdate,
});
```

## Testing

Mock the SettingsManager in tests:

```typescript
import { SettingsManager } from './services/SettingsManager';

// Create a test instance
const mockSettingsManager = new SettingsManager('/tmp/test-workspace', {
  autoSave: false,
  dataDir: '/tmp/test-data',
});

// Test reading
const settings = await mockSettingsManager.readAllSettings();
expect(settings.memory.apiUrl).toBe('http://localhost:8100');

// Test writing
await mockSettingsManager.writeSettings({
  memory: { apiUrl: 'http://test:8100' },
});

// Clean up
mockSettingsManager.dispose();
```

## Best Practices

1. **Initialize Once**: Create one SettingsManager instance per extension
2. **Dispose Properly**: Always dispose the manager on deactivation
3. **Listen for Changes**: Use events instead of polling
4. **Validate Input**: Validate user input before writing settings
5. **Handle Errors**: Always wrap in try-catch blocks
6. **Use Partial Updates**: Only update fields that changed
7. **Type Safety**: Use TypeScript types for compile-time safety
8. **Document Defaults**: Document default values in your extension

## Troubleshooting

### Settings Not Loading

Check that all configuration files exist and are valid JSON:

```typescript
const settings = await settingsManager.readAllSettings();
console.log('Loaded settings:', JSON.stringify(settings, null, 2));
```

### Settings Not Saving

Check file permissions and paths:

```typescript
try {
  await settingsManager.writeSettings({ ... });
} catch (error) {
  console.error('Write failed:', error);
  // Check error message for details
}
```

### VS Code Settings Not Applied

Make sure you're writing to the correct configuration target:

```typescript
// Workspace settings (per-project)
vscode.ConfigurationTarget.Workspace

// User settings (global)
vscode.ConfigurationTarget.Global
```

The SettingsManager uses `Workspace` by default for all VS Code settings.
