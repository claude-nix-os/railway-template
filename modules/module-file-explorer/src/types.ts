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

// ----- File Explorer Types -----

/** A single directory entry */
export interface DirectoryEntry {
  name: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  modified: string;
}

/** Response for directory listing */
export interface DirectoryResponse {
  type: 'directory';
  path: string;
  entries: DirectoryEntry[];
}

/** Response for file content */
export interface FileResponse {
  type: 'file';
  path: string;
  content: string;
  size: number;
  modified: string;
}

/** Combined files API response */
export type FilesApiResponse = DirectoryResponse | FileResponse;

// ----- Workspace / Git Types -----

/** A single changed file in a diff */
export interface DiffFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
}

/** A hunk within a diff */
export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

/** A single line in a diff hunk */
export interface DiffLine {
  type: 'addition' | 'deletion' | 'context';
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

/** Full diff response */
export interface DiffResponse {
  files: DiffFile[];
  hunks: Record<string, DiffHunk[]>;
  summary: {
    totalAdditions: number;
    totalDeletions: number;
    filesChanged: number;
  };
}

/** Git status entry */
export interface GitStatusEntry {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';
  staged: boolean;
}

/** Git status response */
export interface GitStatusResponse {
  entries: GitStatusEntry[];
  branch: string;
  clean: boolean;
}

// ----- Task Types -----

export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

/** A single task */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Task creation input */
export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  sessionId?: string;
}

/** Task update input */
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  sessionId?: string | null;
}

/** Tasks API response for listing */
export interface TaskListResponse {
  tasks: Task[];
  total: number;
}
