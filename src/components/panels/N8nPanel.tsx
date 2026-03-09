import React, { useState, useEffect, useRef } from 'react';

interface N8nPanelProps {
  /** Optional path to navigate the iframe to (e.g. /n8n/workflow/123) */
  navigateTo?: string;
}

type PanelStatus = 'loading' | 'ready' | 'error';

/**
 * N8nPanel renders n8n in a full-size iframe, embedding the workflow
 * automation UI directly within ClaudeOS.
 *
 * The iframe points to /n8n/ which is reverse-proxied to the internal
 * n8n instance on port 5678. Security headers (CSP, X-Frame-Options)
 * are stripped by the proxy to allow embedding.
 */
export default function N8nPanel({ navigateTo }: N8nPanelProps) {
  const [status, setStatus] = useState<PanelStatus>('loading');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const healthCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Poll n8n health endpoint until it's ready
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 60;

    const checkHealth = async () => {
      try {
        const res = await fetch('/n8n/healthz');
        if (res.ok && !cancelled) {
          setStatus('ready');
          return;
        }
      } catch {
        // n8n not ready yet
      }

      attempts++;
      if (attempts >= maxAttempts && !cancelled) {
        setStatus('error');
        return;
      }

      if (!cancelled) {
        healthCheckRef.current = setTimeout(checkHealth, 2000);
      }
    };

    checkHealth();

    return () => {
      cancelled = true;
      if (healthCheckRef.current) {
        clearTimeout(healthCheckRef.current);
      }
    };
  }, []);

  // Navigate the iframe when navigateTo prop changes
  useEffect(() => {
    if (navigateTo && iframeRef.current && status === 'ready') {
      try {
        iframeRef.current.src = navigateTo;
      } catch {
        // Cross-origin restrictions may prevent direct src set in some cases
        iframeRef.current.setAttribute('src', navigateTo);
      }
    }
  }, [navigateTo, status]);

  if (status === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          fontFamily: 'var(--font-sans, sans-serif)',
          color: '#888',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            border: '2px solid rgba(255,255,255,0.15)',
            borderTopColor: '#888',
            borderRadius: '50%',
            animation: 'n8n-spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: '13px' }}>Starting n8n...</span>
        <style>{`
          @keyframes n8n-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          fontFamily: 'var(--font-sans, sans-serif)',
          color: '#f44',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 600 }}>
          n8n Unavailable
        </span>
        <span style={{ fontSize: '12px', color: '#888' }}>
          The n8n service failed to start. Check the system logs for details.
        </span>
        <button
          onClick={() => {
            setStatus('loading');
            window.location.reload();
          }}
          style={{
            marginTop: '8px',
            padding: '6px 16px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.15)',
            backgroundColor: 'rgba(255,255,255,0.08)',
            color: 'inherit',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={navigateTo || '/n8n/'}
      title="n8n Workflow Automation"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
      }}
      allow="clipboard-read; clipboard-write"
    />
  );
}
