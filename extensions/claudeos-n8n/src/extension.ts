import * as vscode from 'vscode';
import { N8nViewProvider } from './N8nViewProvider';
import { N8nConnectionStatus } from './types';

// Global state for cleanup
let n8nViewProvider: N8nViewProvider | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

/**
 * Extension activation entry point
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('ClaudeOS N8n extension is now active');

  // Get configuration
  const config = vscode.workspace.getConfiguration('claudeos.n8n');
  const autoConnect = config.get<boolean>('autoConnect', true);

  // Create the n8n webview provider
  n8nViewProvider = new N8nViewProvider(context.extensionUri);

  // Create status bar item showing n8n connection status
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'claudeos-n8n.openInBrowser';
  statusBarItem.tooltip = 'Click to open n8n in browser';
  context.subscriptions.push(statusBarItem);

  // Update initial status bar
  updateStatusBar(autoConnect ? 'connecting' : 'disconnected');

  // Register the webview view provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      N8nViewProvider.viewType,
      n8nViewProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );

  // Register commands
  registerCommands(context);

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('claudeos.n8n')) {
        handleConfigurationChange(e);
      }
    })
  );

  // Poll connection status every 5 seconds to update status bar
  const statusInterval = setInterval(() => {
    if (n8nViewProvider) {
      const status = n8nViewProvider.getConnectionStatus();
      updateStatusBar(status);
    }
  }, 5000);

  context.subscriptions.push({
    dispose: () => clearInterval(statusInterval)
  });

  console.log('ClaudeOS N8n extension commands registered');
}

/**
 * Register extension commands
 */
function registerCommands(context: vscode.ExtensionContext) {
  // Command: Refresh n8n view
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos-n8n.refresh', () => {
      if (n8nViewProvider) {
        n8nViewProvider.refresh();
      }
    })
  );

  // Command: Open n8n in browser
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos-n8n.openInBrowser', () => {
      if (n8nViewProvider) {
        n8nViewProvider.openInBrowser();
      }
    })
  );

  // Command: Show n8n URL
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.showN8nUrl', () => {
      if (n8nViewProvider) {
        const url = n8nViewProvider.getN8nUrl();
        vscode.window.showInformationMessage(`N8n URL: ${url}`);
      }
    })
  );

  // Command: Open n8n in editor panel
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.openN8nInEditor', async () => {
      try {
        // Create a new webview panel for n8n
        const panel = vscode.window.createWebviewPanel(
          'claudeosN8n',
          'N8n Workflow Automation',
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [context.extensionUri]
          }
        );

        // Create a temporary provider for this panel
        const editorProvider = new N8nViewProvider(context.extensionUri);

        // Resolve the webview content
        const webviewView = {
          webview: panel.webview,
          onDidDispose: panel.onDidDispose,
        } as vscode.WebviewView;

        editorProvider.resolveWebviewView(
          webviewView,
          {} as vscode.WebviewViewResolveContext,
          new vscode.CancellationTokenSource().token
        );

        vscode.window.showInformationMessage('N8n opened in editor');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to open n8n in editor: ${errorMessage}`);
        console.error('Error opening n8n in editor:', error);
      }
    })
  );
}

/**
 * Handle configuration changes
 */
function handleConfigurationChange(e: vscode.ConfigurationChangeEvent) {
  const config = vscode.workspace.getConfiguration('claudeos.n8n');

  // Handle URL configuration changes
  if (
    e.affectsConfiguration('claudeos.n8n.protocol') ||
    e.affectsConfiguration('claudeos.n8n.hostname') ||
    e.affectsConfiguration('claudeos.n8n.port')
  ) {
    const protocol = config.get<string>('protocol', 'http');
    const hostname = config.get<string>('hostname', 'localhost');
    const port = config.get<number>('port', 3000);
    const url = `${protocol}://${hostname}:${port}/n8n/`;

    vscode.window.showInformationMessage(`N8n URL updated to: ${url}`);

    // Refresh with new URL (requires recreating the provider)
    // For now, just notify the user to reload the window
    vscode.window.showInformationMessage(
      'Please reload the window to apply the new n8n URL configuration',
      'Reload'
    ).then((selection) => {
      if (selection === 'Reload') {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    });
  }

  // Handle auto-connect changes
  if (e.affectsConfiguration('claudeos.n8n.autoConnect')) {
    const autoConnect = config.get<boolean>('autoConnect', true);
    vscode.window.showInformationMessage(
      `N8n auto-connect ${autoConnect ? 'enabled' : 'disabled'}`
    );
  }
}

/**
 * Update the status bar item based on connection status
 */
function updateStatusBar(status: N8nConnectionStatus) {
  if (!statusBarItem) {
    return;
  }

  switch (status) {
    case 'connected':
      statusBarItem.text = '$(check) N8n';
      statusBarItem.tooltip = 'N8n: Connected - Click to open in browser';
      statusBarItem.backgroundColor = undefined;
      break;
    case 'connecting':
      statusBarItem.text = '$(sync~spin) N8n';
      statusBarItem.tooltip = 'N8n: Connecting...';
      statusBarItem.backgroundColor = undefined;
      break;
    case 'disconnected':
      statusBarItem.text = '$(debug-disconnect) N8n';
      statusBarItem.tooltip = 'N8n: Disconnected - Click to open in browser';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      break;
    case 'error':
      statusBarItem.text = '$(error) N8n';
      statusBarItem.tooltip = 'N8n: Connection Error - Click to open in browser';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      break;
  }

  statusBarItem.show();
}

/**
 * Extension deactivation entry point
 * Called when the extension is deactivated
 */
export function deactivate() {
  console.log('ClaudeOS N8n extension is now deactivated');

  // Dispose status bar item
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }

  // Clean up provider reference
  n8nViewProvider = undefined;
}
