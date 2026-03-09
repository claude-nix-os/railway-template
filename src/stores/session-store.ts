import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  Session,
  Message,
  ToolCall,
  StreamPhase,
  ModelId,
  PermissionMode,
  SessionStatus,
} from '@/types';

/* ------------------------------------------------------------------ */
/*  Session Store Types                                                */
/* ------------------------------------------------------------------ */

export interface SessionStoreState {
  /* Sessions */
  sessions: Session[];
  activeSessionId: string | null;

  /* Messages (keyed by session id) */
  messagesBySession: Record<string, Message[]>;

  /* Streaming state (per session) */
  streamPhaseBySession: Record<string, StreamPhase>;
  streamingMessageId: Record<string, string | null>;

  /* Input drafts (per session) */
  inputDrafts: Record<string, string>;

  /* Actions: sessions */
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  updateSession: (sessionId: string, updates: Partial<Session>) => void;
  removeSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;
  archiveSession: (sessionId: string) => void;
  restoreSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  createSession: (opts?: {
    title?: string;
    model?: ModelId;
    permissionMode?: PermissionMode;
  }) => string;

  /* Actions: messages */
  setMessages: (sessionId: string, messages: Message[]) => void;
  addMessage: (sessionId: string, message: Message) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => void;
  appendStreamDelta: (sessionId: string, messageId: string, delta: string) => void;
  setThinkingContent: (sessionId: string, messageId: string, content: string) => void;
  addToolCall: (sessionId: string, messageId: string, toolCall: ToolCall) => void;
  updateToolCall: (
    sessionId: string,
    messageId: string,
    toolCallId: string,
    updates: Partial<ToolCall>
  ) => void;

  /* Actions: streaming */
  setStreamPhase: (sessionId: string, phase: StreamPhase) => void;
  startStreaming: (sessionId: string, messageId: string) => void;
  stopStreaming: (sessionId: string) => void;

  /* Actions: input */
  setInputDraft: (sessionId: string, draft: string) => void;

  /* Selectors */
  getSession: (sessionId: string) => Session | undefined;
  getMessages: (sessionId: string) => Message[];
  getActiveSession: () => Session | undefined;
  getStreamPhase: (sessionId: string) => StreamPhase;
  isStreaming: (sessionId: string) => boolean;
  getActiveSessions: () => Session[];
  getArchivedSessions: () => Session[];
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messagesBySession: {},
  streamPhaseBySession: {},
  streamingMessageId: {},
  inputDrafts: {},

  /* ---- Sessions ---- */

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((s) => ({
      sessions: [session, ...s.sessions.filter((ss) => ss.id !== session.id)],
    })),

  updateSession: (sessionId, updates) =>
    set((s) => ({
      sessions: s.sessions.map((session) =>
        session.id === sessionId ? { ...session, ...updates } : session
      ),
    })),

  removeSession: (sessionId) =>
    set((s) => ({
      sessions: s.sessions.filter((session) => session.id !== sessionId),
      activeSessionId:
        s.activeSessionId === sessionId ? null : s.activeSessionId,
    })),

  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

  archiveSession: (sessionId) => {
    get().updateSession(sessionId, {
      status: 'archived' as SessionStatus,
      updatedAt: new Date().toISOString(),
    });
  },

  restoreSession: (sessionId) => {
    get().updateSession(sessionId, {
      status: 'idle' as SessionStatus,
      updatedAt: new Date().toISOString(),
    });
  },

  deleteSession: (sessionId) => {
    get().updateSession(sessionId, {
      status: 'deleted' as SessionStatus,
      updatedAt: new Date().toISOString(),
    });
  },

  createSession: (opts = {}) => {
    const {
      title = 'New Session',
      model = 'claude-sonnet-4-20250514',
      permissionMode = 'default',
    } = opts;
    const id = `session-${nanoid(12)}`;
    const now = new Date().toISOString();
    const session: Session = {
      id,
      title,
      status: 'idle',
      model,
      permissionMode,
      createdAt: now,
      updatedAt: now,
      unreadCount: 0,
    };
    get().addSession(session);
    set({
      activeSessionId: id,
      messagesBySession: { ...get().messagesBySession, [id]: [] },
      streamPhaseBySession: { ...get().streamPhaseBySession, [id]: 'idle' },
    });
    return id;
  },

  /* ---- Messages ---- */

  setMessages: (sessionId, messages) =>
    set((s) => ({
      messagesBySession: { ...s.messagesBySession, [sessionId]: messages },
    })),

  addMessage: (sessionId, message) =>
    set((s) => ({
      messagesBySession: {
        ...s.messagesBySession,
        [sessionId]: [
          ...(s.messagesBySession[sessionId] ?? []),
          message,
        ],
      },
    })),

  updateMessage: (sessionId, messageId, updates) =>
    set((s) => ({
      messagesBySession: {
        ...s.messagesBySession,
        [sessionId]: (s.messagesBySession[sessionId] ?? []).map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
      },
    })),

  appendStreamDelta: (sessionId, messageId, delta) =>
    set((s) => ({
      messagesBySession: {
        ...s.messagesBySession,
        [sessionId]: (s.messagesBySession[sessionId] ?? []).map((msg) =>
          msg.id === messageId
            ? { ...msg, content: msg.content + delta }
            : msg
        ),
      },
    })),

  setThinkingContent: (sessionId, messageId, content) =>
    set((s) => ({
      messagesBySession: {
        ...s.messagesBySession,
        [sessionId]: (s.messagesBySession[sessionId] ?? []).map((msg) =>
          msg.id === messageId
            ? { ...msg, thinkingContent: (msg.thinkingContent ?? '') + content }
            : msg
        ),
      },
    })),

  addToolCall: (sessionId, messageId, toolCall) =>
    set((s) => ({
      messagesBySession: {
        ...s.messagesBySession,
        [sessionId]: (s.messagesBySession[sessionId] ?? []).map((msg) =>
          msg.id === messageId
            ? { ...msg, toolCalls: [...(msg.toolCalls ?? []), toolCall] }
            : msg
        ),
      },
    })),

  updateToolCall: (sessionId, messageId, toolCallId, updates) =>
    set((s) => ({
      messagesBySession: {
        ...s.messagesBySession,
        [sessionId]: (s.messagesBySession[sessionId] ?? []).map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                toolCalls: (msg.toolCalls ?? []).map((tc) =>
                  tc.id === toolCallId ? { ...tc, ...updates } : tc
                ),
              }
            : msg
        ),
      },
    })),

  /* ---- Streaming ---- */

  setStreamPhase: (sessionId, phase) =>
    set((s) => ({
      streamPhaseBySession: { ...s.streamPhaseBySession, [sessionId]: phase },
    })),

  startStreaming: (sessionId, messageId) =>
    set((s) => ({
      streamPhaseBySession: { ...s.streamPhaseBySession, [sessionId]: 'streaming' },
      streamingMessageId: { ...s.streamingMessageId, [sessionId]: messageId },
    })),

  stopStreaming: (sessionId) =>
    set((s) => ({
      streamPhaseBySession: { ...s.streamPhaseBySession, [sessionId]: 'done' },
      streamingMessageId: { ...s.streamingMessageId, [sessionId]: null },
    })),

  /* ---- Input ---- */

  setInputDraft: (sessionId, draft) =>
    set((s) => ({
      inputDrafts: { ...s.inputDrafts, [sessionId]: draft },
    })),

  /* ---- Selectors ---- */

  getSession: (sessionId) =>
    get().sessions.find((s) => s.id === sessionId),

  getMessages: (sessionId) =>
    get().messagesBySession[sessionId] ?? [],

  getActiveSession: () => {
    const { activeSessionId, sessions } = get();
    if (!activeSessionId) return undefined;
    return sessions.find((s) => s.id === activeSessionId);
  },

  getStreamPhase: (sessionId) =>
    get().streamPhaseBySession[sessionId] ?? 'idle',

  isStreaming: (sessionId) => {
    const phase = get().streamPhaseBySession[sessionId];
    return phase === 'streaming' || phase === 'thinking' || phase === 'tool_use';
  },

  getActiveSessions: () =>
    get().sessions.filter(
      (s) => s.status === 'active' || s.status === 'idle'
    ),

  getArchivedSessions: () =>
    get().sessions.filter((s) => s.status === 'archived'),
}));
