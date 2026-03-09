import * as vscode from 'vscode';
import { WebSocketClient } from './websocket/client';
import { WSEvent, ConnectionStatus } from './types';
import { commandRegistry, parseCommandInput, mapArgumentsToDefinition } from './commands';
import { registerBuiltinCommands } from './commands/builtinCommands';
import { CommandContext } from './commands/types';

/**
 * WebviewViewProvider for the ClaudeOS Chat panel
 */
export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'claudeos.chatView';

  private view?: vscode.WebviewView;
  private wsClient?: WebSocketClient;
  private wsUrl: string;

  constructor(
    private readonly extensionUri: vscode.Uri,
    wsUrl: string
  ) {
    this.wsUrl = wsUrl;

    // Initialize slash command system
    this.initializeCommands();
  }

  /**
   * Initialize the slash command system
   */
  private initializeCommands(): void {
    try {
      registerBuiltinCommands(commandRegistry);
      console.log('Slash commands initialized successfully');
    } catch (error) {
      console.error('Failed to initialize slash commands:', error);
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
    this.view = webviewView;

    // Configure webview options
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    // Set HTML content
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Initialize WebSocket client
    this.initializeWebSocket();

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((message) => {
      this.handleWebviewMessage(message);
    });

    // Handle view disposal
    webviewView.onDidDispose(() => {
      this.dispose();
    });
  }

  /**
   * Initialize WebSocket client and set up event listeners
   */
  private initializeWebSocket(): void {
    if (this.wsClient) {
      this.wsClient.disconnect();
    }

    this.wsClient = new WebSocketClient(this.wsUrl);

    // Listen for connection status changes
    this.wsClient.onStatus((status: ConnectionStatus) => {
      this.postMessageToWebview({
        type: 'connectionStatus',
        data: { status },
      });
    });

    // Forward all WebSocket events to webview
    const eventTypes = [
      'session_state',
      'session_created',
      'session_update',
      'session_deleted',
      'message',
      'stream',
      'thinking',
      'tool_use',
      'tool_result',
      'done',
      'sessions_list',
      'raw_event',
      'error',
      'auth_success',
      'auth_error',
    ];

    eventTypes.forEach((eventType) => {
      this.wsClient!.on(eventType, (event: WSEvent) => {
        this.postMessageToWebview({
          type: 'wsEvent',
          data: event,
        });
      });
    });

    // Connect to WebSocket server
    this.wsClient.connect();
  }

  /**
   * Handle messages from the webview
   */
  private async handleWebviewMessage(message: any): Promise<void> {
    if (!this.wsClient) {
      console.warn('WebSocket client not initialized');
      return;
    }

    switch (message.type) {
      case 'sendMessage':
        // Check if message is a slash command
        if (message.sessionId && message.content) {
          const content = message.content.trim();
          if (content.startsWith('/')) {
            // Handle as slash command
            await this.handleSlashCommand(message.sessionId, content);
          } else {
            // Send as regular message
            this.wsClient.sendMessage(message.sessionId, message.content);
          }
        }
        break;

      case 'subscribe':
        // Subscribe to a session
        if (message.sessionId) {
          this.wsClient.subscribe(message.sessionId);
        }
        break;

      case 'unsubscribe':
        // Unsubscribe from a session
        if (message.sessionId) {
          this.wsClient.unsubscribe(message.sessionId);
        }
        break;

      case 'requestSessions':
        // Request session list
        this.wsClient.requestSessions();
        break;

      case 'reconnect':
        // Manually reconnect to WebSocket
        this.wsClient.connect();
        break;

      case 'requestAutocomplete':
        // Handle autocomplete request
        await this.handleAutocomplete(message.query);
        break;

      case 'executeSlashCommand':
        // Handle explicit slash command execution
        if (message.sessionId && message.command) {
          await this.handleSlashCommand(message.sessionId, message.command);
        }
        break;

      default:
        console.warn(`Unknown message type from webview: ${message.type}`);
    }
  }

  /**
   * Handle autocomplete request from webview
   */
  private async handleAutocomplete(query: string): Promise<void> {
    try {
      // Remove leading slash if present
      const cleanQuery = query.startsWith('/') ? query.slice(1) : query;

      // Get autocomplete results from command registry
      const commands = commandRegistry.autocomplete(cleanQuery, 25);

      // Send results back to webview
      this.postMessageToWebview({
        type: 'autocompleteResults',
        data: commands,
      });
    } catch (error) {
      console.error('Error handling autocomplete:', error);
      this.postMessageToWebview({
        type: 'autocompleteResults',
        data: [],
      });
    }
  }

  /**
   * Handle slash command execution
   */
  private async handleSlashCommand(sessionId: string, commandInput: string): Promise<void> {
    try {
      // Parse the command input
      const parsed = parseCommandInput(commandInput);

      if (!parsed.command) {
        this.sendErrorToWebview('Invalid command format');
        return;
      }

      // Check if command exists
      if (!commandRegistry.hasCommand(parsed.command)) {
        this.sendErrorToWebview(`Command '/${parsed.command}' not found. Type /help to see available commands.`);
        return;
      }

      // Get the command definition
      const commandDef = commandRegistry.getCommand(parsed.command);

      if (!commandDef) {
        this.sendErrorToWebview(`Command '/${parsed.command}' not found`);
        return;
      }

      // Map arguments to command definition
      let mappedArgs: Record<string, string | number | boolean>;
      try {
        // Create a temporary command object for mapArgumentsToDefinition
        const tempCommand = {
          name: commandDef.name,
          description: commandDef.description,
          args: commandDef.arguments?.map(arg => ({
            name: arg.name,
            type: arg.type as 'string' | 'number' | 'boolean',
            required: arg.required,
            description: arg.description,
            default: arg.default,
          })),
          execute: async () => {},
        };

        mappedArgs = mapArgumentsToDefinition(tempCommand, parsed.args);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.sendErrorToWebview(`Invalid arguments: ${errorMessage}`);
        return;
      }

      // Create command context
      const context: CommandContext = {
        sessionId,
        args: mappedArgs,
        rawInput: commandInput,
        commandName: parsed.command,
        timestamp: new Date().toISOString(),
      };

      // Execute the command
      const result = await commandRegistry.execute(parsed.command, context);

      // Send result back to webview
      if (!result.silent) {
        this.postMessageToWebview({
          type: 'commandResult',
          data: {
            success: result.success,
            message: result.message,
            data: result.data,
            error: result.error,
          },
        });
      }

      // If command was successful and has a message, also send as system message
      if (result.success && result.message) {
        this.postMessageToWebview({
          type: 'systemMessage',
          data: {
            message: result.message,
            timestamp: new Date().toISOString(),
          },
        });
      }

    } catch (error) {
      console.error('Error executing slash command:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.sendErrorToWebview(`Command execution failed: ${errorMessage}`);
    }
  }

  /**
   * Send error message to webview
   */
  private sendErrorToWebview(message: string): void {
    this.postMessageToWebview({
      type: 'commandResult',
      data: {
        success: false,
        error: {
          message,
        },
      },
    });
  }

  /**
   * Post message to webview
   */
  private postMessageToWebview(message: any): void {
    if (this.view) {
      this.view.webview.postMessage(message);
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
                 script-src 'nonce-${nonce}' https://cdn.jsdelivr.net;
                 img-src ${webview.cspSource} https: data:;
                 font-src ${webview.cspSource};">

  <link href="${styleUri}" rel="stylesheet">
  <title>ClaudeOS Chat</title>
</head>
<body>
  <div id="app">
    <div class="loading">
      <div class="spinner"></div>
      <p>Connecting to ClaudeOS...</p>
    </div>
  </div>

  <!-- Markdown parser -->
  <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>

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
   * Update WebSocket URL
   */
  public updateWebSocketUrl(url: string): void {
    this.wsUrl = url;
    if (this.view) {
      this.initializeWebSocket();
    }
  }

  /**
   * Get WebSocket connection status
   */
  public getConnectionStatus(): ConnectionStatus | undefined {
    return this.wsClient?.getStatus();
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.wsClient) {
      this.wsClient.disconnect();
      this.wsClient = undefined;
    }
  }
}
