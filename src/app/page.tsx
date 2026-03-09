'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/ui-store';
import { useSessionStore } from '@/stores/session-store';
import { MainLayout } from '@/components/layout/MainLayout';
import { registerPanel } from '@/components/layout/PanelWrapper';
import type { ConnectionStatus } from '@/types';

/* ------------------------------------------------------------------ */
/*  Lazy-loaded Panel Components                                       */
/* ------------------------------------------------------------------ */

import dynamic from 'next/dynamic';

const HomePanel = dynamic(() => import('@/components/panels/HomePanel').then(m => ({ default: m.default })), { ssr: false });
const ChatPanel = dynamic(() => import('@/components/panels/ChatPanel').then(m => ({ default: m.default })), { ssr: false });
const SettingsPanel = dynamic(() => import('@/components/panels/SettingsPanel').then(m => ({ default: m.default })), { ssr: false });
const ConversationList = dynamic(() => import('@/components/panels/ConversationList').then(m => ({ default: m.default })), { ssr: false });
const ExecutionGraph = dynamic(() => import('@/components/panels/ExecutionGraph').then(m => ({ default: m.default })), { ssr: false });
const ThoughtStream = dynamic(() => import('@/components/panels/ThoughtStream').then(m => ({ default: m.default })), { ssr: false });
const GUISessionViewer = dynamic(() => import('@/components/panels/GUISessionViewer').then(m => ({ default: m.default })), { ssr: false });
const MemoryGraph = dynamic(() => import('@/components/panels/MemoryGraph').then(m => ({ default: m.default })), { ssr: false });
const MemoryProjection = dynamic(() => import('@/components/panels/MemoryProjection').then(m => ({ default: m.default })), { ssr: false });
const N8nPanel = dynamic(() => import('@/components/panels/N8nPanel').then(m => ({ default: m.default })), { ssr: false });
const FileBrowser = dynamic(() => import('@/components/panels/FileBrowser').then(m => ({ default: m.default })), { ssr: false });
const TaskPanel = dynamic(() => import('@/components/panels/TaskPanel').then(m => ({ default: m.default })), { ssr: false });
const SessionDiffs = dynamic(() => import('@/components/panels/SessionDiffs').then(m => ({ default: m.default })), { ssr: false });
const RailwayPanel = dynamic(() => import('@/components/panels/RailwayPanel').then(m => ({ default: m.default })), { ssr: false });
const PasskeySettings = dynamic(() => import('@/components/panels/PasskeySettings').then(m => ({ default: m.default })), { ssr: false });

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function MainPage() {
  const router = useRouter();
  const { jwtToken, isAuthenticated } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [panelsRegistered, setPanelsRegistered] = useState(false);

  // Register all panels on mount
  useEffect(() => {
    if (panelsRegistered) return;

    registerPanel('home', HomePanel as any);
    registerPanel('chat', ChatPanel as any);
    registerPanel('settings', SettingsPanel as any);
    registerPanel('conversation-list', ConversationList as any);
    registerPanel('execution-graph', ExecutionGraph as any);
    registerPanel('thought-stream', ThoughtStream as any);
    registerPanel('gui-session', GUISessionViewer as any);
    registerPanel('memory-graph', MemoryGraph as any);
    registerPanel('memory-projection', MemoryProjection as any);
    registerPanel('n8n', N8nPanel as any);
    registerPanel('file-browser', FileBrowser as any);
    registerPanel('tasks', TaskPanel as any);
    registerPanel('session-diffs', SessionDiffs as any);
    registerPanel('railway', RailwayPanel as any);
    registerPanel('passkey-settings', PasskeySettings as any);

    setPanelsRegistered(true);
  }, [panelsRegistered]);

  useEffect(() => {
    // Check for stored JWT token
    const stored = typeof window !== 'undefined' ? localStorage.getItem('claude_os_jwt') : null;
    if (stored && !jwtToken) {
      useUIStore.getState().setJwtToken(stored);
    }
    setMounted(true);
  }, [jwtToken]);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-0">
        <div className="w-10 h-10 rounded-xl bg-accent animate-pulse" />
      </div>
    );
  }

  return <MainLayout connectionStatus={connectionStatus} />;
}
