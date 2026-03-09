/**
 * Example Usage of SettingsManager
 *
 * This file demonstrates how to use the SettingsManager service
 * in your ClaudeOS extensions.
 */

import * as vscode from 'vscode';
import { SettingsManager } from './services/SettingsManager';
import type { AllSettings } from './types/settings';

/* ------------------------------------------------------------------ */
/*  Example 1: Basic Initialization and Reading                       */
/* ------------------------------------------------------------------ */

export async function example1_basicUsage() {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

  // Create settings manager
  const settingsManager = new SettingsManager(workspaceRoot, {
    autoSave: true,
  });

  // Read all settings
  const settings = await settingsManager.readAllSettings();

  console.log('Memory API URL:', settings.memory.apiUrl);
  console.log('Chat WebSocket URL:', settings.chat.wsUrl);
  console.log('n8n Service URL:', settings.n8n.serviceUrl);

  // Clean up
  settingsManager.dispose();
}

/* ------------------------------------------------------------------ */
/*  Example 2: Updating Settings                                      */
/* ------------------------------------------------------------------ */

export async function example2_updateSettings() {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const settingsManager = new SettingsManager(workspaceRoot);

  // Update memory settings
  await settingsManager.writeSettings({
    memory: {
      apiUrl: 'http://production-server:8100',
      autoRefresh: true,
      refreshInterval: 60000,
      defaultScope: 'global',
    },
  });

  console.log('Memory settings updated');

  // Update multiple categories
  await settingsManager.writeSettings({
    memory: {
      apiUrl: 'http://localhost:8100',
    },
    chat: {
      wsUrl: 'ws://localhost:3000/ws',
      autoConnect: true,
    },
  });

  console.log('Multiple settings updated');

  settingsManager.dispose();
}

/* ------------------------------------------------------------------ */
/*  Example 3: Listening for Changes                                  */
/* ------------------------------------------------------------------ */

export async function example3_listenForChanges(
  context: vscode.ExtensionContext
) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const settingsManager = new SettingsManager(workspaceRoot);

  // Subscribe to settings changes
  const subscription = settingsManager.onDidChangeSettings((event) => {
    console.log(`Settings changed: ${event.category} at ${event.timestamp}`);

    if (event.category === 'memory') {
      console.log('Memory settings changed:', event.settings.memory);
      // React to memory settings changes
    }

    if (event.category === 'chat') {
      console.log('Chat settings changed:', event.settings.chat);
      // Reconnect chat websocket, etc.
    }

    if (event.category === 'all') {
      console.log('All settings changed (import/reset)');
      // Reload entire application configuration
    }
  });

  // Register for cleanup
  context.subscriptions.push(subscription);
  context.subscriptions.push(settingsManager);
}

/* ------------------------------------------------------------------ */
/*  Example 4: Export and Import                                      */
/* ------------------------------------------------------------------ */

export async function example4_exportImport() {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const settingsManager = new SettingsManager(workspaceRoot);

  // Export settings
  const exportJson = await settingsManager.exportSettings();
  console.log('Exported settings:', exportJson);

  // Save to file
  const exportUri = vscode.Uri.file('/tmp/settings-backup.json');
  const exportContent = Buffer.from(exportJson, 'utf8');
  await vscode.workspace.fs.writeFile(exportUri, exportContent);
  console.log('Settings exported to file');

  // Import settings
  const importUri = vscode.Uri.file('/tmp/settings-backup.json');
  const importContent = await vscode.workspace.fs.readFile(importUri);
  const importJson = Buffer.from(importContent).toString('utf8');

  await settingsManager.importSettings(importJson);
  console.log('Settings imported from file');

  settingsManager.dispose();
}

/* ------------------------------------------------------------------ */
/*  Example 5: Reset to Defaults                                      */
/* ------------------------------------------------------------------ */

export async function example5_resetDefaults() {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const settingsManager = new SettingsManager(workspaceRoot);

  // Reset specific category
  await settingsManager.resetToDefaults('memory');
  console.log('Memory settings reset to defaults');

  // Reset all settings
  await settingsManager.resetToDefaults();
  console.log('All settings reset to defaults');

  settingsManager.dispose();
}

/* ------------------------------------------------------------------ */
/*  Example 6: Validation and Error Handling                          */
/* ------------------------------------------------------------------ */

export async function example6_validationAndErrors() {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const settingsManager = new SettingsManager(workspaceRoot);

  try {
    // This will fail validation - refresh interval too low
    await settingsManager.writeSettings({
      memory: {
        refreshInterval: 500, // Must be >= 1000ms
      },
    });
  } catch (error) {
    console.error('Validation failed:', error);
    vscode.window.showErrorMessage(
      `Settings validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  try {
    // This will fail validation - invalid URL
    await settingsManager.writeSettings({
      memory: {
        apiUrl: 'not-a-valid-url',
      },
    });
  } catch (error) {
    console.error('Validation failed:', error);
  }

  try {
    // This will succeed
    await settingsManager.writeSettings({
      memory: {
        apiUrl: 'http://localhost:8100',
        refreshInterval: 30000,
      },
    });
    console.log('Settings updated successfully');
  } catch (error) {
    console.error('Update failed:', error);
  }

  settingsManager.dispose();
}

/* ------------------------------------------------------------------ */
/*  Example 7: Configuration Service Pattern                          */
/* ------------------------------------------------------------------ */

/**
 * Example service that uses SettingsManager to configure itself
 */
export class ConfigurableService {
  private settingsManager: SettingsManager;
  private apiUrl: string = 'http://localhost:8100';
  private disposables: vscode.Disposable[] = [];

  constructor(settingsManager: SettingsManager) {
    this.settingsManager = settingsManager;
  }

  async initialize(): Promise<void> {
    // Load initial settings
    const settings = await this.settingsManager.readAllSettings();
    this.apiUrl = settings.memory.apiUrl;

    console.log(`Service initialized with API URL: ${this.apiUrl}`);

    // Listen for settings changes
    const subscription = this.settingsManager.onDidChangeSettings((event) => {
      if (event.category === 'memory' && event.settings.memory) {
        this.handleMemorySettingsChange(event.settings.memory);
      }
    });

    this.disposables.push(subscription);
  }

  private handleMemorySettingsChange(settings: Partial<AllSettings['memory']>): void {
    if (settings.apiUrl && settings.apiUrl !== this.apiUrl) {
      console.log(`API URL changed from ${this.apiUrl} to ${settings.apiUrl}`);
      this.apiUrl = settings.apiUrl;

      // Reconnect or reconfigure with new URL
      this.reconnect();
    }
  }

  private reconnect(): void {
    console.log(`Reconnecting to ${this.apiUrl}...`);
    // Implement reconnection logic
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}

/* ------------------------------------------------------------------ */
/*  Example 8: VS Code Command Integration                           */
/* ------------------------------------------------------------------ */

export function example8_registerCommands(
  context: vscode.ExtensionContext,
  settingsManager: SettingsManager
) {
  // Command: Update Memory API URL
  context.subscriptions.push(
    vscode.commands.registerCommand('example.updateMemoryUrl', async () => {
      const currentSettings = await settingsManager.readAllSettings();

      const newUrl = await vscode.window.showInputBox({
        prompt: 'Enter new Memory API URL',
        value: currentSettings.memory.apiUrl,
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
    })
  );

  // Command: Toggle Auto-Refresh
  context.subscriptions.push(
    vscode.commands.registerCommand('example.toggleAutoRefresh', async () => {
      const settings = await settingsManager.readAllSettings();
      const newValue = !settings.memory.autoRefresh;

      await settingsManager.writeSettings({
        memory: { autoRefresh: newValue },
      });

      vscode.window.showInformationMessage(
        `Memory auto-refresh ${newValue ? 'enabled' : 'disabled'}`
      );
    })
  );

  // Command: Show Current Settings
  context.subscriptions.push(
    vscode.commands.registerCommand('example.showSettings', async () => {
      const settings = await settingsManager.readAllSettings();

      const info = [
        'Current Settings:',
        '',
        'Memory:',
        `  API URL: ${settings.memory.apiUrl}`,
        `  Auto-refresh: ${settings.memory.autoRefresh}`,
        `  Refresh interval: ${settings.memory.refreshInterval}ms`,
        `  Default scope: ${settings.memory.defaultScope}`,
        '',
        'Chat:',
        `  WebSocket URL: ${settings.chat.wsUrl}`,
        `  Auto-connect: ${settings.chat.autoConnect}`,
        '',
        'n8n:',
        `  Service URL: ${settings.n8n.serviceUrl}`,
      ].join('\n');

      vscode.window.showInformationMessage(info, { modal: true });
    })
  );
}

/* ------------------------------------------------------------------ */
/*  Example 9: Status Bar Integration                                */
/* ------------------------------------------------------------------ */

export class SettingsStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private settingsManager: SettingsManager;

  constructor(settingsManager: SettingsManager) {
    this.settingsManager = settingsManager;
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'example.showSettings';
  }

  async initialize(): Promise<void> {
    // Update status bar with current settings
    await this.update();

    // Listen for settings changes
    this.settingsManager.onDidChangeSettings((event) => {
      if (event.category === 'memory' || event.category === 'all') {
        this.update();
      }
    });

    this.statusBarItem.show();
  }

  private async update(): Promise<void> {
    const settings = await this.settingsManager.readAllSettings();

    const icon = settings.memory.autoRefresh ? '$(sync)' : '$(database)';
    this.statusBarItem.text = `${icon} Memory: ${settings.memory.defaultScope}`;
    this.statusBarItem.tooltip = [
      'ClaudeOS Memory Settings',
      `API: ${settings.memory.apiUrl}`,
      `Auto-refresh: ${settings.memory.autoRefresh}`,
      '',
      'Click to view all settings',
    ].join('\n');
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}

/* ------------------------------------------------------------------ */
/*  Example 10: Complete Extension Integration                       */
/* ------------------------------------------------------------------ */

let settingsManager: SettingsManager | undefined;
let configurableService: ConfigurableService | undefined;
let statusBar: SettingsStatusBar | undefined;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Example extension activating...');

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

  // Initialize settings manager
  settingsManager = new SettingsManager(workspaceRoot, {
    autoSave: true,
  });

  // Register for cleanup
  context.subscriptions.push(settingsManager);

  // Initialize configurable service
  configurableService = new ConfigurableService(settingsManager);
  await configurableService.initialize();
  context.subscriptions.push(configurableService);

  // Initialize status bar
  statusBar = new SettingsStatusBar(settingsManager);
  await statusBar.initialize();
  context.subscriptions.push(statusBar);

  // Register commands
  example8_registerCommands(context, settingsManager);

  // Listen for settings changes globally
  context.subscriptions.push(
    settingsManager.onDidChangeSettings((event) => {
      console.log(`Settings changed: ${event.category} at ${event.timestamp}`);
    })
  );

  console.log('Example extension activated');
}

export function deactivate() {
  console.log('Example extension deactivating...');

  statusBar?.dispose();
  configurableService?.dispose();
  settingsManager?.dispose();

  statusBar = undefined;
  configurableService = undefined;
  settingsManager = undefined;

  console.log('Example extension deactivated');
}
