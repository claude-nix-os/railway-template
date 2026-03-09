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
// Browser automation types
// ---------------------------------------------------------------------------

/** Browser session state */
export type SessionState = 'active' | 'idle' | 'closed';

/** Browser session configuration */
export interface BrowserSessionConfig {
  headless?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  screenshotInterval?: number; // milliseconds, 0 = disabled
  userAgent?: string;
  recordVideo?: boolean;
}

/** Browser session metadata */
export interface BrowserSession {
  id: string;
  state: SessionState;
  config: BrowserSessionConfig;
  currentUrl: string | null;
  createdAt: string;
  lastActivityAt: string;
  screenshotCount: number;
  controlledBy?: string; // user ID who has control
}

/** Screenshot metadata */
export interface Screenshot {
  id: string;
  sessionId: string;
  timestamp: string;
  url: string;
  filePath: string;
  width: number;
  height: number;
}

/** Create session request */
export interface CreateSessionRequest {
  config?: BrowserSessionConfig;
}

/** Create session response */
export interface CreateSessionResponse {
  session: BrowserSession;
}

/** List sessions response */
export interface ListSessionsResponse {
  sessions: BrowserSession[];
}

/** Navigate request */
export interface NavigateRequest {
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

/** Navigate response */
export interface NavigateResponse {
  success: boolean;
  url: string;
  screenshot?: Screenshot;
}

/** Screenshot request */
export interface ScreenshotRequest {
  fullPage?: boolean;
}

/** Screenshot response */
export interface ScreenshotResponse {
  screenshot: Screenshot;
}

/** Click request */
export interface ClickRequest {
  selector: string;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
}

/** Click response */
export interface ClickResponse {
  success: boolean;
  screenshot?: Screenshot;
}

/** Type request */
export interface TypeRequest {
  selector: string;
  text: string;
  delay?: number;
}

/** Type response */
export interface TypeResponse {
  success: boolean;
  screenshot?: Screenshot;
}

/** Control request */
export interface ControlRequest {
  action: 'take' | 'release';
  userId: string;
}

/** Control response */
export interface ControlResponse {
  success: boolean;
  controlledBy?: string;
}

/** WebSocket screenshot message */
export interface WsScreenshotMessage {
  type: 'browser:screenshot';
  sessionId: string;
  screenshot: Screenshot;
}

/** WebSocket interaction message */
export interface WsInteractionMessage {
  type: 'browser:interaction';
  sessionId: string;
  action: string;
  details: Record<string, unknown>;
  timestamp: string;
}
