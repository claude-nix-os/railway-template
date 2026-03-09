/**
 * Tests for the MemoryGraph component.
 *
 * Verifies rendering, sidebar interactions (search, add, delete),
 * and error state display.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock react-force-graph-2d
vi.mock('react-force-graph-2d', () => {
  const ForceGraph2D = React.forwardRef(function MockForceGraph(
    props: Record<string, unknown>,
    ref: React.Ref<unknown>
  ) {
    React.useImperativeHandle(ref, () => ({
      centerAt: vi.fn(),
      zoom: vi.fn(),
    }));
    return (
      <div data-testid="force-graph" data-nodes={JSON.stringify(props.graphData)}>
        ForceGraph2D Mock
      </div>
    );
  });
  return { default: ForceGraph2D };
});

// Mock useMemory hook
const mockFetchAll = vi.fn().mockResolvedValue([]);
const mockFetchGraph = vi.fn().mockResolvedValue({ nodes: [], edges: [] });
const mockAddMemory = vi.fn().mockResolvedValue({
  id: 'new-1',
  text: 'Test',
  user_id: 'global',
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});
const mockDeleteMemory = vi.fn().mockResolvedValue(undefined);
const mockSearchMemories = vi.fn().mockResolvedValue([]);
const mockClearError = vi.fn();

let mockMemories: Array<{
  id: string;
  text: string;
  user_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}> = [];

let mockGraph = { nodes: [] as unknown[], edges: [] as unknown[] };
let mockLoading = false;
let mockError: string | null = null;

vi.mock('../../src/hooks/useMemory', () => ({
  useMemory: () => ({
    memories: mockMemories,
    graph: mockGraph,
    searchResults: [],
    health: null,
    loading: mockLoading,
    error: mockError,
    fetchAll: mockFetchAll,
    fetchGraph: mockFetchGraph,
    addMemory: mockAddMemory,
    deleteMemory: mockDeleteMemory,
    searchMemories: mockSearchMemories,
    addEdge: vi.fn(),
    deleteEdge: vi.fn(),
    clearError: mockClearError,
    fetchHealth: vi.fn(),
  }),
}));

// Import component after mocks are set up
import MemoryGraph from '../../src/components/MemoryGraph';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockMemories = [];
  mockGraph = { nodes: [], edges: [] };
  mockLoading = false;
  mockError = null;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MemoryGraph', () => {
  it('renders the component with empty state', () => {
    render(<MemoryGraph />);

    expect(screen.getByText('Memories (0)')).toBeDefined();
    expect(screen.getByText('No memories yet')).toBeDefined();
    expect(screen.getByTestId('force-graph')).toBeDefined();
  });

  it('fetches data on mount', () => {
    render(<MemoryGraph userId="test-user" />);

    expect(mockFetchAll).toHaveBeenCalledWith('test-user');
    expect(mockFetchGraph).toHaveBeenCalledWith('test-user');
  });

  it('displays memory list', () => {
    mockMemories = [
      {
        id: 'mem-1',
        text: 'First memory',
        user_id: 'global',
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'mem-2',
        text: 'Second memory',
        user_id: 'global',
        metadata: {},
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    ];

    render(<MemoryGraph />);

    expect(screen.getByText('Memories (2)')).toBeDefined();
    expect(screen.getByText('First memory')).toBeDefined();
    expect(screen.getByText('Second memory')).toBeDefined();
  });

  it('displays loading state', () => {
    mockLoading = true;

    render(<MemoryGraph />);

    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('displays error banner with dismiss button', () => {
    mockError = 'Connection failed';

    render(<MemoryGraph />);

    expect(screen.getByText('Connection failed')).toBeDefined();

    // Click dismiss
    const dismissBtn = screen.getByLabelText('Dismiss error');
    fireEvent.click(dismissBtn);
    expect(mockClearError).toHaveBeenCalled();
  });

  it('filters memories by search text', () => {
    mockMemories = [
      {
        id: 'mem-1',
        text: 'Python programming',
        user_id: 'global',
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'mem-2',
        text: 'JavaScript framework',
        user_id: 'global',
        metadata: {},
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    ];

    render(<MemoryGraph />);

    const searchInput = screen.getByLabelText('Search memories');
    fireEvent.change(searchInput, { target: { value: 'Python' } });

    expect(screen.getByText('Python programming')).toBeDefined();
    expect(screen.queryByText('JavaScript framework')).toBeNull();
  });

  it('adds a new memory', async () => {
    render(<MemoryGraph />);

    const input = screen.getByLabelText('New memory text');
    const addBtn = screen.getByLabelText('Add memory');

    fireEvent.change(input, { target: { value: 'New test memory' } });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(mockAddMemory).toHaveBeenCalledWith({
        text: 'New test memory',
        user_id: 'global',
      });
    });
  });

  it('adds memory on Enter key', async () => {
    render(<MemoryGraph />);

    const input = screen.getByLabelText('New memory text');
    fireEvent.change(input, { target: { value: 'Enter key memory' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockAddMemory).toHaveBeenCalledWith({
        text: 'Enter key memory',
        user_id: 'global',
      });
    });
  });

  it('does not add empty memory', async () => {
    render(<MemoryGraph />);

    const addBtn = screen.getByLabelText('Add memory');
    fireEvent.click(addBtn);

    expect(mockAddMemory).not.toHaveBeenCalled();
  });

  it('deletes a memory', async () => {
    mockMemories = [
      {
        id: 'mem-1',
        text: 'Deletable memory',
        user_id: 'global',
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    render(<MemoryGraph />);

    const deleteBtn = screen.getByLabelText('Delete memory: Deletable memory');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockDeleteMemory).toHaveBeenCalledWith('mem-1');
    });
  });

  it('renders agent color legend', () => {
    mockMemories = [
      {
        id: 'mem-1',
        text: 'Global memory',
        user_id: 'global',
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    render(<MemoryGraph />);

    expect(screen.getByText('Agents')).toBeDefined();
    expect(screen.getByText('global')).toBeDefined();
  });

  it('displays node/edge count status', () => {
    mockGraph = {
      nodes: [
        { id: 'n1', text: 'A', user_id: 'global', metadata: {}, created_at: '' },
        { id: 'n2', text: 'B', user_id: 'global', metadata: {}, created_at: '' },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', relation: 'link' },
      ],
    };

    render(<MemoryGraph />);

    expect(screen.getByText('2 nodes, 1 edges')).toBeDefined();
  });

  it('passes custom userId prop', () => {
    render(<MemoryGraph userId="alice" />);

    expect(mockFetchAll).toHaveBeenCalledWith('alice');
    expect(mockFetchGraph).toHaveBeenCalledWith('alice');
  });

  it('shows "No matching memories" when filter has no results', () => {
    mockMemories = [
      {
        id: 'mem-1',
        text: 'Only memory',
        user_id: 'global',
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    render(<MemoryGraph />);

    const searchInput = screen.getByLabelText('Search memories');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No matching memories')).toBeDefined();
  });
});
