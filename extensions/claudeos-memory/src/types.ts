/**
 * Memory record from Mem0 backend
 */
export interface Memory {
  /** Unique memory identifier */
  id: string;

  /** Memory text content */
  text: string;

  /** User ID associated with this memory */
  user_id: string;

  /** Additional metadata for the memory */
  metadata: Record<string, unknown>;

  /** ISO timestamp when memory was created */
  created_at: string;

  /** ISO timestamp when memory was last updated */
  updated_at: string;
}

/**
 * Graph node representing a memory entity
 */
export interface GraphNode {
  /** Unique node identifier */
  id: string;

  /** Node text content */
  text: string;

  /** User ID associated with this node */
  user_id: string;

  /** Additional metadata for the node */
  metadata: Record<string, unknown>;

  /** ISO timestamp when node was created */
  created_at: string;
}

/**
 * Graph edge representing a relationship between memories
 */
export interface GraphEdge {
  /** Unique edge identifier */
  id: string;

  /** Source node ID */
  source: string;

  /** Target node ID */
  target: string;

  /** Type of relationship */
  relation: string;
}

/**
 * Complete memory graph with nodes and edges
 */
export interface MemoryGraph {
  /** All nodes in the graph */
  nodes: GraphNode[];

  /** All edges connecting the nodes */
  edges: GraphEdge[];
}

/**
 * Scope of memory persistence
 *
 * - global: Persists across all projects and sessions
 * - project: Persists within a specific project
 * - session: Persists only within a specific session
 */
export type MemoryScope = 'global' | 'project' | 'session';

/**
 * Request payload for adding a new memory
 */
export interface AddMemoryRequest {
  /** Memory text content */
  text: string;

  /** User ID to associate with the memory */
  user_id: string;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Request payload for searching memories
 */
export interface SearchMemoriesRequest {
  /** Search query string */
  query: string;

  /** User ID to filter results */
  user_id: string;

  /** Optional limit on number of results */
  limit?: number;
}

/**
 * Error response from the API
 */
export interface ApiError {
  /** Error message */
  message: string;

  /** Optional error code */
  code?: string;

  /** Optional detailed error information */
  details?: unknown;
}
