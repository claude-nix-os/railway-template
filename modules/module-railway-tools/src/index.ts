import type { ClaudeOSModule } from './types';

const module: ClaudeOSModule = {
  name: '@claude-nix-os/module-railway-tools',
  version: '1.0.0',
  description: 'Railway management slash commands, UI components, and tooling',
  requires: [],
  optional: ['@claude-nix-os/module-ui'],

  activityBarItems: [{
    id: 'railway',
    icon: 'Train',
    tooltip: 'Railway',
    position: 'bottom',
    priority: 80,
    panelId: 'railway',
  }],

  panels: [{
    id: 'railway',
    title: 'Railway',
    icon: 'Train',
    component: 'components/RailwayPanel',
    singleton: true,
  }],

  statusBarItems: [{
    id: 'railway-status',
    component: 'components/RailwayStatusBar',
    position: 'right',
    priority: 90,
  }],

  apiRoutes: [
    {
      path: '/api/railway/status',
      handler: 'api/railway/handler',
      methods: ['GET'],
    },
    {
      path: '/api/railway/info',
      handler: 'api/railway/handler',
      methods: ['GET'],
    },
    {
      path: '/api/railway/logs',
      handler: 'api/railway/handler',
      methods: ['GET'],
    },
  ],

  skills: [
    {
      name: 'railway-deploy',
      description: 'Trigger a Railway deployment or redeploy the current service',
      handler: 'skills/railway-deploy.md',
    },
    {
      name: 'railway-logs',
      description: 'View deployment logs from the Railway service',
      handler: 'skills/railway-logs.md',
    },
    {
      name: 'railway-env',
      description: 'View and manage Railway environment variables',
      handler: 'skills/railway-env.md',
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
