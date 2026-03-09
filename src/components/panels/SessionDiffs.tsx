import React, { useEffect, useState, useCallback } from 'react';
import type { DiffResponse, DiffFile, DiffHunk, DiffLine } from '@/types/file-explorer';

const STATUS_COLORS: Record<DiffFile['status'], string> = {
  added: '#22c55e',
  modified: '#eab308',
  deleted: '#ef4444',
  renamed: '#60a5fa',
};

const STATUS_LABELS: Record<DiffFile['status'], string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
};

function DiffLineComponent({ line }: { line: DiffLine }) {
  const bgColor = line.type === 'addition' ? 'rgba(34,197,94,0.1)' :
    line.type === 'deletion' ? 'rgba(239,68,68,0.1)' : 'transparent';
  const textColor = line.type === 'addition' ? '#4ade80' :
    line.type === 'deletion' ? '#f87171' : '#9ca3af';
  const prefix = line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' ';

  return (
    <div style={{
      display: 'flex', fontFamily: 'monospace', fontSize: 12, lineHeight: '20px',
      background: bgColor, minWidth: 'fit-content',
    }}>
      <span style={{ width: 48, textAlign: 'right', paddingRight: 8, color: '#4b5563', flexShrink: 0, userSelect: 'none' }}>
        {line.oldLineNumber ?? ''}
      </span>
      <span style={{ width: 48, textAlign: 'right', paddingRight: 8, color: '#4b5563', flexShrink: 0, userSelect: 'none' }}>
        {line.newLineNumber ?? ''}
      </span>
      <span style={{ color: textColor, paddingRight: 8, flexShrink: 0, userSelect: 'none' }}>{prefix}</span>
      <span style={{ color: textColor, whiteSpace: 'pre' }}>{line.content}</span>
    </div>
  );
}

function FileSection({ file, hunks, expanded, onToggle }: {
  file: DiffFile;
  hunks: DiffHunk[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusColor = STATUS_COLORS[file.status];

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      {/* File header */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', padding: '8px 12px',
          cursor: 'pointer', gap: 8,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <span style={{ fontSize: 10, color: '#6b7280', width: 14, textAlign: 'center' }}>
          {expanded ? '\u25BC' : '\u25B6'}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, color: statusColor,
          padding: '1px 4px', borderRadius: 3, background: `${statusColor}22`,
        }}>
          {STATUS_LABELS[file.status]}
        </span>
        <span style={{ fontSize: 12, color: '#e5e7eb', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {file.path}
        </span>
        <span style={{ fontSize: 11, color: '#22c55e', flexShrink: 0 }}>+{file.additions}</span>
        <span style={{ fontSize: 11, color: '#ef4444', flexShrink: 0 }}>-{file.deletions}</span>
      </div>

      {/* Diff hunks */}
      {expanded && (
        <div style={{ overflow: 'auto', maxHeight: 500, background: 'rgba(0,0,0,0.15)' }}>
          {hunks.map((hunk, i) => (
            <div key={i}>
              <div style={{
                padding: '4px 12px', fontSize: 11, color: '#6366f1',
                fontFamily: 'monospace', background: 'rgba(99,102,241,0.08)',
              }}>
                {hunk.header}
              </div>
              {hunk.lines.map((line, j) => (
                <DiffLineComponent key={`${i}-${j}`} line={line} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SessionDiffs() {
  const [diff, setDiff] = useState<DiffResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const fetchDiff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/workspace?action=diff');
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Failed to load diff');
      }
      const data = await res.json() as DiffResponse;
      setDiff(data);
      // Expand all files by default
      setExpandedFiles(new Set(data.files.map(f => f.path)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiff();
  }, [fetchDiff]);

  const toggleFile = useCallback((path: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (!diff) return;
    if (expandedFiles.size === diff.files.length) {
      setExpandedFiles(new Set());
    } else {
      setExpandedFiles(new Set(diff.files.map(f => f.path)));
    }
  }, [diff, expandedFiles]);

  if (loading) {
    return <div style={{ padding: 24, color: '#6b7280', textAlign: 'center' }}>Loading workspace diff...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: '#ef4444', marginBottom: 12 }}>{error}</div>
        <button
          onClick={fetchDiff}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 4, cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!diff || diff.files.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
        <div style={{ fontSize: 14, marginBottom: 8 }}>No workspace changes</div>
        <div style={{ fontSize: 12 }}>Your working directory is clean</div>
        <button
          onClick={fetchDiff}
          style={{ marginTop: 12, background: '#374151', color: '#d1d5db', border: 'none', padding: '6px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div style={{ color: '#e5e7eb', fontFamily: 'system-ui, sans-serif', fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Summary header */}
      <div style={{
        padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ fontWeight: 600, color: '#f9fafb' }}>Workspace Changes</span>
          <span style={{ marginLeft: 12, fontSize: 12, color: '#6b7280' }}>
            {diff.summary.filesChanged} file{diff.summary.filesChanged !== 1 ? 's' : ''} changed
          </span>
          <span style={{ marginLeft: 8, fontSize: 12, color: '#22c55e' }}>+{diff.summary.totalAdditions}</span>
          <span style={{ marginLeft: 4, fontSize: 12, color: '#ef4444' }}>-{diff.summary.totalDeletions}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={toggleAll}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#d1d5db',
              padding: '3px 10px', borderRadius: 3, cursor: 'pointer', fontSize: 11,
            }}
          >
            {expandedFiles.size === diff.files.length ? 'Collapse All' : 'Expand All'}
          </button>
          <button
            onClick={fetchDiff}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#d1d5db',
              padding: '3px 10px', borderRadius: 3, cursor: 'pointer', fontSize: 11,
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* File list with diffs */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {diff.files.map(file => (
          <FileSection
            key={file.path}
            file={file}
            hunks={diff.hunks[file.path] ?? []}
            expanded={expandedFiles.has(file.path)}
            onToggle={() => toggleFile(file.path)}
          />
        ))}
      </div>
    </div>
  );
}
