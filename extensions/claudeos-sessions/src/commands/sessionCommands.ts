import * as vscode from 'vscode';
import { SessionTreeItem } from '../sessionTree/SessionTreeItem';

/**
 * WebSocket client interface for session management
 * This interface defines the methods that the WebSocket client should implement
 */
export interface IWebSocketClient {
  renameSession(sessionId: string, newName: string): void;
  archiveSession(sessionId: string): void;
  restoreSession(sessionId: string): void;
  deleteSession(sessionId: string): void;
  requestSessionList(): void;
}

/**
 * Session tree provider interface
 * This interface defines the methods that the tree provider should implement
 */
export interface ISessionTreeProvider {
  refresh(): void;
  refreshItem(item: SessionTreeItem): void;
}

/**
 * Register all session management commands
 *
 * @param context - Extension context for adding command subscriptions
 * @param treeProvider - Session tree data provider for refreshing the tree
 * @param wsClient - WebSocket client for making API calls
 * @param treeView - Tree view for revealing items
 */
export function registerSessionCommands(
  context: vscode.ExtensionContext,
  treeProvider: ISessionTreeProvider,
  wsClient: IWebSocketClient,
  treeView: vscode.TreeView<any>
): void {
  // Open session command
  const openSessionCmd = vscode.commands.registerCommand(
    'claudeos.openSession',
    async (sessionId?: string, item?: SessionTreeItem) => {
      await openSession(sessionId, item, treeView);
    }
  );

  // Rename session command
  const renameSessionCmd = vscode.commands.registerCommand(
    'claudeos.renameSession',
    async (item?: SessionTreeItem) => {
      await renameSession(item, wsClient, treeProvider);
    }
  );

  // Archive session command
  const archiveSessionCmd = vscode.commands.registerCommand(
    'claudeos.archiveSession',
    async (item?: SessionTreeItem) => {
      await archiveSession(item, wsClient, treeProvider);
    }
  );

  // Restore session command
  const restoreSessionCmd = vscode.commands.registerCommand(
    'claudeos.restoreSession',
    async (item?: SessionTreeItem) => {
      await restoreSession(item, wsClient, treeProvider);
    }
  );

  // Delete session command
  const deleteSessionCmd = vscode.commands.registerCommand(
    'claudeos.deleteSession',
    async (item?: SessionTreeItem) => {
      await deleteSession(item, wsClient, treeProvider);
    }
  );

  // Refresh sessions command
  const refreshSessionsCmd = vscode.commands.registerCommand(
    'claudeos.refreshSessions',
    async () => {
      await refreshSessions(wsClient);
    }
  );

  // Add all commands to subscriptions
  context.subscriptions.push(
    openSessionCmd,
    renameSessionCmd,
    archiveSessionCmd,
    restoreSessionCmd,
    deleteSessionCmd,
    refreshSessionsCmd
  );
}

/* ------------------------------------------------------------------ */
/*  Command Implementations                                            */
/* ------------------------------------------------------------------ */

/**
 * Open a session in the chat panel
 *
 * @param sessionId - Session ID to open (can be passed directly or from item)
 * @param item - SessionTreeItem if called from tree view
 * @param treeView - Tree view for revealing the session
 */
async function openSession(
  sessionId?: string,
  item?: SessionTreeItem,
  treeView?: vscode.TreeView<any>
): Promise<void> {
  try {
    // Get session ID from item if not provided directly
    const id = sessionId || item?.session.id;

    if (!id) {
      vscode.window.showWarningMessage('No session selected');
      return;
    }

    // Execute the chat extension's focusSession command to load the session
    await vscode.commands.executeCommand('claudeos.chat.focusSession', id);

    // Reveal the session item in tree view with select + focus
    if (item && treeView) {
      await treeView.reveal(item, {
        select: true,
        focus: true,
        expand: true
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to open session: ${message}`);
    console.error('Error opening session:', error);
  }
}

/**
 * Rename a session
 *
 * @param item - SessionTreeItem to rename
 * @param wsClient - WebSocket client for API calls
 * @param treeProvider - Tree provider to refresh after rename
 */
async function renameSession(
  item: SessionTreeItem | undefined,
  wsClient: IWebSocketClient,
  treeProvider: ISessionTreeProvider
): Promise<void> {
  try {
    if (!item) {
      vscode.window.showWarningMessage('No session selected');
      return;
    }

    // Show input box with current name as default
    const newName = await vscode.window.showInputBox({
      prompt: 'Enter new session name',
      placeHolder: 'Session name',
      value: item.session.name,
      validateInput: (value: string) => {
        // Validate name is not empty
        if (!value || value.trim().length === 0) {
          return 'Session name cannot be empty';
        }
        return null;
      }
    });

    // User cancelled the input
    if (newName === undefined) {
      return;
    }

    const trimmedName = newName.trim();

    // No change
    if (trimmedName === item.session.name) {
      return;
    }

    // Call WebSocket client to rename session
    wsClient.renameSession(item.session.id, trimmedName);

    // Update the session object
    item.session.name = trimmedName;

    // Refresh the tree item
    treeProvider.refreshItem(item);

    vscode.window.showInformationMessage(`Session renamed to "${trimmedName}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to rename session: ${message}`);
    console.error('Error renaming session:', error);
  }
}

/**
 * Archive a session
 *
 * @param item - SessionTreeItem to archive
 * @param wsClient - WebSocket client for API calls
 * @param treeProvider - Tree provider to refresh after archive
 */
async function archiveSession(
  item: SessionTreeItem | undefined,
  wsClient: IWebSocketClient,
  treeProvider: ISessionTreeProvider
): Promise<void> {
  try {
    if (!item) {
      vscode.window.showWarningMessage('No session selected');
      return;
    }

    // Call WebSocket client to archive session
    wsClient.archiveSession(item.session.id);

    // Refresh entire tree (session moves from active to archived section)
    treeProvider.refresh();

    vscode.window.showInformationMessage(`Session "${item.session.name}" archived`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to archive session: ${message}`);
    console.error('Error archiving session:', error);
  }
}

/**
 * Restore an archived session
 *
 * @param item - SessionTreeItem to restore
 * @param wsClient - WebSocket client for API calls
 * @param treeProvider - Tree provider to refresh after restore
 */
async function restoreSession(
  item: SessionTreeItem | undefined,
  wsClient: IWebSocketClient,
  treeProvider: ISessionTreeProvider
): Promise<void> {
  try {
    if (!item) {
      vscode.window.showWarningMessage('No session selected');
      return;
    }

    // Call WebSocket client to restore session
    wsClient.restoreSession(item.session.id);

    // Refresh entire tree (session moves from archived to active section)
    treeProvider.refresh();

    vscode.window.showInformationMessage(`Session "${item.session.name}" restored`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to restore session: ${message}`);
    console.error('Error restoring session:', error);
  }
}

/**
 * Delete a session
 *
 * @param item - SessionTreeItem to delete
 * @param wsClient - WebSocket client for API calls
 * @param treeProvider - Tree provider to refresh after delete
 */
async function deleteSession(
  item: SessionTreeItem | undefined,
  wsClient: IWebSocketClient,
  treeProvider: ISessionTreeProvider
): Promise<void> {
  try {
    if (!item) {
      vscode.window.showWarningMessage('No session selected');
      return;
    }

    // Show warning confirmation modal
    const confirmation = await vscode.window.showWarningMessage(
      `Are you sure you want to delete the session "${item.session.name}"? This action cannot be undone.`,
      {
        modal: true,
        detail: 'All messages and history in this session will be permanently deleted.'
      },
      'Delete'
    );

    // User cancelled or closed the dialog
    if (confirmation !== 'Delete') {
      return;
    }

    // Call WebSocket client to delete session
    wsClient.deleteSession(item.session.id);

    // Refresh entire tree (session is removed)
    treeProvider.refresh();

    vscode.window.showInformationMessage(`Session "${item.session.name}" deleted`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to delete session: ${message}`);
    console.error('Error deleting session:', error);
  }
}

/**
 * Refresh the sessions list
 *
 * @param wsClient - WebSocket client for API calls
 */
async function refreshSessions(wsClient: IWebSocketClient): Promise<void> {
  try {
    // Request session list from WebSocket
    // The tree will auto-refresh when 'sessions_list' event fires
    wsClient.requestSessionList();

    vscode.window.showInformationMessage('Refreshing sessions...');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to refresh sessions: ${message}`);
    console.error('Error refreshing sessions:', error);
  }
}
