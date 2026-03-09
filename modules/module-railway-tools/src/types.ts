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

/** Railway environment info extracted from env vars */
export interface RailwayEnvironment {
  isRailway: boolean;
  projectId: string | null;
  serviceId: string | null;
  environmentId: string | null;
  environmentName: string | null;
  publicDomain: string | null;
  deploymentId: string | null;
  staticUrl: string | null;
  region: string | null;
}

/** Railway deployment status */
export type RailwayDeploymentStatus = 'healthy' | 'deploying' | 'error' | 'unknown';

/** Railway environment variable entry */
export interface RailwayEnvVar {
  key: string;
  value: string;
  masked: boolean;
}

/** Railway API log entry */
export interface RailwayLogEntry {
  timestamp: string;
  message: string;
  severity: 'info' | 'warn' | 'error' | 'debug';
}

/** API response for /api/railway/status */
export interface RailwayStatusResponse {
  isRailway: boolean;
  status: RailwayDeploymentStatus;
}

/** API response for /api/railway/info */
export interface RailwayInfoResponse {
  environment: RailwayEnvironment;
  envVars: RailwayEnvVar[];
  dashboardUrl: string | null;
}

/** API response for /api/railway/logs */
export interface RailwayLogsResponse {
  logs: RailwayLogEntry[];
  hasMore: boolean;
}
