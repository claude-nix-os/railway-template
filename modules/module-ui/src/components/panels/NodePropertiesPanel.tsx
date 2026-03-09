'use client';

import React from 'react';
import {
  Hash,
  Tag,
  Type,
  Link as LinkIcon,
  Database,
} from 'lucide-react';
import { usePanelStore } from '../../stores/panel-store';
import type { PanelProps, GraphNodeKind } from '../../types';

/* ------------------------------------------------------------------ */
/*  Node kind icons                                                    */
/* ------------------------------------------------------------------ */

const KIND_COLORS: Record<string, string> = {
  'root-agent': '#6366f1',
  subagent: '#8b5cf6',
  teammate: '#a855f7',
  'tool-use': '#22c55e',
  'tool-result': '#3b82f6',
  thinking: '#f59e0b',
  message: '#71717a',
};

/* ------------------------------------------------------------------ */
/*  Node Properties Panel                                              */
/* ------------------------------------------------------------------ */

export function NodePropertiesPanel({ panelId, tabId }: PanelProps) {
  const data = usePanelStore((s) => s.companionPanelData);

  if (!data) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ backgroundColor: 'var(--surface-0)' }}
        data-testid="node-properties-empty"
      >
        <p className="text-xs text-[var(--text-tertiary)]">
          Select a node in the execution graph to view its properties
        </p>
      </div>
    );
  }

  const kind = data.kind as string;
  const kindColor = KIND_COLORS[kind] ?? 'var(--text-tertiary)';

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--surface-0)' }}
      data-testid="node-properties-panel"
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 h-10 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: kindColor }}
        />
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {(data.label as string) ?? 'Node Properties'}
        </span>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {/* ID */}
        <PropertyRow
          icon={Hash}
          label="ID"
          value={data.id as string}
        />

        {/* Kind */}
        <PropertyRow
          icon={Tag}
          label="Kind"
          value={kind}
          valueColor={kindColor}
        />

        {/* Label */}
        <PropertyRow
          icon={Type}
          label="Label"
          value={data.label as string}
        />

        {/* Session ID */}
        {data.sessionId && (
          <PropertyRow
            icon={LinkIcon}
            label="Session ID"
            value={data.sessionId as string}
          />
        )}

        {/* Tool Call ID */}
        {data.toolCallId && (
          <PropertyRow
            icon={LinkIcon}
            label="Tool Call ID"
            value={data.toolCallId as string}
          />
        )}

        {/* Additional data */}
        {Object.entries(data).filter(
          ([key]) =>
            !['id', 'kind', 'label', 'sessionId', 'toolCallId'].includes(key)
        ).length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Database className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Additional Data
              </span>
            </div>
            <pre className="text-[11px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap break-all p-3 rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)]">
              {JSON.stringify(
                Object.fromEntries(
                  Object.entries(data).filter(
                    ([key]) =>
                      !['id', 'kind', 'label', 'sessionId', 'toolCallId'].includes(
                        key
                      )
                  )
                ),
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Property Row                                                       */
/* ------------------------------------------------------------------ */

function PropertyRow({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] block">
          {label}
        </span>
        <span
          className="text-xs font-mono break-all"
          style={{ color: valueColor ?? 'var(--text-secondary)' }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
