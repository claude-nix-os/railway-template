'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Monitor,
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  ArrowLeft,
  ArrowRight,
  Globe,
  MousePointer,
  Camera,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { PanelProps } from '../../types';

/* ------------------------------------------------------------------ */
/*  GUI Session Viewer                                                 */
/* ------------------------------------------------------------------ */

export function GUISessionViewer({ panelId, tabId, sessionId, params }: PanelProps) {
  const [url, setUrl] = useState((params?.url as string) ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenshotMode, setScreenshotMode] = useState(false);

  const browserUrl = params?.browserUrl as string | undefined;

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--surface-0)' }}
      data-testid="gui-session-viewer"
    >
      {/* Browser chrome */}
      <div
        className="flex items-center gap-2 px-3 h-10 flex-shrink-0"
        style={{
          backgroundColor: 'var(--surface-1)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {/* Navigation buttons */}
        <div className="flex items-center gap-0.5">
          <button
            className="flex items-center justify-center w-7 h-7 rounded text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            className="flex items-center justify-center w-7 h-7 rounded text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors"
            title="Forward"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsLoading(!isLoading)}
            className="flex items-center justify-center w-7 h-7 rounded text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors"
            title="Refresh"
          >
            <RefreshCw
              className={clsx('w-3.5 h-3.5', isLoading && 'animate-spin')}
            />
          </button>
        </div>

        {/* URL bar */}
        <div
          className="flex items-center flex-1 gap-2 px-3 h-7 rounded-md"
          style={{
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Globe className="w-3 h-3 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL..."
            className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none font-mono"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setScreenshotMode(!screenshotMode)}
            className={clsx(
              'flex items-center justify-center w-7 h-7 rounded transition-colors',
              screenshotMode
                ? 'text-[var(--accent)] bg-[var(--accent-muted)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'
            )}
            title="Screenshot mode"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center justify-center w-7 h-7 rounded text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 relative overflow-hidden">
        {browserUrl ? (
          <iframe
            src={browserUrl}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms"
            title="GUI Session"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                }}
              >
                <Monitor className="w-10 h-10 text-[var(--accent)] opacity-50" />
              </div>
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
                GUI Browser Session
              </h3>
              <p className="text-xs text-[var(--text-tertiary)] text-center max-w-xs">
                This panel displays browser sessions controlled by Claude.
                Sessions are initiated through tool calls.
              </p>

              {/* Interaction indicators */}
              <div className="flex items-center gap-4 mt-6">
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
                  <MousePointer className="w-3 h-3" />
                  <span>Click</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
                  <Camera className="w-3 h-3" />
                  <span>Screenshot</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
                  <ExternalLink className="w-3 h-3" />
                  <span>Navigate</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Screenshot overlay */}
        {screenshotMode && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-dashed border-[var(--accent)] rounded-lg w-[80%] h-[80%] flex items-center justify-center">
              <span className="text-xs text-[var(--accent)] font-medium px-2 py-1 rounded bg-black/50">
                Click to capture screenshot
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div
        className="flex items-center justify-between px-3 h-6 flex-shrink-0 text-[10px] text-[var(--text-tertiary)]"
        style={{
          backgroundColor: 'var(--surface-1)',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <span>{isLoading ? 'Loading...' : 'Ready'}</span>
        <span>{url ? new URL(url).hostname : 'No URL'}</span>
      </div>
    </div>
  );
}
