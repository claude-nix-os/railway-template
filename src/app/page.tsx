'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/ui-store';
import { MainLayout } from '@/components/layout/MainLayout';
import { registerPanel } from '@/components/layout/PanelWrapper';
import type { ConnectionStatus } from '@/types';

/* ------------------------------------------------------------------ */
/*  Lazy-loaded Panel Components                                       */
/* ------------------------------------------------------------------ */

import dynamic from 'next/dynamic';

/* Named exports → must map to { default: m.ComponentName } */
const HomePanel = dynamic(() => import('@/components/panels/HomePanel').then(m => ({ default: m.HomePanel })), { ssr: false });
const ChatPanel = dynamic(() => import('@/components/panels/ChatPanel').then(m => ({ default: m.ChatPanel })), { ssr: false });
const SettingsPanel = dynamic(() => import('@/components/panels/SettingsPanel').then(m => ({ default: m.SettingsPanel })), { ssr: false });
const ConversationList = dynamic(() => import('@/components/panels/ConversationList').then(m => ({ default: m.ConversationList })), { ssr: false });
const ExecutionGraph = dynamic(() => import('@/components/panels/ExecutionGraph').then(m => ({ default: m.ExecutionGraph })), { ssr: false });
const ThoughtStream = dynamic(() => import('@/components/panels/ThoughtStream').then(m => ({ default: m.ThoughtStream })), { ssr: false });
const GUISessionViewer = dynamic(() => import('@/components/panels/GUISessionViewer').then(m => ({ default: m.GUISessionViewer })), { ssr: false });
/* Default exports → m.default works */
const MemoryGraph = dynamic(() => import('@/components/panels/MemoryGraph'), { ssr: false });
const MemoryProjection = dynamic(() => import('@/components/panels/MemoryProjection'), { ssr: false });
const N8nPanel = dynamic(() => import('@/components/panels/N8nPanel'), { ssr: false });
const FileBrowser = dynamic(() => import('@/components/panels/FileBrowser'), { ssr: false });
const TaskPanel = dynamic(() => import('@/components/panels/TaskPanel'), { ssr: false });
const SessionDiffs = dynamic(() => import('@/components/panels/SessionDiffs'), { ssr: false });
const RailwayPanel = dynamic(() => import('@/components/panels/RailwayPanel'), { ssr: false });
const PasskeySettings = dynamic(() => import('@/components/panels/PasskeySettings'), { ssr: false });

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function MainPage() {
  const router = useRouter();
  const jwtToken = useUIStore((s) => s.jwtToken);
  const isAuthenticated = useUIStore((s) => s.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const panelsRegisteredRef = useRef(false);

  // Register all panels once on mount
  useEffect(() => {
    if (panelsRegisteredRef.current) return;
    panelsRegisteredRef.current = true;

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
  }, []);

  // Load JWT from localStorage on mount only
  useEffect(() => {
    const stored = localStorage.getItem('claude_os_jwt');
    if (stored && !useUIStore.getState().jwtToken) {
      useUIStore.getState().setJwtToken(stored);
    }
    setMounted(true);
  }, []);

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
