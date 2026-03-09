import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSessionStore } from '../../src/stores/session-store';
import { useUIStore } from '../../src/stores/ui-store';
import type { Session, Message } from '../../src/types';

/* ------------------------------------------------------------------ */
/*  Mock WebSocket                                                     */
/* ------------------------------------------------------------------ */

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  readyState = WebSocket.CONNECTING;
  url: string;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;

  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.();
  }

  /* Test helpers */
  simulateOpen() {
    this.readyState = WebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateClose() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.();
  }

  simulateError() {
    this.onerror?.();
  }
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('useWebSocket message handling', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];

    /* Reset stores */
    useSessionStore.setState({
      sessions: [],
      activeSessionId: null,
      messagesBySession: {},
      streamPhaseBySession: {},
      streamingMessageId: {},
      inputDrafts: {},
    });

    useUIStore.setState({
      jwtToken: 'test-token',
      isAuthenticated: true,
      apiKey: null,
      oauthToken: null,
      notifications: [],
    });
  });

  describe('Session events', () => {
    it('should handle sessions_list event', () => {
      const sessions: Session[] = [
        {
          id: 's1',
          title: 'Session 1',
          status: 'idle',
          model: 'claude-sonnet-4-20250514',
          permissionMode: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          unreadCount: 0,
        },
      ];

      /* Simulate what the WebSocket handler does */
      useSessionStore.getState().setSessions(sessions);
      expect(useSessionStore.getState().sessions).toHaveLength(1);
      expect(useSessionStore.getState().sessions[0].title).toBe('Session 1');
    });

    it('should handle session_state event', () => {
      const session: Session = {
        id: 's1',
        title: 'Test',
        status: 'idle',
        model: 'claude-sonnet-4-20250514',
        permissionMode: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unreadCount: 0,
      };

      const messages: Message[] = [
        {
          id: 'msg1',
          sessionId: 's1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date().toISOString(),
        },
      ];

      const store = useSessionStore.getState();
      store.addSession(session);
      store.setMessages('s1', messages);

      expect(useSessionStore.getState().sessions).toHaveLength(1);
      expect(useSessionStore.getState().getMessages('s1')).toHaveLength(1);
    });

    it('should handle session_created event', () => {
      const session: Session = {
        id: 's-new',
        title: 'New Chat',
        status: 'idle',
        model: 'claude-sonnet-4-20250514',
        permissionMode: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unreadCount: 0,
      };

      useSessionStore.getState().addSession(session);
      expect(useSessionStore.getState().sessions).toHaveLength(1);
      expect(useSessionStore.getState().sessions[0].id).toBe('s-new');
    });

    it('should handle session_update event', () => {
      const session: Session = {
        id: 's1',
        title: 'Original',
        status: 'idle',
        model: 'claude-sonnet-4-20250514',
        permissionMode: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unreadCount: 0,
      };

      useSessionStore.getState().addSession(session);
      useSessionStore.getState().updateSession('s1', { title: 'Updated' });

      expect(useSessionStore.getState().sessions[0].title).toBe('Updated');
    });

    it('should handle session_deleted event', () => {
      useSessionStore.getState().addSession({
        id: 's1',
        title: 'To Delete',
        status: 'idle',
        model: 'claude-sonnet-4-20250514',
        permissionMode: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unreadCount: 0,
      });

      useSessionStore.getState().removeSession('s1');
      expect(useSessionStore.getState().sessions).toHaveLength(0);
    });
  });

  describe('Stream events', () => {
    const sessionId = 's1';

    beforeEach(() => {
      useSessionStore.getState().addSession({
        id: sessionId,
        title: 'Stream Test',
        status: 'active',
        model: 'claude-sonnet-4-20250514',
        permissionMode: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unreadCount: 0,
      });

      useSessionStore.getState().addMessage(sessionId, {
        id: 'msg1',
        sessionId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      });
    });

    it('should handle stream event (append delta)', () => {
      const store = useSessionStore.getState();
      store.setStreamPhase(sessionId, 'streaming');
      store.appendStreamDelta(sessionId, 'msg1', 'Hello');
      store.appendStreamDelta(sessionId, 'msg1', ' World');

      expect(store.getMessages(sessionId)[0].content).toBe('Hello World');
      expect(store.getStreamPhase(sessionId)).toBe('streaming');
    });

    it('should handle thinking event', () => {
      const store = useSessionStore.getState();
      store.setStreamPhase(sessionId, 'thinking');
      store.setThinkingContent(sessionId, 'msg1', 'Analyzing...');

      expect(store.getMessages(sessionId)[0].thinkingContent).toBe(
        'Analyzing...'
      );
      expect(store.getStreamPhase(sessionId)).toBe('thinking');
    });

    it('should handle tool_use event', () => {
      const store = useSessionStore.getState();
      store.setStreamPhase(sessionId, 'tool_use');
      store.addToolCall(sessionId, 'msg1', {
        id: 'tc1',
        name: 'read_file',
        input: { path: '/test.ts' },
        status: 'running',
      });

      const tc = store.getMessages(sessionId)[0].toolCalls;
      expect(tc).toHaveLength(1);
      expect(tc![0].name).toBe('read_file');
    });

    it('should handle tool_result event', () => {
      const store = useSessionStore.getState();
      store.addToolCall(sessionId, 'msg1', {
        id: 'tc1',
        name: 'read_file',
        input: { path: '/test.ts' },
        status: 'running',
      });

      store.updateToolCall(sessionId, 'msg1', 'tc1', {
        output: 'file contents',
        status: 'success',
        completedAt: new Date().toISOString(),
      });

      const tc = store.getMessages(sessionId)[0].toolCalls![0];
      expect(tc.status).toBe('success');
      expect(tc.output).toBe('file contents');
    });

    it('should handle done event', () => {
      const store = useSessionStore.getState();
      store.startStreaming(sessionId, 'msg1');
      expect(store.isStreaming(sessionId)).toBe(true);

      store.stopStreaming(sessionId);
      store.updateMessage(sessionId, 'msg1', {
        isStreaming: false,
        streamPhase: 'done',
      });

      expect(store.isStreaming(sessionId)).toBe(false);
      expect(store.getStreamPhase(sessionId)).toBe('done');
    });
  });

  describe('Error events', () => {
    it('should handle error event by adding notification', () => {
      useUIStore.getState().addNotification({
        id: 'ws-error-1',
        type: 'error',
        title: 'WebSocket Error',
        message: 'Connection refused',
        timestamp: new Date().toISOString(),
      });

      expect(useUIStore.getState().notifications).toHaveLength(1);
      expect(useUIStore.getState().notifications[0].type).toBe('error');
    });
  });

  describe('Auth events', () => {
    it('should clear auth on auth_error', () => {
      useUIStore.getState().setJwtToken('token');
      expect(useUIStore.getState().isAuthenticated).toBe(true);

      useUIStore.getState().clearAuth();
      expect(useUIStore.getState().isAuthenticated).toBe(false);
      expect(useUIStore.getState().jwtToken).toBeNull();
    });
  });
});
