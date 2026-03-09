import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  Memory,
  ScoredMemory,
  MemoryGraph,
  AddMemoryRequest,
  SearchMemoryRequest,
  AddEdgeRequest,
  HealthResponse,
} from '../types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE = '/api/memory';

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // Retrieve token from common storage locations
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('claude_token') ??
        sessionStorage.getItem('claude_token') ??
        ''
      : '';
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      errBody.error ?? errBody.detail ?? `HTTP ${res.status}`
    );
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface UseMemoryReturn {
  // State
  memories: Memory[];
  graph: MemoryGraph | null;
  searchResults: ScoredMemory[];
  health: HealthResponse | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchHealth: () => Promise<HealthResponse>;
  fetchAll: (userId?: string) => Promise<Memory[]>;
  fetchGraph: (userId?: string) => Promise<MemoryGraph>;
  addMemory: (req: AddMemoryRequest) => Promise<Memory>;
  deleteMemory: (id: string) => Promise<void>;
  searchMemories: (req: SearchMemoryRequest) => Promise<ScoredMemory[]>;
  addEdge: (req: AddEdgeRequest) => Promise<void>;
  deleteEdge: (id: string) => Promise<void>;
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMemory(defaultUserId: string = 'global'): UseMemoryReturn {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [graph, setGraph] = useState<MemoryGraph | null>(null);
  const [searchResults, setSearchResults] = useState<ScoredMemory[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track mount status to avoid state updates on unmounted component
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback(
    <T>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
      if (mountedRef.current) setter(value);
    },
    []
  );

  // -----------------------------------------------------------------------
  // Health
  // -----------------------------------------------------------------------

  const fetchHealth = useCallback(async (): Promise<HealthResponse> => {
    safeSetState(setLoading, true);
    safeSetState(setError, null);
    try {
      const data = await apiFetch<HealthResponse>('/health');
      safeSetState(setHealth, data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch health';
      safeSetState(setError, msg);
      throw err;
    } finally {
      safeSetState(setLoading, false);
    }
  }, [safeSetState]);

  // -----------------------------------------------------------------------
  // Fetch all
  // -----------------------------------------------------------------------

  const fetchAll = useCallback(
    async (userId?: string): Promise<Memory[]> => {
      const uid = userId ?? defaultUserId;
      safeSetState(setLoading, true);
      safeSetState(setError, null);
      try {
        const data = await apiFetch<Memory[]>(
          `/all?user_id=${encodeURIComponent(uid)}`
        );
        safeSetState(setMemories, data);
        return data;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to fetch memories';
        safeSetState(setError, msg);
        throw err;
      } finally {
        safeSetState(setLoading, false);
      }
    },
    [defaultUserId, safeSetState]
  );

  // -----------------------------------------------------------------------
  // Fetch graph
  // -----------------------------------------------------------------------

  const fetchGraph = useCallback(
    async (userId?: string): Promise<MemoryGraph> => {
      const uid = userId ?? defaultUserId;
      safeSetState(setLoading, true);
      safeSetState(setError, null);
      try {
        const data = await apiFetch<MemoryGraph>(
          `/graph?user_id=${encodeURIComponent(uid)}`
        );
        safeSetState(setGraph, data);
        return data;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to fetch graph';
        safeSetState(setError, msg);
        throw err;
      } finally {
        safeSetState(setLoading, false);
      }
    },
    [defaultUserId, safeSetState]
  );

  // -----------------------------------------------------------------------
  // Add memory
  // -----------------------------------------------------------------------

  const addMemory = useCallback(
    async (req: AddMemoryRequest): Promise<Memory> => {
      safeSetState(setLoading, true);
      safeSetState(setError, null);
      try {
        const payload = {
          text: req.text,
          user_id: req.user_id ?? defaultUserId,
          metadata: req.metadata ?? {},
        };
        const data = await apiFetch<Memory>('/add', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        // Prepend to local list
        safeSetState(setMemories, (prev: Memory[]) => [data, ...prev]);
        return data;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to add memory';
        safeSetState(setError, msg);
        throw err;
      } finally {
        safeSetState(setLoading, false);
      }
    },
    [defaultUserId, safeSetState]
  );

  // -----------------------------------------------------------------------
  // Delete memory
  // -----------------------------------------------------------------------

  const deleteMemory = useCallback(
    async (id: string): Promise<void> => {
      safeSetState(setLoading, true);
      safeSetState(setError, null);
      try {
        await apiFetch(`/delete/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        safeSetState(setMemories, (prev: Memory[]) =>
          prev.filter((m) => m.id !== id)
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to delete memory';
        safeSetState(setError, msg);
        throw err;
      } finally {
        safeSetState(setLoading, false);
      }
    },
    [safeSetState]
  );

  // -----------------------------------------------------------------------
  // Search
  // -----------------------------------------------------------------------

  const searchMemoriesFn = useCallback(
    async (req: SearchMemoryRequest): Promise<ScoredMemory[]> => {
      safeSetState(setLoading, true);
      safeSetState(setError, null);
      try {
        const payload = {
          query: req.query,
          user_id: req.user_id ?? defaultUserId,
          limit: req.limit ?? 10,
        };
        const data = await apiFetch<ScoredMemory[]>('/search', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        safeSetState(setSearchResults, data);
        return data;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to search memories';
        safeSetState(setError, msg);
        throw err;
      } finally {
        safeSetState(setLoading, false);
      }
    },
    [defaultUserId, safeSetState]
  );

  // -----------------------------------------------------------------------
  // Graph edge operations
  // -----------------------------------------------------------------------

  const addEdge = useCallback(
    async (req: AddEdgeRequest): Promise<void> => {
      safeSetState(setLoading, true);
      safeSetState(setError, null);
      try {
        await apiFetch('/graph/edge', {
          method: 'POST',
          body: JSON.stringify({
            source_id: req.source_id,
            target_id: req.target_id,
            relation: req.relation,
            user_id: req.user_id ?? defaultUserId,
          }),
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to add edge';
        safeSetState(setError, msg);
        throw err;
      } finally {
        safeSetState(setLoading, false);
      }
    },
    [defaultUserId, safeSetState]
  );

  const deleteEdge = useCallback(
    async (id: string): Promise<void> => {
      safeSetState(setLoading, true);
      safeSetState(setError, null);
      try {
        await apiFetch(`/graph/edge/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to delete edge';
        safeSetState(setError, msg);
        throw err;
      } finally {
        safeSetState(setLoading, false);
      }
    },
    [safeSetState]
  );

  // -----------------------------------------------------------------------
  // Utility
  // -----------------------------------------------------------------------

  const clearError = useCallback(() => {
    safeSetState(setError, null);
  }, [safeSetState]);

  return {
    memories,
    graph,
    searchResults,
    health,
    loading,
    error,
    fetchHealth,
    fetchAll,
    fetchGraph,
    addMemory,
    deleteMemory,
    searchMemories: searchMemoriesFn,
    addEdge,
    deleteEdge,
    clearError,
  };
}

export default useMemory;
