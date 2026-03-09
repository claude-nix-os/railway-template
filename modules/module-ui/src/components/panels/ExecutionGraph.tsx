'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { usePanelStore } from '../../stores/panel-store';
import type {
  PanelProps,
  GraphNode,
  GraphEdge,
  ExecutionGraphData,
  GraphNodeKind,
} from '../../types';

/* ------------------------------------------------------------------ */
/*  Node color mapping                                                 */
/* ------------------------------------------------------------------ */

const NODE_COLORS: Record<GraphNodeKind, string> = {
  'root-agent': '#6366f1',
  subagent: '#8b5cf6',
  teammate: '#a855f7',
  'tool-use': '#22c55e',
  'tool-result': '#3b82f6',
  thinking: '#f59e0b',
  message: '#71717a',
};

const NODE_RADII: Record<GraphNodeKind, number> = {
  'root-agent': 24,
  subagent: 20,
  teammate: 20,
  'tool-use': 14,
  'tool-result': 14,
  thinking: 12,
  message: 10,
};

/* ------------------------------------------------------------------ */
/*  Types for d3 simulation                                            */
/* ------------------------------------------------------------------ */

interface SimNode extends d3.SimulationNodeDatum, GraphNode {}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  label?: string;
}

/* ------------------------------------------------------------------ */
/*  Execution Graph Panel                                              */
/* ------------------------------------------------------------------ */

export function ExecutionGraph({ panelId, tabId, params }: PanelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const setCompanionPanel = usePanelStore((s) => s.setCompanionPanel);
  const openTab = usePanelStore((s) => s.openTab);

  /* Demo data -- in production, this comes from params or a store */
  const [graphData] = useState<ExecutionGraphData>(() => ({
    nodes: [
      { id: 'root', kind: 'root-agent', label: 'Main Agent' },
      { id: 'sub1', kind: 'subagent', label: 'Code Analysis', sessionId: 'session-1' },
      { id: 'sub2', kind: 'teammate', label: 'Test Writer', sessionId: 'session-2' },
      { id: 'tool1', kind: 'tool-use', label: 'Read File', toolCallId: 'tc-1' },
      { id: 'tool2', kind: 'tool-use', label: 'Write File', toolCallId: 'tc-2' },
      { id: 'result1', kind: 'tool-result', label: 'File Contents' },
      { id: 'think1', kind: 'thinking', label: 'Planning' },
      { id: 'msg1', kind: 'message', label: 'Response' },
    ],
    edges: [
      { source: 'root', target: 'think1' },
      { source: 'root', target: 'sub1' },
      { source: 'root', target: 'sub2' },
      { source: 'sub1', target: 'tool1' },
      { source: 'tool1', target: 'result1' },
      { source: 'sub1', target: 'tool2' },
      { source: 'root', target: 'msg1' },
    ],
  }));

  /* ---- Build graph ---- */
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = containerRef.current.getBoundingClientRect();

    /* Clear previous */
    svg.selectAll('*').remove();

    /* Set up zoom */
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    const g = svg.append('g');

    /* Build simulation data */
    const nodes: SimNode[] = graphData.nodes.map((n) => ({ ...n }));
    const links: SimLink[] = graphData.edges.map((e) => ({
      source: e.source,
      target: e.target,
      label: e.label,
    }));

    /* Simulation */
    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    simulationRef.current = simulation;

    /* Arrow marker */
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', 'var(--border-subtle)');

    /* Links */
    const link = g
      .append('g')
      .selectAll<SVGLineElement, SimLink>('line')
      .data(links)
      .join('line')
      .attr('class', 'graph-link')
      .attr('marker-end', 'url(#arrowhead)');

    /* Nodes */
    const node = g
      .append('g')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes)
      .join('g')
      .attr('class', 'graph-node')
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    /* Node circles */
    node
      .append('circle')
      .attr('r', (d) => NODE_RADII[d.kind])
      .attr('fill', (d) => NODE_COLORS[d.kind])
      .attr('stroke', 'var(--surface-0)')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))');

    /* Node labels */
    node
      .append('text')
      .attr('class', 'graph-label')
      .attr('dy', (d) => NODE_RADII[d.kind] + 14)
      .attr('text-anchor', 'middle')
      .text((d) => d.label);

    /* Click handlers */
    node.on('click', (event, d) => {
      event.stopPropagation();

      /* Show properties in companion panel */
      setCompanionPanel(true, {
        id: d.id,
        kind: d.kind,
        label: d.label,
        sessionId: d.sessionId,
        toolCallId: d.toolCallId,
        ...d.data,
      });

      /* Navigate to agent chat if it's an agent node */
      if (
        (d.kind === 'root-agent' || d.kind === 'subagent' || d.kind === 'teammate') &&
        d.sessionId
      ) {
        openTab('chat', {
          label: d.label,
          sessionId: d.sessionId,
        });
      }
    });

    /* Tick */
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0);

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, setCompanionPanel, openTab]);

  /* ---- Zoom controls ---- */
  const handleZoomIn = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 1.3);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 0.7);
    }
  }, []);

  const handleResetZoom = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, []);

  const handleFitView = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !zoomRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    d3.select(svgRef.current)
      .transition()
      .duration(500)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8)
      );
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      style={{ backgroundColor: 'var(--surface-0)' }}
      data-testid="execution-graph"
    >
      <svg ref={svgRef} className="w-full h-full" />

      {/* Zoom controls */}
      <div
        className="absolute bottom-4 right-4 flex flex-col gap-1 rounded-lg p-1"
        style={{
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <button
          onClick={handleZoomIn}
          className="flex items-center justify-center w-8 h-8 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="flex items-center justify-center w-8 h-8 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleFitView}
          className="flex items-center justify-center w-8 h-8 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors"
          title="Fit view"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="flex items-center justify-center w-8 h-8 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors"
          title="Reset"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div
        className="absolute top-4 left-4 rounded-lg p-3 space-y-1.5"
        style={{
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Legend
        </span>
        {(Object.entries(NODE_COLORS) as [GraphNodeKind, string][]).map(
          ([kind, color]) => (
            <div key={kind} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] text-[var(--text-secondary)] capitalize">
                {kind.replace('-', ' ')}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
