'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Home,
  FolderOpen,
  GitBranch,
  Archive,
  Settings,
} from 'lucide-react';
import { clsx } from 'clsx';
import { usePanelStore } from '@/stores/panel-store';
import type { ActivityBarPosition } from '@/types';

/* ------------------------------------------------------------------ */
/*  Activity Bar Item Data                                             */
/* ------------------------------------------------------------------ */

interface ActivityBarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  position: ActivityBarPosition;
  priority: number;
  sidebarSection: string;
}

const ACTIVITY_ITEMS: ActivityBarItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    position: 'top',
    priority: 0,
    sidebarSection: 'sessions',
  },
  {
    id: 'files',
    label: 'Files',
    icon: FolderOpen,
    position: 'top',
    priority: 10,
    sidebarSection: 'files',
  },
  {
    id: 'git',
    label: 'Git',
    icon: GitBranch,
    position: 'top',
    priority: 20,
    sidebarSection: 'git',
  },
  {
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    position: 'bottom',
    priority: 90,
    sidebarSection: 'archive',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    position: 'bottom',
    priority: 100,
    sidebarSection: 'settings',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ActivityBar() {
  const activeItem = usePanelStore((s) => s.activeActivityItem);
  const sidebarVisible = usePanelStore((s) => s.sidebarVisible);
  const setActiveActivityItem = usePanelStore((s) => s.setActiveActivityItem);
  const setActiveSidebarSection = usePanelStore(
    (s) => s.setActiveSidebarSection
  );
  const setSidebarVisible = usePanelStore((s) => s.setSidebarVisible);

  const { topItems, bottomItems } = useMemo(() => {
    const sorted = [...ACTIVITY_ITEMS].sort((a, b) => a.priority - b.priority);
    return {
      topItems: sorted.filter((i) => i.position === 'top'),
      bottomItems: sorted.filter((i) => i.position === 'bottom'),
    };
  }, []);

  const handleClick = (item: ActivityBarItem) => {
    if (activeItem === item.id && sidebarVisible) {
      setSidebarVisible(false);
    } else {
      setActiveActivityItem(item.id);
      setActiveSidebarSection(item.sidebarSection);
      setSidebarVisible(true);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-between w-12 h-full py-1 select-none"
      style={{ backgroundColor: 'var(--surface-1)' }}
      data-testid="activity-bar"
    >
      {/* Top items */}
      <div className="flex flex-col items-center gap-0.5">
        {topItems.map((item) => (
          <ActivityBarButton
            key={item.id}
            item={item}
            isActive={activeItem === item.id && sidebarVisible}
            onClick={() => handleClick(item)}
          />
        ))}
      </div>

      {/* Bottom items */}
      <div className="flex flex-col items-center gap-0.5">
        {bottomItems.map((item) => (
          <ActivityBarButton
            key={item.id}
            item={item}
            isActive={activeItem === item.id && sidebarVisible}
            onClick={() => handleClick(item)}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity Bar Button                                                */
/* ------------------------------------------------------------------ */

interface ActivityBarButtonProps {
  item: ActivityBarItem;
  isActive: boolean;
  onClick: () => void;
}

function ActivityBarButton({ item, isActive, onClick }: ActivityBarButtonProps) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      title={item.label}
      aria-label={item.label}
      data-testid={`activity-bar-item-${item.id}`}
      className={clsx(
        'relative flex items-center justify-center w-12 h-11 transition-colors',
        isActive
          ? 'text-[var(--text-primary)]'
          : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <motion.div
          layoutId="activity-indicator"
          className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
          style={{ backgroundColor: 'var(--accent)' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
      <Icon className="w-5 h-5" />
    </button>
  );
}

export { ACTIVITY_ITEMS };
export type { ActivityBarItem };
