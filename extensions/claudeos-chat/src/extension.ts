import * as vscode from 'vscode';
import { ChatViewProvider } from './chatViewProvider';
import { ConnectionStatus } from './types';

let chatViewProvider: ChatViewProvider | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('ClaudeOS Chat extension is now active');

  // Get configuration
  const config = vscode.workspace.getConfiguration('claudeos.chat');
  const wsUrl = config.get<string>('wsUrl', 'ws://localhost:3000/ws');
  const autoConnect = config.get<boolean>('autoConnect', true);

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'claudeos.openChatInEditor';
  context.subscriptions.push(statusBarItem);

  // Initialize chat view provider
  try {
    chatViewProvider = new ChatViewProvider(context.extensionUri, wsUrl);

    // Register the webview view provider
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        ChatViewProvider.viewType,
        chatViewProvider
      )
    );

    // Update status bar based on connection status
    updateStatusBar(autoConnect ? 'connecting' : 'disconnected');

    // Register commands
    registerCommands(context);

    // Listen for configuration changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('claudeos.chat.wsUrl')) {
          const newUrl = vscode.workspace.getConfiguration('claudeos.chat').get<string>('wsUrl', 'ws://localhost:3000/ws');
          if (chatViewProvider) {
            chatViewProvider.updateWebSocketUrl(newUrl);
            vscode.window.showInformationMessage(`ClaudeOS: Updated WebSocket URL to ${newUrl}`);
          }
        }
      })
    );

    // Poll connection status every 5 seconds to update status bar
    const statusInterval = setInterval(() => {
      if (chatViewProvider) {
        const status = chatViewProvider.getConnectionStatus();
        if (status) {
          updateStatusBar(status);
        }
      }
    }, 5000);

    context.subscriptions.push({
      dispose: () => clearInterval(statusInterval)
    });

    vscode.window.showInformationMessage('ClaudeOS Chat extension activated');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to activate ClaudeOS Chat: ${errorMessage}`);
    console.error('ClaudeOS Chat activation error:', error);
  }
}

/**
 * Register extension commands
 */
function registerCommands(context: vscode.ExtensionContext) {
  // Command: Open chat in editor panel
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.openChatInEditor', async () => {
      try {
        // Create a new webview panel for the chat
        const panel = vscode.window.createWebviewPanel(
          'claudeosChat',
          'ClaudeOS Chat',
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [context.extensionUri]
          }
        );

        // Get configuration
        const config = vscode.workspace.getConfiguration('claudeos.chat');
        const wsUrl = config.get<string>('wsUrl', 'ws://localhost:3000/ws');

        // Create a temporary provider for this panel
        const editorProvider = new ChatViewProvider(context.extensionUri, wsUrl);

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

        // Clean up when panel is disposed
        panel.onDidDispose(() => {
          editorProvider.dispose();
        });

        vscode.window.showInformationMessage('ClaudeOS Chat opened in editor');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to open chat in editor: ${errorMessage}`);
        console.error('Error opening chat in editor:', error);
      }
    })
  );

  // Command: Create new chat session
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.newSession', async () => {
      try {
        // Send message to webview to create a new session
        // The actual session creation is handled by the kernel server
        vscode.window.showInformationMessage('Creating new chat session...');

        // TODO: In a full implementation, this would communicate with the webview
        // to trigger session creation through the WebSocket connection
        // For now, we just show a notification
        vscode.window.showWarningMessage('New session creation will be implemented when webview is ready');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to create new session: ${errorMessage}`);
        console.error('Error creating new session:', error);
      }
    })
  );

  // Command: Clear chat history
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.clearChat', async () => {
      try {
        // Ask for confirmation before clearing
        const result = await vscode.window.showWarningMessage(
          'Are you sure you want to clear the chat history? This action cannot be undone.',
          { modal: true },
          'Clear',
          'Cancel'
        );

        if (result === 'Clear') {
          // TODO: In a full implementation, this would communicate with the webview
          // to clear the chat history and potentially notify the kernel server
          vscode.window.showInformationMessage('Chat history cleared');

          // For now, we just show a notification
          vscode.window.showWarningMessage('Chat history clearing will be fully implemented when webview is ready');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to clear chat: ${errorMessage}`);
        console.error('Error clearing chat:', error);
      }
    })
  );
}

/**
 * Update the status bar item based on connection status
 */
function updateStatusBar(status: ConnectionStatus) {
  if (!statusBarItem) {
    return;
  }

  switch (status) {
    case 'connected':
      statusBarItem.text = '$(check) ClaudeOS';
      statusBarItem.tooltip = 'ClaudeOS Chat: Connected';
      statusBarItem.backgroundColor = undefined;
      break;
    case 'connecting':
      statusBarItem.text = '$(sync~spin) ClaudeOS';
      statusBarItem.tooltip = 'ClaudeOS Chat: Connecting...';
      statusBarItem.backgroundColor = undefined;
      break;
    case 'disconnected':
      statusBarItem.text = '$(debug-disconnect) ClaudeOS';
      statusBarItem.tooltip = 'ClaudeOS Chat: Disconnected';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      break;
    case 'error':
      statusBarItem.text = '$(error) ClaudeOS';
      statusBarItem.tooltip = 'ClaudeOS Chat: Connection Error';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      break;
  }

  statusBarItem.show();
}

/**
 * Extension deactivation cleanup
 */
export function deactivate() {
  console.log('ClaudeOS Chat extension is now deactivated');

  // Clean up chat view provider
  if (chatViewProvider) {
    chatViewProvider.dispose();
    chatViewProvider = undefined;
  }

  // Clean up status bar
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }
}
