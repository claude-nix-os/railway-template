/**
 * ClaudeOS Memory Extension
 *
 * Provides integration with the Mem0 memory backend for persistent memory
 * across sessions, projects, and global contexts.
 */

// Export types
export type {
  Memory,
  MemoryGraph,
  GraphNode,
  GraphEdge,
  MemoryScope,
  AddMemoryRequest,
  SearchMemoriesRequest,
  ApiError,
} from './types';

// Export services
export { MemoryApiClient } from './services/MemoryApiClient';
export type { MemoryApiClientOptions } from './services/MemoryApiClient';
