/**
 * Webview-specific types for claudeos-chat extension
 */

/* ------------------------------------------------------------------ */
/*  Messages from Webview to Extension                                */
/* ------------------------------------------------------------------ */

export type WebviewToExtensionMessageType =
  | 'sendMessage'
  | 'subscribe'
  | 'unsubscribe'
  | 'requestSessions'
  | 'reconnect';

export interface SendMessageMessage {
  type: 'sendMessage';
  sessionId: string;
  content: string;
}

export interface SubscribeMessage {
  type: 'subscribe';
  sessionId: string;
}

export interface UnsubscribeMessage {
  type: 'unsubscribe';
  sessionId: string;
}

export interface RequestSessionsMessage {
  type: 'requestSessions';
}

export interface ReconnectMessage {
  type: 'reconnect';
}

export type WebviewToExtensionMessage =
  | SendMessageMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | RequestSessionsMessage
  | ReconnectMessage;

/* ------------------------------------------------------------------ */
/*  Messages from Extension to Webview                                */
/* ------------------------------------------------------------------ */

export type ExtensionToWebviewMessageType = 'connectionStatus' | 'wsEvent';

export interface ConnectionStatusMessage {
  type: 'connectionStatus';
  data: {
    status: 'connected' | 'connecting' | 'disconnected' | 'error';
  };
}

export interface WSEventMessage {
  type: 'wsEvent';
  data: any; // WSEvent from parent types.ts
}

export type ExtensionToWebviewMessage =
  | ConnectionStatusMessage
  | WSEventMessage;

/* ------------------------------------------------------------------ */
/*  UI State Types                                                    */
/* ------------------------------------------------------------------ */

export interface UISession {
  id: string;
  title: string;
  model: string;
  unreadCount: number;
  lastMessage?: string;
  updatedAt: string;
}

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  thinkingContent?: string;
  toolCalls?: UIToolCall[];
  isStreaming?: boolean;
}

export interface UIToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'pending' | 'running' | 'success' | 'error';
  expanded: boolean;
}

export interface UIThinkingBlock {
  content: string;
  expanded: boolean;
}

export interface AppState {
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  sessions: UISession[];
  currentSessionId: string | null;
  messages: UIMessage[];
  inputValue: string;
  isLoading: boolean;
  error: string | null;
}
