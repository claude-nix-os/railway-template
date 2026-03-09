'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  Settings,
  BookOpen,
  GitBranch,
  Network,
  Brain,
  ArrowRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { usePanelStore } from '../../stores/panel-store';
import { useSessionStore } from '../../stores/session-store';
import type { PanelProps, Session } from '../../types';

/* ------------------------------------------------------------------ */
/*  Quick Access Items                                                 */
/* ------------------------------------------------------------------ */

interface QuickAccessItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  panelId: string;
  gradient?: string;
}

const QUICK_ACCESS: QuickAccessItem[] = [
  {
    id: 'new-chat',
    label: 'New Chat',
    description: 'Start a new conversation',
    icon: Plus,
    panelId: 'chat',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Configure API keys and preferences',
    icon: Settings,
    panelId: 'settings',
  },
  {
    id: 'execution-graph',
    label: 'Execution Graph',
    description: 'Visualize agent execution tree',
    icon: Network,
    panelId: 'execution-graph',
  },
  {
    id: 'thought-stream',
    label: 'Thought Stream',
    description: 'View streaming thought process',
    icon: Brain,
    panelId: 'thought-stream',
  },
];

/* ------------------------------------------------------------------ */
/*  Home Panel                                                         */
/* ------------------------------------------------------------------ */

export function HomePanel({ panelId, tabId }: PanelProps) {
  const openTab = usePanelStore((s) => s.openTab);
  const createSession = useSessionStore((s) => s.createSession);
  const sessions = useSessionStore((s) => s.getActiveSessions());
  const setActiveSession = useSessionStore((s) => s.setActiveSession);

  const recentSessions = useMemo(
    () =>
      [...sessions]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 5),
    [sessions]
  );

  const handleNewSession = () => {
    const sessionId = createSession();
    openTab('chat', {
      label: 'New Session',
      sessionId,
    });
  };

  const handleQuickAccess = (item: QuickAccessItem) => {
    if (item.id === 'new-chat') {
      handleNewSession();
    } else {
      openTab(item.panelId, { label: item.label });
    }
  };

  const handleOpenSession = (session: Session) => {
    setActiveSession(session.id);
    openTab('chat', {
      label: session.title,
      sessionId: session.id,
    });
  };

  return (
    <div
      className="h-full overflow-y-auto scrollbar-thin"
      style={{ backgroundColor: 'var(--surface-0)' }}
      data-testid="home-panel"
    >
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl font-bold mb-2">
            <span className="claude-gradient-text">ClaudeOS</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Your AI-powered development environment
          </p>
        </motion.div>

        {/* New Session CTA */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          onClick={handleNewSession}
          className="w-full mb-8 p-5 rounded-xl text-left transition-all hover:scale-[1.01]"
          style={{
            background:
              'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1))',
            border: '1px solid rgba(99, 102, 241, 0.2)',
          }}
          data-testid="new-session-cta"
        >
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
              }}
            >
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Start New Session
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Begin a new conversation with Claude
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-[var(--accent)]" />
          </div>
        </motion.button>

        {/* Quick Access Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-10"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
            Quick Access
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACCESS.filter((i) => i.id !== 'new-chat').map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleQuickAccess(item)}
                  className="flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-[var(--surface-3)]"
                  style={{
                    backgroundColor: 'var(--surface-2)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                    style={{
                      backgroundColor: 'var(--accent-muted)',
                    }}
                  >
                    <Icon className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-[var(--text-primary)] block truncate">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)] block truncate">
                      {item.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
              Recent Sessions
            </h3>
            <div className="space-y-1">
              {recentSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleOpenSession(session)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-[var(--surface-3)] transition-colors group"
                >
                  <MessageSquare className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-[var(--text-primary)] block truncate">
                      {session.title}
                    </span>
                    {session.lastMessage && (
                      <span className="text-[10px] text-[var(--text-tertiary)] block truncate">
                        {session.lastMessage}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">
                    {formatRelativeTime(session.updatedAt)}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Time formatter                                                     */
/* ------------------------------------------------------------------ */

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
