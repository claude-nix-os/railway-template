import type { ClaudeOSModule } from './types';
import { cleanup } from './api/browser/handler';

const module: ClaudeOSModule = {
  name: '@claude-nix-os/module-browser',
  version: '1.0.0',
  description: 'Playwright-based browser automation with screenshot capture and interaction',
  requires: [],
  optional: ['@claude-nix-os/module-ui'],

  activityBarItems: [],

  panels: [],

  apiRoutes: [
    {
      path: '/api/browser',
      handler: 'api/browser/handler',
      methods: ['GET', 'POST', 'DELETE'],
    },
  ],

  wsHandlers: [
    {
      messageType: 'browser:screenshot',
      handler: 'ws/screenshot-handler',
    },
    {
      messageType: 'browser:interaction',
      handler: 'ws/interaction-handler',
    },
  ],

  async onLoad() {
    console.log(`[${this.name}] Browser automation module loaded`);
    console.log(`[${this.name}] API available at /api/browser`);
    console.log(`[${this.name}] WebSocket handlers: browser:screenshot, browser:interaction`);
  },

  async onUnload() {
    console.log(`[${this.name}] Browser automation module unloading...`);
    await cleanup();
    console.log(`[${this.name}] Browser automation module unloaded`);
  },
};

export default module;

// Re-export types for consumers
export type {
  BrowserSession,
  BrowserSessionConfig,
  Screenshot,
  CreateSessionRequest,
  CreateSessionResponse,
  ListSessionsResponse,
  NavigateRequest,
  NavigateResponse,
  ScreenshotRequest,
  ScreenshotResponse,
  ClickRequest,
  ClickResponse,
  TypeRequest,
  TypeResponse,
  ControlRequest,
  ControlResponse,
  WsScreenshotMessage,
  WsInteractionMessage,
  SessionState,
} from './types';

// Re-export service for advanced usage
export { BrowserSessionManager } from './services/BrowserSessionManager';
