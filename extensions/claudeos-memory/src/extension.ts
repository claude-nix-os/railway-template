import * as vscode from 'vscode';
import { MemoryGraphViewProvider } from './MemoryGraphViewProvider';

// Global state for cleanup
let memoryGraphProvider: MemoryGraphViewProvider | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
let autoRefreshTimer: NodeJS.Timeout | undefined;

/**
 * Extension activation entry point
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('ClaudeOS Memory Graph extension is now active');

  // Get configuration
  const config = vscode.workspace.getConfiguration('claudeos.memory');
  const defaultScope = config.get<string>('defaultScope', 'session');
  const autoRefresh = config.get<boolean>('autoRefresh', true);
  const refreshInterval = config.get<number>('refreshInterval', 30000);

  // Create the memory graph webview provider
  memoryGraphProvider = new MemoryGraphViewProvider(context.extensionUri, context);

  // Create status bar item showing current scope
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'claudeos.changeMemoryScope';
  statusBarItem.text = `$(database) Memory: ${defaultScope}`;
  statusBarItem.tooltip = 'Click to change memory scope';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Register the webview view provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'claudeos.memoryView',
      memoryGraphProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );

  // Register commands
  registerCommands(context);

  // Set up auto-refresh if enabled
  if (autoRefresh && refreshInterval > 0) {
    autoRefreshTimer = setInterval(() => {
      if (memoryGraphProvider) {
        console.log('Auto-refreshing memory graph');
        memoryGraphProvider.refresh();
      }
    }, refreshInterval);

    context.subscriptions.push({
      dispose: () => {
        if (autoRefreshTimer) {
          clearInterval(autoRefreshTimer);
          autoRefreshTimer = undefined;
        }
      }
    });
  }

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('claudeos.memory')) {
        handleConfigurationChange(e);
      }
    })
  );

  console.log('ClaudeOS Memory Graph extension commands registered');
}

/**
 * Register extension commands
 */
function registerCommands(context: vscode.ExtensionContext) {
  // Command: Refresh memory graph
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.refreshMemory', () => {
      if (memoryGraphProvider) {
        memoryGraphProvider.refresh();
      }
    })
  );

  // Command: Change memory scope
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.changeMemoryScope', async () => {
      const config = vscode.workspace.getConfiguration('claudeos.memory');
      const currentScope = config.get<string>('defaultScope', 'session');

      const scope = await vscode.window.showQuickPick(
        [
          { label: 'session', description: 'Current session only', picked: currentScope === 'session' },
          { label: 'user', description: 'Current user across sessions', picked: currentScope === 'user' },
          { label: 'global', description: 'All users and sessions', picked: currentScope === 'global' }
        ],
        {
          placeHolder: 'Select memory scope'
        }
      );

      if (scope && memoryGraphProvider) {
        memoryGraphProvider.changeScope(scope.label);

        // Update status bar
        if (statusBarItem) {
          statusBarItem.text = `$(database) Memory: ${scope.label}`;
        }

        // Update configuration
        await config.update('defaultScope', scope.label, vscode.ConfigurationTarget.Workspace);
      }
    })
  );

  // Command: Export memory graph
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.exportMemoryGraph', async () => {
      if (memoryGraphProvider) {
        await memoryGraphProvider.exportGraph();
      }
    })
  );
}

/**
 * Handle configuration changes
 */
function handleConfigurationChange(e: vscode.ConfigurationChangeEvent) {
  const config = vscode.workspace.getConfiguration('claudeos.memory');

  // Handle API URL changes
  if (e.affectsConfiguration('claudeos.memory.apiUrl')) {
    const newUrl = config.get<string>('apiUrl', 'http://localhost:3000/api/memory');
    vscode.window.showInformationMessage(`Memory API URL updated to: ${newUrl}`);

    // Refresh with new URL
    if (memoryGraphProvider) {
      memoryGraphProvider.refresh();
    }
  }

  // Handle auto-refresh changes
  if (e.affectsConfiguration('claudeos.memory.autoRefresh') ||
      e.affectsConfiguration('claudeos.memory.refreshInterval')) {
    const autoRefresh = config.get<boolean>('autoRefresh', true);
    const refreshInterval = config.get<number>('refreshInterval', 30000);

    // Clear existing timer
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = undefined;
    }

    // Set up new timer if auto-refresh is enabled
    if (autoRefresh && refreshInterval > 0 && memoryGraphProvider) {
      autoRefreshTimer = setInterval(() => {
        if (memoryGraphProvider) {
          console.log('Auto-refreshing memory graph');
          memoryGraphProvider.refresh();
        }
      }, refreshInterval);

      vscode.window.showInformationMessage(
        `Memory auto-refresh ${autoRefresh ? 'enabled' : 'disabled'} (interval: ${refreshInterval}ms)`
      );
    }
  }

  // Handle default scope changes
  if (e.affectsConfiguration('claudeos.memory.defaultScope')) {
    const defaultScope = config.get<string>('defaultScope', 'session');

    // Update status bar
    if (statusBarItem) {
      statusBarItem.text = `$(database) Memory: ${defaultScope}`;
    }

    // Update provider scope
    if (memoryGraphProvider) {
      memoryGraphProvider.changeScope(defaultScope);
    }
  }
}

/**
 * Extension deactivation entry point
 * Called when the extension is deactivated
 */
export function deactivate() {
  console.log('ClaudeOS Memory Graph extension is now deactivated');

  // Clear auto-refresh timer
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = undefined;
  }

  // Dispose status bar item
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }

  // Clean up provider reference
  memoryGraphProvider = undefined;
}
