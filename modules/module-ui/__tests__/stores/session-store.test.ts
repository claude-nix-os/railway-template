import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '../../src/stores/session-store';
import type { SessionStoreState } from '../../src/stores/session-store';
import type { Session, Message, ToolCall } from '../../src/types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getState(): SessionStoreState {
  return useSessionStore.getState();
}

function resetStore() {
  useSessionStore.setState({
    sessions: [],
    activeSessionId: null,
    messagesBySession: {},
    streamPhaseBySession: {},
    streamingMessageId: {},
    inputDrafts: {},
  });
}

function createTestSession(overrides?: Partial<Session>): Session {
  return {
    id: `session-${Date.now()}`,
    title: 'Test Session',
    status: 'idle',
    model: 'claude-sonnet-4-20250514',
    permissionMode: 'default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 0,
    ...overrides,
  };
}

function createTestMessage(
  sessionId: string,
  overrides?: Partial<Message>
): Message {
  return {
    id: `msg-${Date.now()}`,
    sessionId,
    role: 'user',
    content: 'Test message',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('session-store', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('Session operations', () => {
    it('should start with empty sessions', () => {
      expect(getState().sessions).toEqual([]);
      expect(getState().activeSessionId).toBeNull();
    });

    it('should create a session', () => {
      const sessionId = getState().createSession({
        title: 'My Chat',
        model: 'claude-opus-4-6',
      });

      const state = getState();
      expect(state.sessions).toHaveLength(1);
      expect(state.activeSessionId).toBe(sessionId);
      expect(state.sessions[0].title).toBe('My Chat');
      expect(state.sessions[0].model).toBe('claude-opus-4-6');
      expect(state.sessions[0].status).toBe('idle');
      expect(state.messagesBySession[sessionId]).toEqual([]);
      expect(state.streamPhaseBySession[sessionId]).toBe('idle');
    });

    it('should create a session with defaults', () => {
      const sessionId = getState().createSession();

      const session = getState().sessions[0];
      expect(session.title).toBe('New Session');
      expect(session.model).toBe('claude-sonnet-4-20250514');
      expect(session.permissionMode).toBe('default');
    });

    it('should set sessions list', () => {
      const sessions = [
        createTestSession({ id: 's1', title: 'Session 1' }),
        createTestSession({ id: 's2', title: 'Session 2' }),
      ];

      getState().setSessions(sessions);
      expect(getState().sessions).toHaveLength(2);
    });

    it('should add a session (prepending)', () => {
      const s1 = createTestSession({ id: 's1' });
      const s2 = createTestSession({ id: 's2' });

      getState().addSession(s1);
      getState().addSession(s2);

      expect(getState().sessions[0].id).toBe('s2');
      expect(getState().sessions[1].id).toBe('s1');
    });

    it('should update a session', () => {
      const s = createTestSession({ id: 's1', title: 'Original' });
      getState().addSession(s);

      getState().updateSession('s1', { title: 'Updated' });
      expect(getState().sessions[0].title).toBe('Updated');
    });

    it('should remove a session', () => {
      getState().addSession(createTestSession({ id: 's1' }));
      getState().addSession(createTestSession({ id: 's2' }));
      expect(getState().sessions).toHaveLength(2);

      getState().removeSession('s1');
      expect(getState().sessions).toHaveLength(1);
      expect(getState().sessions[0].id).toBe('s2');
    });

    it('should clear active session when removed', () => {
      getState().addSession(createTestSession({ id: 's1' }));
      getState().setActiveSession('s1');
      expect(getState().activeSessionId).toBe('s1');

      getState().removeSession('s1');
      expect(getState().activeSessionId).toBeNull();
    });

    it('should archive a session', () => {
      getState().addSession(createTestSession({ id: 's1', status: 'idle' }));
      getState().archiveSession('s1');
      expect(getState().sessions[0].status).toBe('archived');
    });

    it('should restore an archived session', () => {
      getState().addSession(
        createTestSession({ id: 's1', status: 'archived' })
      );
      getState().restoreSession('s1');
      expect(getState().sessions[0].status).toBe('idle');
    });

    it('should delete a session', () => {
      getState().addSession(createTestSession({ id: 's1' }));
      getState().deleteSession('s1');
      expect(getState().sessions[0].status).toBe('deleted');
    });
  });

  describe('Message operations', () => {
    const sessionId = 'test-session';

    beforeEach(() => {
      getState().addSession(createTestSession({ id: sessionId }));
      getState().setMessages(sessionId, []);
    });

    it('should add a message', () => {
      const msg = createTestMessage(sessionId, { id: 'msg1', content: 'Hello' });
      getState().addMessage(sessionId, msg);

      const messages = getState().getMessages(sessionId);
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello');
    });

    it('should update a message', () => {
      const msg = createTestMessage(sessionId, { id: 'msg1' });
      getState().addMessage(sessionId, msg);

      getState().updateMessage(sessionId, 'msg1', { content: 'Updated' });
      expect(getState().getMessages(sessionId)[0].content).toBe('Updated');
    });

    it('should append stream delta', () => {
      const msg = createTestMessage(sessionId, {
        id: 'msg1',
        role: 'assistant',
        content: 'Hello',
      });
      getState().addMessage(sessionId, msg);

      getState().appendStreamDelta(sessionId, 'msg1', ' World');
      expect(getState().getMessages(sessionId)[0].content).toBe('Hello World');

      getState().appendStreamDelta(sessionId, 'msg1', '!');
      expect(getState().getMessages(sessionId)[0].content).toBe(
        'Hello World!'
      );
    });

    it('should set thinking content (appending)', () => {
      const msg = createTestMessage(sessionId, {
        id: 'msg1',
        role: 'assistant',
        content: '',
      });
      getState().addMessage(sessionId, msg);

      getState().setThinkingContent(sessionId, 'msg1', 'Let me think...');
      expect(getState().getMessages(sessionId)[0].thinkingContent).toBe(
        'Let me think...'
      );

      getState().setThinkingContent(sessionId, 'msg1', ' more thoughts');
      expect(getState().getMessages(sessionId)[0].thinkingContent).toBe(
        'Let me think... more thoughts'
      );
    });

    it('should add and update tool calls', () => {
      const msg = createTestMessage(sessionId, {
        id: 'msg1',
        role: 'assistant',
        content: '',
      });
      getState().addMessage(sessionId, msg);

      const toolCall: ToolCall = {
        id: 'tc1',
        name: 'read_file',
        input: { path: '/test.ts' },
        status: 'running',
      };

      getState().addToolCall(sessionId, 'msg1', toolCall);
      const tc = getState().getMessages(sessionId)[0].toolCalls;
      expect(tc).toHaveLength(1);
      expect(tc![0].name).toBe('read_file');
      expect(tc![0].status).toBe('running');

      getState().updateToolCall(sessionId, 'msg1', 'tc1', {
        status: 'success',
        output: 'file contents here',
      });

      const updated = getState().getMessages(sessionId)[0].toolCalls![0];
      expect(updated.status).toBe('success');
      expect(updated.output).toBe('file contents here');
    });

    it('should set messages for a session', () => {
      const messages = [
        createTestMessage(sessionId, { id: 'msg1' }),
        createTestMessage(sessionId, { id: 'msg2' }),
      ];
      getState().setMessages(sessionId, messages);
      expect(getState().getMessages(sessionId)).toHaveLength(2);
    });
  });

  describe('Streaming state', () => {
    const sessionId = 'test-session';

    beforeEach(() => {
      getState().addSession(createTestSession({ id: sessionId }));
    });

    it('should start and stop streaming', () => {
      expect(getState().isStreaming(sessionId)).toBe(false);
      expect(getState().getStreamPhase(sessionId)).toBe('idle');

      getState().startStreaming(sessionId, 'msg1');
      expect(getState().isStreaming(sessionId)).toBe(true);
      expect(getState().getStreamPhase(sessionId)).toBe('streaming');
      expect(getState().streamingMessageId[sessionId]).toBe('msg1');

      getState().stopStreaming(sessionId);
      expect(getState().isStreaming(sessionId)).toBe(false);
      expect(getState().getStreamPhase(sessionId)).toBe('done');
      expect(getState().streamingMessageId[sessionId]).toBeNull();
    });

    it('should set stream phase', () => {
      getState().setStreamPhase(sessionId, 'thinking');
      expect(getState().getStreamPhase(sessionId)).toBe('thinking');
      expect(getState().isStreaming(sessionId)).toBe(true);

      getState().setStreamPhase(sessionId, 'tool_use');
      expect(getState().getStreamPhase(sessionId)).toBe('tool_use');
      expect(getState().isStreaming(sessionId)).toBe(true);

      getState().setStreamPhase(sessionId, 'idle');
      expect(getState().isStreaming(sessionId)).toBe(false);
    });
  });

  describe('Input drafts', () => {
    it('should set and get input drafts', () => {
      getState().setInputDraft('s1', 'Hello world');
      expect(getState().inputDrafts['s1']).toBe('Hello world');

      getState().setInputDraft('s1', 'Updated');
      expect(getState().inputDrafts['s1']).toBe('Updated');
    });
  });

  describe('Selectors', () => {
    it('should get session by id', () => {
      getState().addSession(createTestSession({ id: 's1', title: 'Test' }));
      const session = getState().getSession('s1');
      expect(session).toBeDefined();
      expect(session!.title).toBe('Test');

      expect(getState().getSession('nonexistent')).toBeUndefined();
    });

    it('should get active session', () => {
      getState().addSession(createTestSession({ id: 's1', title: 'Active' }));
      expect(getState().getActiveSession()).toBeUndefined();

      getState().setActiveSession('s1');
      expect(getState().getActiveSession()?.title).toBe('Active');
    });

    it('should get active sessions', () => {
      getState().addSession(createTestSession({ id: 's1', status: 'active' }));
      getState().addSession(createTestSession({ id: 's2', status: 'idle' }));
      getState().addSession(
        createTestSession({ id: 's3', status: 'archived' })
      );

      const active = getState().getActiveSessions();
      expect(active).toHaveLength(2);
    });

    it('should get archived sessions', () => {
      getState().addSession(createTestSession({ id: 's1', status: 'active' }));
      getState().addSession(
        createTestSession({ id: 's2', status: 'archived' })
      );
      getState().addSession(
        createTestSession({ id: 's3', status: 'archived' })
      );

      const archived = getState().getArchivedSessions();
      expect(archived).toHaveLength(2);
    });

    it('should return empty messages for unknown session', () => {
      expect(getState().getMessages('unknown')).toEqual([]);
    });

    it('should return idle stream phase for unknown session', () => {
      expect(getState().getStreamPhase('unknown')).toBe('idle');
    });
  });
});
