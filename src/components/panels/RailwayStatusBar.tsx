import React, { useEffect, useState, useCallback } from 'react';
import type { RailwayStatusResponse, RailwayDeploymentStatus } from '@/types/railway';

const STATUS_COLORS: Record<RailwayDeploymentStatus, string> = {
  healthy: '#22c55e',
  deploying: '#eab308',
  error: '#ef4444',
  unknown: '#6b7280',
};

const STATUS_TEXT: Record<RailwayDeploymentStatus, string> = {
  healthy: 'Connected',
  deploying: 'Deploying',
  error: 'Error',
  unknown: 'Offline',
};

export default function RailwayStatusBar() {
  const [status, setStatus] = useState<RailwayStatusResponse | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [deploymentInfo, setDeploymentInfo] = useState<{
    environment?: string;
    domain?: string;
    deploymentId?: string;
  }>({});

  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, infoRes] = await Promise.all([
        fetch('/api/railway/status'),
        fetch('/api/railway/info'),
      ]);

      if (statusRes.ok) {
        const data = await statusRes.json() as RailwayStatusResponse;
        setStatus(data);
      }

      if (infoRes.ok) {
        const info = await infoRes.json() as {
          environment?: {
            environmentName?: string;
            publicDomain?: string;
            deploymentId?: string;
          };
        };
        setDeploymentInfo({
          environment: info.environment?.environmentName ?? undefined,
          domain: info.environment?.publicDomain ?? undefined,
          deploymentId: info.environment?.deploymentId ?? undefined,
        });
      }
    } catch {
      setStatus({ isRailway: false, status: 'unknown' });
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const deploymentStatus = status?.status ?? 'unknown';
  const color = STATUS_COLORS[deploymentStatus];
  const text = STATUS_TEXT[deploymentStatus];

  if (!status?.isRailway) {
    return null;
  }

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
      role="status"
      aria-label={`Railway: ${text}`}
    >
      {/* Status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px', height: '100%' }}>
        <div
          style={{
            width: 7, height: 7, borderRadius: '50%',
            backgroundColor: color,
            boxShadow: `0 0 4px ${color}`,
          }}
        />
        <span style={{ fontSize: 11, color: '#d1d5db', fontWeight: 500 }}>Railway</span>
      </div>

      {/* Tooltip */}
      {tooltipVisible && (
        <div
          style={{
            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
            marginBottom: 6, background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '8px 12px', minWidth: 180, zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
          role="tooltip"
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#f9fafb', marginBottom: 6 }}>
            Railway Deployment
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span>Status:</span>
              <span style={{ color }}>{text}</span>
            </div>
            {deploymentInfo.environment && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span>Env:</span>
                <span style={{ color: '#d1d5db' }}>{deploymentInfo.environment}</span>
              </div>
            )}
            {deploymentInfo.domain && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span>Domain:</span>
                <span style={{ color: '#93c5fd', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                  {deploymentInfo.domain}
                </span>
              </div>
            )}
            {deploymentInfo.deploymentId && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Deploy:</span>
                <span style={{ color: '#d1d5db', fontFamily: 'monospace', fontSize: 10 }}>
                  {deploymentInfo.deploymentId.slice(0, 8)}...
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
