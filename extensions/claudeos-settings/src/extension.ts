import * as vscode from 'vscode';
import { SettingsManager } from './services/SettingsManager';
import { SettingsViewProvider } from './SettingsViewProvider';

let settingsManager: SettingsManager | undefined;
let settingsViewProvider: SettingsViewProvider | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

/**
 * Extension activation entry point
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('ClaudeOS Settings extension is now active');

  // Get workspace root
  const workspaceRoot =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ||
    process.cwd();

  try {
    // Initialize settings manager
    settingsManager = new SettingsManager(workspaceRoot, {
      autoSave: true,
    });

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99
    );
    statusBarItem.command = 'claudeos.openSettings';
    statusBarItem.text = '$(gear) ClaudeOS Settings';
    statusBarItem.tooltip = 'Open ClaudeOS Settings';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Create settings view provider
    settingsViewProvider = new SettingsViewProvider(
      context.extensionUri,
      settingsManager
    );

    // Register the webview view provider
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        'claudeos.settingsView',
        settingsViewProvider,
        {
          webviewOptions: {
            retainContextWhenHidden: true,
          },
        }
      )
    );

    // Register commands
    registerCommands(context);

    // Listen for settings changes
    context.subscriptions.push(
      settingsManager.onDidChangeSettings((event) => {
        console.log(`Settings changed: ${event.category}`, event.timestamp);

        // Show notification for significant changes
        if (event.category === 'all') {
          vscode.window.showInformationMessage('ClaudeOS settings updated');
        }
      })
    );

    console.log('ClaudeOS Settings extension commands registered');
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(
      `Failed to activate ClaudeOS Settings: ${errorMessage}`
    );
    console.error('ClaudeOS Settings activation error:', error);
  }
}

/**
 * Register extension commands
 */
function registerCommands(context: vscode.ExtensionContext) {
  // Command: Open settings panel
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.openSettings', async () => {
      try {
        // Focus on the settings view
        await vscode.commands.executeCommand('claudeos.settingsView.focus');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(
          `Failed to open settings: ${errorMessage}`
        );
        console.error('Error opening settings:', error);
      }
    })
  );

  // Command: Refresh settings
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.refreshSettings', async () => {
      try {
        if (settingsViewProvider) {
          await settingsViewProvider.refresh();
          vscode.window.showInformationMessage('Settings refreshed');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(
          `Failed to refresh settings: ${errorMessage}`
        );
        console.error('Error refreshing settings:', error);
      }
    })
  );

  // Command: Export settings
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.exportSettings', async () => {
      try {
        if (!settingsManager) {
          throw new Error('Settings manager not initialized');
        }

        // Get export data
        const exportJson = await settingsManager.exportSettings();

        // Show save dialog
        const uri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file('claudeos-settings.json'),
          filters: {
            JSON: ['json'],
          },
          saveLabel: 'Export Settings',
        });

        if (uri) {
          // Write to file
          const content = Buffer.from(exportJson, 'utf8');
          await vscode.workspace.fs.writeFile(uri, content);
          vscode.window.showInformationMessage(
            `Settings exported to ${uri.fsPath}`
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(
          `Failed to export settings: ${errorMessage}`
        );
        console.error('Error exporting settings:', error);
      }
    })
  );

  // Command: Import settings
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.importSettings', async () => {
      try {
        if (!settingsManager) {
          throw new Error('Settings manager not initialized');
        }

        // Show open dialog
        const uris = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: {
            JSON: ['json'],
          },
          openLabel: 'Import Settings',
        });

        if (uris && uris.length > 0) {
          // Read file
          const content = await vscode.workspace.fs.readFile(uris[0]);
          const json = Buffer.from(content).toString('utf8');

          // Confirm import
          const confirm = await vscode.window.showWarningMessage(
            'This will overwrite your current settings. Are you sure?',
            { modal: true },
            'Import',
            'Cancel'
          );

          if (confirm === 'Import') {
            await settingsManager.importSettings(json);
            vscode.window.showInformationMessage('Settings imported successfully');

            // Refresh view
            if (settingsViewProvider) {
              await settingsViewProvider.refresh();
            }
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(
          `Failed to import settings: ${errorMessage}`
        );
        console.error('Error importing settings:', error);
      }
    })
  );

  // Command: Reset settings to defaults
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'claudeos.resetSettings',
      async (category?: string) => {
        try {
          if (!settingsManager) {
            throw new Error('Settings manager not initialized');
          }

          // Confirm reset
          const message = category
            ? `Reset ${category} settings to defaults?`
            : 'Reset all settings to defaults?';

          const confirm = await vscode.window.showWarningMessage(
            message,
            { modal: true },
            'Reset',
            'Cancel'
          );

          if (confirm === 'Reset') {
            await settingsManager.resetToDefaults(
              category as any
            );
            vscode.window.showInformationMessage('Settings reset to defaults');

            // Refresh view
            if (settingsViewProvider) {
              await settingsViewProvider.refresh();
            }
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          vscode.window.showErrorMessage(
            `Failed to reset settings: ${errorMessage}`
          );
          console.error('Error resetting settings:', error);
        }
      }
    )
  );

  // Command: Edit settings category
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'claudeos.editSettingsCategory',
      async () => {
        try {
          if (!settingsManager) {
            throw new Error('Settings manager not initialized');
          }

          // Show category picker
          const categories = [
            { label: 'Memory', value: 'memory' },
            { label: 'Chat', value: 'chat' },
            { label: 'n8n', value: 'n8n' },
            { label: 'Browser', value: 'browser' },
            { label: 'Modules', value: 'modules' },
            { label: 'ClaudeOS', value: 'claudeos' },
          ];

          const selected = await vscode.window.showQuickPick(categories, {
            placeHolder: 'Select settings category to edit',
          });

          if (selected) {
            // Open VS Code settings to the appropriate section
            await vscode.commands.executeCommand(
              'workbench.action.openSettings',
              `claudeos.${selected.value}`
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          vscode.window.showErrorMessage(
            `Failed to edit settings: ${errorMessage}`
          );
          console.error('Error editing settings:', error);
        }
      }
    )
  );
}

/**
 * Extension deactivation entry point
 * Called when the extension is deactivated
 */
export function deactivate() {
  console.log('ClaudeOS Settings extension is now deactivated');

  // Dispose status bar item
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }

  // Dispose settings manager
  if (settingsManager) {
    settingsManager.dispose();
    settingsManager = undefined;
  }

  // Clean up provider reference
  settingsViewProvider = undefined;
}
