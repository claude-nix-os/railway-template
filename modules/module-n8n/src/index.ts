import type { ClaudeOSModule } from './types';

const module: ClaudeOSModule = {
  name: '@claude-nix-os/module-n8n',
  version: '1.0.0',
  description: 'n8n workflow automation integration',
  requires: [],
  optional: ['@claude-nix-os/module-ui'],

  activityBarItems: [{
    id: 'workflows',
    icon: 'Workflow',
    tooltip: 'Workflows',
    position: 'top',
    priority: 30,
    sidebarSection: 'workflows',
  }],

  panels: [{
    id: 'n8n',
    title: 'n8n',
    icon: 'Workflow',
    component: 'components/N8nPanel',
    singleton: true,
  }],

  sidebarSections: [{
    id: 'workflows',
    title: 'Workflows',
    icon: 'Workflow',
    component: 'components/WorkflowsSidebar',
    priority: 30,
  }],

  apiRoutes: [{
    path: '/api/n8n',
    handler: 'api/n8n/handler',
    methods: ['GET'],
  }],

  services: [{
    name: 'n8n',
    command: 'n8n',
    args: ['start'],
    port: 5678,
    healthCheck: '/healthz',
    env: {
      N8N_PORT: '5678',
      N8N_PROTOCOL: 'http',
      N8N_HOST: '0.0.0.0',
      N8N_USER_FOLDER: '/data/n8n',
      DB_TYPE: 'sqlite',
      DB_SQLITE_DATABASE: '/data/n8n/database.sqlite',
      N8N_DIAGNOSTICS_ENABLED: 'false',
      N8N_PERSONALIZATION_ENABLED: 'false',
      N8N_TEMPLATES_ENABLED: 'false',
      GENERIC_TIMEZONE: 'UTC',
      N8N_SECURE_COOKIE: 'false',
    },
    user: 'claude',
    priority: 30,
    startDelay: 10,
  }],

  async onLoad() {
    console.log(`[${this.name}] Module loaded`);
  },

  async onUnload() {
    console.log(`[${this.name}] Module unloaded`);
  },
};

export default module;
