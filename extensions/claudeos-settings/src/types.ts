/**
 * TypeScript type definitions for ClaudeOS Settings extension
 * Comprehensive types covering all configuration categories and webview communication
 */

// ---------------------------------------------------------------------------
// Setting Value Types
// ---------------------------------------------------------------------------

/**
 * Supported setting value types
 */
export type SettingValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'array'
  | 'object'
  | 'secret';

/**
 * Generic setting value based on type
 */
export type SettingValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | Record<string, unknown>
  | null
  | undefined;

// ---------------------------------------------------------------------------
// Setting Validation
// ---------------------------------------------------------------------------

/**
 * Validation rule for a setting
 */
export interface SettingValidation {
  /** Minimum value for numbers */
  min?: number;

  /** Maximum value for numbers */
  max?: number;

  /** Minimum length for strings or arrays */
  minLength?: number;

  /** Maximum length for strings or arrays */
  maxLength?: number;

  /** Regex pattern for string validation */
  pattern?: string;

  /** Whether the field is required */
  required?: boolean;

  /** Custom validation error message */
  errorMessage?: string;

  /** Custom validator function (serialized as string) */
  validator?: string;
}

// ---------------------------------------------------------------------------
// Setting Definitions
// ---------------------------------------------------------------------------

/**
 * Base setting interface
 */
export interface BaseSetting {
  /** Unique setting identifier */
  id: string;

  /** JSON path key for the setting (e.g., "model.default" or "auth.apiKey") */
  key: string;

  /** Display label */
  label: string;

  /** Detailed description */
  description: string;

  /** Setting value type */
  type: SettingValueType;

  /** Default value */
  defaultValue: SettingValue;

  /** Validation rules */
  validation?: SettingValidation;

  /** Whether setting is enabled/visible */
  enabled?: boolean;

  /** Whether setting is read-only */
  readOnly?: boolean;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * String setting
 */
export interface StringSetting extends BaseSetting {
  type: 'string';
  defaultValue: string;

  /** Placeholder text */
  placeholder?: string;

  /** Whether to use multiline textarea */
  multiline?: boolean;
}

/**
 * Number setting
 */
export interface NumberSetting extends BaseSetting {
  type: 'number';
  defaultValue: number;

  /** Step increment */
  step?: number;

  /** Display as slider */
  slider?: boolean;
}

/**
 * Boolean setting
 */
export interface BooleanSetting extends BaseSetting {
  type: 'boolean';
  defaultValue: boolean;
}

/**
 * Select/dropdown setting
 */
export interface SelectSetting extends BaseSetting {
  type: 'select';
  defaultValue: string;

  /** Available options */
  options: SelectOption[];

  /** Allow multiple selections */
  multiple?: boolean;
}

/**
 * Select option
 */
export interface SelectOption {
  /** Option value */
  value: string;

  /** Display label */
  label: string;

  /** Optional description */
  description?: string;

  /** Optional icon */
  icon?: string;
}

/**
 * Array setting
 */
export interface ArraySetting extends BaseSetting {
  type: 'array';
  defaultValue: string[] | number[];

  /** Type of array items */
  itemType: 'string' | 'number';

  /** Validation for array items */
  itemValidation?: SettingValidation;
}

/**
 * Object setting
 */
export interface ObjectSetting extends BaseSetting {
  type: 'object';
  defaultValue: Record<string, unknown>;

  /** Schema for object properties */
  schema?: Record<string, BaseSetting>;

  /** Allow arbitrary key-value pairs */
  freeform?: boolean;
}

/**
 * Secret setting (API keys, passwords, etc.)
 */
export interface SecretSetting extends BaseSetting {
  type: 'secret';
  defaultValue: string;

  /** Placeholder text */
  placeholder?: string;

  /** Storage method */
  storageMethod?: 'vscode' | 'system' | 'encrypted';
}

/**
 * Union type of all setting types
 */
export type Setting =
  | StringSetting
  | NumberSetting
  | BooleanSetting
  | SelectSetting
  | ArraySetting
  | ObjectSetting
  | SecretSetting;

// ---------------------------------------------------------------------------
// Setting Organization
// ---------------------------------------------------------------------------

/**
 * A section groups related settings together
 */
export interface SettingSection {
  /** Unique section identifier */
  id: string;

  /** Section label */
  label: string;

  /** Section description */
  description: string;

  /** Settings in this section */
  settings: Setting[];

  /** Whether section is collapsible */
  collapsible?: boolean;

  /** Default collapsed state */
  defaultCollapsed?: boolean;

  /** Display order */
  order?: number;
}

/**
 * A category groups related sections together
 */
export interface SettingCategory {
  /** Unique category identifier */
  id: string;

  /** Category label */
  label: string;

  /** Optional icon (lucide icon name) */
  icon?: string;

  /** Sections in this category */
  sections: SettingSection[];

  /** Display order */
  order?: number;

  /** Whether category is visible */
  visible?: boolean;
}

// ---------------------------------------------------------------------------
// Settings Configuration Schema
// ---------------------------------------------------------------------------

/**
 * Complete settings configuration covering all categories
 */
export interface SettingsConfig {
  /** General settings */
  general: GeneralSettings;

  /** Authentication settings */
  authentication: AuthenticationSettings;

  /** Permission settings */
  permissions: PermissionSettings;

  /** Memory (Mem0) settings */
  memory: MemorySettings;

  /** Automation (n8n) settings */
  automation: AutomationSettings;

  /** Browser (Playwright) settings */
  browser: BrowserSettings;

  /** Module management settings */
  modules: ModuleSettings;

  /** Environment variables */
  environment: EnvironmentSettings;

  /** Advanced settings */
  advanced: AdvancedSettings;
}

/**
 * General settings category
 */
export interface GeneralSettings {
  /** Default model */
  model: {
    default: string;
    fallback?: string;
  };

  /** Language and locale */
  language: {
    locale: string;
    dateFormat?: string;
    timeFormat?: string;
  };

  /** Output style preferences */
  outputStyle: {
    theme: 'light' | 'dark' | 'auto';
    codeHighlighting: boolean;
    syntaxTheme: string;
    fontSize: number;
    fontFamily?: string;
  };

  /** UI preferences */
  ui: {
    compactMode: boolean;
    showLineNumbers: boolean;
    wordWrap: boolean;
    sidebarPosition: 'left' | 'right';
  };
}

/**
 * Authentication settings category
 */
export interface AuthenticationSettings {
  /** API key authentication */
  apiKey?: string;

  /** OAuth configuration */
  oauth: {
    enabled: boolean;
    provider?: 'anthropic' | 'github' | 'google';
    clientId?: string;
    clientSecret?: string;
  };

  /** Login method */
  loginMethod: 'passkey' | 'api-key' | 'oauth' | 'none';

  /** Session timeout in minutes */
  sessionTimeout?: number;

  /** Require re-authentication for sensitive operations */
  requireReauth: boolean;
}

/**
 * Permission settings category
 */
export interface PermissionSettings {
  /** Default permission mode */
  defaultMode: 'default' | 'plan' | 'bypass' | 'acceptEdits';

  /** Allow rules */
  allowRules: PermissionRule[];

  /** Deny rules */
  denyRules: PermissionRule[];

  /** Ask rules */
  askRules: PermissionRule[];

  /** Auto-approve patterns */
  autoApprove: {
    filePatterns: string[];
    toolNames: string[];
  };
}

/**
 * Permission rule
 */
export interface PermissionRule {
  /** Rule identifier */
  id: string;

  /** Rule type */
  type: 'tool' | 'file' | 'path' | 'command';

  /** Pattern to match */
  pattern: string;

  /** Whether pattern is regex */
  isRegex: boolean;

  /** Rule description */
  description?: string;

  /** Rule enabled */
  enabled: boolean;
}

/**
 * Memory (Mem0) settings category
 */
export interface MemorySettings {
  /** Enable memory system */
  enabled: boolean;

  /** Mem0 configuration */
  mem0: {
    /** API URL */
    apiUrl: string;

    /** API key */
    apiKey?: string;

    /** User ID */
    userId: string;

    /** Organization ID */
    organizationId?: string;

    /** Project ID */
    projectId?: string;
  };

  /** Memory scope */
  scope: 'global' | 'project' | 'session';

  /** Auto-save memories */
  autoSave: boolean;

  /** Memory retention policy */
  retention: {
    maxAge?: number; // days
    maxCount?: number;
  };
}

/**
 * Automation (n8n) settings category
 */
export interface AutomationSettings {
  /** Enable automation system */
  enabled: boolean;

  /** n8n configuration */
  n8n: {
    /** n8n instance URL */
    baseUrl: string;

    /** API key */
    apiKey?: string;

    /** Auto-start n8n service */
    autoStart: boolean;

    /** Port for local n8n instance */
    port?: number;
  };

  /** Webhook settings */
  webhooks: {
    /** Enable webhooks */
    enabled: boolean;

    /** Webhook base URL */
    baseUrl?: string;
  };
}

/**
 * Browser (Playwright) settings category
 */
export interface BrowserSettings {
  /** Enable browser automation */
  enabled: boolean;

  /** Playwright configuration */
  playwright: {
    /** Default browser */
    browser: 'chromium' | 'firefox' | 'webkit';

    /** Headless mode */
    headless: boolean;

    /** Default viewport */
    viewport: {
      width: number;
      height: number;
    };

    /** User agent */
    userAgent?: string;

    /** Timeout in milliseconds */
    timeout: number;
  };

  /** Screenshot settings */
  screenshots: {
    /** Auto-capture screenshots */
    autoCapture: boolean;

    /** Capture interval in seconds */
    interval: number;

    /** Max screenshots per session */
    maxPerSession: number;
  };

  /** Captcha solver configuration */
  captcha: {
    /** Enable captcha solving */
    enabled: boolean;

    /** Solver service */
    solver?: '2captcha' | 'anticaptcha' | 'deathbycaptcha';

    /** Solver API key */
    apiKey?: string;
  };
}

/**
 * Module settings category
 */
export interface ModuleSettings {
  /** Enabled modules */
  enabled: string[];

  /** Disabled modules */
  disabled: string[];

  /** Module-specific configuration */
  moduleConfigs: Record<string, Record<string, unknown>>;

  /** Auto-load modules on startup */
  autoLoad: boolean;

  /** Module load order */
  loadOrder?: string[];
}

/**
 * Environment settings category
 */
export interface EnvironmentSettings {
  /** Custom environment variables */
  variables: Record<string, string>;

  /** Load from .env file */
  loadFromEnv: boolean;

  /** .env file path */
  envFilePath?: string;

  /** Protected variable names (cannot be overridden) */
  protected: string[];
}

/**
 * Advanced settings category
 */
export interface AdvancedSettings {
  /** Custom hooks */
  hooks: {
    /** Before tool execution */
    beforeToolUse?: string;

    /** After tool execution */
    afterToolUse?: string;

    /** Before message send */
    beforeMessageSend?: string;

    /** After message received */
    afterMessageReceived?: string;
  };

  /** Experimental features */
  experimental: {
    /** Enable experimental features */
    enabled: boolean;

    /** Feature flags */
    features: Record<string, boolean>;
  };

  /** Developer mode */
  developerMode: boolean;

  /** Debug settings */
  debug: {
    /** Enable verbose logging */
    verbose: boolean;

    /** Log level */
    logLevel: 'error' | 'warn' | 'info' | 'debug' | 'trace';

    /** Log to file */
    logToFile: boolean;

    /** Log file path */
    logFilePath?: string;
  };

  /** Performance settings */
  performance: {
    /** Enable performance monitoring */
    monitoring: boolean;

    /** Request timeout in milliseconds */
    requestTimeout: number;

    /** Max concurrent requests */
    maxConcurrentRequests: number;

    /** Cache settings */
    cache: {
      enabled: boolean;
      ttl: number; // seconds
      maxSize: number; // MB
    };
  };
}

// ---------------------------------------------------------------------------
// WebView Message Types (Bidirectional Communication)
// ---------------------------------------------------------------------------

/**
 * Messages from Webview to Extension
 */
export type WebviewToExtensionMessageType =
  | 'ready'
  | 'loadSettings'
  | 'saveSettings'
  | 'resetSettings'
  | 'exportSettings'
  | 'importSettings'
  | 'validateSetting'
  | 'searchSettings'
  | 'getSettingValue'
  | 'setSettingValue'
  | 'resetCategory'
  | 'resetSection';

export interface ReadyMessage {
  type: 'ready';
}

export interface LoadSettingsMessage {
  type: 'loadSettings';
  data?: {
    category?: string;
  };
}

export interface SaveSettingsMessage {
  type: 'saveSettings';
  data: {
    settings: Partial<SettingsConfig>;
  };
}

export interface ResetSettingsMessage {
  type: 'resetSettings';
  data?: {
    category?: string;
    section?: string;
  };
}

export interface ExportSettingsMessage {
  type: 'exportSettings';
  data?: {
    format: 'json' | 'yaml';
    includeSecrets: boolean;
  };
}

export interface ImportSettingsMessage {
  type: 'importSettings';
  data: {
    content: string;
    format: 'json' | 'yaml';
    merge: boolean;
  };
}

export interface ValidateSettingMessage {
  type: 'validateSetting';
  data: {
    key: string;
    value: SettingValue;
  };
}

export interface SearchSettingsMessage {
  type: 'searchSettings';
  data: {
    query: string;
  };
}

export interface GetSettingValueMessage {
  type: 'getSettingValue';
  data: {
    key: string;
  };
}

export interface SetSettingValueMessage {
  type: 'setSettingValue';
  data: {
    key: string;
    value: SettingValue;
  };
}

export interface ResetCategoryMessage {
  type: 'resetCategory';
  data: {
    categoryId: string;
  };
}

export interface ResetSectionMessage {
  type: 'resetSection';
  data: {
    sectionId: string;
  };
}

export type WebviewToExtensionMessage =
  | ReadyMessage
  | LoadSettingsMessage
  | SaveSettingsMessage
  | ResetSettingsMessage
  | ExportSettingsMessage
  | ImportSettingsMessage
  | ValidateSettingMessage
  | SearchSettingsMessage
  | GetSettingValueMessage
  | SetSettingValueMessage
  | ResetCategoryMessage
  | ResetSectionMessage;

/**
 * Messages from Extension to Webview
 */
export type ExtensionToWebviewMessageType =
  | 'settingsLoaded'
  | 'settingsSaved'
  | 'settingsReset'
  | 'settingsExported'
  | 'settingsImported'
  | 'validationResult'
  | 'searchResults'
  | 'settingValue'
  | 'error'
  | 'configUpdate';

export interface SettingsLoadedMessage {
  type: 'settingsLoaded';
  data: {
    config: SettingsConfig;
    categories: SettingCategory[];
  };
}

export interface SettingsSavedMessage {
  type: 'settingsSaved';
  data: {
    success: boolean;
    timestamp: string;
  };
}

export interface SettingsResetMessage {
  type: 'settingsReset';
  data: {
    category?: string;
    section?: string;
    config: SettingsConfig;
  };
}

export interface SettingsExportedMessage {
  type: 'settingsExported';
  data: {
    content: string;
    format: 'json' | 'yaml';
    filename: string;
  };
}

export interface SettingsImportedMessage {
  type: 'settingsImported';
  data: {
    success: boolean;
    config: SettingsConfig;
    warnings?: string[];
  };
}

export interface ValidationResultMessage {
  type: 'validationResult';
  data: {
    key: string;
    valid: boolean;
    errors?: string[];
  };
}

export interface SearchResultsMessage {
  type: 'searchResults';
  data: {
    query: string;
    results: SearchResult[];
  };
}

export interface SearchResult {
  /** Setting key */
  key: string;

  /** Setting definition */
  setting: Setting;

  /** Category ID */
  categoryId: string;

  /** Section ID */
  sectionId: string;

  /** Match score */
  score: number;
}

export interface SettingValueMessage {
  type: 'settingValue';
  data: {
    key: string;
    value: SettingValue;
  };
}

export interface ErrorMessage {
  type: 'error';
  data: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export interface ConfigUpdateMessage {
  type: 'configUpdate';
  data: {
    key: string;
    value: SettingValue;
  };
}

export type ExtensionToWebviewMessage =
  | SettingsLoadedMessage
  | SettingsSavedMessage
  | SettingsResetMessage
  | SettingsExportedMessage
  | SettingsImportedMessage
  | ValidationResultMessage
  | SearchResultsMessage
  | SettingValueMessage
  | ErrorMessage
  | ConfigUpdateMessage;

// ---------------------------------------------------------------------------
// View State Types
// ---------------------------------------------------------------------------

/**
 * View mode for settings panel
 */
export type ViewMode = 'list' | 'tree' | 'search';

/**
 * Settings panel view state
 */
export interface ViewState {
  /** Current view mode */
  mode: ViewMode;

  /** Selected category ID */
  selectedCategoryId: string | null;

  /** Selected section ID */
  selectedSectionId: string | null;

  /** Search query */
  searchQuery: string;

  /** Collapsed sections */
  collapsedSections: Set<string>;

  /** Modified settings (unsaved) */
  modifiedSettings: Map<string, SettingValue>;

  /** Validation errors */
  validationErrors: Map<string, string[]>;

  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
}

// ---------------------------------------------------------------------------
// Utility Types
// ---------------------------------------------------------------------------

/**
 * Deep partial type for settings updates
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Setting change event
 */
export interface SettingChangeEvent {
  /** Setting key that changed */
  key: string;

  /** Old value */
  oldValue: SettingValue;

  /** New value */
  newValue: SettingValue;

  /** Timestamp of change */
  timestamp: string;

  /** Source of change */
  source: 'user' | 'import' | 'reset' | 'system';
}

/**
 * Settings diff for displaying changes
 */
export interface SettingsDiff {
  /** Added settings */
  added: Array<{ key: string; value: SettingValue }>;

  /** Modified settings */
  modified: Array<{ key: string; oldValue: SettingValue; newValue: SettingValue }>;

  /** Removed settings */
  removed: Array<{ key: string; oldValue: SettingValue }>;
}
