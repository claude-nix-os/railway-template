import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { UMAP } from 'umap-js';
import { useMemory } from '@/hooks/useMemory';
import type { Memory } from '@/types/memory';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemoryProjectionProps {
  userId?: string;
  sessionId?: string; // Optional session filter
}

type DistanceMetric = 'cosine' | 'euclidean' | 'manhattan';

interface ProjectedPoint {
  x: number;
  y: number;
  memory: Memory;
}

// ---------------------------------------------------------------------------
// Text to simple embedding (bag-of-words TF vector)
// ---------------------------------------------------------------------------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function buildVocabulary(texts: string[]): Map<string, number> {
  const vocab = new Map<string, number>();
  for (const text of texts) {
    const tokens = tokenize(text);
    for (const token of tokens) {
      if (!vocab.has(token)) {
        vocab.set(token, vocab.size);
      }
    }
  }
  return vocab;
}

function textToVector(text: string, vocab: Map<string, number>): number[] {
  const vector = new Array(vocab.size).fill(0);
  const tokens = tokenize(text);
  const total = tokens.length || 1;
  for (const token of tokens) {
    const idx = vocab.get(token);
    if (idx !== undefined) {
      vector[idx] += 1 / total;
    }
  }
  return vector;
}

// ---------------------------------------------------------------------------
// Distance functions for UMAP
// ---------------------------------------------------------------------------

function cosineDistance(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  if (magA === 0 || magB === 0) return 1;
  return 1 - dot / (magA * magB);
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function manhattanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum;
}

const DISTANCE_FUNCTIONS: Record<DistanceMetric, (a: number[], b: number[]) => number> = {
  cosine: cosineDistance,
  euclidean: euclideanDistance,
  manhattan: manhattanDistance,
};

// ---------------------------------------------------------------------------
// Canvas-based scatter plot
// ---------------------------------------------------------------------------

interface ScatterPlotProps {
  points: ProjectedPoint[];
  selectedIdx: number | null;
  onSelect: (idx: number | null) => void;
  width: number;
  height: number;
}

function ScatterPlot({ points, selectedIdx, onSelect, width, height }: ScatterPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const PADDING = 40;

  // Compute bounds
  const bounds = useMemo(() => {
    if (points.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    // Add margin
    const dx = (maxX - minX) * 0.05 || 1;
    const dy = (maxY - minY) * 0.05 || 1;
    return { minX: minX - dx, maxX: maxX + dx, minY: minY - dy, maxY: maxY + dy };
  }, [points]);

  const toScreen = useCallback(
    (px: number, py: number): [number, number] => {
      const plotW = width - 2 * PADDING;
      const plotH = height - 2 * PADDING;
      const x = PADDING + ((px - bounds.minX) / (bounds.maxX - bounds.minX)) * plotW;
      const y = PADDING + ((py - bounds.minY) / (bounds.maxY - bounds.minY)) * plotH;
      return [x, height - y]; // flip Y
    },
    [width, height, bounds]
  );

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // HiDPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const frac = i / 4;
      const x = PADDING + frac * (width - 2 * PADDING);
      const y = PADDING + frac * (height - 2 * PADDING);
      ctx.beginPath();
      ctx.moveTo(x, PADDING);
      ctx.lineTo(x, height - PADDING);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(PADDING, y);
      ctx.lineTo(width - PADDING, y);
      ctx.stroke();
    }

    // Points
    const POINT_RADIUS = 4;
    const SELECTED_RADIUS = 7;
    const COLORS = [
      '#6366f1',
      '#ec4899',
      '#10b981',
      '#f59e0b',
      '#8b5cf6',
      '#06b6d4',
      '#f43f5e',
      '#84cc16',
    ];

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const [sx, sy] = toScreen(p.x, p.y);
      const isSelected = selectedIdx === i;
      const color = COLORS[i % COLORS.length];

      ctx.beginPath();
      ctx.arc(sx, sy, isSelected ? SELECTED_RADIUS : POINT_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? '#ffffff' : color;
      ctx.globalAlpha = isSelected ? 1.0 : 0.75;
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw label
        const label =
          p.memory.text.length > 40
            ? p.memory.text.slice(0, 37) + '...'
            : p.memory.text;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e4e4e7';
        ctx.globalAlpha = 1.0;
        ctx.fillText(label, sx, sy - SELECTED_RADIUS - 6);
      }
    }

    ctx.globalAlpha = 1.0;
  }, [points, selectedIdx, width, height, toScreen]);

  // Click handler
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let closest = -1;
      let closestDist = Infinity;
      for (let i = 0; i < points.length; i++) {
        const [sx, sy] = toScreen(points[i].x, points[i].y);
        const d = Math.sqrt((clickX - sx) ** 2 + (clickY - sy) ** 2);
        if (d < 15 && d < closestDist) {
          closest = i;
          closestDist = d;
        }
      }
      onSelect(closest >= 0 ? closest : null);
    },
    [points, toScreen, onSelect]
  );

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ cursor: 'crosshair', display: 'block' }}
      aria-label="Memory projection scatter plot"
    />
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    fontFamily: 'var(--font-sans, system-ui, sans-serif)',
    color: '#e4e4e7',
    backgroundColor: '#0a0a0f',
    overflow: 'hidden',
  } as React.CSSProperties,

  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '10px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    flexWrap: 'wrap' as const,
    fontSize: 12,
  } as React.CSSProperties,

  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  } as React.CSSProperties,

  label: {
    color: '#a1a1aa',
    fontSize: 11,
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  select: {
    padding: '4px 8px',
    fontSize: 12,
    borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#e4e4e7',
    outline: 'none',
  } as React.CSSProperties,

  slider: {
    width: 80,
    accentColor: '#6366f1',
  } as React.CSSProperties,

  plotArea: {
    flex: 1,
    position: 'relative' as const,
    overflow: 'hidden',
  } as React.CSSProperties,

  detailPanel: {
    padding: '10px 16px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    fontSize: 12,
    maxHeight: 120,
    overflowY: 'auto' as const,
  } as React.CSSProperties,

  infoMessage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    color: '#71717a',
    fontSize: 13,
  } as React.CSSProperties,
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MemoryProjection({
  userId = 'global',
  sessionId,
}: MemoryProjectionProps) {
  const { memories, loading, error, fetchAll, clearError } = useMemory(userId);

  // UMAP parameters
  const [metric, setMetric] = useState<DistanceMetric>('cosine');
  const [nNeighbors, setNNeighbors] = useState(15);
  const [minDist, setMinDist] = useState(0.1);
  const [spread, setSpread] = useState(1.0);

  // Projection state
  const [projectedPoints, setProjectedPoints] = useState<ProjectedPoint[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [computing, setComputing] = useState(false);

  // Container dimensions
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  // -----------------------------------------------------------------------
  // Resize observer
  // -----------------------------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });

    observer.observe(container);
    // Set initial dimensions
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDimensions({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    }

    return () => observer.disconnect();
  }, []);

  // -----------------------------------------------------------------------
  // Data load
  // -----------------------------------------------------------------------

  useEffect(() => {
    fetchAll(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // -----------------------------------------------------------------------
  // Filter by session if provided
  // -----------------------------------------------------------------------

  const filteredMemories = useMemo(() => {
    if (!sessionId) return memories;
    return memories.filter(
      (m: Memory) =>
        (m.metadata as Record<string, unknown>)?.session_id === sessionId
    );
  }, [memories, sessionId]);

  // -----------------------------------------------------------------------
  // Compute UMAP projection
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (filteredMemories.length < 3) {
      // Need at least 3 points for UMAP
      setProjectedPoints(
        filteredMemories.map((m: Memory, i: number) => ({
          x: i,
          y: 0,
          memory: m,
        }))
      );
      return;
    }

    setComputing(true);
    setSelectedIdx(null);

    // Run UMAP in a microtask to avoid blocking UI
    const timeoutId = setTimeout(() => {
      try {
        const texts = filteredMemories.map((m: Memory) => m.text);
        const vocab = buildVocabulary(texts);
        const vectors = texts.map((t) => textToVector(t, vocab));

        // Clamp nNeighbors to valid range
        const effectiveNeighbors = Math.min(
          nNeighbors,
          filteredMemories.length - 1
        );

        const umap = new UMAP({
          nComponents: 2,
          nNeighbors: Math.max(2, effectiveNeighbors),
          minDist,
          spread,
          distanceFn: DISTANCE_FUNCTIONS[metric],
          nEpochs: 200,
        });

        const embedding = umap.fit(vectors);

        const points: ProjectedPoint[] = embedding.map(
          ([x, y]: number[], i: number) => ({
            x,
            y,
            memory: filteredMemories[i],
          })
        );

        setProjectedPoints(points);
      } catch (err) {
        console.error('UMAP computation error:', err);
        // Fallback: spread points linearly
        setProjectedPoints(
          filteredMemories.map((m: Memory, i: number) => ({
            x: i % 10,
            y: Math.floor(i / 10),
            memory: m,
          }))
        );
      } finally {
        setComputing(false);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [filteredMemories, metric, nNeighbors, minDist, spread]);

  // -----------------------------------------------------------------------
  // Selected memory detail
  // -----------------------------------------------------------------------

  const selectedMemory =
    selectedIdx !== null && selectedIdx < projectedPoints.length
      ? projectedPoints[selectedIdx].memory
      : null;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading && memories.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.infoMessage}>Loading memories...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.controlGroup}>
          <span style={styles.label}>Metric:</span>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as DistanceMetric)}
            style={styles.select}
            aria-label="Distance metric"
          >
            <option value="cosine">Cosine</option>
            <option value="euclidean">Euclidean</option>
            <option value="manhattan">Manhattan</option>
          </select>
        </div>

        <div style={styles.controlGroup}>
          <span style={styles.label}>Neighbors: {nNeighbors}</span>
          <input
            type="range"
            min={2}
            max={50}
            value={nNeighbors}
            onChange={(e) => setNNeighbors(parseInt(e.target.value, 10))}
            style={styles.slider}
            aria-label="Number of neighbors"
          />
        </div>

        <div style={styles.controlGroup}>
          <span style={styles.label}>Min dist: {minDist.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={minDist * 100}
            onChange={(e) => setMinDist(parseInt(e.target.value, 10) / 100)}
            style={styles.slider}
            aria-label="Minimum distance"
          />
        </div>

        <div style={styles.controlGroup}>
          <span style={styles.label}>Spread: {spread.toFixed(1)}</span>
          <input
            type="range"
            min={1}
            max={50}
            value={spread * 10}
            onChange={(e) => setSpread(parseInt(e.target.value, 10) / 10)}
            style={styles.slider}
            aria-label="Spread"
          />
        </div>

        <div style={{ color: '#71717a', fontSize: 11, marginLeft: 'auto' }}>
          {filteredMemories.length} memories
          {sessionId ? ` (session: ${sessionId.slice(0, 8)}...)` : ''}
          {computing ? ' | Computing...' : ''}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '6px 16px',
            backgroundColor: 'rgba(239,68,68,0.12)',
            color: '#f87171',
            fontSize: 12,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            onClick={clearError}
            style={{
              background: 'none',
              border: 'none',
              color: '#f87171',
              cursor: 'pointer',
            }}
            aria-label="Dismiss error"
          >
            x
          </button>
        </div>
      )}

      {/* Plot area */}
      <div style={styles.plotArea} ref={containerRef}>
        {filteredMemories.length === 0 ? (
          <div style={styles.infoMessage}>
            No memories to project{sessionId ? ' for this session' : ''}
          </div>
        ) : (
          <ScatterPlot
            points={projectedPoints}
            selectedIdx={selectedIdx}
            onSelect={setSelectedIdx}
            width={dimensions.width}
            height={dimensions.height}
          />
        )}
      </div>

      {/* Detail panel */}
      {selectedMemory && (
        <div style={styles.detailPanel}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {selectedMemory.text}
          </div>
          <div style={{ color: '#a1a1aa' }}>
            ID: {selectedMemory.id} | User: {selectedMemory.user_id} | Created:{' '}
            {new Date(selectedMemory.created_at).toLocaleString()}
            {Object.keys(selectedMemory.metadata).length > 0 && (
              <span> | Meta: {JSON.stringify(selectedMemory.metadata)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
