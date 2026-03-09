import * as vscode from 'vscode';
import { SettingsManager } from './services/SettingsManager';
import type { AllSettings } from './types/settings';

/**
 * Webview provider for ClaudeOS Settings panel
 */
export class SettingsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'claudeos.settingsView';

  private _view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly settingsManager: SettingsManager
  ) {}

  /**
   * Resolve the webview view
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
      localResourceRoots: [this.extensionUri],
    };

    // Set initial HTML content
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        await this.handleMessage(message);
      }
    );

    // Handle view disposal
    webviewView.onDidDispose(() => {
      this.dispose();
    });

    // Load and send initial settings
    this.loadSettings();
  }

  /**
   * Refresh the settings view
   */
  public async refresh(): Promise<void> {
    await this.loadSettings();
  }

  /**
   * Load settings and send to webview
   */
  private async loadSettings(): Promise<void> {
    try {
      const settings = await this.settingsManager.readAllSettings();

      this._view?.webview.postMessage({
        type: 'settingsLoaded',
        settings,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this._view?.webview.postMessage({
        type: 'error',
        message: `Failed to load settings: ${errorMessage}`,
      });
    }
  }

  /**
   * Handle messages from webview
   */
  private async handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'ready':
        // Webview is ready, send initial settings
        await this.loadSettings();
        break;

      case 'saveSettings':
      case 'updateSettings':
        // Update settings
        try {
          await this.settingsManager.writeSettings(message.settings);
          this._view?.webview.postMessage({
            type: 'updateSuccess',
          });
          vscode.window.showInformationMessage('Settings updated successfully');
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this._view?.webview.postMessage({
            type: 'error',
            message: `Failed to update settings: ${errorMessage}`,
          });
          vscode.window.showErrorMessage(
            `Failed to update settings: ${errorMessage}`
          );
        }
        break;

      case 'resetSettings':
        // Reset settings to defaults
        try {
          await this.settingsManager.resetToDefaults(message.category);
          await this.loadSettings();
          vscode.window.showInformationMessage('Settings reset to defaults');
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this._view?.webview.postMessage({
            type: 'error',
            message: `Failed to reset settings: ${errorMessage}`,
          });
          vscode.window.showErrorMessage(
            `Failed to reset settings: ${errorMessage}`
          );
        }
        break;

      case 'exportSettings':
        // Trigger export command
        await vscode.commands.executeCommand('claudeos.exportSettings');
        break;

      case 'importSettings':
        // Trigger import command
        await vscode.commands.executeCommand('claudeos.importSettings');
        break;

      case 'validateSetting':
        // Validate a specific setting
        try {
          const validation = this.settingsManager['validateSettings']({
            [message.key.split('.')[0]]: {
              [message.key.split('.')[1]]: message.value
            }
          });

          this._view?.webview.postMessage({
            type: 'validationResult',
            key: message.key,
            valid: validation.valid,
            errors: validation.errors.map(e => e.message),
          });
        } catch (error) {
          console.error('Validation error:', error);
        }
        break;

      case 'openFile':
        // Open a configuration file
        try {
          const uri = vscode.Uri.file(message.path);
          await vscode.window.showTextDocument(uri);
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to open file: ${message.path}`
          );
        }
        break;
    }
  }

  /**
   * Generate HTML content for the webview
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    // Get the URI for the webview script
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'out', 'webview.js')
    );

    // Get the URI for the webview styles
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'out', 'webview.css')
    );

    // Generate a nonce for Content Security Policy
    const nonce = this.getNonce();

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
                 img-src ${webview.cspSource} https: data:;
                 font-src ${webview.cspSource};">

  <link href="${styleUri}" rel="stylesheet">
  <title>ClaudeOS Settings</title>
</head>
<body>
  <div id="app">
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading settings...</p>
    </div>
  </div>

  <!-- Webview script -->
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * Generate a nonce for Content Security Policy
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Cleanup if needed
  }
}
