// ---------------------------------------------------------------------------
// Module system types (shared across all ClaudeOS modules)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Memory-specific types
// ---------------------------------------------------------------------------

/** A stored memory record. */
export interface Memory {
  id: string;
  text: string;
  user_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** A memory with a search relevance score. */
export interface ScoredMemory extends Memory {
  score: number;
}

/** A graph edge relating two memories. */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
}

/** A graph node (memory) for visualization. */
export interface GraphNode {
  id: string;
  text: string;
  user_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Full graph data returned by the /graph endpoint. */
export interface MemoryGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Request payload for adding a memory. */
export interface AddMemoryRequest {
  text: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

/** Request payload for searching memories. */
export interface SearchMemoryRequest {
  query: string;
  user_id?: string;
  limit?: number;
}

/** Request payload for adding a graph edge. */
export interface AddEdgeRequest {
  source_id: string;
  target_id: string;
  relation: string;
  user_id?: string;
}

/** Health check response. */
export interface HealthResponse {
  status: string;
  count: number;
}
