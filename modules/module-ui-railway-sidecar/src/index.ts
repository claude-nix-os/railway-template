import type { ClaudeOSModule } from './types';

const module: ClaudeOSModule = {
  name: '@claude-nix-os/module-ui-railway-sidecar',
  version: '1.0.0',
  description: 'Serves the ClaudeOS UI on a Railway public URL with proxy-aware routing',
  requires: ['@claude-nix-os/module-ui'],
  optional: [],

  apiRoutes: [
    {
      path: '/api/sidecar/health',
      handler: 'api/sidecar/handler',
      methods: ['GET'],
    },
    {
      path: '/api/sidecar/config',
      handler: 'api/sidecar/handler',
      methods: ['GET'],
    },
  ],

  async onLoad() {
    const env = process.env;
    const domain = env.RAILWAY_PUBLIC_DOMAIN ?? 'not set';
    const port = env.PORT ?? '3000';
    const environment = env.RAILWAY_ENVIRONMENT ?? 'development';

    console.log(`[${this.name}] Module loaded`);
    console.log(`[${this.name}] Railway domain: ${domain}`);
    console.log(`[${this.name}] Binding to port: ${port}`);
    console.log(`[${this.name}] Environment: ${environment}`);

    if (env.RAILWAY_PUBLIC_DOMAIN) {
      console.log(`[${this.name}] SSL terminated by Railway proxy`);
      console.log(`[${this.name}] Public URL: https://${env.RAILWAY_PUBLIC_DOMAIN}`);
    } else {
      console.log(`[${this.name}] No Railway domain detected - running in local mode`);
    }
  },

  async onUnload() {
    console.log(`[${this.name}] Module unloaded`);
  },
};

export default module;
