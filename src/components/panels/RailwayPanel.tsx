import React, { useEffect, useState, useCallback } from 'react';
import type {
  RailwayInfoResponse,
  RailwayStatusResponse,
  RailwayDeploymentStatus,
  RailwayEnvVar,
} from '@/types/railway';

/** Color mapping for deployment status */
const STATUS_COLORS: Record<RailwayDeploymentStatus, string> = {
  healthy: '#22c55e',
  deploying: '#eab308',
  error: '#ef4444',
  unknown: '#6b7280',
};

/** Label mapping for deployment status */
const STATUS_LABELS: Record<RailwayDeploymentStatus, string> = {
  healthy: 'Healthy',
  deploying: 'Deploying',
  error: 'Error',
  unknown: 'Unknown',
};

interface EnvVarRowProps {
  envVar: RailwayEnvVar;
  revealed: boolean;
  onToggle: () => void;
}

function EnvVarRow({ envVar, revealed, onToggle }: EnvVarRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#93c5fd', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {envVar.key}
      </span>
      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#d1d5db', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: 8 }}>
        {envVar.masked && !revealed ? envVar.value : (revealed ? '(reveal not available in masked mode)' : envVar.value)}
      </span>
      {envVar.masked && (
        <button
          onClick={onToggle}
          style={{
            background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer',
            fontSize: 11, padding: '2px 6px', marginLeft: 4, flexShrink: 0,
          }}
          aria-label={revealed ? 'Hide value' : 'Reveal value'}
        >
          {revealed ? 'Hide' : 'Show'}
        </button>
      )}
    </div>
  );
}

export default function RailwayPanel() {
  const [status, setStatus] = useState<RailwayStatusResponse | null>(null);
  const [info, setInfo] = useState<RailwayInfoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const [revealedVars, setRevealedVars] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, infoRes] = await Promise.all([
        fetch('/api/railway/status'),
        fetch('/api/railway/info'),
      ]);

      if (!statusRes.ok || !infoRes.ok) {
        throw new Error('Failed to fetch Railway data');
      }

      const [statusData, infoData] = await Promise.all([
        statusRes.json() as Promise<RailwayStatusResponse>,
        infoRes.json() as Promise<RailwayInfoResponse>,
      ]);

      setStatus(statusData);
      setInfo(infoData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Railway information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRestart = useCallback(async () => {
    setRestarting(true);
    try {
      const res = await fetch('/api/railway/restart', { method: 'POST' });
      if (!res.ok) throw new Error('Restart request failed');
      setTimeout(fetchData, 5000);
    } catch {
      setError('Failed to restart service');
    } finally {
      setRestarting(false);
    }
  }, [fetchData]);

  const toggleReveal = useCallback((key: string) => {
    setRevealedVars(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  if (loading && !status) {
    return (
      <div style={{ padding: 24, color: '#9ca3af', textAlign: 'center' }}>
        Loading Railway information...
      </div>
    );
  }

  if (error && !status) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: '#ef4444', marginBottom: 12 }}>{error}</div>
        <button
          onClick={fetchData}
          style={{
            background: '#3b82f6', color: '#fff', border: 'none',
            padding: '6px 16px', borderRadius: 4, cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const env = info?.environment;
  const deploymentStatus = status?.status ?? 'unknown';
  const statusColor = STATUS_COLORS[deploymentStatus];

  return (
    <div style={{ padding: 16, color: '#e5e7eb', fontFamily: 'system-ui, sans-serif', fontSize: 13 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          backgroundColor: statusColor, marginRight: 8, flexShrink: 0,
          boxShadow: `0 0 6px ${statusColor}`,
        }} />
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#f9fafb' }}>
          Railway Deployment
        </h2>
        <span style={{
          marginLeft: 'auto', fontSize: 11, padding: '2px 8px',
          borderRadius: 10, backgroundColor: `${statusColor}22`, color: statusColor,
          fontWeight: 500,
        }}>
          {STATUS_LABELS[deploymentStatus]}
        </span>
      </div>

      {/* Deployment Info */}
      {env && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Deployment Info
          </h3>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: 12 }}>
            <InfoRow label="Project ID" value={env.projectId} />
            <InfoRow label="Service ID" value={env.serviceId} />
            <InfoRow label="Environment" value={env.environmentName} />
            <InfoRow label="Deployment ID" value={env.deploymentId} />
            <InfoRow label="Domain" value={env.publicDomain} />
            <InfoRow label="Region" value={env.region} />
          </div>
        </div>
      )}

      {/* Environment Variables */}
      {info?.envVars && info.envVars.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Environment Variables
          </h3>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: 12, maxHeight: 300, overflowY: 'auto' }}>
            {info.envVars.map(envVar => (
              <EnvVarRow
                key={envVar.key}
                envVar={envVar}
                revealed={revealedVars.has(envVar.key)}
                onToggle={() => toggleReveal(envVar.key)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {info?.dashboardUrl && (
          <a
            href={info.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#4f46e5', color: '#fff', border: 'none',
              padding: '6px 16px', borderRadius: 4, cursor: 'pointer',
              textDecoration: 'none', fontSize: 12, fontWeight: 500,
            }}
          >
            Open Dashboard
          </a>
        )}
        <button
          onClick={handleRestart}
          disabled={restarting}
          style={{
            background: restarting ? '#374151' : '#dc2626', color: '#fff', border: 'none',
            padding: '6px 16px', borderRadius: 4, cursor: restarting ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 500, opacity: restarting ? 0.6 : 1,
          }}
        >
          {restarting ? 'Restarting...' : 'Restart Service'}
        </button>
        <button
          onClick={fetchData}
          style={{
            background: '#374151', color: '#d1d5db', border: 'none',
            padding: '6px 16px', borderRadius: 4, cursor: 'pointer',
            fontSize: 12, fontWeight: 500,
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 12, color: '#ef4444', fontSize: 12 }}>{error}</div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ display: 'flex', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ color: '#9ca3af', fontSize: 12, width: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#e5e7eb', fontSize: 12, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value ?? '-'}
      </span>
    </div>
  );
}
