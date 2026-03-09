'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  ListChecks,
  AlertTriangle,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { usePanelStore } from '../../stores/panel-store';
import type { BottomPanelTab } from '../../types';

/* ------------------------------------------------------------------ */
/*  Tab definitions                                                    */
/* ------------------------------------------------------------------ */

interface BottomTabDef {
  id: BottomPanelTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BOTTOM_TABS: BottomTabDef[] = [
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'problems', label: 'Problems', icon: AlertTriangle },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BottomPanel() {
  const visible = usePanelStore((s) => s.bottomPanelVisible);
  const activeTab = usePanelStore((s) => s.activeBottomTab);
  const setActiveBottomTab = usePanelStore((s) => s.setActiveBottomTab);
  const toggleBottomPanel = usePanelStore((s) => s.toggleBottomPanel);
  const bottomPanelHeight = usePanelStore((s) => s.bottomPanelHeight);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: bottomPanelHeight, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex flex-col overflow-hidden flex-shrink-0"
          style={{
            backgroundColor: 'var(--surface-1)',
            borderTop: '1px solid var(--border-subtle)',
          }}
          data-testid="bottom-panel"
        >
          {/* Tab bar */}
          <div
            className="flex items-center justify-between h-9 px-2 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-0.5">
              {BOTTOM_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveBottomTab(tab.id)}
                    className={clsx(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs transition-colors',
                      isActive
                        ? 'text-[var(--text-primary)] bg-[var(--surface-3)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={toggleBottomPanel}
                className="flex items-center justify-center w-6 h-6 rounded-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors"
                aria-label="Close panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-3">
            {activeTab === 'terminal' && <TerminalPanel />}
            {activeTab === 'tasks' && <TasksPanel />}
            {activeTab === 'problems' && <ProblemsPanel />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Terminal Panel                                                     */
/* ------------------------------------------------------------------ */

function TerminalPanel() {
  return (
    <div className="h-full font-mono text-xs text-[var(--text-secondary)]">
      <div className="flex items-center gap-2 mb-2">
        <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span className="text-[var(--text-primary)]">Terminal</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[var(--accent)]">$</span>
        <span className="streaming-cursor"> </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tasks Panel                                                        */
/* ------------------------------------------------------------------ */

function TasksPanel() {
  return (
    <div className="h-full text-xs text-[var(--text-secondary)]">
      <div className="flex items-center gap-2 mb-2">
        <ListChecks className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span className="text-[var(--text-primary)]">Running Tasks</span>
      </div>
      <p className="text-[var(--text-tertiary)]">No running tasks</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Problems Panel                                                     */
/* ------------------------------------------------------------------ */

function ProblemsPanel() {
  return (
    <div className="h-full text-xs text-[var(--text-secondary)]">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)]" />
        <span className="text-[var(--text-primary)]">Problems</span>
      </div>
      <p className="text-[var(--text-tertiary)]">No problems detected</p>
    </div>
  );
}
