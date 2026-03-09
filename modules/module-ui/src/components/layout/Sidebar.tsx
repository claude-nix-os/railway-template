'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  MessageSquare,
  Circle,
  Loader2,
  Archive,
  Trash2,
  RotateCcw,
  FolderOpen,
  GitBranch,
  GitCommit,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { usePanelStore } from '../../stores/panel-store';
import { useSessionStore } from '../../stores/session-store';
import type { Session, SessionStatus } from '../../types';

/* ------------------------------------------------------------------ */
/*  Sidebar Component                                                  */
/* ------------------------------------------------------------------ */

export function Sidebar() {
  const activeSidebarSection = usePanelStore((s) => s.activeSidebarSection);

  return (
    <div
      className="flex flex-col h-full overflow-hidden select-none"
      style={{ backgroundColor: 'var(--surface-1)' }}
      data-testid="sidebar"
    >
      {activeSidebarSection === 'sessions' && <SessionsSidebar />}
      {activeSidebarSection === 'files' && <FilesSidebar />}
      {activeSidebarSection === 'git' && <GitSidebar />}
      {activeSidebarSection === 'archive' && <ArchiveSidebar />}
      {activeSidebarSection === 'settings' && <SettingsSidebar />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Session Status Icons                                               */
/* ------------------------------------------------------------------ */

function SessionStatusIcon({ status }: { status: SessionStatus }) {
  switch (status) {
    case 'active':
      return <Loader2 className="w-3 h-3 text-[var(--success)] animate-spin" />;
    case 'idle':
      return <Circle className="w-3 h-3 text-[var(--text-tertiary)]" />;
    case 'archived':
      return <Archive className="w-3 h-3 text-[var(--text-tertiary)]" />;
    case 'deleted':
      return <Trash2 className="w-3 h-3 text-[var(--error)]" />;
    default:
      return <Circle className="w-3 h-3 text-[var(--text-tertiary)]" />;
  }
}

/* ------------------------------------------------------------------ */
/*  Sessions Sidebar                                                   */
/* ------------------------------------------------------------------ */

function SessionsSidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const sessions = useSessionStore((s) => s.getActiveSessions());
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const createSession = useSessionStore((s) => s.createSession);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const archiveSession = useSessionStore((s) => s.archiveSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const openTab = usePanelStore((s) => s.openTab);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.lastMessage?.toLowerCase().includes(q)
    );
  }, [sessions, searchQuery]);

  const handleNewSession = useCallback(() => {
    const sessionId = createSession();
    openTab('chat', {
      label: 'New Session',
      sessionId,
    });
  }, [createSession, openTab]);

  const handleSelectSession = useCallback(
    (session: Session) => {
      setActiveSession(session.id);
      openTab('chat', {
        label: session.title,
        sessionId: session.id,
      });
    },
    [setActiveSession, openTab]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 h-10 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Sessions
        </span>
        <button
          onClick={handleNewSession}
          className="flex items-center justify-center w-6 h-6 rounded-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors"
          aria-label="New session"
          data-testid="new-session-button"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 flex-shrink-0">
        <div
          className="flex items-center gap-2 px-2 h-7 rounded-md"
          style={{
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Search className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions..."
            className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
          />
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-1">
        <AnimatePresence initial={false}>
          {filteredSessions.map((session) => (
            <motion.button
              key={session.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => handleSelectSession(session)}
              className={clsx(
                'w-full flex items-start gap-2 px-3 py-2 rounded-md text-left',
                'transition-colors group',
                session.id === activeSessionId
                  ? 'bg-[var(--accent-muted)]'
                  : 'hover:bg-[var(--surface-3)]'
              )}
            >
              <SessionStatusIcon status={session.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                    {session.title}
                  </span>
                  {session.unreadCount > 0 && (
                    <span
                      className="ml-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: 'var(--accent)',
                        color: 'white',
                      }}
                    >
                      {session.unreadCount}
                    </span>
                  )}
                </div>
                {session.lastMessage && (
                  <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
                    {session.lastMessage}
                  </p>
                )}
              </div>
              {/* Context actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    archiveSession(session.id);
                  }}
                  className="p-0.5 rounded hover:bg-[var(--surface-4)] text-[var(--text-tertiary)]"
                  title="Archive"
                >
                  <Archive className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="p-0.5 rounded hover:bg-[var(--surface-4)] text-[var(--text-tertiary)]"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        {filteredSessions.length === 0 && (
          <div className="px-4 py-8 text-center">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)]" />
            <p className="text-xs text-[var(--text-tertiary)]">
              {searchQuery ? 'No matching sessions' : 'No sessions yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleNewSession}
                className="mt-2 text-xs text-[var(--accent)] hover:underline"
              >
                Start a new session
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Files Sidebar                                                      */
/* ------------------------------------------------------------------ */

function FilesSidebar() {
  const openTab = usePanelStore((s) => s.openTab);

  return (
    <div className="flex flex-col h-full">
      <SidebarHeader title="Files" />
      <div className="flex-1 overflow-y-auto scrollbar-thin px-1">
        <button
          onClick={() =>
            openTab('home', {
              label: 'File Browser',
              params: { view: 'files' },
            })
          }
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
          <span>Open File Browser</span>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Git Sidebar                                                        */
/* ------------------------------------------------------------------ */

function GitSidebar() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="flex flex-col h-full">
      <SidebarHeader title="Source Control" />
      <div className="flex-1 overflow-y-auto scrollbar-thin px-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
          <GitBranch className="w-3.5 h-3.5" />
          <span>Branches</span>
        </button>
        {expanded && (
          <div className="pl-8 pr-3">
            <div className="flex items-center gap-2 py-1 text-xs text-[var(--text-secondary)]">
              <GitCommit className="w-3 h-3" />
              <span>main</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-muted)] text-[var(--accent)]">
                current
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Archive Sidebar                                                    */
/* ------------------------------------------------------------------ */

function ArchiveSidebar() {
  const archivedSessions = useSessionStore((s) => s.getArchivedSessions());
  const restoreSession = useSessionStore((s) => s.restoreSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);

  return (
    <div className="flex flex-col h-full">
      <SidebarHeader title="Archive" />
      <div className="flex-1 overflow-y-auto scrollbar-thin px-1">
        {archivedSessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center gap-2 px-3 py-2 rounded-md group hover:bg-[var(--surface-3)] transition-colors"
          >
            <Archive className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
            <span className="flex-1 text-xs text-[var(--text-secondary)] truncate">
              {session.title}
            </span>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => restoreSession(session.id)}
                className="p-0.5 rounded hover:bg-[var(--surface-4)] text-[var(--text-tertiary)]"
                title="Restore"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                onClick={() => deleteSession(session.id)}
                className="p-0.5 rounded hover:bg-[var(--surface-4)] text-[var(--error)]"
                title="Delete permanently"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {archivedSessions.length === 0 && (
          <div className="px-4 py-8 text-center">
            <Archive className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)]" />
            <p className="text-xs text-[var(--text-tertiary)]">
              No archived sessions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings Sidebar                                                   */
/* ------------------------------------------------------------------ */

function SettingsSidebar() {
  const openTab = usePanelStore((s) => s.openTab);

  return (
    <div className="flex flex-col h-full">
      <SidebarHeader title="Settings" />
      <div className="flex-1 overflow-y-auto scrollbar-thin px-1">
        <button
          onClick={() =>
            openTab('settings', { label: 'Settings', closable: true })
          }
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>Open Settings</span>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar Header                                                     */
/* ------------------------------------------------------------------ */

function SidebarHeader({ title }: { title: string }) {
  return (
    <div
      className="flex items-center px-4 h-10 flex-shrink-0"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
        {title}
      </span>
    </div>
  );
}
