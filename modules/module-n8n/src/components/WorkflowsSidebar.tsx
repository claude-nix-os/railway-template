import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { N8nWorkflow, N8nExecution } from '../types';

interface WorkflowsSidebarProps {
  /** Callback to navigate the n8n panel iframe */
  onNavigate?: (path: string) => void;
  /** Auth token for API requests */
  authToken?: string;
}

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const REFRESH_INTERVAL = 15_000; // 15 seconds

/**
 * Format a date string into a relative time (e.g. "2m ago", "1h ago").
 */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Extract schedule info from workflow nodes (Cron, Schedule Trigger, etc.).
 */
function extractScheduleInfo(workflow: N8nWorkflow): string | null {
  if (!workflow.nodes) return null;

  for (const node of workflow.nodes) {
    const typeLower = node.type.toLowerCase();
    if (
      typeLower.includes('cron') ||
      typeLower.includes('schedule') ||
      typeLower.includes('interval')
    ) {
      // Try to extract human-readable schedule from parameters
      const params = node.parameters;
      if (!params) return 'Scheduled';

      if (typeof params.rule === 'string') return params.rule;
      if (typeof params.interval === 'object' && params.interval !== null) {
        const interval = params.interval as Record<string, unknown>;
        if (interval.field && interval.value) {
          return `Every ${interval.value} ${interval.field}`;
        }
      }
      if (typeof params.cronExpression === 'string') {
        return `Cron: ${params.cronExpression}`;
      }
      return 'Scheduled';
    }
  }

  return null;
}

/**
 * Collapsible section used for "Workflows" and "Recent Runs" groups.
 */
function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: '8px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          width: '100%',
          padding: '4px 8px',
          background: 'none',
          border: 'none',
          color: '#999',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            transition: 'transform 0.15s ease',
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            fontSize: '10px',
          }}
        >
          &#9654;
        </span>
        {title}
      </button>
      {isOpen && (
        <div style={{ paddingLeft: '4px' }}>{children}</div>
      )}
    </div>
  );
}

/**
 * Status dot indicating workflow active/inactive state.
 */
function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: active ? '#4caf50' : '#666',
        flexShrink: 0,
      }}
    />
  );
}

/**
 * Execution status icon.
 */
function ExecutionStatusIcon({ status }: { status: N8nExecution['status'] }) {
  switch (status) {
    case 'running':
    case 'new':
      return (
        <span
          style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            border: '1.5px solid transparent',
            borderTopColor: '#ff9800',
            borderRadius: '50%',
            animation: 'exec-spin 0.8s linear infinite',
            flexShrink: 0,
          }}
        />
      );
    case 'success':
      return (
        <span style={{ color: '#4caf50', fontSize: '12px', flexShrink: 0 }}>
          &#10003;
        </span>
      );
    case 'error':
      return (
        <span style={{ color: '#f44336', fontSize: '12px', flexShrink: 0 }}>
          &#10007;
        </span>
      );
    case 'waiting':
      return (
        <span style={{ color: '#ff9800', fontSize: '12px', flexShrink: 0 }}>
          &#9679;
        </span>
      );
    default:
      return (
        <span style={{ color: '#666', fontSize: '12px', flexShrink: 0 }}>
          &#8226;
        </span>
      );
  }
}

/**
 * WorkflowsSidebar provides a sidebar section for browsing n8n workflows
 * and recent execution runs. It auto-refreshes every 15 seconds.
 */
export default function WorkflowsSidebar({ onNavigate, authToken }: WorkflowsSidebarProps) {
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [executions, setExecutions] = useState<N8nExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
      const [wfRes, exRes] = await Promise.allSettled([
        fetch('/api/n8n?resource=workflows', { headers }),
        fetch('/api/n8n?resource=executions', { headers }),
      ]);

      if (wfRes.status === 'fulfilled' && wfRes.value.ok) {
        const wfData = await wfRes.value.json();
        const wfList = wfData?.data || wfData?.items || [];
        setWorkflows(Array.isArray(wfList) ? wfList : []);
      }

      if (exRes.status === 'fulfilled' && exRes.value.ok) {
        const exData = await exRes.value.json();
        const exList = exData?.data || exData?.items || [];
        setExecutions(Array.isArray(exList) ? exList : []);
      }
    } catch (err) {
      console.error('[WorkflowsSidebar] Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchData();

    refreshRef.current = setInterval(fetchData, REFRESH_INTERVAL);

    return () => {
      if (refreshRef.current) {
        clearInterval(refreshRef.current);
      }
    };
  }, [fetchData]);

  const handleOpenN8n = () => {
    onNavigate?.('/n8n/');
  };

  const handleWorkflowClick = (workflow: N8nWorkflow) => {
    onNavigate?.(`/n8n/workflow/${workflow.id}`);
  };

  const handleExecutionClick = (execution: N8nExecution) => {
    onNavigate?.(`/n8n/workflow/${execution.workflowId}/executions/${execution.id}`);
  };

  return (
    <div
      style={{
        fontFamily: 'var(--font-sans, sans-serif)',
        fontSize: '13px',
        padding: '8px 0',
      }}
    >
      <style>{`
        @keyframes exec-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Open n8n Button */}
      <div style={{ padding: '0 12px 12px' }}>
        <button
          onClick={handleOpenN8n}
          style={{
            width: '100%',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.15)',
            backgroundColor: 'rgba(255,255,255,0.08)',
            color: 'inherit',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          Open n8n
        </button>
      </div>

      {loading && (
        <div style={{ padding: '0 12px', color: '#888', fontSize: '12px' }}>
          Loading...
        </div>
      )}

      {!loading && (
        <>
          {/* Workflows Section */}
          <CollapsibleSection title="Workflows" defaultOpen={true}>
            {workflows.length === 0 ? (
              <div
                style={{
                  padding: '4px 12px',
                  color: '#666',
                  fontSize: '12px',
                  fontStyle: 'italic',
                }}
              >
                No workflows yet
              </div>
            ) : (
              workflows.map((workflow) => {
                const scheduleInfo = extractScheduleInfo(workflow);
                return (
                  <button
                    key={workflow.id}
                    onClick={() => handleWorkflowClick(workflow)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      width: '100%',
                      padding: '4px 12px',
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: '2px',
                      fontSize: '13px',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                        'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                        'transparent';
                    }}
                  >
                    <StatusDot active={workflow.active} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {workflow.name}
                      </div>
                      {scheduleInfo && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#888',
                            marginTop: '1px',
                          }}
                        >
                          {scheduleInfo}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </CollapsibleSection>

          {/* Recent Runs Section */}
          <CollapsibleSection title="Recent Runs" defaultOpen={true}>
            {executions.length === 0 ? (
              <div
                style={{
                  padding: '4px 12px',
                  color: '#666',
                  fontSize: '12px',
                  fontStyle: 'italic',
                }}
              >
                No recent runs
              </div>
            ) : (
              executions.map((execution) => (
                <button
                  key={execution.id}
                  onClick={() => handleExecutionClick(execution)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '4px 12px',
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'left',
                    borderRadius: '2px',
                    fontSize: '13px',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      'transparent';
                  }}
                >
                  <ExecutionStatusIcon status={execution.status} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {execution.workflowData?.name || `Workflow ${execution.workflowId}`}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#888',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatRelativeTime(execution.startedAt)}
                  </span>
                </button>
              ))
            )}
          </CollapsibleSection>
        </>
      )}
    </div>
  );
}
