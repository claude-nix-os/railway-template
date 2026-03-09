/**
 * TypeScript type definitions for Browser Sessions extension
 */

// ---------------------------------------------------------------------------
// Browser Session Types (matching backend API)
// ---------------------------------------------------------------------------

export type SessionState = 'active' | 'idle' | 'closed';

export interface BrowserSessionConfig {
  headless?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  screenshotInterval?: number;
  userAgent?: string;
  recordVideo?: boolean;
}

export interface BrowserSession {
  id: string;
  state: SessionState;
  config: BrowserSessionConfig;
  currentUrl: string | null;
  createdAt: string;
  lastActivityAt: string;
  screenshotCount: number;
  controlledBy?: string;
}

export interface Screenshot {
  id: string;
  sessionId: string;
  timestamp: string;
  url: string;
  filePath: string;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// API Request/Response Types
// ---------------------------------------------------------------------------

export interface CreateSessionRequest {
  config?: BrowserSessionConfig;
}

export interface CreateSessionResponse {
  session: BrowserSession;
}

export interface ListSessionsResponse {
  sessions: BrowserSession[];
}

export interface NavigateRequest {
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

export interface NavigateResponse {
  success: boolean;
  url: string;
  screenshot?: Screenshot;
}

export interface ScreenshotRequest {
  fullPage?: boolean;
}

export interface ScreenshotResponse {
  screenshot: Screenshot;
}

export interface ControlRequest {
  action: 'take' | 'release';
  userId: string;
}

export interface ControlResponse {
  success: boolean;
  controlledBy?: string;
}

// ---------------------------------------------------------------------------
// WebSocket Message Types
// ---------------------------------------------------------------------------

export interface WsScreenshotMessage {
  type: 'browser:screenshot';
  sessionId: string;
  screenshot: Screenshot;
}

export interface WsInteractionMessage {
  type: 'browser:interaction';
  sessionId: string;
  action: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export type WsBrowserMessage = WsScreenshotMessage | WsInteractionMessage;

// ---------------------------------------------------------------------------
// Extension Message Types (Extension ↔ Webview)
// ---------------------------------------------------------------------------

// Extension → Webview
export type ToWebviewMessage =
  | { type: 'sessionsUpdate'; data: BrowserSession[] }
  | { type: 'screenshotUpdate'; data: { sessionId: string; imageData: string; timestamp: number } }
  | { type: 'controlStatus'; data: { sessionId: string; controlledBy: string | null } }
  | { type: 'connectionStatus'; data: { connected: boolean } }
  | { type: 'error'; data: { message: string } };

// Webview → Extension
export type FromWebviewMessage =
  | { type: 'ready' }
  | { type: 'createSession'; data: { url?: string; headless?: boolean } }
  | { type: 'openSession'; data: { sessionId: string } }
  | { type: 'closeSession'; data: { sessionId: string } }
  | { type: 'takeControl'; data: { sessionId: string } }
  | { type: 'handOffControl'; data: { sessionId: string } }
  | { type: 'navigate'; data: { sessionId: string; url: string } }
  | { type: 'scrubToFrame'; data: { sessionId: string; frameIndex: number } }
  | { type: 'exportSession'; data: { sessionId: string } }
  | { type: 'refreshSessions' };

// ---------------------------------------------------------------------------
// View State Types (for webview)
// ---------------------------------------------------------------------------

export type ViewMode = 'grid' | 'detail';

export interface ViewState {
  mode: ViewMode;
  selectedSessionId: string | null;
  selectedFrameIndex: number;
  isPlaying: boolean;
}

export interface SessionAction {
  type: 'navigate' | 'click' | 'type' | 'screenshot';
  timestamp: string;
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Connection Status
// ---------------------------------------------------------------------------

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';
