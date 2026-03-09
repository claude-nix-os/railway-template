import type { ClaudeOSModule } from './types';

const module: ClaudeOSModule = {
  name: '@claude-nix-os/module-file-explorer',
  version: '1.0.0',
  description: 'Filesystem browsing, git diffs, and task management',
  requires: [],
  optional: ['@claude-nix-os/module-ui'],

  activityBarItems: [
    {
      id: 'files',
      icon: 'FolderOpen',
      tooltip: 'Files',
      position: 'top',
      priority: 10,
      panelId: 'file-browser',
      sidebarSection: 'files',
    },
    {
      id: 'tasks',
      icon: 'CheckSquare',
      tooltip: 'Tasks',
      position: 'top',
      priority: 20,
      panelId: 'tasks',
    },
  ],

  panels: [
    {
      id: 'file-browser',
      title: 'File Browser',
      icon: 'FolderOpen',
      component: 'components/FileBrowser',
      singleton: true,
    },
    {
      id: 'session-diffs',
      title: 'Changes',
      icon: 'GitBranch',
      component: 'components/SessionDiffs',
      singleton: true,
    },
    {
      id: 'tasks',
      title: 'Tasks',
      icon: 'CheckSquare',
      component: 'components/TaskPanel',
      singleton: true,
    },
  ],

  sidebarSections: [
    {
      id: 'files',
      title: 'Files',
      icon: 'FolderOpen',
      component: 'components/FilesSidebar',
      priority: 10,
    },
  ],

  apiRoutes: [
    {
      path: '/api/files',
      handler: 'api/files/handler',
      methods: ['GET'],
    },
    {
      path: '/api/workspace',
      handler: 'api/workspace/handler',
      methods: ['GET'],
    },
    {
      path: '/api/tasks',
      handler: 'api/tasks/handler',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  ],

  async onLoad() {
    console.log(`[${this.name}] Module loaded`);
  },

  async onUnload() {
    console.log(`[${this.name}] Module unloaded`);
  },
};

export default module;
