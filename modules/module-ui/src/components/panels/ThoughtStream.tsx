'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Loader2 } from 'lucide-react';
import { useSessionStore } from '../../stores/session-store';
import type { PanelProps, Message } from '../../types';

/* ------------------------------------------------------------------ */
/*  Thought Stream Panel                                               */
/* ------------------------------------------------------------------ */

export function ThoughtStream({ panelId, tabId, sessionId }: PanelProps) {
  const messages = useSessionStore((s) =>
    sessionId ? s.getMessages(sessionId) : []
  );
  const streamPhase = useSessionStore((s) =>
    sessionId ? s.getStreamPhase(sessionId) : 'idle'
  );
  const isCurrentlyStreaming = useSessionStore((s) =>
    sessionId ? s.isStreaming(sessionId) : false
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Collect all thinking content from messages */
  const thinkingEntries = messages
    .filter((m) => m.thinkingContent)
    .map((m) => ({
      id: m.id,
      content: m.thinkingContent!,
      timestamp: m.timestamp,
      isActive: isCurrentlyStreaming && streamPhase === 'thinking' &&
        m.id === useSessionStore.getState().streamingMessageId[sessionId ?? ''],
    }));

  /* Auto-scroll */
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [thinkingEntries]);

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--surface-0)' }}
      data-testid="thought-stream"
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 h-10 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <Brain className="w-4 h-4 text-[var(--accent)]" />
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          Thought Stream
        </span>
        {isCurrentlyStreaming && streamPhase === 'thinking' && (
          <Loader2 className="w-3.5 h-3.5 text-[var(--accent)] animate-spin ml-auto" />
        )}
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        {thinkingEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Brain className="w-12 h-12 text-[var(--text-tertiary)] mb-3 opacity-30" />
            <p className="text-sm text-[var(--text-tertiary)]">
              No thinking content yet
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Thinking blocks will appear here during streaming
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {thinkingEntries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative"
                >
                  {/* Time label */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: entry.isActive
                          ? 'var(--accent)'
                          : 'var(--text-tertiary)',
                        boxShadow: entry.isActive
                          ? '0 0 8px var(--accent-glow)'
                          : 'none',
                      }}
                    />
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {new Date(entry.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    {entry.isActive && (
                      <span className="text-[10px] text-[var(--accent)] font-medium">
                        active
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div
                    className="pl-4 text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap"
                    style={{
                      borderLeft: `2px solid ${
                        entry.isActive
                          ? 'var(--accent)'
                          : 'var(--border-subtle)'
                      }`,
                    }}
                  >
                    <span className={entry.isActive ? 'streaming-cursor' : ''}>
                      {entry.content}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
