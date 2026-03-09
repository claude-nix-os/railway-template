import type { ClaudeOSModule } from './types';

const module: ClaudeOSModule = {
  name: '@claude-nix-os/module-ui-passkey-auth',
  version: '1.0.0',
  description: 'WebAuthn passkey authentication',
  requires: ['@claude-nix-os/module-ui'],

  settingsPages: [{
    id: 'security',
    title: 'Security',
    icon: 'Shield',
    component: 'components/PasskeySettings',
    priority: 20,
  }],

  apiRoutes: [
    { path: '/api/passkeys/register/options', handler: 'api/passkeys/register-options', methods: ['POST'] },
    { path: '/api/passkeys/register/verify', handler: 'api/passkeys/register-verify', methods: ['POST'] },
    { path: '/api/passkeys/authenticate/options', handler: 'api/passkeys/authenticate-options', methods: ['POST'] },
    { path: '/api/passkeys/authenticate/verify', handler: 'api/passkeys/authenticate-verify', methods: ['POST'] },
    { path: '/api/passkeys/check', handler: 'api/passkeys/check', methods: ['GET'] },
    { path: '/api/passkeys/setup-token', handler: 'api/passkeys/setup-token', methods: ['POST'] },
    { path: '/api/passkeys', handler: 'api/passkeys/manage', methods: ['GET', 'DELETE'] },
  ],

  async onLoad() {
    console.log('[module-ui-passkey-auth] Passkey authentication module loaded');
  },

  async onUnload() {
    console.log('[module-ui-passkey-auth] Passkey authentication module unloaded');
  },
};

export default module;
