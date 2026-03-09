import * as vscode from 'vscode';
import { BrowserSessionsViewProvider } from './BrowserSessionsViewProvider';

// Global state for cleanup
let browserViewProvider: BrowserSessionsViewProvider | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

/**
 * Extension activation entry point
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('ClaudeOS Browser Sessions extension is now active');

  // Create the browser sessions webview provider
  browserViewProvider = new BrowserSessionsViewProvider(context.extensionUri);

  // Create status bar item showing connection status
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'claudeos-browser-sessions.refresh';
  statusBarItem.text = '$(browser) Browser';
  statusBarItem.tooltip = 'Browser Sessions - Click to refresh';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Register the webview view provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      BrowserSessionsViewProvider.viewType,
      browserViewProvider,
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
      if (e.affectsConfiguration('claudeos.browser')) {
        handleConfigurationChange(e);
      }
    })
  );

  console.log('ClaudeOS Browser Sessions extension commands registered');
}

/**
 * Register extension commands
 */
function registerCommands(context: vscode.ExtensionContext) {
  // Command: Refresh browser sessions
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos-browser-sessions.refresh', async () => {
      if (browserViewProvider) {
        await browserViewProvider.refreshSessions();
        vscode.window.showInformationMessage('Browser sessions refreshed');
      }
    })
  );

  // Command: Create new browser session
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos-browser-sessions.newSession', async () => {
      const url = await vscode.window.showInputBox({
        prompt: 'Enter URL to navigate (optional)',
        placeHolder: 'https://example.com',
        validateInput: (value) => {
          if (!value) {
            return null; // Empty is OK
          }
          try {
            new URL(value);
            return null;
          } catch {
            return 'Please enter a valid URL';
          }
        }
      });

      if (url !== undefined) {
        // User didn't cancel
        const headless = await vscode.window.showQuickPick(
          ['Headed (visible browser)', 'Headless (background)'],
          { placeHolder: 'Select browser mode' }
        );

        if (headless !== undefined) {
          const isHeadless = headless.startsWith('Headless');

          // Send message to webview
          if (browserViewProvider && (browserViewProvider as any)._view) {
            (browserViewProvider as any)._view.webview.postMessage({
              type: 'createSession',
              data: { url: url || undefined, headless: isHeadless }
            });
          }
        }
      }
    })
  );

  // Command: Take control of browser session
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos-browser-sessions.takeControl', async () => {
      const sessionId = await vscode.window.showInputBox({
        prompt: 'Enter session ID to take control of',
        placeHolder: 'session-id'
      });

      if (sessionId) {
        if (browserViewProvider && (browserViewProvider as any)._view) {
          (browserViewProvider as any)._view.webview.postMessage({
            type: 'takeControl',
            data: { sessionId }
          });
        }
      }
    })
  );

  // Command: Hand off control
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos-browser-sessions.handOffControl', async () => {
      const sessionId = await vscode.window.showInputBox({
        prompt: 'Enter session ID to hand off control',
        placeHolder: 'session-id'
      });

      if (sessionId) {
        if (browserViewProvider && (browserViewProvider as any)._view) {
          (browserViewProvider as any)._view.webview.postMessage({
            type: 'handOffControl',
            data: { sessionId }
          });
        }
      }
    })
  );

  // Command: Export browser session
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos-browser-sessions.exportSession', async () => {
      const sessionId = await vscode.window.showInputBox({
        prompt: 'Enter session ID to export',
        placeHolder: 'session-id'
      });

      if (sessionId) {
        if (browserViewProvider && (browserViewProvider as any)._view) {
          (browserViewProvider as any)._view.webview.postMessage({
            type: 'exportSession',
            data: { sessionId }
          });
        }
      }
    })
  );
}

/**
 * Handle configuration changes
 */
function handleConfigurationChange(e: vscode.ConfigurationChangeEvent) {
  if (
    e.affectsConfiguration('claudeos.browser.apiUrl') ||
    e.affectsConfiguration('claudeos.browser.wsUrl')
  ) {
    vscode.window.showInformationMessage(
      'Browser configuration changed. Please reload the window to apply changes.',
      'Reload'
    ).then((selection) => {
      if (selection === 'Reload') {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    });
  }

  if (e.affectsConfiguration('claudeos.browser.autoRefresh')) {
    const config = vscode.workspace.getConfiguration('claudeos.browser');
    const autoRefresh = config.get<boolean>('autoRefresh', true);
    vscode.window.showInformationMessage(
      `Browser auto-refresh ${autoRefresh ? 'enabled' : 'disabled'}`
    );
  }
}

/**
 * Extension deactivation entry point
 * Called when the extension is deactivated
 */
export function deactivate() {
  console.log('ClaudeOS Browser Sessions extension is now deactivated');

  // Dispose status bar item
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }

  // Clean up provider reference
  browserViewProvider = undefined;
}
