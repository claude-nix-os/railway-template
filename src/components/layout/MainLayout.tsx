'use client';

import React, { useEffect, useCallback, useState } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import { usePanelStore } from '@/stores/panel-store';
import { useUIStore } from '@/stores/ui-store';
import { ActivityBar } from '@/components/layout/ActivityBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { TabBar } from '@/components/layout/TabBar';
import { StatusBar } from '@/components/layout/StatusBar';
import { BottomPanel } from '@/components/layout/BottomPanel';
import { PanelWrapper } from '@/components/layout/PanelWrapper';
import { EditorDropZones } from '@/components/layout/EditorDropZones';
import type { ConnectionStatus, SplitDirection } from '@/types';

/* ------------------------------------------------------------------ */
/*  Main Layout                                                        */
/* ------------------------------------------------------------------ */

interface MainLayoutProps {
  connectionStatus: ConnectionStatus;
}

export function MainLayout({ connectionStatus }: MainLayoutProps) {
  const sidebarVisible = usePanelStore((s) => s.sidebarVisible);
  const toggleSidebar = usePanelStore((s) => s.toggleSidebar);
  const toggleBottomPanel = usePanelStore((s) => s.toggleBottomPanel);
  const tabGroups = usePanelStore((s) => s.tabGroups);
  const splitDirection = usePanelStore((s) => s.splitDirection);
  const activeGroupId = usePanelStore((s) => s.activeGroupId);
  const splitView = usePanelStore((s) => s.splitView);
  const moveTab = usePanelStore((s) => s.moveTab);
  const companionPanelVisible = usePanelStore(
    (s) => s.companionPanelVisible
  );
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen);
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);

  /* ---- Keyboard shortcuts ---- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      /* Cmd+B: toggle sidebar */
      if (isMod && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }

      /* Cmd+J: toggle bottom panel */
      if (isMod && e.key === 'j') {
        e.preventDefault();
        toggleBottomPanel();
      }

      /* Cmd+Shift+P: command palette */
      if (isMod && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        toggleCommandPalette();
      }

      /* Cmd+\\: split editor */
      if (isMod && e.key === '\\') {
        e.preventDefault();
        splitView('horizontal');
      }

      /* Escape: close command palette */
      if (e.key === 'Escape' && commandPaletteOpen) {
        e.preventDefault();
        toggleCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    toggleSidebar,
    toggleBottomPanel,
    toggleCommandPalette,
    commandPaletteOpen,
    splitView,
  ]);

  /* ---- Drop zone handler ---- */
  const handleEditorDrop = useCallback(
    (tabId: string, zone: string, sourceGroupId: string) => {
      const direction: SplitDirection =
        zone === 'left' || zone === 'right' ? 'horizontal' : 'vertical';
      splitView(direction, tabId);
    },
    [splitView]
  );

  /* ---- Main editor content ---- */
  const renderEditorGroups = () => {
    if (tabGroups.length === 1) {
      return (
        <div className="relative flex flex-col h-full w-full">
          <TabBar groupId={tabGroups[0].id} />
          <div className="flex-1 relative overflow-hidden">
            <PanelWrapper groupId={tabGroups[0].id} />
            <EditorDropZones
              groupId={tabGroups[0].id}
              onDrop={handleEditorDrop}
            />
          </div>
        </div>
      );
    }

    /* Split view with 2 groups */
    return (
      <PanelGroup
        direction={splitDirection === 'vertical' ? 'vertical' : 'horizontal'}
        className="h-full"
      >
        {tabGroups.map((group, index) => (
          <React.Fragment key={group.id}>
            {index > 0 && (
              <PanelResizeHandle className="w-[1px] bg-[var(--border-subtle)] hover:bg-[var(--accent-muted)] transition-colors data-[resize-handle-active]:bg-[var(--accent)]" />
            )}
            <Panel minSize={20}>
              <div
                className="relative flex flex-col h-full"
                onClick={() =>
                  usePanelStore.setState({ activeGroupId: group.id })
                }
              >
                <TabBar groupId={group.id} />
                <div className="flex-1 relative overflow-hidden">
                  <PanelWrapper groupId={group.id} />
                  <EditorDropZones
                    groupId={group.id}
                    onDrop={handleEditorDrop}
                  />
                </div>
              </div>
            </Panel>
          </React.Fragment>
        ))}
      </PanelGroup>
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" data-testid="main-layout">
      <div className="flex flex-1 min-h-0">
        {/* Activity Bar */}
        <ActivityBar />

        {/* Main Content Area */}
        <PanelGroup direction="horizontal" className="flex-1">
          {/* Sidebar */}
          {sidebarVisible && (
            <>
              <Panel
                defaultSize={20}
                minSize={15}
                maxSize={40}
                collapsible
                onCollapse={() =>
                  usePanelStore.setState({ sidebarVisible: false })
                }
              >
                <Sidebar />
              </Panel>
              <PanelResizeHandle className="w-[1px] bg-[var(--border-subtle)] hover:bg-[var(--accent-muted)] transition-colors data-[resize-handle-active]:bg-[var(--accent)]" />
            </>
          )}

          {/* Editor + Bottom Panel */}
          <Panel minSize={40}>
            <div className="flex flex-col h-full">
              {/* Editor area */}
              <div className="flex-1 min-h-0">
                {renderEditorGroups()}
              </div>

              {/* Bottom panel */}
              <BottomPanel />
            </div>
          </Panel>

          {/* Companion Panel (for execution graph node properties) */}
          {companionPanelVisible && (
            <>
              <PanelResizeHandle className="w-[1px] bg-[var(--border-subtle)] hover:bg-[var(--accent-muted)] transition-colors" />
              <Panel defaultSize={20} minSize={15} maxSize={35}>
                <CompanionPanel />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {/* Status Bar */}
      <StatusBar connectionStatus={connectionStatus} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Companion Panel (Node Properties)                                  */
/* ------------------------------------------------------------------ */

function CompanionPanel() {
  const data = usePanelStore((s) => s.companionPanelData);
  const setCompanionPanel = usePanelStore((s) => s.setCompanionPanel);

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--surface-1)' }}
    >
      <div
        className="flex items-center justify-between px-3 h-9 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          Properties
        </span>
        <button
          onClick={() => setCompanionPanel(false)}
          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Close properties"
        >
          <span className="text-xs">&times;</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 text-xs">
        {data ? (
          <pre className="text-[var(--text-secondary)] whitespace-pre-wrap break-all font-mono">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <p className="text-[var(--text-tertiary)]">Select a node to view properties</p>
        )}
      </div>
    </div>
  );
}
