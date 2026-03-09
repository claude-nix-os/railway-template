'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { usePanelStore } from '../../stores/panel-store';
import type { SplitDirection } from '../../types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DropZone = 'left' | 'right' | 'top' | 'bottom' | 'center';

interface EditorDropZonesProps {
  groupId: string;
  onDrop: (tabId: string, zone: DropZone, sourceGroupId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function EditorDropZones({ groupId, onDrop }: EditorDropZonesProps) {
  const [activeZone, setActiveZone] = useState<DropZone | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const splitView = usePanelStore((s) => s.splitView);
  const moveTab = usePanelStore((s) => s.moveTab);
  const tabGroups = usePanelStore((s) => s.tabGroups);

  const handleDragEnter = useCallback(
    (zone: DropZone) => (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setActiveZone(zone);
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      /* Only reset if leaving the drop zones container */
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const { clientX, clientY } = e;
      if (
        clientX <= rect.left ||
        clientX >= rect.right ||
        clientY <= rect.top ||
        clientY >= rect.bottom
      ) {
        setIsDragging(false);
        setActiveZone(null);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (zone: DropZone) => (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const tabId = e.dataTransfer.getData('text/plain');
      const sourceGroupId = e.dataTransfer.getData('application/x-tab-group');

      if (tabId && sourceGroupId) {
        if (zone === 'center') {
          /* Move tab to this group */
          if (sourceGroupId !== groupId) {
            moveTab(tabId, sourceGroupId, groupId);
          }
        } else {
          /* Create split with this tab */
          const direction: SplitDirection =
            zone === 'left' || zone === 'right' ? 'horizontal' : 'vertical';
          onDrop(tabId, zone, sourceGroupId);
        }
      }

      setIsDragging(false);
      setActiveZone(null);
    },
    [groupId, moveTab, onDrop]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const zones: { id: DropZone; className: string }[] = [
    {
      id: 'left',
      className: 'absolute left-0 top-0 w-1/4 h-full',
    },
    {
      id: 'right',
      className: 'absolute right-0 top-0 w-1/4 h-full',
    },
    {
      id: 'top',
      className: 'absolute left-1/4 top-0 w-1/2 h-1/4',
    },
    {
      id: 'bottom',
      className: 'absolute left-1/4 bottom-0 w-1/2 h-1/4',
    },
    {
      id: 'center',
      className: 'absolute left-1/4 top-1/4 w-1/2 h-1/2',
    },
  ];

  return (
    <AnimatePresence>
      {isDragging && (
        <div
          className="absolute inset-0 z-50 pointer-events-auto"
          onDragLeave={handleDragLeave}
          data-testid="editor-drop-zones"
        >
          {zones.map((zone) => (
            <div
              key={zone.id}
              className={clsx(zone.className, 'transition-colors')}
              onDragEnter={handleDragEnter(zone.id)}
              onDragOver={handleDragOver}
              onDrop={handleDrop(zone.id)}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: activeZone === zone.id ? 0.4 : 0.15,
                }}
                exit={{ opacity: 0 }}
                className={clsx(
                  'absolute inset-1 rounded-lg border-2 border-dashed',
                  activeZone === zone.id
                    ? 'border-[var(--accent)] bg-[var(--accent)]'
                    : 'border-[var(--accent)] bg-[var(--accent-muted)]'
                )}
              />
            </div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
