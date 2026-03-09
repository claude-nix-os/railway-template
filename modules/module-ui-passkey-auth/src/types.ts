/* ------------------------------------------------------------------ */
/*  ClaudeOS Module System Types                                       */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Passkey-Specific Types                                             */
/* ------------------------------------------------------------------ */

export interface StoredCredential {
  id: string;
  publicKey: string;
  counter: number;
  createdAt: string;
  label?: string;
}

export interface PasskeysStore {
  credentials: StoredCredential[];
}

export interface ChallengeEntry {
  challenge: string;
  userId?: string;
  type: 'registration' | 'authentication';
  createdAt: string;
  expiresAt: string;
}

export interface ChallengesStore {
  challenges: Record<string, ChallengeEntry>;
}

export interface SetupToken {
  token: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

export interface SetupTokensStore {
  tokens: SetupToken[];
}

export interface PasskeyCheckResponse {
  hasPasskeys: boolean;
  count: number;
}

export interface PasskeyListItem {
  id: string;
  createdAt: string;
  label?: string;
}

export interface SetupTokenResponse {
  setupToken: string;
  expiresAt: string;
}
