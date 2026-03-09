/**
 * ClaudeOS v3 Kernel - Module Interface Types
 *
 * This file defines the complete contract between the kernel and modules.
 * Any breaking changes to these types require a major version bump.
 */

// ---------------------------------------------------------------------------
// UI Extension Types
// ---------------------------------------------------------------------------

export interface ActivityBarItem {
  id: string;
  icon: string;
  tooltip: string;
  position: 'top' | 'bottom';
  priority: number;
  panelId?: string;
  sidebarSection?: string;
}

export interface PanelDefinition {
  id: string;
  title: string;
  icon: string;
  component: string;
  singleton?: boolean;
  defaultTab?: boolean;
}

export interface SidebarSection {
  id: string;
  title: string;
  icon: string;
  component: string;
  priority: number;
}

export interface SettingsPage {
  id: string;
  title: string;
  icon: string;
  component: string;
  priority: number;
}

export interface StatusBarItem {
  id: string;
  component: string;
  position: 'left' | 'right';
  priority: number;
}

export interface BottomPanelTab {
  id: string;
  title: string;
  icon: string;
  component: string;
  priority: number;
}

// ---------------------------------------------------------------------------
// Server Extension Types
// ---------------------------------------------------------------------------

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

export interface ApiRouteDefinition {
  path: string;
  handler: string;
  methods: HttpMethod[];
  middleware?: string[];
}

export interface WsHandlerDefinition {
  messageType: string;
  handler: string;
}

export interface ServiceDefinition {
  name: string;
  command: string;
  args?: string[];
  port?: number;
  healthCheck?: string;
  env?: Record<string, string>;
  user?: string;
  priority?: number;
  startDelay?: number;
}

// ---------------------------------------------------------------------------
// Claude Code Extension Types
// ---------------------------------------------------------------------------

export interface SkillDefinition {
  name: string;
  description: string;
  handler: string;
}

export interface HookDefinition {
  event: string;
  handler: string;
}

// ---------------------------------------------------------------------------
// Core Module Interface
// ---------------------------------------------------------------------------

export interface ClaudeOSModule {
  name: string;
  version: string;
  description: string;
  requires?: string[];
  optional?: string[];

  // UI Extensions
  activityBarItems?: ActivityBarItem[];
  panels?: PanelDefinition[];
  sidebarSections?: SidebarSection[];
  settingsPages?: SettingsPage[];
  statusBarItems?: StatusBarItem[];
  bottomPanelTabs?: BottomPanelTab[];

  // Server Extensions
  apiRoutes?: ApiRouteDefinition[];
  wsHandlers?: WsHandlerDefinition[];
  services?: ServiceDefinition[];

  // Claude Code Extensions
  skills?: SkillDefinition[];
  hooks?: HookDefinition[];

  // Lifecycle
  onLoad?: () => Promise<void>;
  onUnload?: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Module Manifest (claudeos-module.json)
// ---------------------------------------------------------------------------

export interface ModuleManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  repository?: string;
  requires?: string[];
  optional?: string[];
  main: string;
  files?: string[];
}

// ---------------------------------------------------------------------------
// Module Registry (generated at build time)
// ---------------------------------------------------------------------------

export interface RegisteredModule {
  manifest: ModuleManifest;
  module: ClaudeOSModule;
  path: string;
  enabled: boolean;
}

export interface ModuleRegistry {
  modules: Record<string, RegisteredModule>;
  panels: PanelDefinition[];
  activityBarItems: ActivityBarItem[];
  sidebarSections: SidebarSection[];
  settingsPages: SettingsPage[];
  statusBarItems: StatusBarItem[];
  bottomPanelTabs: BottomPanelTab[];
  apiRoutes: ApiRouteDefinition[];
  wsHandlers: WsHandlerDefinition[];
  services: ServiceDefinition[];
}

// ---------------------------------------------------------------------------
// Modules Config (modules.json)
// ---------------------------------------------------------------------------

export interface ModuleConfig {
  enabled: boolean;
  settings?: Record<string, unknown>;
}

export interface ModulesConfig {
  modules: Record<string, ModuleConfig>;
}

// ---------------------------------------------------------------------------
// Session Types (core kernel)
// ---------------------------------------------------------------------------

export interface Session {
  id: string;
  title: string;
  status: 'active' | 'idle' | 'archived' | 'error';
  claudeSessionId?: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  unread?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  thinking?: string;
  toolCalls?: ToolCall[];
  timestamp: string;
  status?: 'queued' | 'sent';
}

export interface ToolCall {
  id: string;
  name: string;
  input: string;
  output?: string;
  status: 'pending' | 'running' | 'complete' | 'error';
}

// ---------------------------------------------------------------------------
// WebSocket Event Types
// ---------------------------------------------------------------------------

export type WsEventType =
  | 'session_state'
  | 'sessions_list'
  | 'session_created'
  | 'session_update'
  | 'session_deleted'
  | 'message'
  | 'stream'
  | 'thinking'
  | 'tool_use'
  | 'tool_result'
  | 'raw_event'
  | 'done'
  | 'error';

export interface WsEvent {
  type: WsEventType;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// API Handler Types
// ---------------------------------------------------------------------------

export interface ApiContext {
  sessions: Map<string, Session>;
  dataDir: string;
  workspaceDir: string;
  broadcastAll: (event: unknown) => void;
  broadcast: (sessionId: string, event: unknown) => void;
}

export type ApiHandler = (
  req: Request,
  context: ApiContext,
) => Promise<Response>;

// ---------------------------------------------------------------------------
// Build Artifact Types
// ---------------------------------------------------------------------------

export interface BuildManifest {
  version: string;
  builtAt: string;
  modules: Array<{
    name: string;
    version: string;
    path: string;
  }>;
  services: ServiceDefinition[];
}
