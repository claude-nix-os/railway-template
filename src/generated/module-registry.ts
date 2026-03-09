// AUTO-GENERATED - Registers all installed modules
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

// Panel components (lazy loaded)
export const panelComponents: Record<string, ComponentType<any>> = {};

// Activity bar items from all modules
export const activityBarItems = [
  { id: 'home', icon: 'Home', tooltip: 'Home', position: 'top' as const, priority: 0, sidebarSection: 'sessions' },
  { id: 'files', icon: 'FolderOpen', tooltip: 'Files', position: 'top' as const, priority: 10, sidebarSection: 'files' },
  { id: 'git', icon: 'GitBranch', tooltip: 'Source Control', position: 'top' as const, priority: 20, sidebarSection: 'git' },
  { id: 'workflows', icon: 'Workflow', tooltip: 'Workflows', position: 'top' as const, priority: 30, sidebarSection: 'workflows' },
  { id: 'archive', icon: 'Archive', tooltip: 'Archive', position: 'bottom' as const, priority: 90, sidebarSection: 'archive' },
  { id: 'settings', icon: 'Settings', tooltip: 'Settings', position: 'bottom' as const, priority: 100, sidebarSection: 'settings' },
];

// All registered panels with metadata
export const panelDefinitions = [
  { id: 'home', title: 'Home', icon: 'Home', singleton: true, defaultTab: true, module: 'ui' },
  { id: 'chat', title: 'Chat', icon: 'MessageSquare', singleton: false, module: 'ui' },
  { id: 'settings', title: 'Settings', icon: 'Settings', singleton: true, module: 'ui' },
  { id: 'file-browser', title: 'File Browser', icon: 'FolderOpen', singleton: true, module: 'file-explorer' },
  { id: 'memory-graph', title: 'Memory Graph', icon: 'Brain', singleton: true, module: 'memory' },
  { id: 'memory-projection', title: 'Memory Projection', icon: 'Radar', singleton: false, module: 'memory' },
  { id: 'n8n', title: 'n8n', icon: 'Workflow', singleton: true, module: 'n8n' },
  { id: 'execution-graph', title: 'Execution Graph', icon: 'GitBranch', singleton: true, module: 'ui' },
  { id: 'thought-stream', title: 'Thought Stream', icon: 'Zap', singleton: true, module: 'ui' },
  { id: 'conversation-list', title: 'Sessions', icon: 'MessageSquare', singleton: true, module: 'ui' },
  { id: 'tasks', title: 'Tasks', icon: 'CheckSquare', singleton: true, module: 'file-explorer' },
  { id: 'session-diffs', title: 'Session Diffs', icon: 'GitCompare', singleton: true, module: 'file-explorer' },
  { id: 'railway', title: 'Railway', icon: 'Train', singleton: true, module: 'railway-tools' },
  { id: 'passkey-settings', title: 'Passkey Settings', icon: 'Shield', singleton: true, module: 'passkey-auth' },
  { id: 'gui-session', title: 'GUI Session', icon: 'Monitor', singleton: false, module: 'ui' },
];

// Module metadata
export const installedModules = [
  { name: '@claude-nix-os/module-ui', version: '1.0.0', enabled: true },
  { name: '@claude-nix-os/module-memory', version: '1.0.0', enabled: true },
  { name: '@claude-nix-os/module-n8n', version: '1.0.0', enabled: true },
  { name: '@claude-nix-os/module-ui-passkey-auth', version: '1.0.0', enabled: true },
  { name: '@claude-nix-os/module-railway-tools', version: '1.0.0', enabled: true },
  { name: '@claude-nix-os/module-ui-railway-sidecar', version: '1.0.0', enabled: true },
  { name: '@claude-nix-os/module-file-explorer', version: '1.0.0', enabled: true },
];
