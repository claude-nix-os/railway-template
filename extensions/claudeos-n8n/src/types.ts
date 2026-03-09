/**
 * N8n workflow interface
 */
export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: N8nNode[];
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
  tags?: string[];
}

/**
 * N8n workflow node interface
 */
export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
}

/**
 * N8n execution interface
 */
export interface N8nExecution {
  id: string;
  workflowId: string;
  mode: 'manual' | 'trigger' | 'webhook' | 'retry';
  status: 'running' | 'success' | 'error' | 'waiting' | 'canceled';
  startedAt: string;
  stoppedAt?: string;
  finishedAt?: string;
  data?: Record<string, unknown>;
  retryOf?: string;
  retrySuccessId?: string;
  waitTill?: string;
}

/**
 * N8n connection status
 */
export type N8nConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

/**
 * Webview message types
 */
export type WebviewMessageType =
  | 'refresh'
  | 'openInBrowser'
  | 'workflowClicked'
  | 'executionClicked'
  | 'connectionStatus'
  | 'error'
  | 'info'
  | 'initialized';

/**
 * Base webview message interface
 */
export interface WebviewMessage {
  type: WebviewMessageType;
  data?: unknown;
}

/**
 * Refresh message
 */
export interface RefreshMessage extends WebviewMessage {
  type: 'refresh';
}

/**
 * Open in browser message
 */
export interface OpenInBrowserMessage extends WebviewMessage {
  type: 'openInBrowser';
}

/**
 * Workflow clicked message
 */
export interface WorkflowClickedMessage extends WebviewMessage {
  type: 'workflowClicked';
  data: {
    workflowId: string;
  };
}

/**
 * Execution clicked message
 */
export interface ExecutionClickedMessage extends WebviewMessage {
  type: 'executionClicked';
  data: {
    executionId: string;
  };
}

/**
 * Connection status message
 */
export interface ConnectionStatusMessage extends WebviewMessage {
  type: 'connectionStatus';
  data: {
    status: N8nConnectionStatus;
  };
}

/**
 * Error message
 */
export interface ErrorMessage extends WebviewMessage {
  type: 'error';
  data: {
    message: string;
  };
}

/**
 * Info message
 */
export interface InfoMessage extends WebviewMessage {
  type: 'info';
  data: {
    message: string;
  };
}

/**
 * Initialized message
 */
export interface InitializedMessage extends WebviewMessage {
  type: 'initialized';
}

/**
 * Union type of all webview messages
 */
export type N8nWebviewMessage =
  | RefreshMessage
  | OpenInBrowserMessage
  | WorkflowClickedMessage
  | ExecutionClickedMessage
  | ConnectionStatusMessage
  | ErrorMessage
  | InfoMessage
  | InitializedMessage;
