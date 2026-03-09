'use client';

import React from 'react';
import {
  Wifi,
  WifiOff,
  Loader2,
  AlertCircle,
  Shield,
  Cpu,
  GitBranch,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useSessionStore } from '../../stores/session-store';
import { usePanelStore } from '../../stores/panel-store';
import type { ConnectionStatus, ModelId, PermissionMode } from '../../types';
import { MODELS, PERMISSION_MODES } from '../../types';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface StatusBarProps {
  connectionStatus: ConnectionStatus;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function StatusBar({ connectionStatus }: StatusBarProps) {
  const statusBarVisible = usePanelStore((s) => s.statusBarVisible);
  const activeSession = useSessionStore((s) => s.getActiveSession());

  if (!statusBarVisible) return null;

  const model = activeSession
    ? MODELS.find((m) => m.id === activeSession.model)
    : MODELS[1]; /* default to Sonnet */

  const permMode = activeSession
    ? PERMISSION_MODES.find((p) => p.id === activeSession.permissionMode)
    : PERMISSION_MODES[0];

  return (
    <div
      className="flex items-center justify-between h-[22px] px-2 text-[11px] select-none"
      style={{
        backgroundColor: 'var(--surface-1)',
        borderTop: '1px solid var(--border-subtle)',
      }}
      data-testid="status-bar"
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <ConnectionIndicator status={connectionStatus} />

        {/* Branch */}
        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
          <GitBranch className="w-3 h-3" />
          <span>main</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Permission mode */}
        {permMode && (
          <div className="flex items-center gap-1 text-[var(--text-secondary)]">
            <Shield className="w-3 h-3" />
            <span>{permMode.label}</span>
          </div>
        )}

        {/* Model */}
        {model && (
          <div className="flex items-center gap-1 text-[var(--text-secondary)]">
            <Cpu className="w-3 h-3" />
            <span>{model.shortName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Connection Indicator                                               */
/* ------------------------------------------------------------------ */

function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  const config = {
    connected: {
      icon: Wifi,
      label: 'Connected',
      color: 'var(--success)',
    },
    connecting: {
      icon: Loader2,
      label: 'Connecting...',
      color: 'var(--warning)',
    },
    disconnected: {
      icon: WifiOff,
      label: 'Disconnected',
      color: 'var(--text-tertiary)',
    },
    error: {
      icon: AlertCircle,
      label: 'Error',
      color: 'var(--error)',
    },
  }[status];

  const Icon = config.icon;

  return (
    <div
      className="flex items-center gap-1"
      style={{ color: config.color }}
      title={config.label}
    >
      <Icon
        className={clsx(
          'w-3 h-3',
          status === 'connecting' && 'animate-spin'
        )}
      />
      <span>{config.label}</span>
    </div>
  );
}
