import * as vscode from 'vscode';
import { SessionTreeProvider } from './sessionTree/SessionTreeProvider';
import { SessionWebSocketClient } from './services/SessionWebSocketClient';
import { registerSessionCommands } from './commands/sessionCommands';
import { Session } from './types';

// Global state for cleanup
let wsClient: SessionWebSocketClient | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;
let zombieDetectionTimer: NodeJS.Timeout | null = null;

/**
 * Extension activation entry point
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('ClaudeOS Sessions extension is now active');

  // Get kernel WebSocket URL from configuration
  const config = vscode.workspace.getConfiguration('claudeos');
  const kernelUrl = config.get<string>('kernelUrl', 'ws://localhost:3000/ws');

  // Create WebSocket client
  wsClient = new SessionWebSocketClient();

  // Create session tree provider
  const treeProvider = new SessionTreeProvider();

  // Register tree view
  const treeView = vscode.window.createTreeView('claudeos.sessionList', {
    treeDataProvider: treeProvider,
    showCollapseAll: true
  });

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.text = '$(sync~spin) Connecting to ClaudeOS...';
  statusBarItem.show();

  // Set up WebSocket event listeners
  wsClient.on('sessions', (sessions: Session[]) => {
    console.log('Received sessions list:', sessions.length);
    treeProvider.updateSessions(sessions);
    treeProvider.updateZombies();
  });

  wsClient.on('sessionCreated', (session: Session) => {
    console.log('Session created:', session.id);
    treeProvider.addSession(session);
    treeProvider.updateZombies();
  });

  wsClient.on('sessionUpdated', (session: Session) => {
    console.log('Session updated:', session.id);
    treeProvider.updateSession(session);
    treeProvider.updateZombies();
  });

  wsClient.on('sessionDeleted', (sessionId: string) => {
    console.log('Session deleted:', sessionId);
    treeProvider.removeSession(sessionId);
  });

  wsClient.on('status', (status) => {
    console.log('WebSocket status:', status);
    updateStatusBar(status);
  });

  wsClient.on('error', (error) => {
    console.error('WebSocket error:', error);
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`ClaudeOS connection error: ${message}`);
  });

  // Connect WebSocket client
  try {
    wsClient.connect(kernelUrl);
  } catch (error) {
    console.error('Failed to connect to ClaudeOS kernel:', error);
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(
      `Failed to connect to ClaudeOS kernel: ${message}`
    );
  }

  // Request initial session list
  // Note: This will be called automatically on connection, but we can call it again if needed
  setTimeout(() => {
    if (wsClient?.isConnected()) {
      wsClient.requestSessionList();
    }
  }, 1000);

  // Register all session commands
  registerSessionCommands(context, treeProvider, wsClient, treeView);

  // Set up zombie detection timer (check every 60 seconds)
  zombieDetectionTimer = setInterval(() => {
    if (wsClient?.isConnected()) {
      treeProvider.updateZombies();
      const zombies = treeProvider.getZombies();
      if (zombies.length > 0) {
        console.log('Detected zombie sessions:', zombies);
      }
    }
  }, 60000); // 60 seconds

  // Add disposables to context
  context.subscriptions.push(
    treeView,
    statusBarItem,
    {
      dispose: () => {
        if (zombieDetectionTimer) {
          clearInterval(zombieDetectionTimer);
        }
      }
    }
  );
}

/**
 * Extension deactivation entry point
 * Called when the extension is deactivated
 */
export function deactivate() {
  console.log('ClaudeOS Sessions extension is now deactivated');

  // Disconnect WebSocket client
  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }

  // Dispose status bar item
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = null;
  }

  // Clear zombie detection timer
  if (zombieDetectionTimer) {
    clearInterval(zombieDetectionTimer);
    zombieDetectionTimer = null;
  }
}

/**
 * Update the status bar item based on connection status
 */
function updateStatusBar(status: string): void {
  if (!statusBarItem) {
    return;
  }

  switch (status) {
    case 'connected':
      statusBarItem.text = '$(check) ClaudeOS Connected';
      statusBarItem.tooltip = 'Connected to ClaudeOS kernel';
      statusBarItem.backgroundColor = undefined;
      break;

    case 'connecting':
      statusBarItem.text = '$(sync~spin) Connecting to ClaudeOS...';
      statusBarItem.tooltip = 'Connecting to ClaudeOS kernel';
      statusBarItem.backgroundColor = undefined;
      break;

    case 'disconnected':
      statusBarItem.text = '$(debug-disconnect) ClaudeOS Disconnected';
      statusBarItem.tooltip = 'Disconnected from ClaudeOS kernel';
      statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground'
      );
      break;

    case 'error':
      statusBarItem.text = '$(error) ClaudeOS Connection Error';
      statusBarItem.tooltip = 'Error connecting to ClaudeOS kernel';
      statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.errorBackground'
      );
      break;

    default:
      statusBarItem.text = '$(question) ClaudeOS Status Unknown';
      statusBarItem.tooltip = 'Unknown ClaudeOS connection status';
      break;
  }
}
