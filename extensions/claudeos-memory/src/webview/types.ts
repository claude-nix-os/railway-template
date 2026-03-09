/**
 * Webview-specific types for claudeos-memory extension
 */

import { GraphNode, GraphEdge } from '../types';

/* ------------------------------------------------------------------ */
/*  Messages from Extension to Webview                                */
/* ------------------------------------------------------------------ */

export type ExtensionToWebviewMessageType =
  | 'updateGraph'
  | 'selectNode'
  | 'changeScope'
  | 'error'
  | 'loading';

export interface UpdateGraphMessage {
  type: 'updateGraph';
  data: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}

export interface SelectNodeMessage {
  type: 'selectNode';
  nodeId: string;
}

export interface ChangeScopeMessage {
  type: 'changeScope';
  scope: 'global' | 'project' | 'session';
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface LoadingMessage {
  type: 'loading';
  isLoading: boolean;
}

export type ExtensionToWebviewMessage =
  | UpdateGraphMessage
  | SelectNodeMessage
  | ChangeScopeMessage
  | ErrorMessage
  | LoadingMessage;

/* ------------------------------------------------------------------ */
/*  Messages from Webview to Extension                                */
/* ------------------------------------------------------------------ */

export type WebviewToExtensionMessageType =
  | 'ready'
  | 'nodeClicked'
  | 'scopeChanged'
  | 'refreshRequested'
  | 'exportRequested';

export interface ReadyMessage {
  type: 'ready';
}

export interface NodeClickedMessage {
  type: 'nodeClicked';
  nodeId: string;
}

export interface ScopeChangedMessage {
  type: 'scopeChanged';
  scope: 'global' | 'project' | 'session';
}

export interface RefreshRequestedMessage {
  type: 'refreshRequested';
}

export interface ExportRequestedMessage {
  type: 'exportRequested';
}

export type WebviewToExtensionMessage =
  | ReadyMessage
  | NodeClickedMessage
  | ScopeChangedMessage
  | RefreshRequestedMessage
  | ExportRequestedMessage;

/* ------------------------------------------------------------------ */
/*  UI State Types                                                    */
/* ------------------------------------------------------------------ */

export interface AppState {
  scope: 'global' | 'project' | 'session';
  selectedNodeId: string | null;
  isLoading: boolean;
  error: string | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/* ------------------------------------------------------------------ */
/*  Force Graph Types                                                 */
/* ------------------------------------------------------------------ */

export interface ForceGraphNode extends GraphNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  color?: string;
  val?: number; // Node size
}

export interface ForceGraphLink {
  source: string | ForceGraphNode;
  target: string | ForceGraphNode;
  id: string;
  relation: string;
  color?: string;
}
