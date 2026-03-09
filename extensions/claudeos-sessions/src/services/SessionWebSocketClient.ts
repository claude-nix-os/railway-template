import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import type { Session } from '../types';

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];
const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 10000;

/* ------------------------------------------------------------------ */
/*  Connection Status                                                  */
/* ------------------------------------------------------------------ */

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

/* ------------------------------------------------------------------ */
/*  WebSocket Event Types                                              */
/* ------------------------------------------------------------------ */

export type WSEventType =
  | 'sessions_list'
  | 'session_created'
  | 'session_update'
  | 'session_deleted'
  | 'session_rename'
  | 'session_archive'
  | 'session_restore'
  | 'session_delete'
  | 'error'
  | 'ping'
  | 'pong';

export interface WSEvent {
  type: WSEventType;
  sessionId?: string;
  data?: unknown;
  timestamp?: string;
}

export interface WSSessionsListEvent extends WSEvent {
  type: 'sessions_list';
  data: {
    sessions: Session[];
  };
}

export interface WSSessionCreatedEvent extends WSEvent {
  type: 'session_created';
  data: {
    session: Session;
  };
}

export interface WSSessionUpdatedEvent extends WSEvent {
  type: 'session_update';
  sessionId: string;
  data: {
    session: Session;
  };
}

export interface WSSessionDeletedEvent extends WSEvent {
  type: 'session_deleted';
  sessionId: string;
  data?: {
    sessionId: string;
  };
}

export interface WSErrorEvent extends WSEvent {
  type: 'error';
  data: {
    message: string;
    code?: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Event Emitter Interface                                            */
/* ------------------------------------------------------------------ */

export interface SessionWebSocketClientEvents {
  sessions: (sessions: Session[]) => void;
  sessionCreated: (session: Session) => void;
  sessionUpdated: (session: Session) => void;
  sessionDeleted: (sessionId: string) => void;
  status: (status: ConnectionStatus) => void;
  error: (error: Error | string) => void;
}

/* ------------------------------------------------------------------ */
/*  WebSocket Client                                                   */
/* ------------------------------------------------------------------ */

/**
 * WebSocket client for managing ClaudeOS session updates
 *
 * Connects to the kernel server WebSocket endpoint and listens for
 * session lifecycle events (created, updated, deleted).
 *
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Heartbeat/ping-pong to detect dead connections
 * - Type-safe event emitter pattern
 * - Session management operations (rename, archive, restore, delete)
 */
export class SessionWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private currentUrl: string | null = null;
  private autoReconnect = true;

  constructor() {
    super();
  }

  /* ------------------------------------------------------------------ */
  /*  Connection Management                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Connect to the WebSocket server
   *
   * @param url WebSocket URL (e.g., ws://localhost:3000/ws)
   */
  connect(url: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.currentUrl = url;
    this.autoReconnect = true;
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(url);

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
      this.connect(this.currentUrl);
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
  private send(event: WSEvent): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    } else {
      this.emit('error', new Error('WebSocket is not connected'));
    }
  }

  /**
   * Request the list of all sessions
   */
  requestSessionList(): void {
    this.send({ type: 'sessions_list' });
  }

  /**
   * Rename a session
   *
   * @param id Session ID
   * @param name New session name
   */
  renameSession(id: string, name: string): void {
    this.send({
      type: 'session_rename',
      sessionId: id,
      data: { name },
    });
  }

  /**
   * Archive a session
   *
   * @param id Session ID
   */
  archiveSession(id: string): void {
    this.send({
      type: 'session_archive',
      sessionId: id,
    });
  }

  /**
   * Restore an archived session (change archived back to idle)
   *
   * @param id Session ID
   */
  restoreSession(id: string): void {
    this.send({
      type: 'session_restore',
      sessionId: id,
    });
  }

  /**
   * Delete a session permanently
   *
   * @param id Session ID
   */
  deleteSession(id: string): void {
    this.send({
      type: 'session_delete',
      sessionId: id,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Event Handlers                                                     */
  /* ------------------------------------------------------------------ */

  private handleOpen(): void {
    this.setStatus('connected');
    this.reconnectAttempt = 0;
    this.startHeartbeat();

    // Request initial session list on connect
    this.requestSessionList();
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
      case 'sessions_list': {
        const sessionsEvent = event as WSSessionsListEvent;
        const sessions = sessionsEvent.data?.sessions || [];
        this.emit('sessions', sessions);
        break;
      }

      case 'session_created': {
        const createdEvent = event as WSSessionCreatedEvent;
        if (createdEvent.data?.session) {
          this.emit('sessionCreated', createdEvent.data.session);
        }
        break;
      }

      case 'session_update': {
        const updatedEvent = event as WSSessionUpdatedEvent;
        if (updatedEvent.data?.session) {
          this.emit('sessionUpdated', updatedEvent.data.session);
        }
        break;
      }

      case 'session_deleted': {
        const deletedEvent = event as WSSessionDeletedEvent;
        const sessionId = deletedEvent.sessionId || deletedEvent.data?.sessionId;
        if (sessionId) {
          this.emit('sessionDeleted', sessionId);
        }
        break;
      }

      case 'error': {
        const errorEvent = event as WSErrorEvent;
        const errorMessage = errorEvent.data?.message || 'An unknown error occurred';
        this.emit('error', errorMessage);
        break;
      }

      default:
        // Ignore unknown event types
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
        this.connect(this.currentUrl);
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
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
  }

  /* ------------------------------------------------------------------ */
  /*  TypeScript EventEmitter Type Overrides                            */
  /* ------------------------------------------------------------------ */

  on<K extends keyof SessionWebSocketClientEvents>(
    event: K,
    listener: SessionWebSocketClientEvents[K]
  ): this {
    return super.on(event, listener as (...args: any[]) => void);
  }

  once<K extends keyof SessionWebSocketClientEvents>(
    event: K,
    listener: SessionWebSocketClientEvents[K]
  ): this {
    return super.once(event, listener as (...args: any[]) => void);
  }

  off<K extends keyof SessionWebSocketClientEvents>(
    event: K,
    listener: SessionWebSocketClientEvents[K]
  ): this {
    return super.off(event, listener as (...args: any[]) => void);
  }

  emit<K extends keyof SessionWebSocketClientEvents>(
    event: K,
    ...args: Parameters<SessionWebSocketClientEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
