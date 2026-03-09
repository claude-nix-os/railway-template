/**
 * Main webview script for ClaudeOS Settings
 * Lightweight vanilla TypeScript implementation with no framework dependencies
 */

import type { ViewState } from './types';

/* ------------------------------------------------------------------ */
/*  VS Code API                                                       */
/* ------------------------------------------------------------------ */

// Acquire VS Code API (must be called once)
const vscode = acquireVsCodeApi<ViewState>();

/* ------------------------------------------------------------------ */
/*  State Management                                                  */
/* ------------------------------------------------------------------ */

let state: ViewState = {
  config: null,
  categories: [],
  selectedCategoryId: null,
  selectedSectionId: null,
  searchQuery: '',
  collapsedSections: new Set<string>(),
  modifiedSettings: new Map<string, any>(),
  validationErrors: new Map<string, string[]>(),
  hasUnsavedChanges: false,
  isLoading: true,
  error: null,
};

// Current settings data from extension
let currentSettings: any = null;

// Restore previous state if available
const previousState = vscode.getState();
if (previousState) {
  state = {
    ...previousState,
    collapsedSections: new Set(
      Array.isArray(previousState.collapsedSections)
        ? previousState.collapsedSections
        : []
    ),
    modifiedSettings: new Map(
      Array.isArray((previousState as any).modifiedSettingsArray)
        ? (previousState as any).modifiedSettingsArray
        : []
    ),
    validationErrors: new Map(
      Array.isArray((previousState as any).validationErrorsArray)
        ? (previousState as any).validationErrorsArray
        : []
    ),
  };
}

function updateState(updates: Partial<ViewState>): void {
  state = { ...state, ...updates };

  // Save state to vscode (convert Sets and Maps to arrays for serialization)
  vscode.setState({
    ...state,
    collapsedSections: Array.from(state.collapsedSections),
    modifiedSettingsArray: Array.from(state.modifiedSettings.entries()),
    validationErrorsArray: Array.from(state.validationErrors.entries()),
  } as any);

  render();
}

/* ------------------------------------------------------------------ */
/*  Message Passing with Extension                                    */
/* ------------------------------------------------------------------ */

function postMessage(message: any): void {
  vscode.postMessage(message);
}

// Handle messages from extension
window.addEventListener('message', (event) => {
  const message = event.data;

  switch (message.type) {
    case 'settingsLoaded':
      handleSettingsLoaded(message.settings);
      break;

    case 'updateSuccess':
      handleUpdateSuccess();
      break;

    case 'error':
      handleError(message.message);
      break;

    case 'validationResult':
      handleValidationResult(message.key, message.valid, message.errors);
      break;
  }
});

/* ------------------------------------------------------------------ */
/*  Event Handlers                                                    */
/* ------------------------------------------------------------------ */

function handleSettingsLoaded(settings: any): void {
  currentSettings = settings;

  // Build categories structure
  const categories = buildCategories(settings);

  updateState({
    categories,
    selectedCategoryId: state.selectedCategoryId || categories[0]?.id || null,
    isLoading: false,
    error: null,
  });
}

function handleUpdateSuccess(): void {
  updateState({
    hasUnsavedChanges: false,
    modifiedSettings: new Map(),
  });

  showNotification('Settings saved successfully', 'success');
}

function handleError(errorMessage: string): void {
  updateState({
    error: errorMessage,
    isLoading: false,
  });
}

function handleValidationResult(
  key: string,
  valid: boolean,
  errors?: string[]
): void {
  const validationErrors = new Map(state.validationErrors);

  if (valid) {
    validationErrors.delete(key);
  } else if (errors) {
    validationErrors.set(key, errors);
  }

  updateState({ validationErrors });
}

/* ------------------------------------------------------------------ */
/*  Category Building                                                 */
/* ------------------------------------------------------------------ */

function buildCategories(settings: any): any[] {
  const categories = [
    {
      id: 'memory',
      label: 'Memory',
      icon: '🧠',
      order: 1,
      sections: [
        {
          id: 'memory-service',
          label: 'Memory Service',
          description: 'Configure the memory service connection and behavior',
          settings: [
            {
              id: 'memory.apiUrl',
              key: 'memory.apiUrl',
              label: 'API URL',
              description: 'Memory service API endpoint',
              type: 'string',
              defaultValue: 'http://localhost:8100',
            },
            {
              id: 'memory.autoRefresh',
              key: 'memory.autoRefresh',
              label: 'Auto-refresh',
              description: 'Automatically refresh memory graph',
              type: 'boolean',
              defaultValue: true,
            },
            {
              id: 'memory.refreshInterval',
              key: 'memory.refreshInterval',
              label: 'Refresh Interval (ms)',
              description: 'How often to refresh the memory graph',
              type: 'number',
              defaultValue: 30000,
            },
            {
              id: 'memory.defaultScope',
              key: 'memory.defaultScope',
              label: 'Default Scope',
              description: 'Default memory scope for new memories',
              type: 'select',
              defaultValue: 'session',
              options: [
                { value: 'global', label: 'Global' },
                { value: 'project', label: 'Project' },
                { value: 'session', label: 'Session' },
              ],
            },
            {
              id: 'memory.authToken',
              key: 'memory.authToken',
              label: 'Auth Token',
              description: 'Optional authentication token',
              type: 'secret',
              defaultValue: '',
            },
          ],
        },
      ],
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: '💬',
      order: 2,
      sections: [
        {
          id: 'chat-connection',
          label: 'Connection',
          description: 'Configure chat service connection',
          settings: [
            {
              id: 'chat.wsUrl',
              key: 'chat.wsUrl',
              label: 'WebSocket URL',
              description: 'Chat service WebSocket endpoint',
              type: 'string',
              defaultValue: 'ws://localhost:3000/ws',
            },
            {
              id: 'chat.autoConnect',
              key: 'chat.autoConnect',
              label: 'Auto-connect',
              description: 'Automatically connect on startup',
              type: 'boolean',
              defaultValue: true,
            },
          ],
        },
        {
          id: 'chat-behavior',
          label: 'Behavior',
          description: 'Configure chat behavior',
          settings: [
            {
              id: 'chat.maxHistory',
              key: 'chat.maxHistory',
              label: 'Max History',
              description: 'Maximum number of messages to keep in history',
              type: 'number',
              defaultValue: 100,
            },
            {
              id: 'chat.debug',
              key: 'chat.debug',
              label: 'Debug Mode',
              description: 'Enable debug logging',
              type: 'boolean',
              defaultValue: false,
            },
          ],
        },
      ],
    },
    {
      id: 'n8n',
      label: 'n8n Workflows',
      icon: '⚙️',
      order: 3,
      sections: [
        {
          id: 'n8n-service',
          label: 'n8n Service',
          description: 'Configure n8n workflow automation service',
          settings: [
            {
              id: 'n8n.serviceUrl',
              key: 'n8n.serviceUrl',
              label: 'Service URL',
              description: 'n8n service endpoint',
              type: 'string',
              defaultValue: 'http://localhost:5678',
            },
            {
              id: 'n8n.apiKey',
              key: 'n8n.apiKey',
              label: 'API Key',
              description: 'Optional API key for authentication',
              type: 'secret',
              defaultValue: '',
            },
            {
              id: 'n8n.autoStart',
              key: 'n8n.autoStart',
              label: 'Auto-start',
              description: 'Automatically start n8n service',
              type: 'boolean',
              defaultValue: false,
            },
          ],
        },
      ],
    },
    {
      id: 'browser',
      label: 'Browser',
      icon: '🌐',
      order: 4,
      sections: [
        {
          id: 'browser-config',
          label: 'Browser Configuration',
          description: 'Configure browser automation settings',
          settings: [
            {
              id: 'browser.browserType',
              key: 'browser.browserType',
              label: 'Browser Type',
              description: 'Default browser for automation',
              type: 'select',
              defaultValue: 'chromium',
              options: [
                { value: 'chromium', label: 'Chromium' },
                { value: 'firefox', label: 'Firefox' },
                { value: 'webkit', label: 'WebKit' },
              ],
            },
            {
              id: 'browser.headless',
              key: 'browser.headless',
              label: 'Headless Mode',
              description: 'Run browser in headless mode',
              type: 'boolean',
              defaultValue: true,
            },
            {
              id: 'browser.timeout',
              key: 'browser.timeout',
              label: 'Timeout (ms)',
              description: 'Default timeout for browser operations',
              type: 'number',
              defaultValue: 30000,
            },
          ],
        },
      ],
    },
    {
      id: 'modules',
      label: 'Modules',
      icon: '📦',
      order: 5,
      sections: [
        {
          id: 'modules-management',
          label: 'Module Management',
          description: 'View and manage ClaudeOS modules',
          settings: [],
        },
      ],
    },
    {
      id: 'claudeos',
      label: 'ClaudeOS',
      icon: '🤖',
      order: 6,
      sections: [
        {
          id: 'claudeos-system',
          label: 'System Settings',
          description: 'Core ClaudeOS system configuration',
          settings: [
            {
              id: 'claudeos.dataDir',
              key: 'claudeos.dataDir',
              label: 'Data Directory',
              description: 'ClaudeOS data directory path',
              type: 'string',
              defaultValue: '/data',
            },
            {
              id: 'claudeos.workspaceDir',
              key: 'claudeos.workspaceDir',
              label: 'Workspace Directory',
              description: 'Default workspace directory path',
              type: 'string',
              defaultValue: '/data/workspace',
            },
          ],
        },
      ],
    },
  ];

  return categories;
}

/* ------------------------------------------------------------------ */
/*  User Actions                                                      */
/* ------------------------------------------------------------------ */

function selectCategory(categoryId: string): void {
  updateState({ selectedCategoryId: categoryId });
}

function toggleSection(sectionId: string): void {
  const collapsedSections = new Set(state.collapsedSections);

  if (collapsedSections.has(sectionId)) {
    collapsedSections.delete(sectionId);
  } else {
    collapsedSections.add(sectionId);
  }

  updateState({ collapsedSections });
}

function updateSetting(key: string, value: any): void {
  const modifiedSettings = new Map(state.modifiedSettings);
  modifiedSettings.set(key, value);

  updateState({
    modifiedSettings,
    hasUnsavedChanges: true,
  });
}

function saveSettings(): void {
  if (!state.hasUnsavedChanges) return;

  // Build settings object from modified settings
  const updates: any = {
    memory: {},
    chat: {},
    n8n: {},
    browser: {},
    modules: {},
    claudeos: {},
  };

  state.modifiedSettings.forEach((value, key) => {
    const [category, settingKey] = key.split('.');
    if (category && settingKey) {
      updates[category][settingKey] = value;
    }
  });

  postMessage({
    type: 'updateSettings',
    settings: updates,
  });
}

function resetSettings(category?: string): void {
  const message = category
    ? `Reset ${category} settings to defaults?`
    : 'Reset all settings to defaults?';

  if (confirm(message)) {
    postMessage({
      type: 'resetSettings',
      category,
    });

    updateState({
      modifiedSettings: new Map(),
      hasUnsavedChanges: false,
    });
  }
}

function exportSettings(): void {
  postMessage({ type: 'exportSettings' });
}

function importSettings(): void {
  postMessage({ type: 'importSettings' });
}

function searchSettings(query: string): void {
  updateState({ searchQuery: query.trim() });
}

/* ------------------------------------------------------------------ */
/*  Rendering                                                         */
/* ------------------------------------------------------------------ */

function render(): void {
  const app = document.getElementById('app');
  if (!app) return;

  if (state.isLoading) {
    app.innerHTML = renderLoading();
    return;
  }

  app.innerHTML = `
    ${renderHeader()}
    ${renderMain()}
    ${renderActionBar()}
  `;

  attachEventListeners();
}

function renderHeader(): string {
  return `
    <div class="settings-header">
      <div class="settings-title">ClaudeOS Settings</div>
      <div class="search-container">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          class="search-input"
          placeholder="Search settings..."
          value="${escapeHtml(state.searchQuery)}"
          id="search-input"
        />
      </div>
    </div>
  `;
}

function renderMain(): string {
  return `
    <div class="settings-main">
      ${renderSidebar()}
      ${renderContent()}
    </div>
  `;
}

function renderSidebar(): string {
  if (state.searchQuery) {
    return ''; // Hide sidebar during search
  }

  return `
    <nav class="settings-sidebar">
      <ul class="category-list">
        ${state.categories
          .map((category) => renderCategoryItem(category))
          .join('')}
      </ul>
    </nav>
  `;
}

function renderCategoryItem(category: any): string {
  const isActive = category.id === state.selectedCategoryId;
  const activeClass = isActive ? 'category-item--active' : '';

  return `
    <li
      class="category-item ${activeClass}"
      data-category-id="${category.id}"
    >
      <span class="category-icon">${category.icon}</span>
      ${escapeHtml(category.label)}
    </li>
  `;
}

function renderContent(): string {
  if (state.error) {
    return `
      <div class="settings-content">
        <div class="error-banner">${escapeHtml(state.error)}</div>
      </div>
    `;
  }

  if (state.searchQuery) {
    return renderSearchResults();
  }

  const selectedCategory = state.categories.find(
    (c) => c.id === state.selectedCategoryId
  );

  if (!selectedCategory) {
    return `
      <div class="settings-content">
        <div class="empty-state">
          <div class="empty-state-icon">⚙️</div>
          <div class="empty-state-text">Select a category to view settings</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="settings-content">
      ${selectedCategory.sections.map((section: any) => renderSection(section)).join('')}
    </div>
  `;
}

function renderSection(section: any): string {
  const isCollapsed = state.collapsedSections.has(section.id);
  const collapsedClass = isCollapsed ? 'section-collapsed' : '';

  // Special handling for modules section
  if (section.id === 'modules-management' && currentSettings?.modules) {
    return renderModulesSection(section);
  }

  return `
    <div class="settings-section ${collapsedClass}">
      <div class="section-header" data-section-id="${section.id}">
        <div>
          <div class="section-title">${escapeHtml(section.label)}</div>
          ${section.description ? `<div class="section-description">${escapeHtml(section.description)}</div>` : ''}
        </div>
        ${section.collapsible !== false ? '<span class="section-toggle">▼</span>' : ''}
      </div>
      <div class="section-settings">
        ${section.settings.map((setting: any) => renderSetting(setting)).join('')}
      </div>
    </div>
  `;
}

function renderModulesSection(section: any): string {
  const modules = currentSettings?.modules?.modules || {};
  const moduleEntries = Object.entries(modules);

  return `
    <div class="settings-section">
      <div class="section-header">
        <div>
          <div class="section-title">${escapeHtml(section.label)}</div>
          ${section.description ? `<div class="section-description">${escapeHtml(section.description)}</div>` : ''}
        </div>
      </div>
      <div class="section-settings">
        ${
          moduleEntries.length === 0
            ? '<div class="empty-state-text">No modules configured</div>'
            : `
          <div class="module-list">
            ${moduleEntries
              .map(
                ([name, config]: [string, any]) => `
              <div class="module-item">
                <span class="module-name">${escapeHtml(name)}</span>
                <span class="status-badge ${config.enabled ? 'status-enabled' : 'status-disabled'}">
                  ${config.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            `
              )
              .join('')}
          </div>
        `
        }
      </div>
    </div>
  `;
}

function renderSetting(setting: any): string {
  const currentValue = getSettingValue(setting.key);
  const isModified = state.modifiedSettings.has(setting.key);
  const errors = state.validationErrors.get(setting.key);

  return `
    <div class="setting-item">
      <div class="setting-header">
        <div class="setting-label">${escapeHtml(setting.label)}</div>
        ${isModified ? '<span class="setting-modified">(modified)</span>' : ''}
      </div>
      ${setting.description ? `<div class="setting-description">${escapeHtml(setting.description)}</div>` : ''}
      <div class="setting-key">${escapeHtml(setting.key)}</div>
      ${renderSettingInput(setting, currentValue)}
      ${errors ? `<div class="setting-validation setting-validation--error">${errors.join(', ')}</div>` : ''}
    </div>
  `;
}

function renderSettingInput(setting: any, currentValue: any): string {
  const value = currentValue ?? setting.defaultValue;

  switch (setting.type) {
    case 'boolean':
      return renderCheckboxInput(setting, value);

    case 'number':
      return renderNumberInput(setting, value);

    case 'select':
      return renderSelectInput(setting, value);

    case 'secret':
      return renderSecretInput(setting, value);

    case 'string':
    default:
      return renderTextInput(setting, value);
  }
}

function renderTextInput(setting: any, value: string): string {
  const placeholder = setting.placeholder || '';
  const multiline = setting.multiline || false;

  if (multiline) {
    return `
      <textarea
        class="setting-textarea"
        data-setting-key="${setting.key}"
        placeholder="${escapeHtml(placeholder)}"
      >${escapeHtml(value || '')}</textarea>
    `;
  }

  return `
    <input
      type="text"
      class="setting-input"
      data-setting-key="${setting.key}"
      value="${escapeHtml(value || '')}"
      placeholder="${escapeHtml(placeholder)}"
    />
  `;
}

function renderNumberInput(setting: any, value: number): string {
  const step = setting.step || 1;
  const min = setting.validation?.min ?? '';
  const max = setting.validation?.max ?? '';

  return `
    <input
      type="number"
      class="setting-input setting-number"
      data-setting-key="${setting.key}"
      value="${value}"
      step="${step}"
      ${min !== '' ? `min="${min}"` : ''}
      ${max !== '' ? `max="${max}"` : ''}
    />
  `;
}

function renderCheckboxInput(setting: any, value: boolean): string {
  return `
    <div class="setting-checkbox-container">
      <input
        type="checkbox"
        class="setting-checkbox"
        data-setting-key="${setting.key}"
        id="checkbox-${setting.id}"
        ${value ? 'checked' : ''}
      />
      <label
        class="setting-checkbox-label"
        for="checkbox-${setting.id}"
      >
        Enable ${escapeHtml(setting.label)}
      </label>
    </div>
  `;
}

function renderSelectInput(setting: any, value: string): string {
  const options = setting.options || [];

  return `
    <select
      class="setting-select"
      data-setting-key="${setting.key}"
    >
      ${options
        .map(
          (option: any) => `
        <option
          value="${escapeHtml(option.value)}"
          ${option.value === value ? 'selected' : ''}
        >
          ${escapeHtml(option.label)}
        </option>
      `
        )
        .join('')}
    </select>
  `;
}

function renderSecretInput(setting: any, value: string): string {
  const placeholder = setting.placeholder || '';

  return `
    <div class="setting-secret-container">
      <input
        type="password"
        class="setting-input setting-secret"
        data-setting-key="${setting.key}"
        id="secret-${setting.id}"
        value="${escapeHtml(value || '')}"
        placeholder="${escapeHtml(placeholder)}"
      />
      <button
        class="setting-secret-toggle"
        data-secret-id="secret-${setting.id}"
        type="button"
      >
        Show
      </button>
    </div>
  `;
}

function renderSearchResults(): string {
  // Simple search implementation
  const query = state.searchQuery.toLowerCase();
  const results: any[] = [];

  state.categories.forEach((category) => {
    category.sections.forEach((section: any) => {
      section.settings.forEach((setting: any) => {
        if (
          setting.label.toLowerCase().includes(query) ||
          setting.description?.toLowerCase().includes(query) ||
          setting.key.toLowerCase().includes(query)
        ) {
          results.push({
            setting,
            category: category.label,
            section: section.label,
          });
        }
      });
    });
  });

  return `
    <div class="settings-content">
      <div class="search-results">
        <div class="search-results-header">
          Found ${results.length} result${results.length !== 1 ? 's' : ''} for "${escapeHtml(state.searchQuery)}"
        </div>
        ${results.map((result) => `
          <div class="search-result-item">
            <div class="search-result-label">${escapeHtml(result.setting.label)}</div>
            <div class="search-result-description">${escapeHtml(result.setting.description || '')}</div>
            <div class="search-result-category">${escapeHtml(result.category)} › ${escapeHtml(result.section)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderActionBar(): string {
  const hasChanges = state.hasUnsavedChanges;

  return `
    <div class="action-bar">
      <div class="action-bar-left">
        <button
          id="save-btn"
          ${!hasChanges ? 'disabled' : ''}
        >
          Save Settings
        </button>
        <button
          id="reset-btn"
          class="secondary"
        >
          Reset to Defaults
        </button>
      </div>
      <div class="action-bar-right">
        <button id="export-btn" class="secondary">Export</button>
        <button id="import-btn" class="secondary">Import</button>
      </div>
    </div>
  `;
}

function renderLoading(): string {
  return `
    <div class="loading">
      <div class="spinner"></div>
      <div class="loading-text">Loading settings...</div>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/*  Event Listeners                                                   */
/* ------------------------------------------------------------------ */

function attachEventListeners(): void {
  // Category selection
  document.querySelectorAll('.category-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      const categoryId = (item as HTMLElement).dataset.categoryId;
      if (categoryId) {
        selectCategory(categoryId);
      }
    });
  });

  // Section collapse/expand
  document.querySelectorAll('.section-header').forEach((header) => {
    header.addEventListener('click', (e) => {
      const sectionId = (header as HTMLElement).dataset.sectionId;
      if (sectionId) {
        toggleSection(sectionId);
      }
    });
  });

  // Setting inputs
  document.querySelectorAll('[data-setting-key]').forEach((input) => {
    const key = (input as HTMLElement).dataset.settingKey;
    if (!key) return;

    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      let value: any;

      if (target.type === 'checkbox') {
        value = (target as HTMLInputElement).checked;
      } else if (target.type === 'number') {
        value = parseFloat(target.value);
      } else {
        value = target.value;
      }

      updateSetting(key, value);
    });
  });

  // Secret input toggle
  document.querySelectorAll('.setting-secret-toggle').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const secretId = (btn as HTMLElement).dataset.secretId;
      if (!secretId) return;

      const input = document.getElementById(secretId) as HTMLInputElement;
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Hide';
      } else {
        input.type = 'password';
        btn.textContent = 'Show';
      }
    });
  });

  // Search input
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchSettings((e.target as HTMLInputElement).value);
    });
  }

  // Action buttons
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => saveSettings());
  }

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => resetSettings());
  }

  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => exportSettings());
  }

  const importBtn = document.getElementById('import-btn');
  if (importBtn) {
    importBtn.addEventListener('click', () => importSettings());
  }
}

/* ------------------------------------------------------------------ */
/*  Utility Functions                                                 */
/* ------------------------------------------------------------------ */

function getSettingValue(key: string): any {
  // Check if there's a modified value first
  if (state.modifiedSettings.has(key)) {
    return state.modifiedSettings.get(key);
  }

  // Otherwise get from current settings
  if (!currentSettings) return undefined;

  const [category, settingKey] = key.split('.');
  if (category && settingKey && currentSettings[category]) {
    return currentSettings[category][settingKey];
  }

  return undefined;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message: string, type: 'success' | 'error'): void {
  const content = document.querySelector('.settings-content');
  if (!content) return;

  const banner = document.createElement('div');
  banner.className = type === 'success' ? 'success-banner' : 'error-banner';
  banner.textContent = message;

  content.insertBefore(banner, content.firstChild);

  setTimeout(() => {
    banner.remove();
  }, 5000);
}

/* ------------------------------------------------------------------ */
/*  Initialize                                                        */
/* ------------------------------------------------------------------ */

// Initial render
render();

// Send ready message to extension
window.addEventListener('load', () => {
  postMessage({ type: 'ready' });
});
