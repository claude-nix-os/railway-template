import type { ClaudeOSModule } from './types';

const module: ClaudeOSModule = {
  name: '@claude-nix-os/module-memory',
  version: '1.0.0',
  description: 'Memory system with visualization',
  requires: [],
  optional: ['@claude-nix-os/module-ui'],

  activityBarItems: [], // Memory accessed via panels, not activity bar

  panels: [
    {
      id: 'memory-graph',
      title: 'Memory Graph',
      icon: 'Brain',
      component: 'components/MemoryGraph',
      singleton: true,
    },
    {
      id: 'memory-projection',
      title: 'Memory Projection',
      icon: 'Radar',
      component: 'components/MemoryProjection',
      singleton: false, // Can have multiple (global + per-session)
    },
  ],

  apiRoutes: [
    {
      path: '/api/memory',
      handler: 'api/memory/handler',
      methods: ['GET', 'POST', 'DELETE'],
    },
  ],

  services: [
    {
      name: 'mem0',
      command: 'python3',
      args: ['/opt/mem0/server.py'],
      port: 8100,
      healthCheck: '/health',
      env: { DATA_DIR: '/data' },
      priority: 20,
    },
  ],

  async onLoad() {
    console.log(`[${this.name}] Memory module loaded`);
  },

  async onUnload() {
    console.log(`[${this.name}] Memory module unloaded`);
  },
};

export default module;

// Re-export types for consumers
export type {
  Memory,
  ScoredMemory,
  GraphEdge,
  GraphNode,
  MemoryGraph,
  AddMemoryRequest,
  SearchMemoryRequest,
  AddEdgeRequest,
  HealthResponse,
} from './types';
