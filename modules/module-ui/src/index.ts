import {
  Home,
  FolderOpen,
  GitBranch,
  Archive,
  Settings,
  MessageSquare,
  Network,
  Brain,
  Monitor,
  List,
  Info,
} from 'lucide-react';

import type { ClaudeOSModule } from './types';
import { usePanelStore } from './stores/panel-store';
import { useSessionStore } from './stores/session-store';
import { useUIStore } from './stores/ui-store';
import { registerPanel } from './components/layout/PanelWrapper';

/* Panel components */
import { ChatPanel } from './components/panels/ChatPanel';
import { HomePanel } from './components/panels/HomePanel';
import { SettingsPanel } from './components/panels/SettingsPanel';
import { ConversationList } from './components/panels/ConversationList';
import { ExecutionGraph } from './components/panels/ExecutionGraph';
import { ThoughtStream } from './components/panels/ThoughtStream';
import { NodePropertiesPanel } from './components/panels/NodePropertiesPanel';
import { GUISessionViewer } from './components/panels/GUISessionViewer';

/* Layout components */
import { MainLayout } from './components/layout/MainLayout';
import { ActivityBar } from './components/layout/ActivityBar';
import { Sidebar } from './components/layout/Sidebar';
import { TabBar } from './components/layout/TabBar';
import { StatusBar } from './components/layout/StatusBar';
import { BottomPanel } from './components/layout/BottomPanel';
import { EditorDropZones } from './components/layout/EditorDropZones';
import { PanelWrapper } from './components/layout/PanelWrapper';

/* Hooks */
import { useWebSocket } from './hooks/useWebSocket';

/* ------------------------------------------------------------------ */
/*  Module Definition                                                  */
/* ------------------------------------------------------------------ */

const moduleUI: ClaudeOSModule = {
  id: '@claude-nix-os/module-ui',
  name: 'ClaudeOS UI',
  version: '1.0.0',
  description:
    'Core UI module providing the VSCode-inspired web interface for ClaudeOS',
  dependencies: [],

  activityBarItems: [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      position: 'top',
      priority: 0,
      sidebarSection: 'sessions',
    },
    {
      id: 'files',
      label: 'Files',
      icon: FolderOpen,
      position: 'top',
      priority: 10,
      sidebarSection: 'files',
    },
    {
      id: 'git',
      label: 'Git',
      icon: GitBranch,
      position: 'top',
      priority: 20,
      sidebarSection: 'git',
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      position: 'bottom',
      priority: 90,
      sidebarSection: 'archive',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      position: 'bottom',
      priority: 100,
      sidebarSection: 'settings',
    },
  ],

  panels: [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      component: HomePanel,
      defaultTab: true,
      singleton: true,
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: MessageSquare,
      component: ChatPanel,
      singleton: false,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      component: SettingsPanel,
      singleton: true,
    },
    {
      id: 'conversation-list',
      label: 'Sessions',
      icon: List,
      component: ConversationList,
      singleton: true,
    },
    {
      id: 'execution-graph',
      label: 'Execution Graph',
      icon: Network,
      component: ExecutionGraph,
      singleton: false,
    },
    {
      id: 'thought-stream',
      label: 'Thought Stream',
      icon: Brain,
      component: ThoughtStream,
      singleton: false,
    },
    {
      id: 'node-properties',
      label: 'Node Properties',
      icon: Info,
      component: NodePropertiesPanel,
      singleton: true,
    },
    {
      id: 'gui-session',
      label: 'GUI Session',
      icon: Monitor,
      component: GUISessionViewer,
      singleton: false,
    },
  ],

  sidebarSections: [
    {
      id: 'sessions',
      label: 'Sessions',
      icon: MessageSquare,
      component: () => null, /* Handled by Sidebar component internally */
      collapsible: true,
      defaultExpanded: true,
    },
    {
      id: 'files',
      label: 'Files',
      icon: FolderOpen,
      component: () => null,
      collapsible: true,
      defaultExpanded: true,
    },
    {
      id: 'git',
      label: 'Source Control',
      icon: GitBranch,
      component: () => null,
      collapsible: true,
      defaultExpanded: true,
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      component: () => null,
      collapsible: true,
      defaultExpanded: true,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      component: () => null,
      collapsible: false,
      defaultExpanded: true,
    },
  ],

  stores: [
    { id: 'panel-store', store: usePanelStore },
    { id: 'session-store', store: useSessionStore },
    { id: 'ui-store', store: useUIStore },
  ],

  init: () => {
    /* Register all panels in the panel registry */
    registerPanel('home', HomePanel);
    registerPanel('chat', ChatPanel);
    registerPanel('settings', SettingsPanel);
    registerPanel('conversation-list', ConversationList);
    registerPanel('execution-graph', ExecutionGraph);
    registerPanel('thought-stream', ThoughtStream);
    registerPanel('node-properties', NodePropertiesPanel);
    registerPanel('gui-session', GUISessionViewer);

    /* Register default command palette items */
    useUIStore.getState().registerCommands([
      {
        id: 'cmd-new-session',
        label: 'New Session',
        description: 'Create a new chat session',
        shortcut: 'Cmd+N',
        category: 'Sessions',
        action: () => {
          const sessionId = useSessionStore.getState().createSession();
          usePanelStore.getState().openTab('chat', {
            label: 'New Session',
            sessionId,
          });
        },
      },
      {
        id: 'cmd-toggle-sidebar',
        label: 'Toggle Sidebar',
        description: 'Show or hide the sidebar',
        shortcut: 'Cmd+B',
        category: 'View',
        action: () => usePanelStore.getState().toggleSidebar(),
      },
      {
        id: 'cmd-toggle-bottom-panel',
        label: 'Toggle Bottom Panel',
        description: 'Show or hide the bottom panel',
        shortcut: 'Cmd+J',
        category: 'View',
        action: () => usePanelStore.getState().toggleBottomPanel(),
      },
      {
        id: 'cmd-open-settings',
        label: 'Open Settings',
        description: 'Configure preferences',
        shortcut: 'Cmd+,',
        category: 'General',
        action: () =>
          usePanelStore.getState().openTab('settings', {
            label: 'Settings',
          }),
      },
      {
        id: 'cmd-split-editor',
        label: 'Split Editor',
        description: 'Split the editor horizontally',
        shortcut: 'Cmd+\\',
        category: 'View',
        action: () => usePanelStore.getState().splitView('horizontal'),
      },
      {
        id: 'cmd-execution-graph',
        label: 'Open Execution Graph',
        description: 'View agent execution tree',
        category: 'Tools',
        action: () =>
          usePanelStore.getState().openTab('execution-graph', {
            label: 'Execution Graph',
          }),
      },
    ]);
  },
};

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export default moduleUI;

/* Re-export everything for external use */
export { moduleUI };

/* Stores */
export { usePanelStore } from './stores/panel-store';
export { useSessionStore } from './stores/session-store';
export { useUIStore } from './stores/ui-store';

/* Hooks */
export { useWebSocket } from './hooks/useWebSocket';

/* Layout components */
export { MainLayout } from './components/layout/MainLayout';
export { ActivityBar } from './components/layout/ActivityBar';
export { Sidebar } from './components/layout/Sidebar';
export { TabBar } from './components/layout/TabBar';
export { StatusBar } from './components/layout/StatusBar';
export { BottomPanel } from './components/layout/BottomPanel';
export { EditorDropZones } from './components/layout/EditorDropZones';
export { PanelWrapper, registerPanel, unregisterPanel } from './components/layout/PanelWrapper';

/* Panel components */
export { ChatPanel } from './components/panels/ChatPanel';
export { HomePanel } from './components/panels/HomePanel';
export { SettingsPanel } from './components/panels/SettingsPanel';
export { ConversationList } from './components/panels/ConversationList';
export { ExecutionGraph } from './components/panels/ExecutionGraph';
export { ThoughtStream } from './components/panels/ThoughtStream';
export { NodePropertiesPanel } from './components/panels/NodePropertiesPanel';
export { GUISessionViewer } from './components/panels/GUISessionViewer';

/* Types */
export type * from './types';
