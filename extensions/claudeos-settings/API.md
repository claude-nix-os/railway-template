# SettingsManager Public API Reference

Complete API reference for the ClaudeOS SettingsManager service.

## Installation

```typescript
import { SettingsManager } from './services/SettingsManager';
import type { AllSettings, MemorySettings, ChatSettings } from './types/settings';
```

## Constructor

### `new SettingsManager(workspaceRoot, options?)`

Create a new SettingsManager instance.

**Parameters:**
- `workspaceRoot` (string) - Root directory of the workspace
- `options` (SettingsManagerOptions, optional)
  - `dataDir` (string) - Base data directory path (default: '/data')
  - `autoSave` (boolean) - Auto-save changes (default: true)

**Returns:** SettingsManager instance

**Example:**
```typescript
const settingsManager = new SettingsManager(workspaceRoot, {
  dataDir: '/data',
  autoSave: true,
});
```

## Methods

### `readAllSettings(): Promise<AllSettings>`

Read and merge all settings from all sources.

**Returns:** Promise resolving to complete settings object

**Throws:** Error if reading fails

**Example:**
```typescript
const settings = await settingsManager.readAllSettings();
console.log(settings.memory.apiUrl);
```

**Settings Priority (highest to lowest):**
1. VS Code workspace configuration
2. User-level files (`/data/.claude/settings.json`)
3. Project config (`config/settings.json`)
4. Module config (`modules.json`)
5. Environment variables (`/data/.env`)
6. Default values

---

### `writeSettings(settings: Partial<AllSettings>): Promise<void>`

Write settings to appropriate locations with validation.

**Parameters:**
- `settings` (Partial<AllSettings>) - Settings to write (can be partial)

**Returns:** Promise resolving when write completes

**Throws:**
- Error if validation fails
- Error if write fails

**Example:**
```typescript
await settingsManager.writeSettings({
  memory: {
    apiUrl: 'http://localhost:8100',
    refreshInterval: 60000,
  },
  chat: {
    wsUrl: 'ws://localhost:3000/ws',
  },
});
```

**Validation:**
- Validates settings before writing
- Throws descriptive errors for validation failures
- Ensures type safety

---

### `resetToDefaults(category?: keyof AllSettings): Promise<void>`

Reset settings to default values.

**Parameters:**
- `category` (optional) - Specific category to reset (if omitted, resets all)

**Returns:** Promise resolving when reset completes

**Throws:** Error if reset fails

**Examples:**
```typescript
// Reset specific category
await settingsManager.resetToDefaults('memory');

// Reset all settings
await settingsManager.resetToDefaults();
```

---

### `exportSettings(): Promise<string>`

Export all settings as JSON string.

**Returns:** Promise resolving to JSON string with metadata

**Throws:** Error if export fails

**Example:**
```typescript
const json = await settingsManager.exportSettings();
await fs.writeFile('backup.json', json);
```

**Export Format:**
```typescript
{
  version: string;           // Format version
  exportedAt: string;        // ISO timestamp
  settings: AllSettings;     // Complete settings
  metadata?: Record<...>;    // Optional metadata
}
```

---

### `importSettings(json: string): Promise<void>`

Import settings from JSON string.

**Parameters:**
- `json` (string) - JSON string containing settings export

**Returns:** Promise resolving when import completes

**Throws:**
- Error if JSON is invalid
- Error if version is incompatible
- Error if import fails

**Example:**
```typescript
const json = await fs.readFile('backup.json', 'utf8');
await settingsManager.importSettings(json);
```

---

### `dispose(): void`

Dispose of resources and clean up event listeners.

**Returns:** void

**Example:**
```typescript
settingsManager.dispose();
```

**Note:** Always dispose when extension deactivates

---

## Events

### `onDidChangeSettings: vscode.Event<SettingsChangeEvent>`

Event fired when settings change.

**Event Object:**
```typescript
interface SettingsChangeEvent {
  category: keyof AllSettings | 'all';  // Category that changed
  settings: Partial<AllSettings>;       // Changed settings
  timestamp: Date;                      // When change occurred
}
```

**Example:**
```typescript
const subscription = settingsManager.onDidChangeSettings((event) => {
  console.log(`Category: ${event.category}`);
  console.log(`Time: ${event.timestamp.toISOString()}`);

  if (event.category === 'memory') {
    console.log('Memory settings:', event.settings.memory);
  }
});

// Don't forget to dispose
subscription.dispose();
```

---

## Types

### `AllSettings`

Complete settings structure.

```typescript
interface AllSettings {
  claudeos: ClaudeOSSettings;
  modules: ModulesSettings;
  memory: MemorySettings;
  chat: ChatSettings;
  n8n: N8nSettings;
  browser: BrowserSettings;
}
```

---

### `MemorySettings`

Memory service configuration.

```typescript
interface MemorySettings {
  apiUrl: string;                          // Memory API URL
  autoRefresh: boolean;                    // Auto-refresh enabled
  refreshInterval: number;                 // Refresh interval (ms)
  defaultScope: 'session' | 'user' | 'global';  // Default scope
  authToken?: string;                      // Auth token (optional)
}
```

**Defaults:**
```typescript
{
  apiUrl: 'http://localhost:8100',
  autoRefresh: true,
  refreshInterval: 30000,
  defaultScope: 'session'
}
```

**Validation:**
- `apiUrl`: Must be valid HTTP/HTTPS URL
- `refreshInterval`: Must be >= 1000ms

---

### `ChatSettings`

Chat service configuration.

```typescript
interface ChatSettings {
  wsUrl: string;           // WebSocket URL
  autoConnect: boolean;    // Auto-connect on startup
  maxHistory?: number;     // Max message history (optional)
  debug?: boolean;         // Debug logging (optional)
}
```

**Defaults:**
```typescript
{
  wsUrl: 'ws://localhost:3000/ws',
  autoConnect: true
}
```

**Validation:**
- `wsUrl`: Must be valid WebSocket URL (ws:// or wss://)
- `maxHistory`: Must be >= 0 if provided

---

### `N8nSettings`

n8n workflow automation settings.

```typescript
interface N8nSettings {
  serviceUrl: string;      // n8n service URL
  apiKey?: string;         // API key (optional)
  autoStart?: boolean;     // Auto-start workflows (optional)
}
```

**Defaults:**
```typescript
{
  serviceUrl: 'http://localhost:5678'
}
```

**Validation:**
- `serviceUrl`: Must be valid HTTP/HTTPS URL

---

### `BrowserSettings`

Browser automation settings.

```typescript
interface BrowserSettings {
  browserType?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;      // Run in headless mode
  timeout?: number;        // Operation timeout (ms)
}
```

**Defaults:**
```typescript
{
  browserType: 'chromium',
  headless: true,
  timeout: 30000
}
```

**Validation:**
- `timeout`: Must be >= 0 if provided

---

### `ModulesSettings`

Module configurations.

```typescript
interface ModulesSettings {
  modules: Record<string, ModuleConfig>;
}

interface ModuleConfig {
  enabled: boolean;                      // Module enabled
  config?: Record<string, unknown>;      // Module-specific config
}
```

**Example:**
```typescript
{
  modules: {
    '@claude-nix-os/module-ui': {
      enabled: true,
      config: { port: 3000 }
    },
    '@claude-nix-os/module-memory': {
      enabled: true
    }
  }
}
```

---

### `ClaudeOSSettings`

Core ClaudeOS system settings.

```typescript
interface ClaudeOSSettings {
  permissions?: {
    allow: string[];
    deny: string[];
  };
  env?: Record<string, string>;
  dataDir?: string;
  workspaceDir?: string;
}
```

**Defaults:**
```typescript
{
  permissions: { allow: [], deny: [] },
  env: {},
  dataDir: '/data',
  workspaceDir: '/data/workspace'
}
```

---

### `SettingsChangeEvent`

Event emitted when settings change.

```typescript
interface SettingsChangeEvent {
  category: keyof AllSettings | 'all';
  settings: Partial<AllSettings>;
  timestamp: Date;
}
```

---

### `SettingsValidationError`

Validation error for settings.

```typescript
interface SettingsValidationError {
  path: string;          // Path to invalid setting (e.g., 'memory.apiUrl')
  message: string;       // Error message
  value: unknown;        // The invalid value
}
```

---

### `SettingsValidationResult`

Result of settings validation.

```typescript
interface SettingsValidationResult {
  valid: boolean;
  errors: SettingsValidationError[];
}
```

---

### `SettingsExport`

Format for exported settings.

```typescript
interface SettingsExport {
  version: string;                        // Export format version
  exportedAt: string;                     // ISO timestamp
  settings: AllSettings;                  // Complete settings
  metadata?: Record<string, unknown>;     // Optional metadata
}
```

---

## Error Handling

All methods throw descriptive errors:

### Validation Errors

```typescript
try {
  await settingsManager.writeSettings({
    memory: { refreshInterval: 500 }  // Too low
  });
} catch (error) {
  // Error: Settings validation failed: Refresh interval must be at least 1000ms
}
```

### File I/O Errors

```typescript
try {
  await settingsManager.readAllSettings();
} catch (error) {
  // Error: Failed to read settings: ENOENT: no such file or directory
}
```

### Parse Errors

```typescript
try {
  await settingsManager.importSettings('invalid json');
} catch (error) {
  // Error: Failed to import settings: Unexpected token 'i'
}
```

---

## Usage Patterns

### Initialization

```typescript
import * as vscode from 'vscode';
import { SettingsManager } from './services/SettingsManager';

export function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const settingsManager = new SettingsManager(workspaceRoot);

  context.subscriptions.push(settingsManager);
}
```

### Reading Settings

```typescript
const settings = await settingsManager.readAllSettings();
const apiUrl = settings.memory.apiUrl;
```

### Updating Settings

```typescript
await settingsManager.writeSettings({
  memory: { apiUrl: 'http://localhost:8100' }
});
```

### Listening for Changes

```typescript
settingsManager.onDidChangeSettings((event) => {
  if (event.category === 'memory') {
    // React to memory settings changes
  }
});
```

### Export/Import

```typescript
// Export
const json = await settingsManager.exportSettings();

// Import
await settingsManager.importSettings(json);
```

---

## Best Practices

1. **Create Once**: Create single SettingsManager instance per extension
2. **Dispose**: Always dispose on deactivation
3. **Use Events**: Listen for changes instead of polling
4. **Validate Input**: Validate before writing
5. **Handle Errors**: Wrap in try-catch blocks
6. **Partial Updates**: Only update changed fields
7. **Type Safety**: Use TypeScript types

---

## Complete Example

```typescript
import * as vscode from 'vscode';
import { SettingsManager } from './services/SettingsManager';

let settingsManager: SettingsManager | undefined;

export async function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

  // Initialize
  settingsManager = new SettingsManager(workspaceRoot, {
    autoSave: true
  });
  context.subscriptions.push(settingsManager);

  // Read settings
  const settings = await settingsManager.readAllSettings();
  console.log('Memory API:', settings.memory.apiUrl);

  // Listen for changes
  context.subscriptions.push(
    settingsManager.onDidChangeSettings((event) => {
      console.log('Settings changed:', event.category);
    })
  );

  // Register command
  context.subscriptions.push(
    vscode.commands.registerCommand('example.updateSettings', async () => {
      try {
        await settingsManager!.writeSettings({
          memory: { apiUrl: 'http://new-url:8100' }
        });
        vscode.window.showInformationMessage('Settings updated');
      } catch (error) {
        vscode.window.showErrorMessage('Failed to update settings');
      }
    })
  );
}

export function deactivate() {
  settingsManager?.dispose();
  settingsManager = undefined;
}
```

---

## Version

**API Version:** 1.0.0

**Compatibility:** VS Code 1.60.0+

**Last Updated:** 2026-03-09
