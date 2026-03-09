'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquare,
  Circle,
  Loader2,
  Archive,
  Trash2,
  Filter,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { clsx } from 'clsx';
import { usePanelStore } from '@/stores/panel-store';
import { useSessionStore } from '@/stores/session-store';
import type { PanelProps, Session, SessionStatus } from '@/types';

/* ------------------------------------------------------------------ */
/*  Sort/Filter types                                                  */
/* ------------------------------------------------------------------ */

type SortField = 'updatedAt' | 'createdAt' | 'title';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | SessionStatus;

/* ------------------------------------------------------------------ */
/*  Conversation List Panel                                            */
/* ------------------------------------------------------------------ */

export function ConversationList({ panelId, tabId }: PanelProps) {
  const sessions = useSessionStore((s) => s.sessions);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const archiveSession = useSessionStore((s) => s.archiveSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const openTab = usePanelStore((s) => s.openTab);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    /* Status filter */
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    /* Search */
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.lastMessage?.toLowerCase().includes(q)
      );
    }

    /* Sort */
    result.sort((a, b) => {
      let cmp: number;
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'createdAt':
          cmp =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
        default:
          cmp =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [sessions, searchQuery, sortField, sortDir, statusFilter]);

  const handleOpenSession = (session: Session) => {
    setActiveSession(session.id);
    openTab('chat', {
      label: session.title,
      sessionId: session.id,
    });
  };

  const toggleSort = () => {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--surface-0)' }}
      data-testid="conversation-list"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 h-10 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          All Sessions
        </span>
        <span className="text-[10px] text-[var(--text-tertiary)]">
          {filteredSessions.length} session
          {filteredSessions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Search & Filters */}
      <div
        className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div
          className="flex items-center flex-1 gap-2 px-2 h-7 rounded-md"
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
            placeholder="Search..."
            className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-7 px-2 rounded-md text-xs bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border-subtle)] outline-none"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="idle">Idle</option>
          <option value="archived">Archived</option>
        </select>

        {/* Sort toggle */}
        <button
          onClick={toggleSort}
          className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors"
          title={`Sort ${sortDir === 'asc' ? 'descending' : 'ascending'}`}
        >
          {sortDir === 'asc' ? (
            <SortAsc className="w-3.5 h-3.5" />
          ) : (
            <SortDesc className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence initial={false}>
          {filteredSessions.map((session) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 px-4 py-3 group cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
              style={{
                borderBottom: '1px solid var(--border-subtle)',
              }}
              onClick={() => handleOpenSession(session)}
            >
              {/* Status indicator */}
              <div className="flex-shrink-0">
                {session.status === 'active' ? (
                  <Loader2 className="w-4 h-4 text-[var(--success)] animate-spin" />
                ) : (
                  <Circle
                    className={clsx(
                      'w-4 h-4',
                      session.status === 'archived'
                        ? 'text-[var(--warning)]'
                        : 'text-[var(--text-tertiary)]'
                    )}
                  />
                )}
              </div>

              {/* Session info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {session.title}
                  </span>
                  {session.unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-[var(--accent)] text-white flex-shrink-0">
                      {session.unreadCount}
                    </span>
                  )}
                </div>
                {session.lastMessage && (
                  <p className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">
                    {session.lastMessage}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {new Date(session.updatedAt).toLocaleDateString()}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {session.model.split('-').slice(1, 2).join('')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    archiveSession(session.id);
                  }}
                  className="p-1 rounded hover:bg-[var(--surface-4)] text-[var(--text-tertiary)]"
                  title="Archive"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="p-1 rounded hover:bg-[var(--surface-4)] text-[var(--text-tertiary)]"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredSessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="w-10 h-10 text-[var(--text-tertiary)] mb-3" />
            <p className="text-sm text-[var(--text-tertiary)]">
              {searchQuery
                ? 'No matching sessions found'
                : 'No sessions yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
