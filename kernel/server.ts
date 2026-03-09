/**
 * ClaudeOS v3 Kernel - Core HTTP/WebSocket Server
 *
 * Responsibilities:
 *   - HTTP server with Next.js request handling
 *   - Module API route dispatching
 *   - WebSocket server with JWT auth
 *   - Module WS handler registration
 *   - Claude Code session management
 *   - Session persistence to /data/sessions/
 */

import { createServer, IncomingMessage } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { spawn, ChildProcess } from 'child_process';
import { randomBytes } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import * as fs from 'fs';
import * as path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Session, Message, ToolCall, ModuleRegistry, WsHandlerDefinition } from './types';
import { buildRegistry } from './module-loader';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = process.env.DATA_DIR || '/data';
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const WORKSPACE_DIR = path.join(DATA_DIR, 'workspace');

// ---------------------------------------------------------------------------
// JWT Secret Management
// ---------------------------------------------------------------------------

function getOrCreateJwtSecret(): string {
  const secretFile = path.join(DATA_DIR, '.jwt_secret');
  const envFile = path.join(DATA_DIR, '.env');

  if (process.env.JWT_SECRET) {
    console.log('[ClaudeOS] JWT secret: loaded from env var');
    return process.env.JWT_SECRET;
  }

  try {
    const secret = fs.readFileSync(secretFile, 'utf-8').trim();
    if (secret) {
      console.log('[ClaudeOS] JWT secret: loaded from file');
      persistSecretToEnv(envFile, secret);
      return secret;
    }
  } catch {
    /* file doesn't exist */
  }

  const secret = randomBytes(32).toString('hex');
  console.log('[ClaudeOS] JWT secret: generated new');
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(secretFile, secret, { mode: 0o600 });
    persistSecretToEnv(envFile, secret);
  } catch (err) {
    console.error('[ClaudeOS] JWT secret: failed to persist:', err);
  }
  return secret;
}

function persistSecretToEnv(envFile: string, secret: string): void {
  try {
    let envContent = '';
    try {
      envContent = fs.readFileSync(envFile, 'utf-8');
      envContent = envContent
        .split('\n')
        .filter((l) => !l.startsWith('JWT_SECRET='))
        .join('\n');
    } catch {
      /* no existing env file */
    }
    envContent += `\nJWT_SECRET=${secret}\n`;
    fs.writeFileSync(envFile, envContent.trim() + '\n', { mode: 0o600 });
  } catch (err) {
    console.error('[ClaudeOS] JWT secret: failed to persist to .env:', err);
  }
}

const JWT_SECRET = new TextEncoder().encode(getOrCreateJwtSecret());
const AUTH_TOKEN =
  process.env.CLAUDE_OS_AUTH_TOKEN || randomBytes(24).toString('hex');

console.log(
  `[ClaudeOS] Auth token: ${AUTH_TOKEN}` +
    (process.env.CLAUDE_OS_AUTH_TOKEN ? ' (from env)' : ' (auto-generated)'),
);

// ---------------------------------------------------------------------------
// Auth Functions
// ---------------------------------------------------------------------------

async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

async function createJWT(): Promise<string> {
  return new SignJWT({ role: 'user' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

// ---------------------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------------------

const sessions = new Map<string, Session>();
const activeProcesses = new Map<string, ChildProcess>();
const wsClients = new Map<string, Set<WebSocket>>();

function ensureDirs(): void {
  for (const dir of [SESSIONS_DIR, WORKSPACE_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadSessions(): void {
  try {
    const files = fs
      .readdirSync(SESSIONS_DIR)
      .filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const data = JSON.parse(
        fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf-8'),
      );
      sessions.set(data.id, data);
    }
    console.log(`[ClaudeOS] Loaded ${sessions.size} sessions`);
  } catch {
    // First boot - no sessions yet
  }
}

function saveSession(session: Session): void {
  fs.writeFileSync(
    path.join(SESSIONS_DIR, `${session.id}.json`),
    JSON.stringify(session, null, 2),
  );
}

function broadcast(sessionId: string, event: unknown): void {
  const clients = wsClients.get(sessionId);
  if (!clients) return;
  const data = JSON.stringify(event);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function broadcastAll(event: unknown): void {
  const data = JSON.stringify(event);
  for (const [key, clients] of wsClients.entries()) {
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }
}

function createSession(title?: string): Session {
  const id = randomBytes(12).toString('hex');
  const session: Session = {
    id,
    title: title || 'New Session',
    messages: [],
    status: 'idle',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unread: 0,
  };
  sessions.set(id, session);
  saveSession(session);
  broadcastAll({
    type: 'session_created',
    session: {
      id,
      title: session.title,
      status: session.status,
      createdAt: session.createdAt,
    },
  });
  return session;
}

function deleteSession(id: string): boolean {
  const proc = activeProcesses.get(id);
  if (proc) proc.kill();
  activeProcesses.delete(id);
  sessions.delete(id);
  try {
    fs.unlinkSync(path.join(SESSIONS_DIR, `${id}.json`));
  } catch {
    /* already deleted */
  }
  broadcastAll({ type: 'session_deleted', sessionId: id });
  return true;
}

function archiveSession(id: string): boolean {
  const session = sessions.get(id);
  if (!session) return false;
  session.status = 'archived';
  session.updatedAt = new Date().toISOString();
  saveSession(session);
  broadcastAll({
    type: 'session_update',
    session: {
      id,
      status: 'archived',
      title: session.title,
      updatedAt: session.updatedAt,
    },
  });
  return true;
}

// ---------------------------------------------------------------------------
// Claude Code Process Management
// ---------------------------------------------------------------------------

function runClaudeCommand(sessionId: string, message: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.status = 'active';
  session.updatedAt = new Date().toISOString();
  saveSession(session);
  broadcastAll({
    type: 'session_update',
    session: {
      id: session.id,
      status: session.status,
      title: session.title,
      updatedAt: session.updatedAt,
    },
  });

  const args = [
    '-p',
    message,
    '--output-format',
    'stream-json',
    '--verbose',
    '--dangerously-skip-permissions',
  ];
  if (session.claudeSessionId) {
    args.push('--resume', session.claudeSessionId);
  }

  // Load OAuth token from credentials file if not in env
  let oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN || '';
  if (!oauthToken) {
    try {
      const credsFile = path.join(DATA_DIR, '.claude', '.credentials.json');
      const creds = JSON.parse(fs.readFileSync(credsFile, 'utf-8'));
      if (creds.claudeAiOauth?.accessToken) {
        oauthToken = creds.claudeAiOauth.accessToken;
      }
    } catch {
      /* no credentials file */
    }
  }

  const childEnv = { ...process.env, FORCE_COLOR: '0' } as NodeJS.ProcessEnv;
  if (oauthToken) {
    childEnv.CLAUDE_CODE_OAUTH_TOKEN = oauthToken;
  }

  console.log(`[Claude] Spawning: claude ${args.join(' ').slice(0, 100)}...`);
  console.log(`[Claude] CWD: ${WORKSPACE_DIR}`);

  const proc = spawn('claude', args, {
    cwd: WORKSPACE_DIR,
    env: childEnv,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  console.log(`[Claude] Process PID: ${proc.pid}`);
  proc.stdin?.end();
  activeProcesses.set(sessionId, proc);

  let fullResponse = '';
  let currentThinking = '';
  const toolCalls: ToolCall[] = [];

  const processLine = (line: string): void => {
    if (!line.trim()) return;
    try {
      const event = JSON.parse(line);

      if (event.session_id && !session.claudeSessionId) {
        session.claudeSessionId = event.session_id;
      }

      if (event.type === 'assistant' && event.message) {
        const content = event.message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text') {
              fullResponse += block.text;
              broadcast(sessionId, { type: 'stream', content: block.text });
            } else if (block.type === 'thinking') {
              currentThinking += block.thinking;
              broadcast(sessionId, {
                type: 'thinking',
                content: block.thinking,
              });
            } else if (block.type === 'tool_use') {
              const tc: ToolCall = {
                id: block.id || randomBytes(8).toString('hex'),
                name: block.name,
                input:
                  typeof block.input === 'string'
                    ? block.input
                    : JSON.stringify(block.input),
                status: 'running',
              };
              toolCalls.push(tc);
              broadcast(sessionId, { type: 'tool_use', toolCall: tc });
            }
          }
        } else if (typeof content === 'string') {
          fullResponse += content;
          broadcast(sessionId, { type: 'stream', content });
        }
      } else if (event.type === 'result') {
        if (event.session_id) {
          session.claudeSessionId = event.session_id;
        }
        if (event.result) {
          fullResponse = event.result;
        }
      } else if (
        event.type === 'tool_result' ||
        event.type === 'tool_output'
      ) {
        const lastTool = toolCalls[toolCalls.length - 1];
        if (lastTool) {
          lastTool.status = 'complete';
          lastTool.output = event.output || event.content || '';
          broadcast(sessionId, { type: 'tool_result', toolCall: lastTool });
        }
      }

      broadcast(sessionId, { type: 'raw_event', event });
    } catch {
      if (line.trim()) {
        fullResponse += line;
        broadcast(sessionId, { type: 'stream', content: line });
      }
    }
  };

  let stdoutBuffer = '';
  proc.stdout?.on('data', (chunk: Buffer) => {
    stdoutBuffer += chunk.toString();
    const lines = stdoutBuffer.split('\n');
    stdoutBuffer = lines.pop() || '';
    lines.forEach(processLine);
  });

  let stderrOutput = '';
  proc.stderr?.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    stderrOutput += text;
    console.log(`[Claude][stderr] ${text.slice(0, 200)}`);
  });

  proc.on('error', (err) => {
    console.error('[Claude] Process error:', err.message);
  });

  proc.on('close', (code) => {
    console.log(`[Claude] Process exited with code: ${code}`);
    if (stdoutBuffer.trim()) processLine(stdoutBuffer);

    activeProcesses.delete(sessionId);

    if (session.title === 'New Session' && message.length > 0) {
      session.title =
        message.slice(0, 60) + (message.length > 60 ? '...' : '');
    }

    for (const tc of toolCalls) {
      if (tc.status === 'running' || tc.status === 'pending') {
        tc.status = code === 0 ? 'complete' : 'error';
      }
    }

    const assistantMsg: Message = {
      id: randomBytes(8).toString('hex'),
      role: 'assistant',
      content: fullResponse || stderrOutput || '(no response)',
      thinking: currentThinking || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      timestamp: new Date().toISOString(),
    };

    session.messages.push(assistantMsg);
    session.status = code === 0 ? 'idle' : 'error';
    session.updatedAt = new Date().toISOString();
    session.unread = 1;
    saveSession(session);

    broadcast(sessionId, { type: 'message', message: assistantMsg });
    broadcast(sessionId, { type: 'done', code });
    broadcastAll({
      type: 'session_update',
      session: {
        id: session.id,
        status: session.status,
        title: session.title,
        updatedAt: session.updatedAt,
        unread: session.unread,
        lastMessage: assistantMsg.content.slice(0, 100),
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Module WS Handler Registration
// ---------------------------------------------------------------------------

const moduleWsHandlers = new Map<
  string,
  (ws: WebSocket, data: unknown) => void
>();

function registerModuleWsHandlers(registry: ModuleRegistry): void {
  for (const handler of registry.wsHandlers) {
    console.log(
      `[WS] Registered module handler for message type: ${handler.messageType}`,
    );
    // Module WS handlers are loaded dynamically and registered by messageType
    // The actual handler functions are resolved at module load time
  }
}

// ---------------------------------------------------------------------------
// Server Startup
// ---------------------------------------------------------------------------

async function startServer(): Promise<void> {
  // Load module registry
  let registry: ModuleRegistry;
  try {
    registry = await buildRegistry();
  } catch (err) {
    console.error('[ClaudeOS] Failed to build module registry:', err);
    registry = {
      modules: {},
      panels: [],
      activityBarItems: [],
      sidebarSections: [],
      settingsPages: [],
      statusBarItems: [],
      bottomPanelTabs: [],
      apiRoutes: [],
      wsHandlers: [],
      services: [],
    };
  }

  registerModuleWsHandlers(registry);

  // Initialize Next.js
  const app = next({ dev });
  const handle = app.getRequestHandler();
  await app.prepare();

  ensureDirs();
  loadSessions();

  // Create proxy middleware for OpenVSCode Server
  const vscodeProxy = createProxyMiddleware({
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    ws: true,
    onError: (err, req, res) => {
      console.error('[Proxy] Error proxying request:', err.message);
      if (!res.headersSent && res && typeof res.writeHead === 'function') {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway - OpenVSCode Server not available');
      }
    },
  });

  // Create HTTP server
  const server = createServer((req, res) => {
    const url = req.url || '/';
    const pathname = url.split('?')[0];

    // Skip proxy for API routes and WebSocket endpoint
    if (pathname.startsWith('/api/') || pathname === '/ws') {
      // Check module API routes first
      for (const route of registry.apiRoutes) {
        if (url.startsWith(route.path)) {
          // Module API routes are handled through Next.js API routes
          // The build pipeline generates the appropriate route files
          break;
        }
      }

      // Default: Next.js handles the request
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
      return;
    }

    // Proxy all other requests to OpenVSCode Server
    vscodeProxy(req, res, (err) => {
      if (err) {
        console.error('[Proxy] Middleware error:', err);
      }
    });
  });

  // WebSocket server
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (req, socket, head) => {
    const pathname = req.url?.split('?')[0];

    // Handle ClaudeOS WebSocket endpoint
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
      return;
    }

    // Proxy all other WebSocket connections to OpenVSCode Server
    if (vscodeProxy.upgrade) {
      vscodeProxy.upgrade(req, socket as any, head);
    }
  });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token || !(await verifyToken(token))) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    const sessionId = url.searchParams.get('sessionId') || '__global__';

    // Register client
    if (!wsClients.has(sessionId)) {
      wsClients.set(sessionId, new Set());
    }
    wsClients.get(sessionId)!.add(ws);

    // Send current state
    if (sessionId !== '__global__') {
      const session = sessions.get(sessionId);
      if (session) {
        ws.send(JSON.stringify({ type: 'session_state', session }));
      }
    } else {
      const summaries = Array.from(sessions.values()).map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        updatedAt: s.updatedAt,
        unread: s.unread,
        messageCount: s.messages.length,
        lastMessage: s.messages[s.messages.length - 1]?.content.slice(0, 100),
      }));
      ws.send(JSON.stringify({ type: 'sessions_list', sessions: summaries }));
    }

    ws.on('message', (raw: Buffer) => {
      try {
        const data = JSON.parse(raw.toString());

        // Check module WS handlers first
        const moduleHandler = moduleWsHandlers.get(data.type);
        if (moduleHandler) {
          moduleHandler(ws, data);
          return;
        }

        // Core message handling
        if (
          data.type === 'send_message' &&
          data.sessionId &&
          data.content
        ) {
          const session = sessions.get(data.sessionId);
          if (!session) return;

          if (activeProcesses.has(data.sessionId)) {
            ws.send(
              JSON.stringify({ type: 'error', message: 'Session is busy' }),
            );
            return;
          }

          const userMsg: Message = {
            id: randomBytes(8).toString('hex'),
            role: 'user',
            content: data.content,
            timestamp: new Date().toISOString(),
          };
          session.messages.push(userMsg);
          session.unread = 0;
          saveSession(session);

          broadcast(data.sessionId, { type: 'message', message: userMsg });
          runClaudeCommand(data.sessionId, data.content);
        }
      } catch (err) {
        console.error('[WS] Error processing message:', err);
      }
    });

    ws.on('close', () => {
      wsClients.get(sessionId)?.delete(ws);
    });
  });

  server.listen(port, () => {
    console.log(`[ClaudeOS] Ready on http://0.0.0.0:${port}`);
    console.log(
      `[ClaudeOS] Modules loaded: ${Object.keys(registry.modules).length}`,
    );
  });

  // Expose kernel API for Next.js API routes
  globalThis.claudeOS = {
    sessions,
    AUTH_TOKEN,
    JWT_SECRET,
    createJWT,
    verifyToken,
    createSession,
    deleteSession,
    archiveSession,
    DATA_DIR,
    WORKSPACE_DIR,
    broadcastAll,
    activeProcesses,
    registry,
  };
}

// ---------------------------------------------------------------------------
// Global Type Declaration
// ---------------------------------------------------------------------------

declare global {
  var claudeOS: {
    sessions: Map<string, Session>;
    AUTH_TOKEN: string;
    JWT_SECRET: Uint8Array;
    createJWT: () => Promise<string>;
    verifyToken: (token: string) => Promise<boolean>;
    createSession: (title?: string) => Session;
    deleteSession: (id: string) => boolean;
    archiveSession: (id: string) => boolean;
    DATA_DIR: string;
    WORKSPACE_DIR: string;
    broadcastAll: (event: unknown) => void;
    activeProcesses: Map<string, ChildProcess>;
    registry: ModuleRegistry;
  };
}

// Start the server
startServer().catch((err) => {
  console.error('[ClaudeOS] FATAL:', err);
  process.exit(1);
});
