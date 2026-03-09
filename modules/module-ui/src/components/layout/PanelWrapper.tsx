'use client';

import React, { Suspense, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { usePanelStore } from '../../stores/panel-store';
import type { PanelProps, Tab } from '../../types';

/* ------------------------------------------------------------------ */
/*  Panel Registry                                                     */
/* ------------------------------------------------------------------ */

type PanelComponent = React.ComponentType<PanelProps>;
const panelRegistry = new Map<string, PanelComponent>();

export function registerPanel(id: string, component: PanelComponent) {
  panelRegistry.set(id, component);
}

export function unregisterPanel(id: string) {
  panelRegistry.delete(id);
}

/* ------------------------------------------------------------------ */
/*  Loading Fallback                                                   */
/* ------------------------------------------------------------------ */

function PanelLoading() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
        <span className="text-xs text-[var(--text-tertiary)]">Loading panel...</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Not Found                                                          */
/* ------------------------------------------------------------------ */

function PanelNotFound({ panelId }: { panelId: string }) {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="flex flex-col items-center gap-3">
        <span className="text-sm text-[var(--text-secondary)]">
          Panel not found: {panelId}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Panel Wrapper                                                      */
/* ------------------------------------------------------------------ */

interface PanelWrapperProps {
  groupId: string;
}

export function PanelWrapper({ groupId }: PanelWrapperProps) {
  const group = usePanelStore((s) =>
    s.tabGroups.find((g) => g.id === groupId)
  );

  const activeTab = useMemo(() => {
    if (!group || !group.activeTabId) return null;
    return group.tabs.find((t) => t.id === group.activeTabId) ?? null;
  }, [group]);

  if (!activeTab) {
    return (
      <div
        className="flex items-center justify-center h-full w-full"
        style={{ backgroundColor: 'var(--surface-0)' }}
      >
        <span className="text-sm text-[var(--text-tertiary)]">
          No tab selected
        </span>
      </div>
    );
  }

  const PanelComponent = panelRegistry.get(activeTab.panelId);

  if (!PanelComponent) {
    return <PanelNotFound panelId={activeTab.panelId} />;
  }

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{ backgroundColor: 'var(--surface-0)' }}
      data-testid={`panel-wrapper-${activeTab.panelId}`}
    >
      <Suspense fallback={<PanelLoading />}>
        <PanelComponent
          panelId={activeTab.panelId}
          tabId={activeTab.id}
          sessionId={activeTab.sessionId}
          params={activeTab.params}
        />
      </Suspense>
    </div>
  );
}
