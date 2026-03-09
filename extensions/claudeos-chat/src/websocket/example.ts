/**
 * Example usage of the WebSocketClient in a VS Code extension
 *
 * This file demonstrates how to integrate the WebSocketClient into your extension.
 */

import * as vscode from 'vscode';
import { WebSocketClient } from './client';

export function activateWebSocketClient(context: vscode.ExtensionContext) {
  // Create client instance
  const client = new WebSocketClient();

  // Get configuration
  const config = vscode.workspace.getConfiguration('claudeos.chat');
  const wsUrl = config.get<string>('wsUrl', 'ws://localhost:3000/ws');
  const autoConnect = config.get<boolean>('autoConnect', true);

  // Create status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.show();

  // Listen for connection status changes
  client.on('status', (status) => {
    switch (status) {
      case 'connected':
        statusBarItem.text = '$(plug) ClaudeOS: Connected';
        statusBarItem.backgroundColor = undefined;
        vscode.window.showInformationMessage('Connected to ClaudeOS server');
        break;
      case 'connecting':
        statusBarItem.text = '$(sync~spin) ClaudeOS: Connecting...';
        break;
      case 'disconnected':
        statusBarItem.text = '$(plug) ClaudeOS: Disconnected';
        break;
      case 'error':
        statusBarItem.text = '$(error) ClaudeOS: Error';
        statusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.errorBackground'
        );
        break;
    }
  });

  // Listen for authentication events
  client.on('auth_success', () => {
    vscode.window.showInformationMessage('ClaudeOS: Authentication successful');
    // Request initial session list
    client.requestSessionList();
  });

  client.on('auth_error', () => {
    vscode.window.showErrorMessage('ClaudeOS: Authentication failed');
  });

  // Listen for errors
  client.on('error', (error) => {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`ClaudeOS Error: ${message}`);
  });

  // Listen for session list
  client.on('sessions_list', (event) => {
    const sessions = event.data?.sessions || [];
    console.log('Received sessions:', sessions);
    // Update your UI with the session list
  });

  // Listen for messages
  client.on('message', (event) => {
    console.log('New message:', event.data?.message);
    // Update your UI with the new message
  });

  // Listen for streaming content
  client.on('stream', (event) => {
    const { messageId, delta } = event.data;
    console.log(`Stream delta for message ${messageId}:`, delta);
    // Append the delta to your UI
  });

  // Listen for thinking content
  client.on('thinking', (event) => {
    const { messageId, content } = event.data;
    console.log(`Thinking for message ${messageId}:`, content);
    // Update your UI with thinking content
  });

  // Listen for tool use
  client.on('tool_use', (event) => {
    const { messageId, toolCall } = event.data;
    console.log(`Tool call for message ${messageId}:`, toolCall);
    // Update your UI with tool call
  });

  // Listen for tool results
  client.on('tool_result', (event) => {
    const { messageId, toolCallId, output, status } = event.data;
    console.log(`Tool result for ${toolCallId}:`, { output, status });
    // Update your UI with tool result
  });

  // Listen for done event
  client.on('done', (event) => {
    const { messageId } = event.data;
    console.log(`Streaming complete for message ${messageId}`);
    // Mark streaming as complete in your UI
  });

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.connect', () => {
      const token = undefined; // Get from your auth system if needed
      client.connect(wsUrl, token);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.disconnect', () => {
      client.disconnect();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.reconnect', () => {
      client.reconnect();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.sendMessage', async () => {
      // Example: Send a message to a session
      const sessionId = 'your-session-id'; // Get this from your UI state
      const message = await vscode.window.showInputBox({
        prompt: 'Enter your message',
        placeHolder: 'Type a message...',
      });

      if (message && client.isConnected()) {
        client.sendMessage(sessionId, message);
      } else if (!client.isConnected()) {
        vscode.window.showWarningMessage('Not connected to ClaudeOS server');
      }
    })
  );

  // Auto-connect if enabled
  if (autoConnect) {
    client.connect(wsUrl);
  }

  // Clean up on deactivation
  context.subscriptions.push({
    dispose: () => {
      client.dispose();
      statusBarItem.dispose();
    },
  });

  return client;
}
