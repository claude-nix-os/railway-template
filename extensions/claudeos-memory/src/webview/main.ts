/**
 * Main webview script for ClaudeOS Memory Graph Visualizer
 * Lightweight vanilla TypeScript implementation with force-graph library
 */

import ForceGraph from 'force-graph';
import type {
  AppState,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  ForceGraphNode,
  ForceGraphLink,
} from './types';
import { GraphNode, GraphEdge } from '../types';

/* ------------------------------------------------------------------ */
/*  VS Code API                                                       */
/* ------------------------------------------------------------------ */

// Acquire VS Code API (must be called once)
const vscode = acquireVsCodeApi<AppState>();

/* ------------------------------------------------------------------ */
/*  State Management                                                  */
/* ------------------------------------------------------------------ */

let state: AppState = {
  scope: 'session',
  selectedNodeId: null,
  isLoading: false,
  error: null,
  nodes: [],
  edges: [],
};

// Restore previous state if available
const previousState = vscode.getState();
if (previousState) {
  state = previousState;
}

function updateState(updates: Partial<AppState>): void {
  state = { ...state, ...updates };
  vscode.setState(state);
  render();
}

/* ------------------------------------------------------------------ */
/*  Force Graph Instance                                              */
/* ------------------------------------------------------------------ */

let graph: ReturnType<typeof ForceGraph> | null = null;

/* ------------------------------------------------------------------ */
/*  Message Passing with Extension                                    */
/* ------------------------------------------------------------------ */

function postMessage(message: WebviewToExtensionMessage): void {
  vscode.postMessage(message);
}

// Handle messages from extension
window.addEventListener('message', (event) => {
  const message: ExtensionToWebviewMessage = event.data;

  switch (message.type) {
    case 'updateGraph':
      handleUpdateGraph(message.data.nodes, message.data.edges);
      break;

    case 'selectNode':
      handleSelectNode(message.nodeId);
      break;

    case 'changeScope':
      handleChangeScope(message.scope);
      break;

    case 'error':
      handleError(message.message);
      break;

    case 'loading':
      handleLoading(message.isLoading);
      break;
  }
});

/* ------------------------------------------------------------------ */
/*  Event Handlers                                                    */
/* ------------------------------------------------------------------ */

function handleUpdateGraph(nodes: GraphNode[], edges: GraphEdge[]): void {
  updateState({
    nodes,
    edges,
    isLoading: false,
    error: null,
  });

  // Update the graph visualization
  updateGraphVisualization();
}

function handleSelectNode(nodeId: string): void {
  updateState({ selectedNodeId: nodeId });

  // Highlight the node in the graph
  if (graph) {
    const node = state.nodes.find((n) => n.id === nodeId);
    if (node) {
      graph.centerAt(
        (node as ForceGraphNode).x || 0,
        (node as ForceGraphNode).y || 0,
        1000
      );
      graph.zoom(2, 1000);
    }
  }

  renderNodeDetails();
}

function handleChangeScope(scope: 'global' | 'project' | 'session'): void {
  updateState({ scope });
}

function handleError(message: string): void {
  updateState({
    error: message,
    isLoading: false,
  });
}

function handleLoading(isLoading: boolean): void {
  updateState({ isLoading });
}

/* ------------------------------------------------------------------ */
/*  User Actions                                                      */
/* ------------------------------------------------------------------ */

function onScopeChange(scope: 'global' | 'project' | 'session'): void {
  updateState({ scope, isLoading: true });
  postMessage({
    type: 'scopeChanged',
    scope,
  });
}

function onNodeClick(node: ForceGraphNode): void {
  updateState({ selectedNodeId: node.id });
  postMessage({
    type: 'nodeClicked',
    nodeId: node.id,
  });
  renderNodeDetails();
}

function onRefresh(): void {
  updateState({ isLoading: true });
  postMessage({
    type: 'refreshRequested',
  });
}

function onExport(): void {
  postMessage({
    type: 'exportRequested',
  });
}

/* ------------------------------------------------------------------ */
/*  Graph Visualization                                               */
/* ------------------------------------------------------------------ */

function initializeGraph(): void {
  const container = document.getElementById('graph-container');
  if (!container) return;

  // Create force-directed graph
  graph = ForceGraph()(container)
    .graphData({ nodes: [], links: [] })
    .nodeId('id')
    .nodeLabel((node: any) => {
      const n = node as ForceGraphNode;
      return `${n.text}\n\nUser: ${n.user_id}\nCreated: ${new Date(
        n.created_at
      ).toLocaleString()}`;
    })
    .nodeColor((node: any) => getNodeColor((node as ForceGraphNode).user_id))
    .nodeVal((node: any) => 5) // Node size
    .nodeCanvasObject((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as ForceGraphNode;
      const label = n.text;
      const fontSize = 12 / globalScale;
      ctx.font = `${fontSize}px Sans-Serif`;

      // Draw node circle
      const nodeSize = 5;
      ctx.fillStyle = n.id === state.selectedNodeId ? '#fff' : getNodeColor(n.user_id);
      ctx.beginPath();
      ctx.arc(n.x || 0, n.y || 0, nodeSize, 0, 2 * Math.PI, false);
      ctx.fill();

      // Draw selection ring if selected
      if (n.id === state.selectedNodeId) {
        ctx.strokeStyle = getNodeColor(n.user_id);
        ctx.lineWidth = 2 / globalScale;
        ctx.beginPath();
        ctx.arc(n.x || 0, n.y || 0, nodeSize + 2, 0, 2 * Math.PI, false);
        ctx.stroke();
      }

      // Draw label
      const textWidth = ctx.measureText(label).width;
      const bckgDimensions = [textWidth, fontSize].map((n) => n + fontSize * 0.4);

      ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
      ctx.fillRect(
        (n.x || 0) - bckgDimensions[0] / 2,
        (n.y || 0) - nodeSize - bckgDimensions[1] - 2,
        bckgDimensions[0],
        bckgDimensions[1]
      );

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(label, n.x || 0, (n.y || 0) - nodeSize - fontSize / 2 - 2);
    })
    .linkLabel((link: any) => {
      const l = link as ForceGraphLink;
      return `Relation: ${l.relation}`;
    })
    .linkColor((link: any) => '#666')
    .linkWidth(2)
    .linkDirectionalParticles(2)
    .linkDirectionalParticleWidth(2)
    .onNodeClick((node: any) => onNodeClick(node as ForceGraphNode))
    .onBackgroundClick(() => {
      updateState({ selectedNodeId: null });
      renderNodeDetails();
    })
    .d3Force('charge', (d3: any) => d3.forceManyBody().strength(-200))
    .d3Force('link', (d3: any) => d3.forceLink().distance(100))
    .cooldownTicks(100)
    .onEngineStop(() => {
      // Graph has stabilized
    });

  // Set canvas dimensions
  graph.width(container.offsetWidth);
  graph.height(container.offsetHeight);

  // Handle window resize
  window.addEventListener('resize', () => {
    if (graph && container) {
      graph.width(container.offsetWidth);
      graph.height(container.offsetHeight);
    }
  });
}

function updateGraphVisualization(): void {
  if (!graph) return;

  // Convert nodes and edges to force-graph format
  const nodes: ForceGraphNode[] = state.nodes.map((node) => ({
    ...node,
    color: getNodeColor(node.user_id),
    val: 5,
  }));

  const links: ForceGraphLink[] = state.edges.map((edge) => ({
    ...edge,
    source: edge.source,
    target: edge.target,
    color: '#666',
  }));

  // Update graph data
  graph.graphData({ nodes, links });

  // Re-heat simulation to settle new layout
  graph.d3ReheatSimulation();
}

function getNodeColor(userId: string): string {
  // Color by user_id type
  if (userId === 'global') {
    return '#6366f1'; // indigo
  } else if (userId === 'system') {
    return '#ec4899'; // pink
  } else if (userId.startsWith('user-')) {
    return '#10b981'; // emerald
  } else if (userId.startsWith('claude-')) {
    return '#f59e0b'; // amber
  }
  return '#8b5cf6'; // purple - default
}

/* ------------------------------------------------------------------ */
/*  Rendering                                                         */
/* ------------------------------------------------------------------ */

function render(): void {
  renderToolbar();
  renderGraphState();
  renderNodeDetails();
}

function renderToolbar(): void {
  const toolbar = document.getElementById('toolbar');
  if (!toolbar) return;

  toolbar.innerHTML = `
    <div class="toolbar-section">
      <label for="scope-select">Scope:</label>
      <select id="scope-select" class="scope-select">
        <option value="session" ${state.scope === 'session' ? 'selected' : ''}>Session</option>
        <option value="project" ${state.scope === 'project' ? 'selected' : ''}>Project</option>
        <option value="global" ${state.scope === 'global' ? 'selected' : ''}>Global</option>
      </select>
    </div>
    <div class="toolbar-section">
      <button id="refresh-btn" class="toolbar-btn" ${state.isLoading ? 'disabled' : ''}>
        <span class="icon">↻</span>
        Refresh
      </button>
      <button id="export-btn" class="toolbar-btn">
        <span class="icon">↓</span>
        Export
      </button>
    </div>
  `;

  attachToolbarListeners();
}

function renderGraphState(): void {
  const graphContainer = document.getElementById('graph-container');
  if (!graphContainer) return;

  // Show loading or error overlays
  let overlay = document.querySelector('.graph-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'graph-overlay';
    graphContainer.appendChild(overlay);
  }

  if (state.isLoading) {
    overlay.innerHTML = `
      <div class="overlay-content">
        <div class="spinner"></div>
        <p>Loading memory graph...</p>
      </div>
    `;
    overlay.classList.add('visible');
  } else if (state.error) {
    overlay.innerHTML = `
      <div class="overlay-content">
        <div class="error-icon">⚠</div>
        <p class="error-message">${escapeHtml(state.error)}</p>
        <button id="retry-btn" class="retry-btn">Retry</button>
      </div>
    `;
    overlay.classList.add('visible');

    const retryBtn = overlay.querySelector('#retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', onRefresh);
    }
  } else if (state.nodes.length === 0) {
    overlay.innerHTML = `
      <div class="overlay-content">
        <p class="empty-state">No memories found for this scope</p>
      </div>
    `;
    overlay.classList.add('visible');
  } else {
    overlay.classList.remove('visible');
  }
}

function renderNodeDetails(): void {
  const detailsPanel = document.getElementById('node-details');
  if (!detailsPanel) return;

  if (!state.selectedNodeId) {
    detailsPanel.innerHTML = `
      <div class="details-empty">
        <p>Click a node to view details</p>
      </div>
    `;
    return;
  }

  const node = state.nodes.find((n) => n.id === state.selectedNodeId);
  if (!node) {
    detailsPanel.innerHTML = `
      <div class="details-empty">
        <p>Node not found</p>
      </div>
    `;
    return;
  }

  // Find connected edges
  const connectedEdges = state.edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );

  detailsPanel.innerHTML = `
    <div class="details-header">
      <h3>Memory Details</h3>
      <button id="close-details" class="close-btn" aria-label="Close details">×</button>
    </div>
    <div class="details-content">
      <div class="detail-section">
        <label>Text:</label>
        <p class="detail-text">${escapeHtml(node.text)}</p>
      </div>
      <div class="detail-section">
        <label>User ID:</label>
        <p class="detail-badge" style="background-color: ${getNodeColor(node.user_id)}">
          ${escapeHtml(node.user_id)}
        </p>
      </div>
      <div class="detail-section">
        <label>Created:</label>
        <p>${new Date(node.created_at).toLocaleString()}</p>
      </div>
      ${Object.keys(node.metadata).length > 0 ? `
        <div class="detail-section">
          <label>Metadata:</label>
          <pre class="detail-metadata">${escapeHtml(JSON.stringify(node.metadata, null, 2))}</pre>
        </div>
      ` : ''}
      ${connectedEdges.length > 0 ? `
        <div class="detail-section">
          <label>Relations (${connectedEdges.length}):</label>
          <ul class="relations-list">
            ${connectedEdges.map((edge) => {
              const isSource = edge.source === node.id;
              const otherNodeId = isSource ? edge.target : edge.source;
              const otherNode = state.nodes.find((n) => n.id === otherNodeId);
              const direction = isSource ? '→' : '←';
              return `
                <li class="relation-item">
                  <span class="relation-direction">${direction}</span>
                  <span class="relation-type">${escapeHtml(edge.relation)}</span>
                  ${otherNode ? `
                    <span class="relation-target" data-node-id="${otherNodeId}">
                      ${escapeHtml(otherNode.text.substring(0, 50))}${otherNode.text.length > 50 ? '...' : ''}
                    </span>
                  ` : ''}
                </li>
              `;
            }).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;

  attachDetailsListeners();
}

/* ------------------------------------------------------------------ */
/*  Event Listeners                                                   */
/* ------------------------------------------------------------------ */

function attachToolbarListeners(): void {
  const scopeSelect = document.getElementById('scope-select') as HTMLSelectElement;
  if (scopeSelect) {
    scopeSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      onScopeChange(target.value as 'global' | 'project' | 'session');
    });
  }

  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', onRefresh);
  }

  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', onExport);
  }
}

function attachDetailsListeners(): void {
  const closeBtn = document.getElementById('close-details');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      updateState({ selectedNodeId: null });
      renderNodeDetails();
    });
  }

  // Click on relation targets to navigate
  const relationTargets = document.querySelectorAll('.relation-target');
  relationTargets.forEach((target) => {
    target.addEventListener('click', (e) => {
      const nodeId = (e.currentTarget as HTMLElement).dataset.nodeId;
      if (nodeId) {
        handleSelectNode(nodeId);
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Utility Functions                                                 */
/* ------------------------------------------------------------------ */

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ------------------------------------------------------------------ */
/*  Initialize                                                        */
/* ------------------------------------------------------------------ */

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

function initialize(): void {
  // Initial render
  render();

  // Initialize force graph
  initializeGraph();

  // Notify extension that webview is ready
  postMessage({ type: 'ready' });

  // Update graph if we have data from restored state
  if (state.nodes.length > 0) {
    updateGraphVisualization();
  }
}
