/**
 * Webview-specific types for claudeos-settings extension
 */

import type {
  SettingCategory,
  SettingSection,
  Setting,
  SettingValue,
  SettingsConfig,
} from '../types';

/* ------------------------------------------------------------------ */
/*  View State                                                        */
/* ------------------------------------------------------------------ */

/**
 * View state for the settings webview
 */
export interface ViewState {
  /** Current settings configuration */
  config: SettingsConfig | null;

  /** All setting categories */
  categories: SettingCategory[];

  /** Currently selected category ID */
  selectedCategoryId: string | null;

  /** Currently selected section ID */
  selectedSectionId: string | null;

  /** Search query */
  searchQuery: string;

  /** Collapsed section IDs */
  collapsedSections: Set<string>;

  /** Modified settings (unsaved) */
  modifiedSettings: Map<string, SettingValue>;

  /** Validation errors per setting key */
  validationErrors: Map<string, string[]>;

  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;

  /** Loading state */
  isLoading: boolean;

  /** Error message */
  error: string | null;
}

/* ------------------------------------------------------------------ */
/*  Messages from Webview to Extension                                */
/* ------------------------------------------------------------------ */

export type WebviewToExtensionMessageType =
  | 'ready'
  | 'updateSettings'
  | 'resetSettings'
  | 'exportSettings'
  | 'importSettings'
  | 'validateSetting'
  | 'openFile';

export interface ReadyMessage {
  type: 'ready';
}

export interface UpdateSettingsMessage {
  type: 'updateSettings';
  settings: any;
}

export interface ResetSettingsMessage {
  type: 'resetSettings';
  category?: string;
}

export interface ExportSettingsMessage {
  type: 'exportSettings';
}

export interface ImportSettingsMessage {
  type: 'importSettings';
}

export interface ValidateSettingMessage {
  type: 'validateSetting';
  key: string;
  value: SettingValue;
}

export interface OpenFileMessage {
  type: 'openFile';
  path: string;
}

export type WebviewToExtensionMessage =
  | ReadyMessage
  | UpdateSettingsMessage
  | ResetSettingsMessage
  | ExportSettingsMessage
  | ImportSettingsMessage
  | ValidateSettingMessage
  | OpenFileMessage;

/* ------------------------------------------------------------------ */
/*  Messages from Extension to Webview                                */
/* ------------------------------------------------------------------ */

export type ExtensionToWebviewMessageType =
  | 'settingsLoaded'
  | 'updateSuccess'
  | 'error'
  | 'validationResult';

export interface SettingsLoadedMessage {
  type: 'settingsLoaded';
  settings: any;
}

export interface UpdateSuccessMessage {
  type: 'updateSuccess';
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface ValidationResultMessage {
  type: 'validationResult';
  key: string;
  valid: boolean;
  errors?: string[];
}

export type ExtensionToWebviewMessage =
  | SettingsLoadedMessage
  | UpdateSuccessMessage
  | ErrorMessage
  | ValidationResultMessage;
