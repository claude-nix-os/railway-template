import React, { useEffect, useState, useCallback } from 'react';
import type { DirectoryEntry } from '../types';
import { getFileIcon } from '../lib/file-utils';

const ICON_MAP: Record<string, string> = {
  directory: '\uD83D\uDCC1',
  file: '\uD83D\uDCC4',
  typescript: '\uD83D\uDD37',
  javascript: '\uD83D\uDFE1',
  react: '\u269B\uFE0F',
  json: '{ }',
  markdown: '\uD83D\uDCDD',
  python: '\uD83D\uDC0D',
  terminal: '>_',
  yaml: '\u2699\uFE0F',
  css: '\uD83C\uDFA8',
  html: '\uD83C\uDF10',
};

function getIcon(entry: DirectoryEntry): string {
  if (entry.type === 'directory') return ICON_MAP.directory;
  const icon = getFileIcon(entry.name);
  return ICON_MAP[icon] ?? ICON_MAP.file;
}

interface TreeItem {
  entry: DirectoryEntry;
  path: string;
  depth: number;
  expanded: boolean;
  children?: DirectoryEntry[];
}

export default function FilesSidebar() {
  const [rootEntries, setRootEntries] = useState<DirectoryEntry[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [childEntries, setChildEntries] = useState<Record<string, DirectoryEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const basePath = '/data/workspace';

  const fetchEntries = useCallback(async (path: string): Promise<DirectoryEntry[]> => {
    const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error('Failed to load');
    const data = await res.json() as { type: string; entries?: DirectoryEntry[] };
    return data.entries ?? [];
  }, []);

  useEffect(() => {
    fetchEntries(basePath)
      .then(setRootEntries)
      .catch(() => setError('Failed to load workspace'))
      .finally(() => setLoading(false));
  }, [fetchEntries]);

  const toggleDir = useCallback(async (dirPath: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(dirPath)) {
      newExpanded.delete(dirPath);
    } else {
      newExpanded.add(dirPath);
      if (!childEntries[dirPath]) {
        try {
          const entries = await fetchEntries(dirPath);
          setChildEntries(prev => ({ ...prev, [dirPath]: entries }));
        } catch {
          // Failed to load children
        }
      }
    }
    setExpandedPaths(newExpanded);
  }, [expandedPaths, childEntries, fetchEntries]);

  const renderEntries = (entries: DirectoryEntry[], parentPath: string, depth: number): React.ReactNode => {
    return entries.map(entry => {
      const fullPath = `${parentPath}/${entry.name}`;
      const isExpanded = expandedPaths.has(fullPath);
      const isDir = entry.type === 'directory';
      const children = childEntries[fullPath];

      return (
        <React.Fragment key={fullPath}>
          <div
            onClick={() => isDir ? toggleDir(fullPath) : undefined}
            style={{
              display: 'flex', alignItems: 'center', padding: '3px 8px',
              paddingLeft: 8 + depth * 16, cursor: isDir ? 'pointer' : 'default',
              fontSize: 12, lineHeight: '20px',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {isDir && (
              <span style={{ width: 14, textAlign: 'center', flexShrink: 0, fontSize: 10, color: '#6b7280', marginRight: 2 }}>
                {isExpanded ? '\u25BC' : '\u25B6'}
              </span>
            )}
            {!isDir && <span style={{ width: 16, flexShrink: 0 }} />}
            <span style={{ marginRight: 6, fontSize: 13, flexShrink: 0 }}>
              {getIcon(entry)}
            </span>
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              color: isDir ? '#93c5fd' : '#d1d5db',
            }}>
              {entry.name}
            </span>
          </div>
          {isDir && isExpanded && children && renderEntries(children, fullPath, depth + 1)}
        </React.Fragment>
      );
    });
  };

  if (loading) {
    return <div style={{ padding: 12, color: '#6b7280', fontSize: 12 }}>Loading workspace...</div>;
  }

  if (error) {
    return <div style={{ padding: 12, color: '#ef4444', fontSize: 12 }}>{error}</div>;
  }

  return (
    <div style={{ color: '#e5e7eb', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>
          Files
        </span>
        <button
          style={{
            background: '#3b82f6', color: '#fff', border: 'none',
            padding: '3px 10px', borderRadius: 3, cursor: 'pointer', fontSize: 11,
          }}
        >
          Open File Browser
        </button>
      </div>
      <div style={{ overflow: 'auto', maxHeight: 400 }}>
        {rootEntries.length === 0 ? (
          <div style={{ padding: 12, color: '#6b7280', fontSize: 12 }}>No files in workspace</div>
        ) : (
          renderEntries(rootEntries, basePath, 0)
        )}
      </div>
    </div>
  );
}
