import * as vscode from 'vscode';
import * as path from 'path';
import { MemoryApiClient } from './services/MemoryApiClient';
import type { MemoryGraph } from './types';

/**
 * Webview provider for the Memory Graph view
 */
export class MemoryGraphViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _currentScope: string = 'session';
  private _apiClient: MemoryApiClient;
  private _currentUserId: string = 'global';

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context?: vscode.ExtensionContext
  ) {
    // Initialize API client with configuration
    const config = vscode.workspace.getConfiguration('claudeos.memory');
    const baseUrl = config.get<string>('apiUrl', 'http://localhost:3000');
    const authToken = config.get<string>('authToken', '');

    this._apiClient = new MemoryApiClient({
      baseUrl,
      authToken,
      timeout: 30000,
    });

    // Update user ID based on initial scope
    this._updateUserId();
  }

  /**
   * Resolves the webview view
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'refreshRequested':
          this.refresh();
          break;
        case 'scopeChanged':
          if (message.scope) {
            this.changeScope(message.scope);
          }
          break;
        case 'nodeClicked':
          if (message.nodeId) {
            this._handleNodeClick(message.nodeId);
          }
          break;
        case 'exportRequested':
          await this.exportGraph();
          break;
        case 'error':
          vscode.window.showErrorMessage(`Memory Graph Error: ${message.message}`);
          break;
        case 'info':
          vscode.window.showInformationMessage(message.message);
          break;
      }
    });

    // Load initial data
    this._loadMemoryData();
  }

  /**
   * Refresh the memory graph
   */
  public refresh() {
    this._loadMemoryData();
    vscode.window.showInformationMessage('Memory graph refreshed');
  }

  /**
   * Change the memory scope
   */
  public changeScope(scope: string) {
    this._currentScope = scope;
    this._updateUserId();
    this._loadMemoryData();
    vscode.window.showInformationMessage(`Memory scope changed to: ${scope}`);
  }

  /**
   * Update user ID based on current scope
   */
  private _updateUserId() {
    switch (this._currentScope) {
      case 'global':
        this._currentUserId = 'global';
        break;
      case 'project':
        // Use workspace name or folder name
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
          this._currentUserId = workspaceFolders[0].name;
        } else {
          this._currentUserId = 'project';
        }
        break;
      case 'session':
        // For session scope, we need to get it from context
        // For now, use a default session ID
        // TODO: Get actual session ID from chat extension context
        this._currentUserId = this._getSessionId();
        break;
      default:
        this._currentUserId = 'global';
    }
  }

  /**
   * Get current session ID
   * In the future, this should be passed from the chat extension
   */
  private _getSessionId(): string {
    // Try to get session ID from context storage
    if (this._context) {
      const sessionId = this._context.workspaceState.get<string>('currentSessionId');
      if (sessionId) {
        return sessionId;
      }
    }
    // Fallback to a default session ID
    return 'session';
  }

  /**
   * Handle node click from webview
   */
  private async _handleNodeClick(nodeId: string) {
    if (!nodeId) {
      return;
    }

    try {
      // Fetch the full graph to get node details
      // In the future, we could cache the graph data
      const graphData = await this._apiClient.fetchGraph(this._currentUserId);
      const node = graphData.nodes.find(n => n.id === nodeId);

      if (!node) {
        vscode.window.showWarningMessage(`Node ${nodeId} not found`);
        return;
      }

      // Check if the node metadata contains a file path
      if (node.metadata && node.metadata.filePath) {
        // Open the file in the editor
        const filePath = node.metadata.filePath as string;
        const uri = vscode.Uri.file(filePath);
        await vscode.window.showTextDocument(uri);
      } else {
        // Show node details in a message
        const details = `Memory: ${node.text}\nCreated: ${new Date(node.created_at).toLocaleString()}`;
        vscode.window.showInformationMessage(details);
      }
    } catch (error) {
      console.error('Error handling node click:', error);
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to handle node click: ${message}`);
    }
  }

  /**
   * Export the memory graph
   */
  public async exportGraph() {
    try {
      // Fetch the current graph data
      const graphData = await this._apiClient.fetchGraph(this._currentUserId);

      // Show save dialog
      const uri = await vscode.window.showSaveDialog({
        filters: { 'JSON': ['json'] },
        defaultUri: vscode.Uri.file(`memory-graph-${this._currentScope}.json`)
      });

      if (uri) {
        // Write the graph data to the file
        const content = JSON.stringify(graphData, null, 2);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
        vscode.window.showInformationMessage(`Memory graph exported to ${uri.fsPath}`);
      }
    } catch (error) {
      console.error('Error exporting memory graph:', error);
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to export memory graph: ${message}`);
    }
  }

  /**
   * Load memory data from the API
   */
  private async _loadMemoryData() {
    if (!this._view) {
      return;
    }

    try {
      // Show loading state
      this._view.webview.postMessage({
        type: 'loading',
        isLoading: true
      });

      // Fetch memory graph from API using the client
      const graphData: MemoryGraph = await this._apiClient.fetchGraph(this._currentUserId);

      // Send the graph data to the webview
      // The webview expects nodes and edges directly in the data property
      this._view.webview.postMessage({
        type: 'updateGraph',
        data: {
          nodes: graphData.nodes,
          edges: graphData.edges
        }
      });

      // Hide loading state
      this._view.webview.postMessage({
        type: 'loading',
        isLoading: false
      });
    } catch (error) {
      console.error('Error loading memory data:', error);
      const message = error instanceof Error ? error.message : String(error);

      // Hide loading state
      if (this._view) {
        this._view.webview.postMessage({
          type: 'loading',
          isLoading: false
        });

        // Send error to webview
        this._view.webview.postMessage({
          type: 'error',
          message
        });
      }

      vscode.window.showErrorMessage(`Failed to load memory data: ${message}`);
    }
  }

  /**
   * Get the HTML content for the webview
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.css')
    );

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
                 script-src 'nonce-${nonce}' https://cdn.jsdelivr.net;
                 img-src ${webview.cspSource} https: data:;
                 font-src ${webview.cspSource};">

  <link href="${styleUri}" rel="stylesheet">
  <title>Memory Graph</title>

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
    }

    #app {
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    #graph-container {
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    #loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: none;
      text-align: center;
    }

    #loading.show {
      display: block;
    }

    .controls {
      padding: 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 4px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      cursor: pointer;
      font-size: 12px;
      border-radius: 2px;
    }

    .btn:hover {
      background: var(--vscode-button-hoverBackground);
    }

    select {
      padding: 4px 8px;
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 2px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div id="app">
    <div class="controls">
      <select id="scope-select">
        <option value="session">Session Scope</option>
        <option value="project">Project Scope</option>
        <option value="global">Global Scope</option>
      </select>
      <button class="btn" id="refresh-btn">Refresh</button>
      <button class="btn" id="export-btn">Export</button>
    </div>
    <div id="graph-container"></div>
    <div id="loading">Loading memory graph...</div>
  </div>

  <!-- Force-graph library from CDN -->
  <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/force-graph@1.43.0/dist/force-graph.min.js"></script>

  <!-- Webview script -->
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
