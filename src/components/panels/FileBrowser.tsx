import React, { useEffect, useState, useCallback } from 'react';
import type { DirectoryEntry, FileResponse } from '@/types/file-explorer';
import { getFileIcon, getLanguage } from '@/lib/file-utils';

interface TreeNode {
  name: string;
  path: string;
  type: DirectoryEntry['type'];
  size: number;
  modified: string;
  children?: TreeNode[];
  expanded?: boolean;
  loading?: boolean;
}

const ICON_MAP: Record<string, string> = {
  directory: '\uD83D\uDCC1',
  file: '\uD83D\uDCC4',
  typescript: '\uD83D\uDD37',
  javascript: '\uD83D\uDFE1',
  react: '\u269B\uFE0F',
  json: '{ }',
  markdown: '\uD83D\uDCDD',
  python: '\uD83D\uDC0D',
  image: '\uD83D\uDDBC\uFE0F',
  terminal: '>_',
  docker: '\uD83D\uDC33',
  git: '\uD83D\uDD00',
  yaml: '\u2699\uFE0F',
  css: '\uD83C\uDFA8',
  html: '\uD83C\uDF10',
  database: '\uD83D\uDDC4\uFE0F',
  lock: '\uD83D\uDD12',
  text: '\uD83D\uDCC4',
  settings: '\u2699\uFE0F',
};

function getIcon(entry: DirectoryEntry): string {
  if (entry.type === 'directory') return ICON_MAP.directory;
  const icon = getFileIcon(entry.name);
  return ICON_MAP[icon] ?? ICON_MAP.file;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function FileBrowser() {
  const [currentPath, setCurrentPath] = useState('/data/workspace');
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const fetchDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Failed to load directory');
      }
      const data = await res.json() as { type: string; entries?: DirectoryEntry[] };
      if (data.type === 'directory' && data.entries) {
        setEntries(data.entries);
        setCurrentPath(path);
        setSelectedFile(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFileContent = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}&content=true`);
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Failed to load file');
      }
      const data = await res.json() as FileResponse;
      setSelectedFile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDirectory(currentPath);
  }, []);

  const handleEntryClick = useCallback((entry: DirectoryEntry) => {
    const fullPath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`;
    if (entry.type === 'directory') {
      fetchDirectory(fullPath);
    } else {
      fetchFileContent(fullPath);
    }
  }, [currentPath, fetchDirectory, fetchFileContent]);

  const navigateUp = useCallback(() => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    fetchDirectory(parentPath);
  }, [currentPath, fetchDirectory]);

  // Breadcrumb segments
  const pathSegments = currentPath.split('/').filter(Boolean);

  const navigateToSegment = useCallback((index: number) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    fetchDirectory(path);
  }, [pathSegments, fetchDirectory]);

  // Filter entries by search
  const filteredEntries = searchQuery
    ? entries.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : entries;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif', fontSize: 13 }}>
      {/* Toolbar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={navigateUp}
          disabled={currentPath === '/'}
          style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#d1d5db',
            padding: '4px 8px', borderRadius: 4, cursor: currentPath === '/' ? 'not-allowed' : 'pointer',
            fontSize: 12, opacity: currentPath === '/' ? 0.4 : 1,
          }}
        >
          Up
        </button>
        <input
          type="text"
          placeholder="Filter files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#e5e7eb', padding: '4px 8px', borderRadius: 4, fontSize: 12, outline: 'none',
          }}
        />
        <button
          onClick={() => fetchDirectory(currentPath)}
          style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#d1d5db',
            padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
          }}
        >
          Refresh
        </button>
      </div>

      {/* Breadcrumbs */}
      <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 12, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <span
          onClick={() => fetchDirectory('/')}
          style={{ cursor: 'pointer', color: '#60a5fa', padding: '2px 4px' }}
        >
          /
        </span>
        {pathSegments.map((segment, i) => (
          <React.Fragment key={i}>
            <span style={{ color: '#4b5563' }}>/</span>
            <span
              onClick={() => navigateToSegment(i)}
              style={{
                cursor: 'pointer', padding: '2px 4px', borderRadius: 3,
                color: i === pathSegments.length - 1 ? '#f9fafb' : '#60a5fa',
              }}
            >
              {segment}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
        {/* File list */}
        <div style={{ width: selectedFile ? '40%' : '100%', overflow: 'auto', borderRight: selectedFile ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
          {loading && !entries.length && (
            <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Loading...</div>
          )}

          {error && (
            <div style={{ padding: 16, color: '#ef4444' }}>{error}</div>
          )}

          {!loading && filteredEntries.length === 0 && !error && (
            <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
              {searchQuery ? 'No matching files' : 'Empty directory'}
            </div>
          )}

          {filteredEntries.map(entry => (
            <div
              key={entry.name}
              onClick={() => handleEntryClick(entry)}
              style={{
                display: 'flex', alignItems: 'center', padding: '6px 12px', cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: selectedFile?.path?.endsWith('/' + entry.name) ? 'rgba(59,130,246,0.15)' : 'transparent',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => {
                const isSelected = selectedFile?.path?.endsWith('/' + entry.name);
                (e.currentTarget as HTMLElement).style.background = isSelected ? 'rgba(59,130,246,0.15)' : 'transparent';
              }}
            >
              <span style={{ width: 24, textAlign: 'center', flexShrink: 0, fontSize: 14 }}>
                {getIcon(entry)}
              </span>
              <span style={{ flex: 1, marginLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.name}
              </span>
              <span style={{ color: '#6b7280', fontSize: 11, marginLeft: 8, flexShrink: 0 }}>
                {entry.type === 'file' ? formatSize(entry.size) : ''}
              </span>
              <span style={{ color: '#6b7280', fontSize: 11, marginLeft: 12, flexShrink: 0, width: 120, textAlign: 'right' }}>
                {formatDate(entry.modified)}
              </span>
            </div>
          ))}
        </div>

        {/* File content viewer */}
        {selectedFile && (
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontWeight: 600, color: '#f9fafb' }}>
                  {selectedFile.path.split('/').pop()}
                </span>
                <span style={{ color: '#6b7280', fontSize: 11, marginLeft: 8 }}>
                  {formatSize(selectedFile.size)}
                </span>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                style={{
                  background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 16, padding: '0 4px',
                }}
              >
                x
              </button>
            </div>
            <pre style={{
              flex: 1, margin: 0, padding: 12, fontSize: 12, fontFamily: 'monospace',
              overflow: 'auto', background: 'rgba(0,0,0,0.2)', lineHeight: 1.5,
              whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#d1d5db',
            }}>
              {selectedFile.content || '(empty file)'}
            </pre>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div style={{ padding: '4px 12px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
        <span>{filteredEntries.length} item{filteredEntries.length !== 1 ? 's' : ''}</span>
        <span>{currentPath}</span>
      </div>
    </div>
  );
}
