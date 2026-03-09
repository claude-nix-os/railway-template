import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import type {
  WSEvent,
  WSStreamEvent,
  WSThinkingEvent,
  WSToolUseEvent,
  WSToolResultEvent,
  WSSessionStateEvent,
  WSSessionsListEvent,
  WSDoneEvent,
  WSMessageEvent,
  ConnectionStatus,
} from '../types';

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];
const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 10000;

/* ------------------------------------------------------------------ */
/*  Event Types                                                        */
/* ------------------------------------------------------------------ */

export interface WebSocketClientEvents {
  message: (event: WSMessageEvent) => void;
  stream: (event: WSStreamEvent) => void;
  thinking: (event: WSThinkingEvent) => void;
  tool_use: (event: WSToolUseEvent) => void;
  tool_result: (event: WSToolResultEvent) => void;
  session_state: (event: WSSessionStateEvent) => void;
  sessions_list: (event: WSSessionsListEvent) => void;
  session_created: (event: WSEvent) => void;
  session_update: (event: WSEvent) => void;
  session_deleted: (event: WSEvent) => void;
  done: (event: WSDoneEvent) => void;
  status: (status: ConnectionStatus) => void;
  error: (error: Error | string) => void;
  auth_success: () => void;
  auth_error: () => void;
  raw_event: (event: WSEvent) => void;
}

/* ------------------------------------------------------------------ */
/*  WebSocket Client                                                   */
/* ------------------------------------------------------------------ */

/**
 * WebSocket client for connecting to the ClaudeOS kernel server
 *
 * Based on the React useWebSocket hook but adapted for use in VS Code extensions.
 * Uses EventEmitter pattern instead of React hooks.
 */
export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private subscribedSessions: Set<string> = new Set();
  private currentUrl: string | null = null;
  private currentToken: string | undefined = undefined;
  private autoReconnect = true;

  constructor() {
    super();
  }

  /* ------------------------------------------------------------------ */
  /*  Connection Management                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Connect to the WebSocket server
   */
  connect(url: string, token?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.currentUrl = url;
    this.currentToken = token;
    this.autoReconnect = true;
    this.setStatus('connecting');

    const wsUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => this.handleOpen());
      this.ws.on('message', (data: WebSocket.Data) => this.handleMessage(data));
      this.ws.on('close', () => this.handleClose());
      this.ws.on('error', (error: Error) => this.handleError(error));
    } catch (error) {
      this.setStatus('error');
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.autoReconnect = false;
    this.clearReconnectTimer();
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /**
   * Reconnect to the WebSocket server
   */
  reconnect(): void {
    this.disconnect();
    this.reconnectAttempt = 0;

    if (this.currentUrl) {
      this.connect(this.currentUrl, this.currentToken);
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  /* ------------------------------------------------------------------ */
  /*  Message Sending                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Send a WebSocket event
   */
  send(event: WSEvent): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    } else {
      this.emit('error', new Error('WebSocket is not connected'));
    }
  }

  /**
   * Subscribe to session updates
   */
  subscribe(sessionId: string): void {
    this.subscribedSessions.add(sessionId);
    this.send({ type: 'session_state', sessionId } as WSEvent);
  }

  /**
   * Unsubscribe from session updates
   */
  unsubscribe(sessionId: string): void {
    this.subscribedSessions.delete(sessionId);
    this.send({
      type: 'session_state',
      sessionId,
      data: { action: 'unsubscribe' },
    } as WSEvent);
  }

  /**
   * Send a message to a session
   */
  sendMessage(sessionId: string, content: string): void {
    this.send({
      type: 'message',
      sessionId,
      data: { content },
    } as WSEvent);
  }

  /**
   * Request the list of sessions
   */
  requestSessionList(): void {
    this.send({ type: 'sessions_list' } as WSEvent);
  }

  /* ------------------------------------------------------------------ */
  /*  Event Handlers                                                     */
  /* ------------------------------------------------------------------ */

  private handleOpen(): void {
    // Auth happens via token in URL or via first message
    if (!this.currentToken) {
      this.setStatus('connected');
      this.reconnectAttempt = 0;
    }
    this.startHeartbeat();
  }

  private handleMessage(data: WebSocket.Data): void {
    let parsed: WSEvent;
    try {
      parsed = JSON.parse(data.toString());
    } catch {
      return;
    }

    // Reset heartbeat timeout on any message
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }

    // Handle pong
    if (parsed.type === 'pong') {
      return;
    }

    this.processEvent(parsed);
  }

  private handleClose(): void {
    this.setStatus('disconnected');
    this.stopHeartbeat();

    if (this.autoReconnect) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Error): void {
    this.setStatus('error');
    this.emit('error', error);
  }

  /* ------------------------------------------------------------------ */
  /*  Event Processing                                                   */
  /* ------------------------------------------------------------------ */

  private processEvent(event: WSEvent): void {
    switch (event.type) {
      case 'auth_success':
        this.setStatus('connected');
        this.reconnectAttempt = 0;
        this.resubscribeToSessions();
        this.emit('auth_success');
        break;

      case 'auth_error':
        this.setStatus('error');
        this.emit('auth_error');
        break;

      case 'sessions_list':
        this.emit('sessions_list', event as WSSessionsListEvent);
        break;

      case 'session_state':
        this.emit('session_state', event as WSSessionStateEvent);
        break;

      case 'session_created':
        this.emit('session_created', event);
        break;

      case 'session_update':
        this.emit('session_update', event);
        break;

      case 'session_deleted':
        this.emit('session_deleted', event);
        break;

      case 'message':
        this.emit('message', event as WSMessageEvent);
        break;

      case 'stream':
        this.emit('stream', event as WSStreamEvent);
        break;

      case 'thinking':
        this.emit('thinking', event as WSThinkingEvent);
        break;

      case 'tool_use':
        this.emit('tool_use', event as WSToolUseEvent);
        break;

      case 'tool_result':
        this.emit('tool_result', event as WSToolResultEvent);
        break;

      case 'done':
        this.emit('done', event as WSDoneEvent);
        break;

      case 'error':
        const errorData = event.data as { message?: string } | undefined;
        this.emit('error', errorData?.message ?? 'An unknown error occurred');
        break;

      case 'raw_event':
        this.emit('raw_event', event);
        break;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Heartbeat                                                          */
  /* ------------------------------------------------------------------ */

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));

        this.heartbeatTimeoutTimer = setTimeout(() => {
          // No pong received, connection may be dead
          this.ws?.close();
        }, HEARTBEAT_TIMEOUT);
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Reconnection                                                       */
  /* ------------------------------------------------------------------ */

  private scheduleReconnect(): void {
    this.clearReconnectTimer();

    const delay =
      RECONNECT_DELAYS[
        Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)
      ];

    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      if (this.currentUrl && this.autoReconnect) {
        this.connect(this.currentUrl, this.currentToken);
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private resubscribeToSessions(): void {
    this.subscribedSessions.forEach((sessionId) => {
      this.ws?.send(
        JSON.stringify({ type: 'session_state', sessionId })
      );
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Status Management                                                  */
  /* ------------------------------------------------------------------ */

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.emit('status', status);
  }

  /* ------------------------------------------------------------------ */
  /*  Cleanup                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Clean up resources and disconnect
   */
  dispose(): void {
    this.disconnect();
    this.removeAllListeners();
    this.subscribedSessions.clear();
  }

  /* ------------------------------------------------------------------ */
  /*  TypeScript EventEmitter Type Overrides                            */
  /* ------------------------------------------------------------------ */

  on<K extends keyof WebSocketClientEvents>(
    event: K,
    listener: WebSocketClientEvents[K]
  ): this {
    return super.on(event, listener as (...args: any[]) => void);
  }

  once<K extends keyof WebSocketClientEvents>(
    event: K,
    listener: WebSocketClientEvents[K]
  ): this {
    return super.once(event, listener as (...args: any[]) => void);
  }

  off<K extends keyof WebSocketClientEvents>(
    event: K,
    listener: WebSocketClientEvents[K]
  ): this {
    return super.off(event, listener as (...args: any[]) => void);
  }

  emit<K extends keyof WebSocketClientEvents>(
    event: K,
    ...args: Parameters<WebSocketClientEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
