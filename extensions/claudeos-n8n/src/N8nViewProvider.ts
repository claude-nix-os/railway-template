import * as vscode from 'vscode';
import * as path from 'path';
import { N8nConnectionStatus, N8nWebviewMessage } from './types';

/**
 * WebviewViewProvider for the N8n panel
 * Embeds n8n in an iframe and provides integration with VS Code
 */
export class N8nViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'claudeos-n8n.workflowView';

  private _view?: vscode.WebviewView;
  private _apiKey?: string;
  private _n8nUrl: string;
  private _connectionStatus: N8nConnectionStatus = 'disconnected';

  constructor(
    private readonly _extensionUri: vscode.Uri
  ) {
    // Get n8n URL from configuration
    const config = vscode.workspace.getConfiguration('claudeos.n8n');
    this._n8nUrl = config.get<string>('serverUrl', 'http://localhost:3000/n8n');

    // Ensure URL ends with /
    if (!this._n8nUrl.endsWith('/')) {
      this._n8nUrl += '/';
    }
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
      localResourceRoots: [this._extensionUri]
    };

    // Set HTML content
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Load API key
    this._loadApiKey().then(() => {
      this._updateConnectionStatus('connected');
    }).catch((error) => {
      console.error('Failed to load n8n API key:', error);
      this._updateConnectionStatus('error');
    });

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((message: N8nWebviewMessage) => {
      this._handleWebviewMessage(message);
    });

    // Handle view disposal
    webviewView.onDidDispose(() => {
      this._view = undefined;
    });
  }

  /**
   * Load n8n API key from /data/n8n/.api_key
   */
  private async _loadApiKey(): Promise<void> {
    try {
      // Construct path to API key file (absolute path in container)
      const apiKeyPath = vscode.Uri.file('/data/n8n/.api_key');

      // Read API key using VS Code's file system API
      const apiKeyData = await vscode.workspace.fs.readFile(apiKeyPath);
      this._apiKey = Buffer.from(apiKeyData).toString('utf8').trim();

      console.log('N8n API key loaded successfully');
    } catch (error) {
      console.error('Error loading n8n API key:', error);
      // Don't throw - API key might not be required for basic usage
      this._apiKey = undefined;
    }
  }

  /**
   * Handle messages from the webview
   */
  private _handleWebviewMessage(message: N8nWebviewMessage): void {
    switch (message.type) {
      case 'refresh':
        this.refresh();
        break;

      case 'openInBrowser':
        this.openInBrowser();
        break;

      case 'workflowClicked':
        if (message.data && 'workflowId' in message.data) {
          this._handleWorkflowClick(message.data.workflowId);
        }
        break;

      case 'executionClicked':
        if (message.data && 'executionId' in message.data) {
          this._handleExecutionClick(message.data.executionId);
        }
        break;

      case 'error':
        if (message.data && 'message' in message.data) {
          vscode.window.showErrorMessage(`N8n Error: ${message.data.message}`);
        }
        break;

      case 'info':
        if (message.data && 'message' in message.data) {
          vscode.window.showInformationMessage(message.data.message);
        }
        break;

      case 'initialized':
        console.log('N8n webview initialized');
        this._updateConnectionStatus('connected');
        break;

      default:
        console.warn(`Unknown message type from webview: ${message.type}`);
    }
  }

  /**
   * Handle workflow click from webview
   */
  private _handleWorkflowClick(workflowId: string): void {
    // Open workflow in n8n (could be enhanced to show workflow details in VS Code)
    const workflowUrl = `${this._n8nUrl}workflow/${workflowId}`;
    vscode.env.openExternal(vscode.Uri.parse(workflowUrl));
  }

  /**
   * Handle execution click from webview
   */
  private _handleExecutionClick(executionId: string): void {
    // Open execution in n8n
    const executionUrl = `${this._n8nUrl}execution/${executionId}`;
    vscode.env.openExternal(vscode.Uri.parse(executionUrl));
  }

  /**
   * Update connection status and notify webview
   */
  private _updateConnectionStatus(status: N8nConnectionStatus): void {
    this._connectionStatus = status;

    if (this._view) {
      this._view.webview.postMessage({
        type: 'connectionStatus',
        data: { status }
      });
    }
  }

  /**
   * Post message to webview
   */
  private _postMessageToWebview(message: unknown): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  /**
   * Refresh the n8n view
   */
  public refresh(): void {
    if (this._view) {
      // Reload the webview content
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
      vscode.window.showInformationMessage('N8n view refreshed');
    }
  }

  /**
   * Open n8n in external browser
   */
  public openInBrowser(): void {
    vscode.env.openExternal(vscode.Uri.parse(this._n8nUrl));
    vscode.window.showInformationMessage('Opening n8n in browser');
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): N8nConnectionStatus {
    return this._connectionStatus;
  }

  /**
   * Get n8n URL
   */
  public getN8nUrl(): string {
    return this._n8nUrl;
  }

  /**
   * Generate HTML content for the webview
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Generate a nonce for Content Security Policy
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
                 frame-src ${this._n8nUrl} http://localhost:* https://localhost:*;
                 img-src ${webview.cspSource} https: data:;
                 font-src ${webview.cspSource};">

  <title>N8n Workflow Automation</title>

  <style>
    /* VS Code theme variables */
    :root {
      --vscode-font-family: var(--vscode-font-family);
      --vscode-font-size: var(--vscode-font-size);
      --vscode-foreground: var(--vscode-foreground);
      --vscode-background: var(--vscode-editor-background);
    }

    body {
      margin: 0;
      padding: 0;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-background);
      overflow: hidden;
    }

    #app {
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    #loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      z-index: 1000;
      background: var(--vscode-background);
      padding: 20px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    #loading.hidden {
      display: none;
    }

    .spinner {
      border: 3px solid var(--vscode-foreground);
      border-top-color: transparent;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    #n8n-iframe {
      flex: 1;
      border: none;
      width: 100%;
      height: 100%;
    }

    .status-bar {
      padding: 4px 8px;
      font-size: 11px;
      background: var(--vscode-statusBar-background);
      color: var(--vscode-statusBar-foreground);
      border-top: 1px solid var(--vscode-panel-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--vscode-statusBar-foreground);
    }

    .status-dot.connected {
      background: #4caf50;
    }

    .status-dot.connecting {
      background: #ff9800;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .status-dot.disconnected {
      background: #f44336;
    }

    .status-dot.error {
      background: #f44336;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body>
  <div id="app">
    <div id="loading">
      <div class="spinner"></div>
      <p>Loading n8n workflow automation...</p>
    </div>
    <iframe
      id="n8n-iframe"
      src="${this._n8nUrl}"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
      title="N8n Workflow Automation"
    ></iframe>
    <div class="status-bar">
      <div class="status-indicator">
        <span class="status-dot connecting" id="status-dot"></span>
        <span id="status-text">Connecting to n8n...</span>
      </div>
      <span id="n8n-url">${this._n8nUrl}</span>
    </div>
  </div>

  <script nonce="${nonce}">
    (function() {
      const vscode = acquireVsCodeApi();
      const iframe = document.getElementById('n8n-iframe');
      const loading = document.getElementById('loading');
      const statusDot = document.getElementById('status-dot');
      const statusText = document.getElementById('status-text');

      // Hide loading spinner when iframe loads
      iframe.addEventListener('load', () => {
        setTimeout(() => {
          loading.classList.add('hidden');
          vscode.postMessage({ type: 'initialized' });
        }, 1000);
      });

      // Handle iframe load error
      iframe.addEventListener('error', () => {
        loading.classList.add('hidden');
        vscode.postMessage({
          type: 'error',
          data: { message: 'Failed to load n8n. Make sure the n8n service is running.' }
        });
      });

      // Listen for messages from the extension
      window.addEventListener('message', (event) => {
        const message = event.data;

        switch (message.type) {
          case 'connectionStatus':
            updateConnectionStatus(message.data.status);
            break;
        }
      });

      // Update connection status indicator
      function updateConnectionStatus(status) {
        statusDot.className = 'status-dot ' + status;

        switch (status) {
          case 'connected':
            statusText.textContent = 'Connected to n8n';
            break;
          case 'connecting':
            statusText.textContent = 'Connecting to n8n...';
            break;
          case 'disconnected':
            statusText.textContent = 'Disconnected from n8n';
            break;
          case 'error':
            statusText.textContent = 'Connection error';
            break;
        }
      }

      // Initialize with connecting status
      updateConnectionStatus('connecting');
    })();
  </script>
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
