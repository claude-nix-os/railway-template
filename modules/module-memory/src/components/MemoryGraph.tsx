import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ForceGraph2D, {
  type ForceGraphMethods,
  type NodeObject,
  type LinkObject,
} from 'react-force-graph-2d';
import { useMemory } from '../hooks/useMemory';
import type { GraphNode, GraphEdge, Memory } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemoryGraphProps {
  userId?: string;
}

interface GraphNodeData extends NodeObject {
  id: string;
  text: string;
  user_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface GraphLinkData extends LinkObject {
  id: string;
  relation: string;
}

// ---------------------------------------------------------------------------
// Agent color map
// ---------------------------------------------------------------------------

const AGENT_COLORS: Record<string, string> = {
  global: '#6366f1', // indigo
  system: '#ec4899', // pink
  user: '#10b981',   // emerald
  claude: '#f59e0b', // amber
  default: '#8b5cf6', // violet
};

function getAgentColor(userId: string): string {
  return AGENT_COLORS[userId] ?? AGENT_COLORS.default;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  container: {
    display: 'flex',
    height: '100%',
    fontFamily: 'var(--font-sans, system-ui, sans-serif)',
    color: '#e4e4e7',
    backgroundColor: '#0a0a0f',
    overflow: 'hidden',
  } as React.CSSProperties,

  sidebar: {
    width: 300,
    minWidth: 260,
    borderRight: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  } as React.CSSProperties,

  sidebarHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    fontSize: 14,
    fontWeight: 600,
  } as React.CSSProperties,

  searchBox: {
    padding: '8px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  } as React.CSSProperties,

  searchInput: {
    width: '100%',
    padding: '6px 10px',
    fontSize: 13,
    borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#e4e4e7',
    outline: 'none',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  memoryList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '4px 0',
  } as React.CSSProperties,

  memoryItem: {
    padding: '8px 16px',
    fontSize: 12,
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    transition: 'background 0.15s',
  } as React.CSSProperties,

  memoryItemHover: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  } as React.CSSProperties,

  memoryText: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    lineHeight: '18px',
  } as React.CSSProperties,

  deleteBtn: {
    flexShrink: 0,
    padding: '2px 6px',
    fontSize: 11,
    borderRadius: 3,
    border: '1px solid rgba(255,80,80,0.3)',
    backgroundColor: 'transparent',
    color: '#f87171',
    cursor: 'pointer',
    transition: 'all 0.15s',
  } as React.CSSProperties,

  addSection: {
    padding: '10px 16px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    gap: 6,
  } as React.CSSProperties,

  addInput: {
    flex: 1,
    padding: '6px 10px',
    fontSize: 13,
    borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#e4e4e7',
    outline: 'none',
  } as React.CSSProperties,

  addBtn: {
    padding: '6px 12px',
    fontSize: 13,
    borderRadius: 4,
    border: '1px solid rgba(99,102,241,0.4)',
    backgroundColor: 'rgba(99,102,241,0.15)',
    color: '#a5b4fc',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  graphContainer: {
    flex: 1,
    position: 'relative' as const,
    overflow: 'hidden',
  } as React.CSSProperties,

  popup: {
    position: 'absolute' as const,
    padding: '12px 16px',
    maxWidth: 320,
    borderRadius: 8,
    backgroundColor: '#1e1e2e',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    fontSize: 13,
    lineHeight: '1.5',
    zIndex: 100,
    pointerEvents: 'auto' as const,
  } as React.CSSProperties,

  popupClose: {
    position: 'absolute' as const,
    top: 6,
    right: 8,
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: 1,
  } as React.CSSProperties,

  legend: {
    position: 'absolute' as const,
    bottom: 12,
    right: 12,
    padding: '8px 12px',
    borderRadius: 6,
    backgroundColor: 'rgba(30,30,46,0.9)',
    border: '1px solid rgba(255,255,255,0.08)',
    fontSize: 11,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  } as React.CSSProperties,

  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  } as React.CSSProperties,

  legendDot: (color: string) =>
    ({
      width: 8,
      height: 8,
      borderRadius: '50%',
      backgroundColor: color,
      flexShrink: 0,
    }) as React.CSSProperties,

  statusBar: {
    position: 'absolute' as const,
    top: 12,
    left: 12,
    padding: '4px 10px',
    borderRadius: 4,
    backgroundColor: 'rgba(30,30,46,0.9)',
    border: '1px solid rgba(255,255,255,0.08)',
    fontSize: 11,
    color: '#a1a1aa',
  } as React.CSSProperties,

  errorBanner: {
    padding: '8px 16px',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderBottom: '1px solid rgba(239,68,68,0.2)',
    color: '#f87171',
    fontSize: 12,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MemoryGraph({ userId = 'global' }: MemoryGraphProps) {
  const {
    memories,
    graph,
    loading,
    error,
    fetchAll,
    fetchGraph,
    addMemory,
    deleteMemory,
    searchMemories,
    clearError,
  } = useMemory(userId);

  const [filterText, setFilterText] = useState('');
  const [newMemoryText, setNewMemoryText] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const graphRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);

  // -----------------------------------------------------------------------
  // Initial data load
  // -----------------------------------------------------------------------

  useEffect(() => {
    fetchAll(userId);
    fetchGraph(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // -----------------------------------------------------------------------
  // Graph data transformation
  // -----------------------------------------------------------------------

  const graphData = useMemo(() => {
    if (!graph) return { nodes: [] as GraphNodeData[], links: [] as GraphLinkData[] };

    const nodes: GraphNodeData[] = graph.nodes.map((n: GraphNode) => ({
      id: n.id,
      text: n.text,
      user_id: n.user_id,
      metadata: n.metadata,
      created_at: n.created_at,
    }));

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links: GraphLinkData[] = graph.edges
      .filter(
        (e: GraphEdge) => nodeIds.has(e.source) && nodeIds.has(e.target)
      )
      .map((e: GraphEdge) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        relation: e.relation,
      }));

    return { nodes, links };
  }, [graph]);

  // -----------------------------------------------------------------------
  // Filtered memory list
  // -----------------------------------------------------------------------

  const filteredMemories = useMemo(() => {
    if (!filterText.trim()) return memories;
    const lower = filterText.toLowerCase();
    return memories.filter(
      (m: Memory) =>
        m.text.toLowerCase().includes(lower) ||
        m.id.toLowerCase().includes(lower)
    );
  }, [memories, filterText]);

  // -----------------------------------------------------------------------
  // Unique agent colors for legend
  // -----------------------------------------------------------------------

  const agentColorEntries = useMemo(() => {
    const userIds = new Set<string>();
    if (graph) {
      graph.nodes.forEach((n: GraphNode) => userIds.add(n.user_id));
    }
    memories.forEach((m: Memory) => userIds.add(m.user_id));
    if (userIds.size === 0) userIds.add('global');
    return Array.from(userIds).map((uid) => ({
      userId: uid,
      color: getAgentColor(uid),
    }));
  }, [graph, memories]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleAddMemory = useCallback(async () => {
    const text = newMemoryText.trim();
    if (!text) return;
    try {
      await addMemory({ text, user_id: userId });
      setNewMemoryText('');
      // Refresh graph to include new node
      await fetchGraph(userId);
    } catch {
      // Error state handled by hook
    }
  }, [newMemoryText, userId, addMemory, fetchGraph]);

  const handleDeleteMemory = useCallback(
    async (id: string) => {
      try {
        await deleteMemory(id);
        if (selectedNode?.id === id) setSelectedNode(null);
        await fetchGraph(userId);
      } catch {
        // Error state handled by hook
      }
    },
    [deleteMemory, userId, fetchGraph, selectedNode]
  );

  const handleNodeClick = useCallback(
    (node: NodeObject, event: MouseEvent) => {
      const gNode = node as GraphNodeData;
      setSelectedNode(gNode);
      // Position popup near the click
      const rect = containerRef.current?.getBoundingClientRect();
      const x = event.clientX - (rect?.left ?? 0);
      const y = event.clientY - (rect?.top ?? 0);
      setPopupPos({ x: Math.min(x, (rect?.width ?? 400) - 340), y });
    },
    []
  );

  const handleSearch = useCallback(
    async (query: string) => {
      setFilterText(query);
      if (query.trim().length >= 2) {
        try {
          await searchMemories({ query, user_id: userId, limit: 20 });
        } catch {
          // Error handled by hook
        }
      }
    },
    [userId, searchMemories]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleAddMemory();
      }
    },
    [handleAddMemory]
  );

  // -----------------------------------------------------------------------
  // Node & link rendering
  // -----------------------------------------------------------------------

  const nodeCanvasObject = useCallback(
    (
      node: NodeObject,
      ctx: CanvasRenderingContext2D,
      globalScale: number
    ) => {
      const gNode = node as GraphNodeData;
      const label = gNode.text.length > 30
        ? gNode.text.slice(0, 27) + '...'
        : gNode.text;
      const fontSize = Math.max(10 / globalScale, 3);
      const nodeRadius = 5;

      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, nodeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = getAgentColor(gNode.user_id);
      ctx.fill();

      if (selectedNode?.id === gNode.id) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      }

      // Draw label
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + nodeRadius + 2);
    },
    [selectedNode]
  );

  const linkCanvasObject = useCallback(
    (
      link: LinkObject,
      ctx: CanvasRenderingContext2D,
      globalScale: number
    ) => {
      const gLink = link as GraphLinkData;
      const source = link.source as NodeObject;
      const target = link.target as NodeObject;
      if (!source.x || !source.y || !target.x || !target.y) return;

      // Draw line
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();

      // Draw relation label at midpoint
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;
      const fontSize = Math.max(8 / globalScale, 2.5);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(gLink.relation, midX, midY);
    },
    []
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          Memories ({memories.length})
        </div>

        {/* Search */}
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Search memories..."
            value={filterText}
            onChange={(e) => handleSearch(e.target.value)}
            style={styles.searchInput}
            aria-label="Search memories"
          />
        </div>

        {/* Error banner */}
        {error && (
          <div style={styles.errorBanner}>
            <span>{error}</span>
            <button
              onClick={clearError}
              style={{
                background: 'none',
                border: 'none',
                color: '#f87171',
                cursor: 'pointer',
                fontSize: 14,
              }}
              aria-label="Dismiss error"
            >
              x
            </button>
          </div>
        )}

        {/* Memory list */}
        <div style={styles.memoryList} role="list" aria-label="Memory list">
          {filteredMemories.map((mem: Memory) => (
            <div
              key={mem.id}
              role="listitem"
              style={{
                ...styles.memoryItem,
                ...(hoveredItem === mem.id ? styles.memoryItemHover : {}),
              }}
              onMouseEnter={() => setHoveredItem(mem.id)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => {
                // Focus the node in the graph
                const node = graphData.nodes.find((n) => n.id === mem.id);
                if (node && graphRef.current) {
                  graphRef.current.centerAt(
                    node.x as number,
                    node.y as number,
                    400
                  );
                  graphRef.current.zoom(3, 400);
                }
                setSelectedNode(
                  node ?? {
                    id: mem.id,
                    text: mem.text,
                    user_id: mem.user_id,
                    metadata: mem.metadata,
                    created_at: mem.created_at,
                  }
                );
              }}
            >
              <div style={styles.memoryText} title={mem.text}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: getAgentColor(mem.user_id),
                    marginRight: 6,
                    verticalAlign: 'middle',
                  }}
                />
                {mem.text}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteMemory(mem.id);
                }}
                style={styles.deleteBtn}
                aria-label={`Delete memory: ${mem.text.slice(0, 30)}`}
              >
                Del
              </button>
            </div>
          ))}

          {filteredMemories.length === 0 && !loading && (
            <div
              style={{
                padding: '24px 16px',
                fontSize: 12,
                color: '#71717a',
                textAlign: 'center',
              }}
            >
              {filterText ? 'No matching memories' : 'No memories yet'}
            </div>
          )}

          {loading && (
            <div
              style={{
                padding: '24px 16px',
                fontSize: 12,
                color: '#71717a',
                textAlign: 'center',
              }}
            >
              Loading...
            </div>
          )}
        </div>

        {/* Add memory */}
        <div style={styles.addSection}>
          <input
            type="text"
            placeholder="New memory..."
            value={newMemoryText}
            onChange={(e) => setNewMemoryText(e.target.value)}
            onKeyDown={handleKeyDown}
            style={styles.addInput}
            aria-label="New memory text"
          />
          <button
            onClick={handleAddMemory}
            disabled={!newMemoryText.trim()}
            style={{
              ...styles.addBtn,
              opacity: newMemoryText.trim() ? 1 : 0.4,
            }}
            aria-label="Add memory"
          >
            Add
          </button>
        </div>
      </div>

      {/* Graph viewport */}
      <div style={styles.graphContainer} ref={containerRef}>
        <ForceGraph2D
          ref={graphRef as React.MutableRefObject<ForceGraphMethods | undefined>}
          graphData={graphData}
          nodeCanvasObject={nodeCanvasObject}
          linkCanvasObject={linkCanvasObject}
          onNodeClick={handleNodeClick}
          nodeId="id"
          backgroundColor="#0a0a0f"
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={0.85}
          enableNodeDrag
          enableZoomPanInteraction
          cooldownTicks={80}
          warmupTicks={20}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />

        {/* Status */}
        <div style={styles.statusBar}>
          {graphData.nodes.length} nodes, {graphData.links.length} edges
        </div>

        {/* Legend */}
        <div style={styles.legend}>
          <div style={{ fontWeight: 600, marginBottom: 2, fontSize: 11 }}>
            Agents
          </div>
          {agentColorEntries.map(({ userId: uid, color }) => (
            <div key={uid} style={styles.legendItem}>
              <div style={styles.legendDot(color)} />
              <span>{uid}</span>
            </div>
          ))}
        </div>

        {/* Node popup */}
        {selectedNode && (
          <div
            style={{
              ...styles.popup,
              left: popupPos.x,
              top: popupPos.y,
            }}
          >
            <button
              style={styles.popupClose}
              onClick={() => setSelectedNode(null)}
              aria-label="Close popup"
            >
              x
            </button>
            <div
              style={{
                fontWeight: 600,
                marginBottom: 6,
                paddingRight: 20,
                wordBreak: 'break-word',
              }}
            >
              {selectedNode.text}
            </div>
            <div style={{ color: '#a1a1aa', fontSize: 11, marginBottom: 4 }}>
              ID: {selectedNode.id}
            </div>
            <div style={{ color: '#a1a1aa', fontSize: 11, marginBottom: 4 }}>
              User: {selectedNode.user_id}
            </div>
            <div style={{ color: '#a1a1aa', fontSize: 11, marginBottom: 4 }}>
              Created: {new Date(selectedNode.created_at).toLocaleString()}
            </div>
            {Object.keys(selectedNode.metadata).length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#a1a1aa',
                    marginBottom: 2,
                  }}
                >
                  Metadata
                </div>
                <pre
                  style={{
                    fontSize: 11,
                    color: '#d4d4d8',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    padding: '6px 8px',
                    borderRadius: 4,
                    margin: 0,
                    overflowX: 'auto',
                    maxHeight: 120,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {JSON.stringify(selectedNode.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
