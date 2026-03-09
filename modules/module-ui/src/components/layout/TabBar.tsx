'use client';

import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, MessageSquare, Home as HomeIcon, Settings as SettingsIcon, GitBranch, Eye, Brain, Monitor } from 'lucide-react';
import { clsx } from 'clsx';
import { usePanelStore } from '../../stores/panel-store';
import type { Tab } from '../../types';

/* ------------------------------------------------------------------ */
/*  Panel icon mapping                                                 */
/* ------------------------------------------------------------------ */

const PANEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: HomeIcon,
  chat: MessageSquare,
  settings: SettingsIcon,
  'conversation-list': MessageSquare,
  'execution-graph': GitBranch,
  'thought-stream': Brain,
  'gui-session': Monitor,
};

/* ------------------------------------------------------------------ */
/*  Tab Bar Component                                                  */
/* ------------------------------------------------------------------ */

interface TabBarProps {
  groupId: string;
}

export function TabBar({ groupId }: TabBarProps) {
  const group = usePanelStore((s) =>
    s.tabGroups.find((g) => g.id === groupId)
  );
  const setActiveTab = usePanelStore((s) => s.setActiveTab);
  const closeTab = usePanelStore((s) => s.closeTab);
  const reorderTab = usePanelStore((s) => s.reorderTab);
  const openTab = usePanelStore((s) => s.openTab);
  const splitView = usePanelStore((s) => s.splitView);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);

  if (!group) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', group.tabs[index].id);
    e.dataTransfer.setData('application/x-tab-group', groupId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIndex(index);
  };

  const handleDragLeave = () => {
    setDropIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const sourceGroupId = e.dataTransfer.getData('application/x-tab-group');

    if (sourceGroupId === groupId && dragIndex !== null) {
      reorderTab(groupId, dragIndex, toIndex);
    }

    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleMiddleClick = (e: React.MouseEvent, tab: Tab) => {
    if (e.button === 1 && tab.closable) {
      e.preventDefault();
      closeTab(tab.id, groupId);
    }
  };

  const handleNewTab = () => {
    openTab('home', { groupId });
  };

  return (
    <div
      ref={tabBarRef}
      className="flex items-center h-9 min-h-[36px] overflow-x-auto no-scrollbar select-none"
      style={{
        backgroundColor: 'var(--surface-1)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
      data-testid="tab-bar"
    >
      {/* Tabs */}
      <div className="flex items-stretch h-full flex-1 min-w-0">
        <AnimatePresence initial={false} mode="popLayout">
          {group.tabs.map((tab, index) => {
            const isActive = tab.id === group.activeTabId;
            const Icon = tab.icon ?? PANEL_ICONS[tab.panelId] ?? Eye;

            return (
              <motion.div
                key={tab.id}
                layout
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                draggable
                onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, index)}
                onDragOver={(e) => handleDragOver(e as unknown as React.DragEvent, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e as unknown as React.DragEvent, index)}
                onDragEnd={handleDragEnd}
                className={clsx(
                  'group flex items-center gap-1.5 px-3 h-full cursor-pointer',
                  'border-r transition-colors text-xs whitespace-nowrap',
                  dropIndex === index && 'tab-drag-over',
                  isActive
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
                style={{
                  backgroundColor: isActive
                    ? 'var(--surface-0)'
                    : 'transparent',
                  borderColor: 'var(--border-subtle)',
                  borderTop: isActive
                    ? '1px solid var(--accent)'
                    : '1px solid transparent',
                }}
                onClick={() => setActiveTab(tab.id, groupId)}
                onMouseDown={(e) => handleMiddleClick(e, tab)}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate max-w-[120px]">{tab.label}</span>
                {tab.dirty && (
                  <span className="w-2 h-2 rounded-full bg-[var(--text-secondary)] flex-shrink-0" />
                )}
                {tab.closable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id, groupId);
                    }}
                    className={clsx(
                      'flex items-center justify-center w-4 h-4 rounded-sm flex-shrink-0',
                      'opacity-0 group-hover:opacity-100 transition-opacity',
                      'hover:bg-[var(--surface-3)]'
                    )}
                    aria-label={`Close ${tab.label}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* New tab button */}
      <button
        onClick={handleNewTab}
        className={clsx(
          'flex items-center justify-center w-8 h-8 mx-0.5 rounded-sm flex-shrink-0',
          'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
          'hover:bg-[var(--surface-3)] transition-colors'
        )}
        aria-label="New tab"
        data-testid="new-tab-button"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
