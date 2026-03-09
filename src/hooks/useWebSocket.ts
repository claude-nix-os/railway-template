import { useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useUIStore } from '@/stores/ui-store';
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
  Message,
  Session,
} from '@/types';

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];
const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 10000;

export interface UseWebSocketOptions {
  url: string;
  enabled?: boolean;
  onStatusChange?: (status: ConnectionStatus) => void;
}

export interface UseWebSocketReturn {
  send: (event: WSEvent) => void;
  subscribe: (sessionId: string) => void;
  unsubscribe: (sessionId: string) => void;
  sendMessage: (sessionId: string, content: string) => void;
  requestSessionList: () => void;
  status: ConnectionStatus;
  disconnect: () => void;
  reconnect: () => void;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useWebSocket({
  url,
  enabled = true,
  onStatusChange,
}: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const statusRef = useRef<ConnectionStatus>('disconnected');
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscribedSessionsRef = useRef<Set<string>>(new Set());

  const setStatus = useCallback(
    (status: ConnectionStatus) => {
      statusRef.current = status;
      onStatusChange?.(status);
    },
    [onStatusChange]
  );

  /* ---- Message handler ---- */

  const handleMessage = useCallback((event: MessageEvent) => {
    let parsed: WSEvent;
    try {
      parsed = JSON.parse(event.data);
    } catch {
      return;
    }

    const store = useSessionStore.getState();

    switch (parsed.type) {
      case 'auth_success': {
        setStatus('connected');
        reconnectAttemptRef.current = 0;
        /* Re-subscribe to sessions */
        subscribedSessionsRef.current.forEach((sid) => {
          wsRef.current?.send(
            JSON.stringify({ type: 'subscribe', sessionId: sid })
          );
        });
        break;
      }

      case 'auth_error': {
        setStatus('error');
        useUIStore.getState().clearAuth();
        break;
      }

      case 'sessions_list': {
        const listEvent = parsed as WSSessionsListEvent;
        const sessions = listEvent.data?.sessions ?? [];
        store.setSessions(sessions as Session[]);
        break;
      }

      case 'session_state': {
        const stateEvent = parsed as WSSessionStateEvent;
        if (stateEvent.data) {
          const { session, messages } = stateEvent.data;
          if (session) store.addSession(session as Session);
          if (messages && stateEvent.sessionId) {
            store.setMessages(stateEvent.sessionId, messages as Message[]);
          }
        }
        break;
      }

      case 'session_created': {
        const sessionData = (parsed.data as { session?: Session })?.session;
        if (sessionData) {
          store.addSession(sessionData);
        }
        break;
      }

      case 'session_update': {
        if (parsed.sessionId && parsed.data) {
          store.updateSession(
            parsed.sessionId,
            parsed.data as Partial<Session>
          );
        }
        break;
      }

      case 'session_deleted': {
        if (parsed.sessionId) {
          store.removeSession(parsed.sessionId);
        }
        break;
      }

      case 'message': {
        const msgEvent = parsed as WSMessageEvent;
        if (msgEvent.sessionId && msgEvent.data?.message) {
          store.addMessage(
            msgEvent.sessionId,
            msgEvent.data.message as Message
          );
        }
        break;
      }

      case 'stream': {
        const streamEvent = parsed as WSStreamEvent;
        if (streamEvent.sessionId && streamEvent.data) {
          const { messageId, delta } = streamEvent.data;
          store.setStreamPhase(streamEvent.sessionId, 'streaming');
          store.appendStreamDelta(streamEvent.sessionId, messageId, delta);
        }
        break;
      }

      case 'thinking': {
        const thinkEvent = parsed as WSThinkingEvent;
        if (thinkEvent.sessionId && thinkEvent.data) {
          const { messageId, content } = thinkEvent.data;
          store.setStreamPhase(thinkEvent.sessionId, 'thinking');
          store.setThinkingContent(thinkEvent.sessionId, messageId, content);
        }
        break;
      }

      case 'tool_use': {
        const toolEvent = parsed as WSToolUseEvent;
        if (toolEvent.sessionId && toolEvent.data) {
          const { messageId, toolCall } = toolEvent.data;
          store.setStreamPhase(toolEvent.sessionId, 'tool_use');
          store.addToolCall(toolEvent.sessionId, messageId, toolCall);
        }
        break;
      }

      case 'tool_result': {
        const resultEvent = parsed as WSToolResultEvent;
        if (resultEvent.sessionId && resultEvent.data) {
          const { messageId, toolCallId, output, status } = resultEvent.data;
          store.updateToolCall(
            resultEvent.sessionId,
            messageId,
            toolCallId,
            {
              output,
              status,
              completedAt: new Date().toISOString(),
            }
          );
        }
        break;
      }

      case 'done': {
        const doneEvent = parsed as WSDoneEvent;
        if (doneEvent.sessionId) {
          store.stopStreaming(doneEvent.sessionId);
          if (doneEvent.data?.messageId) {
            store.updateMessage(
              doneEvent.sessionId,
              doneEvent.data.messageId,
              { isStreaming: false, streamPhase: 'done' }
            );
          }
        }
        break;
      }

      case 'error': {
        const errorData = parsed.data as { message?: string } | undefined;
        useUIStore.getState().addNotification({
          id: `ws-error-${Date.now()}`,
          type: 'error',
          title: 'WebSocket Error',
          message: errorData?.message ?? 'An unknown error occurred',
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'raw_event': {
        /* Raw events are forwarded without processing */
        break;
      }
    }
  }, [setStatus]);

  /* ---- Heartbeat ---- */

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);

    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));

        heartbeatTimeoutRef.current = setTimeout(() => {
          /* No pong received, connection may be dead */
          wsRef.current?.close();
        }, HEARTBEAT_TIMEOUT);
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  /* ---- Connect ---- */

  const connect = useCallback(() => {
    if (!enabled) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');

    const token = useUIStore.getState().jwtToken;
    const wsUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      /* Auth happens via token in URL or via first message */
      if (!token) {
        setStatus('connected');
        reconnectAttemptRef.current = 0;
      }
      startHeartbeat();
    };

    ws.onmessage = (event) => {
      /* Reset heartbeat timeout on any message */
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = null;
      }

      /* Handle pong */
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') return;
      } catch {
        /* Not JSON, ignore */
      }

      handleMessage(event);
    };

    ws.onclose = () => {
      setStatus('disconnected');
      stopHeartbeat();
      scheduleReconnect();
    };

    ws.onerror = () => {
      setStatus('error');
    };

    wsRef.current = ws;
  }, [url, enabled, handleMessage, setStatus, startHeartbeat, stopHeartbeat]);

  /* ---- Reconnect ---- */

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    const delay =
      RECONNECT_DELAYS[
        Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)
      ];
    reconnectAttemptRef.current += 1;
    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  /* ---- Disconnect ---- */

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    stopHeartbeat();
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  }, [stopHeartbeat, setStatus]);

  /* ---- Public API ---- */

  const send = useCallback((event: WSEvent) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  const subscribe = useCallback(
    (sessionId: string) => {
      subscribedSessionsRef.current.add(sessionId);
      send({ type: 'session_state', sessionId } as WSEvent);
    },
    [send]
  );

  const unsubscribe = useCallback(
    (sessionId: string) => {
      subscribedSessionsRef.current.delete(sessionId);
      send({
        type: 'session_state',
        sessionId,
        data: { action: 'unsubscribe' },
      } as WSEvent);
    },
    [send]
  );

  const sendMessage = useCallback(
    (sessionId: string, content: string) => {
      send({
        type: 'message',
        sessionId,
        data: { content },
      } as WSEvent);
    },
    [send]
  );

  const requestSessionList = useCallback(() => {
    send({ type: 'sessions_list' } as WSEvent);
  }, [send]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptRef.current = 0;
    connect();
  }, [disconnect, connect]);

  /* ---- Lifecycle ---- */

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    send,
    subscribe,
    unsubscribe,
    sendMessage,
    requestSessionList,
    status: statusRef.current,
    disconnect,
    reconnect,
  };
}
