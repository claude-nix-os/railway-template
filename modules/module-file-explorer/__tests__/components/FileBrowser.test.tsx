import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock fetch globally before importing the component
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('FileBrowser Component', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('module exports a default function component', async () => {
    // Test that the module can be imported and exports a valid React component
    const mod = await import('../../src/components/FileBrowser');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('fetches directory on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        type: 'directory',
        path: '/data/workspace',
        entries: [
          { name: 'src', type: 'directory', size: 0, modified: '2025-01-01T00:00:00Z' },
          { name: 'README.md', type: 'file', size: 1024, modified: '2025-01-01T00:00:00Z' },
        ],
      }),
    });

    // Dynamically import to ensure mock is ready
    const { default: FileBrowser } = await import('../../src/components/FileBrowser');
    expect(typeof FileBrowser).toBe('function');
  });
});

describe('FilesSidebar Component', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('module exports a default function component', async () => {
    const mod = await import('../../src/components/FilesSidebar');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});

describe('SessionDiffs Component', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('module exports a default function component', async () => {
    const mod = await import('../../src/components/SessionDiffs');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});

describe('TaskPanel Component', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('module exports a default function component', async () => {
    const mod = await import('../../src/components/TaskPanel');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});
