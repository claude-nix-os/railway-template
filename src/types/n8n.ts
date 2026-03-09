export interface ClaudeOSModule {
  name: string;
  version: string;
  description: string;
  requires?: string[];
  optional?: string[];
  activityBarItems?: ActivityBarItem[];
  panels?: PanelDefinition[];
  sidebarSections?: SidebarSection[];
  settingsPages?: SettingsPage[];
  statusBarItems?: StatusBarItem[];
  bottomPanelTabs?: BottomPanelTab[];
  apiRoutes?: ApiRouteDefinition[];
  wsHandlers?: WsHandlerDefinition[];
  services?: ServiceDefinition[];
  skills?: SkillDefinition[];
  hooks?: HookDefinition[];
  onLoad?: () => Promise<void>;
  onUnload?: () => Promise<void>;
}

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

export interface ApiRouteDefinition {
  path: string;
  handler: string;
  methods: ('GET' | 'POST' | 'PATCH' | 'DELETE')[];
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

export interface SkillDefinition {
  name: string;
  description: string;
  handler: string;
}

export interface HookDefinition {
  event: string;
  handler: string;
}

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

/* ── n8n-specific types ──────────────────────────────────────────────── */

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes?: N8nNode[];
  tags?: { id: string; name: string }[];
}

export interface N8nNode {
  type: string;
  name: string;
  parameters?: Record<string, unknown>;
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: string;
  status: 'success' | 'error' | 'running' | 'waiting' | 'new' | 'unknown';
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  workflowData?: {
    name: string;
  };
}

export interface N8nApiResponse<T> {
  data: T;
  nextCursor?: string;
}

export interface ProxyRequestOptions {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body?: Buffer | string | null;
}

export interface ProxyResponseMeta {
  status: number;
  headers: Record<string, string>;
  body: Buffer | string;
}
