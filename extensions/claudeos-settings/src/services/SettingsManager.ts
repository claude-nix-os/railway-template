import * as vscode from 'vscode';
import * as path from 'path';
import type {
  AllSettings,
  ClaudeOSSettings,
  ModulesSettings,
  MemorySettings,
  ChatSettings,
  N8nSettings,
  BrowserSettings,
  SettingsChangeEvent,
  SettingsValidationResult,
  SettingsValidationError,
  SettingsExport,
} from '../types/settings';

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

const SETTINGS_VERSION = '1.0.0';
const DEFAULT_DATA_DIR = '/data';
const DEFAULT_WORKSPACE_DIR = '/data/workspace';

/* ------------------------------------------------------------------ */
/*  Settings File Paths                                               */
/* ------------------------------------------------------------------ */

/**
 * Paths to various settings sources
 */
interface SettingsPaths {
  /** ClaudeOS data directory settings */
  dataSettings: string;

  /** ClaudeOS config directory settings */
  configSettings: string;

  /** Modules configuration */
  modulesConfig: string;

  /** Environment variables file */
  envFile: string;
}

/* ------------------------------------------------------------------ */
/*  Settings Manager Options                                          */
/* ------------------------------------------------------------------ */

export interface SettingsManagerOptions {
  /** Base data directory path */
  dataDir?: string;

  /** Whether to auto-save on changes */
  autoSave?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Settings Manager                                                  */
/* ------------------------------------------------------------------ */

/**
 * Manages ClaudeOS settings from multiple sources
 *
 * Reads and writes settings from:
 * - ClaudeOS config files (/data/.claude/settings.json, config/settings.json)
 * - Module configuration (modules.json)
 * - Environment variables (/data/.env)
 * - VS Code workspace configuration
 *
 * Settings are merged hierarchically: workspace > user > defaults
 */
export class SettingsManager {
  private workspaceRoot: string;
  private paths: SettingsPaths;
  private autoSave: boolean;
  private changeEmitter: vscode.EventEmitter<SettingsChangeEvent>;

  /**
   * Event fired when settings change
   */
  public readonly onDidChangeSettings: vscode.Event<SettingsChangeEvent>;

  constructor(
    workspaceRoot: string,
    options: SettingsManagerOptions = {}
  ) {
    this.workspaceRoot = workspaceRoot;
    this.autoSave = options.autoSave ?? true;

    const dataDir = options.dataDir || DEFAULT_DATA_DIR;

    // Initialize file paths
    this.paths = {
      dataSettings: path.join(dataDir, '.claude', 'settings.json'),
      configSettings: path.join(workspaceRoot, 'config', 'settings.json'),
      modulesConfig: path.join(workspaceRoot, 'modules.json'),
      envFile: path.join(dataDir, '.env'),
    };

    // Initialize event emitter
    this.changeEmitter = new vscode.EventEmitter<SettingsChangeEvent>();
    this.onDidChangeSettings = this.changeEmitter.event;

    // Listen for VS Code configuration changes
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (this.affectsClaudeOSSettings(e)) {
        this.handleConfigurationChange();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Read Settings                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Read all settings from all sources and merge them hierarchically
   *
   * Priority order (highest to lowest):
   * 1. VS Code workspace configuration
   * 2. User-level files (/data/.claude/settings.json)
   * 3. Project config files (config/settings.json, modules.json)
   * 4. Environment variables (/data/.env)
   * 5. Default values
   *
   * @returns Promise resolving to merged settings
   */
  async readAllSettings(): Promise<AllSettings> {
    try {
      // Read from all sources
      const [
        dataSettings,
        configSettings,
        modulesSettings,
        envSettings,
        vscodeSettings,
      ] = await Promise.all([
        this.readDataSettings(),
        this.readConfigSettings(),
        this.readModulesSettings(),
        this.readEnvSettings(),
        this.readVSCodeSettings(),
      ]);

      // Get defaults
      const defaults = this.getDefaultSettings();

      // Merge settings in priority order
      const merged: AllSettings = {
        claudeos: {
          ...defaults.claudeos,
          ...configSettings,
          ...dataSettings,
          ...envSettings.claudeos,
          ...vscodeSettings.claudeos,
        },
        modules: modulesSettings || defaults.modules,
        memory: {
          ...defaults.memory,
          ...vscodeSettings.memory,
        },
        chat: {
          ...defaults.chat,
          ...vscodeSettings.chat,
        },
        n8n: {
          ...defaults.n8n,
          ...vscodeSettings.n8n,
        },
        browser: {
          ...defaults.browser,
          ...vscodeSettings.browser,
        },
      };

      return merged;
    } catch (error) {
      console.error('Error reading settings:', error);
      throw new Error(
        `Failed to read settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Write Settings                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Write settings to appropriate locations
   *
   * Settings are written to:
   * - VS Code workspace configuration for extension settings
   * - Config files for ClaudeOS system settings
   * - modules.json for module configurations
   *
   * @param settings Partial settings to write
   */
  async writeSettings(settings: Partial<AllSettings>): Promise<void> {
    try {
      // Validate settings before writing
      const validation = this.validateSettings(settings);
      if (!validation.valid) {
        throw new Error(
          `Settings validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        );
      }

      // Write different setting categories to appropriate locations
      const writePromises: Promise<void>[] = [];

      // Write ClaudeOS settings to config file
      if (settings.claudeos) {
        writePromises.push(this.writeConfigSettings(settings.claudeos));
      }

      // Write module settings to modules.json
      if (settings.modules) {
        writePromises.push(this.writeModulesSettings(settings.modules));
      }

      // Write extension settings to VS Code configuration
      if (settings.memory) {
        writePromises.push(this.writeVSCodeMemorySettings(settings.memory));
      }

      if (settings.chat) {
        writePromises.push(this.writeVSCodeChatSettings(settings.chat));
      }

      if (settings.n8n) {
        writePromises.push(this.writeVSCodeN8nSettings(settings.n8n));
      }

      if (settings.browser) {
        writePromises.push(this.writeVSCodeBrowserSettings(settings.browser));
      }

      // Wait for all writes to complete
      await Promise.all(writePromises);

      // Emit change event
      this.emitChangeEvent('all', settings);

      console.log('Settings written successfully');
    } catch (error) {
      console.error('Error writing settings:', error);
      throw new Error(
        `Failed to write settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Reset Settings                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Reset settings to defaults
   *
   * @param category Optional category to reset (if not provided, resets all)
   */
  async resetToDefaults(category?: keyof AllSettings): Promise<void> {
    try {
      const defaults = this.getDefaultSettings();

      if (category) {
        // Reset specific category
        const categorySettings = { [category]: defaults[category] };
        await this.writeSettings(categorySettings as Partial<AllSettings>);
        console.log(`Reset ${category} settings to defaults`);
      } else {
        // Reset all settings
        await this.writeSettings(defaults);
        console.log('Reset all settings to defaults');
      }

      this.emitChangeEvent(category || 'all', category ? { [category]: defaults[category] } : defaults);
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw new Error(
        `Failed to reset settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Export Settings                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Export all settings as JSON
   *
   * @returns Promise resolving to JSON string of settings
   */
  async exportSettings(): Promise<string> {
    try {
      const settings = await this.readAllSettings();

      const exportData: SettingsExport = {
        version: SETTINGS_VERSION,
        exportedAt: new Date().toISOString(),
        settings,
        metadata: {
          workspaceRoot: this.workspaceRoot,
        },
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting settings:', error);
      throw new Error(
        `Failed to export settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Import Settings                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Import settings from JSON
   *
   * @param json JSON string containing settings export
   */
  async importSettings(json: string): Promise<void> {
    try {
      // Parse JSON
      const exportData: SettingsExport = JSON.parse(json);

      // Validate export format
      if (!exportData.version || !exportData.settings) {
        throw new Error('Invalid settings export format');
      }

      // Check version compatibility
      if (exportData.version !== SETTINGS_VERSION) {
        console.warn(
          `Settings version mismatch: ${exportData.version} (expected ${SETTINGS_VERSION})`
        );
      }

      // Write imported settings
      await this.writeSettings(exportData.settings);

      console.log('Settings imported successfully');
    } catch (error) {
      console.error('Error importing settings:', error);
      throw new Error(
        `Failed to import settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /*  File Reading Helpers                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Read settings from /data/.claude/settings.json
   */
  private async readDataSettings(): Promise<Partial<ClaudeOSSettings>> {
    return this.readJsonFile<Partial<ClaudeOSSettings>>(this.paths.dataSettings);
  }

  /**
   * Read settings from config/settings.json
   */
  private async readConfigSettings(): Promise<Partial<ClaudeOSSettings>> {
    return this.readJsonFile<Partial<ClaudeOSSettings>>(this.paths.configSettings);
  }

  /**
   * Read module configurations from modules.json
   */
  private async readModulesSettings(): Promise<ModulesSettings | null> {
    return this.readJsonFile<ModulesSettings>(this.paths.modulesConfig);
  }

  /**
   * Read environment variables from /data/.env
   */
  private async readEnvSettings(): Promise<Partial<AllSettings>> {
    try {
      const uri = vscode.Uri.file(this.paths.envFile);
      const content = await vscode.workspace.fs.readFile(uri);
      const envText = Buffer.from(content).toString('utf8');

      // Parse .env format
      const env: Record<string, string> = {};
      const lines = envText.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex).trim();
          const value = trimmed.substring(eqIndex + 1).trim();
          env[key] = value.replace(/^["']|["']$/g, ''); // Remove quotes
        }
      }

      return {
        claudeos: { env },
      };
    } catch (error) {
      // File might not exist, return empty
      return {};
    }
  }

  /**
   * Read settings from VS Code workspace configuration
   */
  private async readVSCodeSettings(): Promise<Partial<AllSettings>> {
    const config = vscode.workspace.getConfiguration();

    return {
      claudeos: {},
      memory: {
        apiUrl: config.get('claudeos.memory.apiUrl', 'http://localhost:8100'),
        autoRefresh: config.get('claudeos.memory.autoRefresh', true),
        refreshInterval: config.get('claudeos.memory.refreshInterval', 30000),
        defaultScope: config.get('claudeos.memory.defaultScope', 'session'),
        authToken: config.get('claudeos.memory.authToken'),
      },
      chat: {
        wsUrl: config.get('claudeos.chat.wsUrl', 'ws://localhost:3000/ws'),
        autoConnect: config.get('claudeos.chat.autoConnect', true),
        maxHistory: config.get('claudeos.chat.maxHistory'),
        debug: config.get('claudeos.chat.debug'),
      },
      n8n: {
        serviceUrl: config.get('claudeos.n8n.serviceUrl', 'http://localhost:5678'),
        apiKey: config.get('claudeos.n8n.apiKey'),
        autoStart: config.get('claudeos.n8n.autoStart'),
      },
      browser: {
        browserType: config.get('claudeos.browser.type'),
        headless: config.get('claudeos.browser.headless'),
        timeout: config.get('claudeos.browser.timeout'),
      },
    };
  }

  /**
   * Generic JSON file reader with error handling
   */
  private async readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(content).toString('utf8');
      return JSON.parse(text) as T;
    } catch (error) {
      // File might not exist or be invalid
      console.warn(`Could not read ${filePath}:`, error);
      return null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  File Writing Helpers                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Write ClaudeOS settings to config/settings.json
   */
  private async writeConfigSettings(settings: ClaudeOSSettings): Promise<void> {
    await this.writeJsonFile(this.paths.configSettings, settings);
  }

  /**
   * Write module configurations to modules.json
   */
  private async writeModulesSettings(settings: ModulesSettings): Promise<void> {
    await this.writeJsonFile(this.paths.modulesConfig, settings);
  }

  /**
   * Write memory settings to VS Code configuration
   */
  private async writeVSCodeMemorySettings(settings: MemorySettings): Promise<void> {
    const config = vscode.workspace.getConfiguration('claudeos.memory');

    await Promise.all([
      config.update('apiUrl', settings.apiUrl, vscode.ConfigurationTarget.Workspace),
      config.update('autoRefresh', settings.autoRefresh, vscode.ConfigurationTarget.Workspace),
      config.update('refreshInterval', settings.refreshInterval, vscode.ConfigurationTarget.Workspace),
      config.update('defaultScope', settings.defaultScope, vscode.ConfigurationTarget.Workspace),
      settings.authToken
        ? config.update('authToken', settings.authToken, vscode.ConfigurationTarget.Workspace)
        : Promise.resolve(),
    ]);
  }

  /**
   * Write chat settings to VS Code configuration
   */
  private async writeVSCodeChatSettings(settings: ChatSettings): Promise<void> {
    const config = vscode.workspace.getConfiguration('claudeos.chat');

    await Promise.all([
      config.update('wsUrl', settings.wsUrl, vscode.ConfigurationTarget.Workspace),
      config.update('autoConnect', settings.autoConnect, vscode.ConfigurationTarget.Workspace),
      settings.maxHistory
        ? config.update('maxHistory', settings.maxHistory, vscode.ConfigurationTarget.Workspace)
        : Promise.resolve(),
      settings.debug !== undefined
        ? config.update('debug', settings.debug, vscode.ConfigurationTarget.Workspace)
        : Promise.resolve(),
    ]);
  }

  /**
   * Write n8n settings to VS Code configuration
   */
  private async writeVSCodeN8nSettings(settings: N8nSettings): Promise<void> {
    const config = vscode.workspace.getConfiguration('claudeos.n8n');

    await Promise.all([
      config.update('serviceUrl', settings.serviceUrl, vscode.ConfigurationTarget.Workspace),
      settings.apiKey
        ? config.update('apiKey', settings.apiKey, vscode.ConfigurationTarget.Workspace)
        : Promise.resolve(),
      settings.autoStart !== undefined
        ? config.update('autoStart', settings.autoStart, vscode.ConfigurationTarget.Workspace)
        : Promise.resolve(),
    ]);
  }

  /**
   * Write browser settings to VS Code configuration
   */
  private async writeVSCodeBrowserSettings(settings: BrowserSettings): Promise<void> {
    const config = vscode.workspace.getConfiguration('claudeos.browser');

    await Promise.all([
      settings.browserType
        ? config.update('type', settings.browserType, vscode.ConfigurationTarget.Workspace)
        : Promise.resolve(),
      settings.headless !== undefined
        ? config.update('headless', settings.headless, vscode.ConfigurationTarget.Workspace)
        : Promise.resolve(),
      settings.timeout
        ? config.update('timeout', settings.timeout, vscode.ConfigurationTarget.Workspace)
        : Promise.resolve(),
    ]);
  }

  /**
   * Generic JSON file writer with error handling
   */
  private async writeJsonFile(filePath: string, data: unknown): Promise<void> {
    try {
      const uri = vscode.Uri.file(filePath);
      const json = JSON.stringify(data, null, 2);
      const content = Buffer.from(json, 'utf8');

      // Ensure parent directory exists
      const dirUri = vscode.Uri.file(path.dirname(filePath));
      await vscode.workspace.fs.createDirectory(dirUri);

      // Write file
      await vscode.workspace.fs.writeFile(uri, content);
    } catch (error) {
      console.error(`Error writing to ${filePath}:`, error);
      throw error;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Validation                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Validate settings before writing
   */
  private validateSettings(settings: Partial<AllSettings>): SettingsValidationResult {
    const errors: SettingsValidationError[] = [];

    // Validate memory settings
    if (settings.memory) {
      if (settings.memory.apiUrl && !this.isValidUrl(settings.memory.apiUrl)) {
        errors.push({
          path: 'memory.apiUrl',
          message: 'Invalid API URL format',
          value: settings.memory.apiUrl,
        });
      }

      if (settings.memory.refreshInterval !== undefined && settings.memory.refreshInterval < 1000) {
        errors.push({
          path: 'memory.refreshInterval',
          message: 'Refresh interval must be at least 1000ms',
          value: settings.memory.refreshInterval,
        });
      }
    }

    // Validate chat settings
    if (settings.chat) {
      if (settings.chat.wsUrl && !this.isValidWebSocketUrl(settings.chat.wsUrl)) {
        errors.push({
          path: 'chat.wsUrl',
          message: 'Invalid WebSocket URL format',
          value: settings.chat.wsUrl,
        });
      }

      if (settings.chat.maxHistory !== undefined && settings.chat.maxHistory < 0) {
        errors.push({
          path: 'chat.maxHistory',
          message: 'Max history must be a positive number',
          value: settings.chat.maxHistory,
        });
      }
    }

    // Validate n8n settings
    if (settings.n8n) {
      if (settings.n8n.serviceUrl && !this.isValidUrl(settings.n8n.serviceUrl)) {
        errors.push({
          path: 'n8n.serviceUrl',
          message: 'Invalid service URL format',
          value: settings.n8n.serviceUrl,
        });
      }
    }

    // Validate browser settings
    if (settings.browser) {
      if (settings.browser.timeout !== undefined && settings.browser.timeout < 0) {
        errors.push({
          path: 'browser.timeout',
          message: 'Timeout must be a positive number',
          value: settings.browser.timeout,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if a string is a valid URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a string is a valid WebSocket URL
   */
  private isValidWebSocketUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
    } catch {
      return false;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Default Settings                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Get default settings
   */
  private getDefaultSettings(): AllSettings {
    return {
      claudeos: {
        permissions: {
          allow: [],
          deny: [],
        },
        env: {},
        dataDir: DEFAULT_DATA_DIR,
        workspaceDir: DEFAULT_WORKSPACE_DIR,
      },
      modules: {
        modules: {},
      },
      memory: {
        apiUrl: 'http://localhost:8100',
        autoRefresh: true,
        refreshInterval: 30000,
        defaultScope: 'session',
      },
      chat: {
        wsUrl: 'ws://localhost:3000/ws',
        autoConnect: true,
      },
      n8n: {
        serviceUrl: 'http://localhost:5678',
      },
      browser: {
        browserType: 'chromium',
        headless: true,
        timeout: 30000,
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Event Handling                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Check if a configuration change affects ClaudeOS settings
   */
  private affectsClaudeOSSettings(e: vscode.ConfigurationChangeEvent): boolean {
    return (
      e.affectsConfiguration('claudeos.memory') ||
      e.affectsConfiguration('claudeos.chat') ||
      e.affectsConfiguration('claudeos.n8n') ||
      e.affectsConfiguration('claudeos.browser')
    );
  }

  /**
   * Handle VS Code configuration changes
   */
  private async handleConfigurationChange(): Promise<void> {
    try {
      const settings = await this.readAllSettings();
      this.emitChangeEvent('all', settings);
    } catch (error) {
      console.error('Error handling configuration change:', error);
    }
  }

  /**
   * Emit a settings change event
   */
  private emitChangeEvent(
    category: keyof AllSettings | 'all',
    settings: Partial<AllSettings>
  ): void {
    const event: SettingsChangeEvent = {
      category,
      settings,
      timestamp: new Date(),
    };

    this.changeEmitter.fire(event);
  }

  /* ------------------------------------------------------------------ */
  /*  Cleanup                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.changeEmitter.dispose();
  }
}
