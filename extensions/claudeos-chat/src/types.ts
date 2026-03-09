/* ------------------------------------------------------------------ */
/*  Sessions                                                           */
/* ------------------------------------------------------------------ */

export type SessionStatus = 'active' | 'idle' | 'archived' | 'deleted';
export type MessageRole = 'user' | 'assistant' | 'system';
export type StreamPhase = 'idle' | 'streaming' | 'thinking' | 'tool_use' | 'done' | 'error';

export interface Session {
  id: string;
  title: string;
  status: SessionStatus;
  model: string;
  permissionMode: PermissionMode;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  lastMessage?: string;
  agentId?: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  model?: string;
  thinkingContent?: string;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
  streamPhase?: StreamPhase;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startedAt?: string;
  completedAt?: string;
}

/* ------------------------------------------------------------------ */
/*  Models & Permissions                                               */
/* ------------------------------------------------------------------ */

export type ModelId = 'claude-opus-4-6' | 'claude-sonnet-4-20250514' | 'claude-haiku-3-20250506';

export interface ModelInfo {
  id: ModelId;
  name: string;
  shortName: string;
  description: string;
}

export const MODELS: ModelInfo[] = [
  {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    shortName: 'Opus',
    description: 'Most capable model for complex tasks',
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    shortName: 'Sonnet',
    description: 'Balanced performance and speed',
  },
  {
    id: 'claude-haiku-3-20250506',
    name: 'Claude Haiku 3',
    shortName: 'Haiku',
    description: 'Fastest model for simple tasks',
  },
];

export type PermissionMode = 'default' | 'plan' | 'bypass' | 'acceptEdits';

export interface PermissionModeInfo {
  id: PermissionMode;
  label: string;
  description: string;
}

export const PERMISSION_MODES: PermissionModeInfo[] = [
  { id: 'default', label: 'Default', description: 'Ask before tool use' },
  { id: 'plan', label: 'Plan', description: 'Show plan before execution' },
  { id: 'bypass', label: 'Bypass', description: 'Execute without confirmation' },
  { id: 'acceptEdits', label: 'Accept Edits', description: 'Auto-accept file edits' },
];

/* ------------------------------------------------------------------ */
/*  WebSocket Events                                                   */
/* ------------------------------------------------------------------ */

export type WSEventType =
  | 'session_state'
  | 'session_created'
  | 'session_update'
  | 'session_deleted'
  | 'message'
  | 'stream'
  | 'thinking'
  | 'tool_use'
  | 'tool_result'
  | 'done'
  | 'sessions_list'
  | 'raw_event'
  | 'error'
  | 'auth_success'
  | 'auth_error'
  | 'ping'
  | 'pong';

export interface WSEvent {
  type: WSEventType;
  sessionId?: string;
  data?: unknown;
  timestamp?: string;
}

export interface WSStreamEvent extends WSEvent {
  type: 'stream';
  data: {
    messageId: string;
    delta: string;
  };
}

export interface WSThinkingEvent extends WSEvent {
  type: 'thinking';
  data: {
    messageId: string;
    content: string;
  };
}

export interface WSToolUseEvent extends WSEvent {
  type: 'tool_use';
  data: {
    messageId: string;
    toolCall: ToolCall;
  };
}

export interface WSToolResultEvent extends WSEvent {
  type: 'tool_result';
  data: {
    messageId: string;
    toolCallId: string;
    output: string;
    status: 'success' | 'error';
  };
}

export interface WSSessionStateEvent extends WSEvent {
  type: 'session_state';
  data: {
    session: Session;
    messages: Message[];
  };
}

export interface WSSessionsListEvent extends WSEvent {
  type: 'sessions_list';
  data: {
    sessions: Session[];
  };
}

export interface WSDoneEvent extends WSEvent {
  type: 'done';
  data: {
    messageId: string;
  };
}

export interface WSMessageEvent extends WSEvent {
  type: 'message';
  data: {
    message: Message;
  };
}

/* ------------------------------------------------------------------ */
/*  Connection Status                                                  */
/* ------------------------------------------------------------------ */

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';
