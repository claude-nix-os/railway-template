import * as vscode from 'vscode';
import * as path from 'path';
import { BrowserApiClient } from './services/BrowserApiClient';
import { BrowserWebSocketClient } from './services/BrowserWebSocketClient';
import type { FromWebviewMessage, ToWebviewMessage, BrowserSession, WsBrowserMessage } from './types';

/**
 * WebviewViewProvider for the Browser Sessions panel
 * Manages the webview lifecycle and communication
 */
export class BrowserSessionsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'claudeos-browser-sessions.browserView';

  private _view?: vscode.WebviewView;
  private apiClient: BrowserApiClient;
  private wsClient: BrowserWebSocketClient;
  private sessions: Map<string, BrowserSession> = new Map();
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly _extensionUri: vscode.Uri
  ) {
    // Initialize API client
    this.apiClient = new BrowserApiClient();

    // Initialize WebSocket client
    this.wsClient = new BrowserWebSocketClient();

    // Set up WebSocket message handler
    this.wsClient.onMessage((message: WsBrowserMessage) => {
      this.handleWebSocketMessage(message);
    });

    // Set up WebSocket status handler
    this.wsClient.onStatusChange((connected: boolean) => {
      this.sendToWebview({
        type: 'connectionStatus',
        data: { connected }
      });
    });
  }

  /**
   * Called when the view is first resolved
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this._view = webviewView;

    // Configure webview options
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri,
        vscode.Uri.joinPath(this._extensionUri, 'dist')
      ]
    };

    // Set HTML content
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (message: FromWebviewMessage) => {
      await this.handleWebviewMessage(message);
    });

    // Handle view disposal
    webviewView.onDidDispose(() => {
      this.cleanup();
    });

    // Connect to WebSocket
    this.wsClient.connect();

    // Start auto-refresh
    this.startAutoRefresh();

    // Initial load of sessions
    this.refreshSessions();
  }

  /**
   * Handle messages from the webview
   */
  private async handleWebviewMessage(message: FromWebviewMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'ready':
          // Webview is ready, send initial data
          await this.refreshSessions();
          break;

        case 'createSession':
          await this.createSession(message.data?.url, message.data?.headless);
          break;

        case 'closeSession':
          if (message.data?.sessionId) {
            await this.closeSession(message.data.sessionId);
          }
          break;

        case 'takeControl':
          if (message.data?.sessionId) {
            await this.takeControl(message.data.sessionId);
          }
          break;

        case 'handOffControl':
          if (message.data?.sessionId) {
            await this.handOffControl(message.data.sessionId);
          }
          break;

        case 'navigate':
          if (message.data?.sessionId && message.data?.url) {
            await this.navigate(message.data.sessionId, message.data.url);
          }
          break;

        case 'exportSession':
          if (message.data?.sessionId) {
            await this.exportSession(message.data.sessionId);
          }
          break;

        case 'refreshSessions':
          await this.refreshSessions();
          break;

        default:
          console.warn(`[BrowserSessionsViewProvider] Unknown message type:`, message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[BrowserSessionsViewProvider] Error handling message:', error);
      this.sendToWebview({
        type: 'error',
        data: { message: errorMessage }
      });
      vscode.window.showErrorMessage(`Browser Sessions: ${errorMessage}`);
    }
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(message: WsBrowserMessage): void {
    if (message.type === 'browser:screenshot') {
      // Send screenshot update to webview
      // Note: The screenshot data would need to be fetched from the file path
      // For now, we'll trigger a session refresh
      this.refreshSessions();
    } else if (message.type === 'browser:interaction') {
      // Handle interaction events
      console.log('[BrowserSessionsViewProvider] Browser interaction:', message);
    }
  }

  /**
   * Refresh all browser sessions
   */
  public async refreshSessions(): Promise<void> {
    try {
      const sessions = await this.apiClient.listSessions();

      // Update local cache
      this.sessions.clear();
      for (const session of sessions) {
        this.sessions.set(session.id, session);
      }

      // Send to webview
      this.sendToWebview({
        type: 'sessionsUpdate',
        data: sessions
      });
    } catch (error) {
      console.error('[BrowserSessionsViewProvider] Error refreshing sessions:', error);
      this.sendToWebview({
        type: 'error',
        data: { message: 'Failed to refresh browser sessions' }
      });
    }
  }

  /**
   * Create a new browser session
   */
  private async createSession(url?: string, headless?: boolean): Promise<void> {
    try {
      const session = await this.apiClient.createSession({
        headless: headless ?? false,
        viewport: { width: 1280, height: 720 },
        screenshotInterval: 2000,
      });

      // Navigate to URL if provided
      if (url) {
        await this.apiClient.navigate(session.id, url);
      }

      // Refresh sessions to show the new one
      await this.refreshSessions();

      vscode.window.showInformationMessage(`Browser session ${session.id} created`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create session: ${errorMessage}`);
    }
  }

  /**
   * Close a browser session
   */
  private async closeSession(sessionId: string): Promise<void> {
    try {
      await this.apiClient.closeSession(sessionId);
      await this.refreshSessions();
      vscode.window.showInformationMessage(`Browser session ${sessionId} closed`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to close session: ${errorMessage}`);
    }
  }

  /**
   * Take control of a browser session
   */
  private async takeControl(sessionId: string): Promise<void> {
    try {
      const userId = 'vscode-user'; // TODO: Get actual user ID
      const result = await this.apiClient.takeControl(sessionId, userId);

      this.sendToWebview({
        type: 'controlStatus',
        data: { sessionId, controlledBy: result.controlledBy || null }
      });

      vscode.window.showInformationMessage(`Took control of session ${sessionId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to take control: ${errorMessage}`);
    }
  }

  /**
   * Hand off control of a browser session
   */
  private async handOffControl(sessionId: string): Promise<void> {
    try {
      const userId = 'vscode-user'; // TODO: Get actual user ID
      const result = await this.apiClient.releaseControl(sessionId, userId);

      this.sendToWebview({
        type: 'controlStatus',
        data: { sessionId, controlledBy: result.controlledBy || null }
      });

      vscode.window.showInformationMessage(`Released control of session ${sessionId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to release control: ${errorMessage}`);
    }
  }

  /**
   * Navigate a browser session to a URL
   */
  private async navigate(sessionId: string, url: string): Promise<void> {
    try {
      await this.apiClient.navigate(sessionId, url);
      await this.refreshSessions();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to navigate: ${errorMessage}`);
    }
  }

  /**
   * Export a browser session
   */
  private async exportSession(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const exportData = JSON.stringify(session, null, 2);
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`browser-session-${sessionId}.json`),
        filters: { 'JSON': ['json'] }
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(exportData, 'utf8'));
        vscode.window.showInformationMessage(`Session exported to ${uri.fsPath}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to export session: ${errorMessage}`);
    }
  }

  /**
   * Send message to webview
   */
  private sendToWebview(message: ToWebviewMessage): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  /**
   * Start auto-refresh of sessions
   */
  private startAutoRefresh(): void {
    const config = vscode.workspace.getConfiguration('claudeos.browser');
    const autoRefresh = config.get<boolean>('autoRefresh', true);
    const interval = config.get<number>('thumbnailRefreshInterval', 2000);

    if (autoRefresh && !this.refreshInterval) {
      this.refreshInterval = setInterval(() => {
        this.refreshSessions();
      }, interval);
    }
  }

  /**
   * Stop auto-refresh
   */
  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.stopAutoRefresh();
    this.wsClient.disconnect();
    this._view = undefined;
  }

  /**
   * Generate HTML content for the webview
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Get resource URIs
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.css')
    );

    // Generate nonce for CSP
    const nonce = this._getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Content Security Policy -->
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 style-src ${webview.cspSource} 'unsafe-inline';
                 script-src 'nonce-${nonce}';
                 img-src ${webview.cspSource} https: http: data:;
                 font-src ${webview.cspSource};">

  <title>Browser Sessions</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * Generate a nonce for Content Security Policy
   */
  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
