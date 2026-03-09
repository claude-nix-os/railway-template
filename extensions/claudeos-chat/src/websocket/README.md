# WebSocket Client

A class-based WebSocket client for the ClaudeOS Chat VS Code extension. This client handles real-time communication with the ClaudeOS kernel server.

## Features

- **EventEmitter-based API**: Subscribe to events using the standard Node.js EventEmitter pattern
- **Automatic Reconnection**: Exponential backoff reconnection strategy
- **Heartbeat/Ping-Pong**: Keep-alive mechanism to detect dead connections
- **Session Management**: Subscribe/unsubscribe to session updates
- **Type-Safe Events**: Full TypeScript support for all event types

## Usage

### Basic Connection

```typescript
import { WebSocketClient } from './websocket';

const client = new WebSocketClient();

// Listen for connection status changes
client.on('status', (status) => {
  console.log('Connection status:', status);
});

// Connect to the server
client.connect('ws://localhost:3000/ws', 'your-auth-token');
```

### Event Listeners

```typescript
// Listen for messages
client.on('message', (event) => {
  console.log('New message:', event.data?.message);
});

// Listen for streaming content
client.on('stream', (event) => {
  console.log('Stream delta:', event.data?.delta);
});

// Listen for thinking content
client.on('thinking', (event) => {
  console.log('Thinking:', event.data?.content);
});

// Listen for tool use
client.on('tool_use', (event) => {
  console.log('Tool call:', event.data?.toolCall);
});

// Listen for tool results
client.on('tool_result', (event) => {
  console.log('Tool result:', event.data?.output);
});

// Listen for session state updates
client.on('session_state', (event) => {
  console.log('Session state:', event.data);
});

// Listen for session list
client.on('sessions_list', (event) => {
  console.log('Sessions:', event.data?.sessions);
});

// Listen for errors
client.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

### Sending Messages

```typescript
// Send a message to a session
client.sendMessage('session-id', 'Hello, Claude!');

// Subscribe to session updates
client.subscribe('session-id');

// Unsubscribe from session updates
client.unsubscribe('session-id');

// Request list of all sessions
client.requestSessionList();

// Send a custom event
client.send({
  type: 'custom_event',
  sessionId: 'session-id',
  data: { key: 'value' }
});
```

### Connection Management

```typescript
// Check connection status
if (client.isConnected()) {
  console.log('Connected!');
}

// Get current status
const status = client.getStatus();

// Manually reconnect
client.reconnect();

// Disconnect
client.disconnect();

// Clean up (call when extension is deactivated)
client.dispose();
```

## Events

### Connection Events

- **`status`**: `(status: ConnectionStatus) => void`
  - Emitted when connection status changes
  - Status values: `'connected'`, `'connecting'`, `'disconnected'`, `'error'`

- **`auth_success`**: `() => void`
  - Emitted when authentication succeeds

- **`auth_error`**: `() => void`
  - Emitted when authentication fails

- **`error`**: `(error: Error | string) => void`
  - Emitted on WebSocket or protocol errors

### Message Events

- **`message`**: `(event: WSMessageEvent) => void`
  - Emitted when a new message is received

- **`stream`**: `(event: WSStreamEvent) => void`
  - Emitted when streaming content is received
  - Contains `messageId` and `delta` in `event.data`

- **`thinking`**: `(event: WSThinkingEvent) => void`
  - Emitted when thinking content is received
  - Contains `messageId` and `content` in `event.data`

- **`tool_use`**: `(event: WSToolUseEvent) => void`
  - Emitted when a tool call is made
  - Contains `messageId` and `toolCall` in `event.data`

- **`tool_result`**: `(event: WSToolResultEvent) => void`
  - Emitted when a tool result is received
  - Contains `messageId`, `toolCallId`, `output`, and `status` in `event.data`

- **`done`**: `(event: WSDoneEvent) => void`
  - Emitted when streaming is complete
  - Contains `messageId` in `event.data`

### Session Events

- **`session_state`**: `(event: WSSessionStateEvent) => void`
  - Emitted when session state is received
  - Contains `session` and `messages` in `event.data`

- **`sessions_list`**: `(event: WSSessionsListEvent) => void`
  - Emitted when the session list is received
  - Contains `sessions` in `event.data`

- **`session_created`**: `(event: WSEvent) => void`
  - Emitted when a new session is created

- **`session_update`**: `(event: WSEvent) => void`
  - Emitted when a session is updated

- **`session_deleted`**: `(event: WSEvent) => void`
  - Emitted when a session is deleted

### Other Events

- **`raw_event`**: `(event: WSEvent) => void`
  - Emitted for raw events that are not processed

## Configuration

The client uses the following configuration constants:

- **Reconnect Delays**: `[1000, 2000, 4000, 8000, 16000, 30000]` ms (exponential backoff)
- **Heartbeat Interval**: `30000` ms (30 seconds)
- **Heartbeat Timeout**: `10000` ms (10 seconds)

## Example: Integration in Extension

```typescript
import * as vscode from 'vscode';
import { WebSocketClient } from './websocket';

export function activate(context: vscode.ExtensionContext) {
  const client = new WebSocketClient();

  // Get configuration
  const config = vscode.workspace.getConfiguration('claudeos.chat');
  const wsUrl = config.get<string>('wsUrl', 'ws://localhost:3000/ws');
  const autoConnect = config.get<boolean>('autoConnect', true);

  // Set up event listeners
  client.on('status', (status) => {
    vscode.window.setStatusBarMessage(`ClaudeOS: ${status}`);
  });

  client.on('error', (error) => {
    vscode.window.showErrorMessage(`ClaudeOS Error: ${error}`);
  });

  client.on('message', (event) => {
    // Handle new message
  });

  // Auto-connect if enabled
  if (autoConnect) {
    client.connect(wsUrl);
  }

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.connect', () => {
      client.connect(wsUrl);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.disconnect', () => {
      client.disconnect();
    })
  );

  // Clean up on deactivation
  context.subscriptions.push({
    dispose: () => client.dispose()
  });
}
```

## Type Safety

All events are fully typed using TypeScript. The `WebSocketClientEvents` interface provides type-safe event listeners:

```typescript
import { WebSocketClient, WebSocketClientEvents } from './websocket';

// Type-safe event listener
const client = new WebSocketClient();
client.on('message', (event) => {
  // event is typed as WSMessageEvent
  const message = event.data?.message;
});
```
