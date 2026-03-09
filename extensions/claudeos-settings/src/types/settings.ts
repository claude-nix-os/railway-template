/**
 * Core ClaudeOS Settings Types
 *
 * Defines the structure for all settings across ClaudeOS components
 */

/* ------------------------------------------------------------------ */
/*  ClaudeOS Configuration Settings                                   */
/* ------------------------------------------------------------------ */

/**
 * Main ClaudeOS system settings
 */
export interface ClaudeOSSettings {
  /** Permissions configuration */
  permissions?: {
    allow: string[];
    deny: string[];
  };

  /** Environment variables */
  env?: Record<string, string>;

  /** Data directory path */
  dataDir?: string;

  /** Workspace directory path */
  workspaceDir?: string;
}

/* ------------------------------------------------------------------ */
/*  Module Configuration Settings                                     */
/* ------------------------------------------------------------------ */

/**
 * Configuration for individual modules
 */
export interface ModuleConfig {
  /** Whether the module is enabled */
  enabled: boolean;

  /** Module-specific configuration */
  config?: Record<string, unknown>;
}

/**
 * Collection of all module configurations
 */
export interface ModulesSettings {
  modules: Record<string, ModuleConfig>;
}

/* ------------------------------------------------------------------ */
/*  Memory Service Settings                                           */
/* ------------------------------------------------------------------ */

/**
 * Memory service configuration
 */
export interface MemorySettings {
  /** Memory API base URL */
  apiUrl: string;

  /** Whether to auto-refresh memory graph */
  autoRefresh: boolean;

  /** Auto-refresh interval in milliseconds */
  refreshInterval: number;

  /** Default memory scope */
  defaultScope: 'session' | 'user' | 'global';

  /** Authentication token */
  authToken?: string;
}

/* ------------------------------------------------------------------ */
/*  Chat Service Settings                                             */
/* ------------------------------------------------------------------ */

/**
 * Chat service configuration
 */
export interface ChatSettings {
  /** WebSocket URL for chat connection */
  wsUrl: string;

  /** Whether to auto-connect on startup */
  autoConnect: boolean;

  /** Maximum message history to keep */
  maxHistory?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/* ------------------------------------------------------------------ */
/*  n8n Workflow Settings                                             */
/* ------------------------------------------------------------------ */

/**
 * n8n workflow automation settings
 */
export interface N8nSettings {
  /** n8n service URL */
  serviceUrl: string;

  /** API key for authentication */
  apiKey?: string;

  /** Whether to auto-start workflows */
  autoStart?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Browser Sessions Settings                                         */
/* ------------------------------------------------------------------ */

/**
 * Browser automation settings
 */
export interface BrowserSettings {
  /** Playwright browser type */
  browserType?: 'chromium' | 'firefox' | 'webkit';

  /** Whether to run in headless mode */
  headless?: boolean;

  /** Default timeout for operations */
  timeout?: number;
}

/* ------------------------------------------------------------------ */
/*  All Settings Aggregate                                            */
/* ------------------------------------------------------------------ */

/**
 * Complete settings structure combining all subsystems
 */
export interface AllSettings {
  /** Core ClaudeOS settings */
  claudeos: ClaudeOSSettings;

  /** Module configurations */
  modules: ModulesSettings;

  /** Memory service settings */
  memory: MemorySettings;

  /** Chat service settings */
  chat: ChatSettings;

  /** n8n workflow settings */
  n8n: N8nSettings;

  /** Browser automation settings */
  browser: BrowserSettings;
}

/* ------------------------------------------------------------------ */
/*  Settings Source Information                                       */
/* ------------------------------------------------------------------ */

/**
 * Information about where a setting value came from
 */
export type SettingSource =
  | 'default'      // Built-in default value
  | 'user'         // User-level configuration
  | 'workspace'    // Workspace-level configuration
  | 'env'          // Environment variable
  | 'file';        // Configuration file

/**
 * Setting value with source tracking
 */
export interface SettingWithSource<T = unknown> {
  /** The setting value */
  value: T;

  /** Where this value came from */
  source: SettingSource;

  /** Path to the source file, if applicable */
  sourcePath?: string;
}

/* ------------------------------------------------------------------ */
/*  Settings Events                                                   */
/* ------------------------------------------------------------------ */

/**
 * Event emitted when settings change
 */
export interface SettingsChangeEvent {
  /** Category of settings that changed */
  category: keyof AllSettings | 'all';

  /** The updated settings */
  settings: Partial<AllSettings>;

  /** Timestamp of the change */
  timestamp: Date;
}

/* ------------------------------------------------------------------ */
/*  Settings Validation                                               */
/* ------------------------------------------------------------------ */

/**
 * Validation error for settings
 */
export interface SettingsValidationError {
  /** Path to the invalid setting */
  path: string;

  /** Error message */
  message: string;

  /** The invalid value */
  value: unknown;
}

/**
 * Result of settings validation
 */
export interface SettingsValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Validation errors, if any */
  errors: SettingsValidationError[];
}

/* ------------------------------------------------------------------ */
/*  Settings Import/Export                                            */
/* ------------------------------------------------------------------ */

/**
 * Format for exported settings
 */
export interface SettingsExport {
  /** Version of the export format */
  version: string;

  /** Timestamp of export */
  exportedAt: string;

  /** The settings data */
  settings: AllSettings;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}
