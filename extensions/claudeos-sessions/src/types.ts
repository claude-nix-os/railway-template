/**
 * Session status enumeration
 */
export enum SessionStatus {
  /** Session is currently active with ongoing conversation */
  ACTIVE = 'active',

  /** Session is idle (no recent activity) */
  IDLE = 'idle',

  /** Session has been archived */
  ARCHIVED = 'archived',

  /** Session encountered an error */
  ERROR = 'error'
}

/**
 * Represents a chat session
 */
export interface Session {
  /** Unique session identifier */
  id: string;

  /** Human-readable session name */
  name: string;

  /** Current session status */
  status: SessionStatus;

  /** Timestamp when session was created */
  createdAt: Date;

  /** Timestamp when session was last modified */
  lastModified: Date;

  /** Number of messages in the session */
  messageCount: number;

  /** Whether the session is archived */
  archived: boolean;

  /** Optional session metadata */
  metadata?: {
    /** Last user message preview */
    lastMessage?: string;

    /** Session tags */
    tags?: string[];

    /** Custom user data */
    [key: string]: any;
  };
}

/**
 * Tree item representing a session in the tree view
 */
export interface SessionTreeItem {
  /** Session data */
  session: Session;

  /** Tree item label */
  label: string;

  /** Tree item description (appears to the right of label) */
  description?: string;

  /** Tree item tooltip */
  tooltip?: string;

  /** Icon path or ThemeIcon */
  iconPath?: any;

  /** Context value for menu contributions */
  contextValue: string;
}

/**
 * Session provider interface for fetching and managing sessions
 */
export interface ISessionProvider {
  /** Fetch all sessions */
  getSessions(): Promise<Session[]>;

  /** Get a specific session by ID */
  getSession(id: string): Promise<Session | undefined>;

  /** Create a new session */
  createSession(name: string): Promise<Session>;

  /** Rename a session */
  renameSession(id: string, newName: string): Promise<void>;

  /** Archive a session */
  archiveSession(id: string): Promise<void>;

  /** Restore an archived session */
  restoreSession(id: string): Promise<void>;

  /** Delete a session */
  deleteSession(id: string): Promise<void>;

  /** Listen for session updates */
  onSessionUpdate(listener: (session: Session) => void): void;
}
