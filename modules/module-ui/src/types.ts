import type { ComponentType, ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  ClaudeOS Module System Types                                       */
/* ------------------------------------------------------------------ */

export interface ClaudeOSModule {
  id: string;
  name: string;
  version: string;
  description: string;
  dependencies: string[];
  activityBarItems: ActivityBarItemRegistration[];
  panels: PanelRegistration[];
  sidebarSections: SidebarSectionRegistration[];
  stores: StoreRegistration[];
  init?: () => void | Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Activity Bar                                                       */
/* ------------------------------------------------------------------ */

export type ActivityBarPosition = 'top' | 'bottom';

export interface ActivityBarItemRegistration {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  position: ActivityBarPosition;
  priority: number;
  sidebarSection: string;
  badge?: () => number | null;
}

/* ------------------------------------------------------------------ */
/*  Panels                                                             */
/* ------------------------------------------------------------------ */

export interface PanelRegistration {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  component: ComponentType<PanelProps>;
  defaultTab?: boolean;
  singleton?: boolean;
}

export interface PanelProps {
  panelId: string;
  tabId: string;
  sessionId?: string;
  params?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

export interface SidebarSectionRegistration {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  component: ComponentType<SidebarSectionProps>;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface SidebarSectionProps {
  collapsed: boolean;
  onToggle: () => void;
}

/* ------------------------------------------------------------------ */
/*  Stores                                                             */
/* ------------------------------------------------------------------ */

export interface StoreRegistration {
  id: string;
  store: unknown;
}

/* ------------------------------------------------------------------ */
/*  Tab System                                                         */
/* ------------------------------------------------------------------ */

export interface Tab {
  id: string;
  panelId: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  closable: boolean;
  sessionId?: string;
  params?: Record<string, unknown>;
  dirty?: boolean;
}

export type SplitDirection = 'horizontal' | 'vertical';

export interface TabGroup {
  id: string;
  tabs: Tab[];
  activeTabId: string | null;
}

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
  | 'auth_error';

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
/*  Execution Graph                                                    */
/* ------------------------------------------------------------------ */

export type GraphNodeKind =
  | 'root-agent'
  | 'subagent'
  | 'teammate'
  | 'tool-use'
  | 'tool-result'
  | 'thinking'
  | 'message';

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  sessionId?: string;
  toolCallId?: string;
  data?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

export interface ExecutionGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/* ------------------------------------------------------------------ */
/*  Bottom Panel                                                       */
/* ------------------------------------------------------------------ */

export type BottomPanelTab = 'terminal' | 'tasks' | 'problems';

/* ------------------------------------------------------------------ */
/*  Status Bar                                                         */
/* ------------------------------------------------------------------ */

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';
