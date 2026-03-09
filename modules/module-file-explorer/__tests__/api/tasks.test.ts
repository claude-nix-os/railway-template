import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleTasksRoute } from '../../src/api/tasks/handler';
import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

// Use a temporary test directory for task storage
const TEST_TASKS_FILE = '/tmp/claudeos-test-tasks/tasks.json';

// Mock the tasks file path by mocking the module-level constant
vi.mock('fs/promises', async () => {
  const actual = await vi.importActual('fs/promises') as typeof import('fs/promises');
  return {
    ...actual,
    readFile: vi.fn(async (path: string, encoding?: string) => {
      if (path === '/data/tasks.json') {
        return actual.readFile(TEST_TASKS_FILE, encoding as BufferEncoding);
      }
      return actual.readFile(path, encoding as BufferEncoding);
    }),
    writeFile: vi.fn(async (path: string, data: string, encoding?: string) => {
      if (path === '/data/tasks.json') {
        await actual.mkdir(dirname(TEST_TASKS_FILE), { recursive: true });
        return actual.writeFile(TEST_TASKS_FILE, data, encoding as BufferEncoding);
      }
      return actual.writeFile(path, data, encoding as BufferEncoding);
    }),
    mkdir: vi.fn(async (path: string, options?: { recursive?: boolean }) => {
      if (path === '/data' || path.startsWith('/data/')) {
        return actual.mkdir(dirname(TEST_TASKS_FILE), { recursive: true });
      }
      return actual.mkdir(path, options);
    }),
  };
});

describe('Tasks API Handler', () => {
  beforeEach(async () => {
    // Clean up test file before each test
    try {
      const dir = dirname(TEST_TASKS_FILE);
      await (await vi.importActual('fs/promises') as typeof import('fs/promises')).mkdir(dir, { recursive: true });
      await (await vi.importActual('fs/promises') as typeof import('fs/promises')).writeFile(TEST_TASKS_FILE, JSON.stringify({ tasks: [] }), 'utf-8');
    } catch {
      // ignore
    }
  });

  afterEach(async () => {
    try {
      await (await vi.importActual('fs/promises') as typeof import('fs/promises')).rm(TEST_TASKS_FILE, { force: true });
    } catch {
      // ignore
    }
  });

  describe('GET /api/tasks', () => {
    it('returns empty task list initially', async () => {
      const request = new Request('http://localhost/api/tasks');
      const response = await handleTasksRoute(request);
      expect(response.status).toBe(200);
      const body = await response.json() as { tasks: unknown[]; total: number };
      expect(body.tasks).toEqual([]);
      expect(body.total).toBe(0);
    });
  });

  describe('POST /api/tasks', () => {
    it('creates a new task with required fields', async () => {
      const request = new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test task' }),
      });
      const response = await handleTasksRoute(request);
      expect(response.status).toBe(201);
      const task = await response.json() as { id: string; title: string; status: string; priority: string };
      expect(task.title).toBe('Test task');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.id).toMatch(/^task-/);
    });

    it('creates a task with all fields', async () => {
      const request = new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Full task',
          description: 'A detailed task',
          status: 'in-progress',
          priority: 'high',
          dueDate: '2025-12-31',
          sessionId: 'session-123',
        }),
      });
      const response = await handleTasksRoute(request);
      expect(response.status).toBe(201);
      const task = await response.json() as { title: string; status: string; priority: string; description: string };
      expect(task.title).toBe('Full task');
      expect(task.description).toBe('A detailed task');
      expect(task.status).toBe('in-progress');
      expect(task.priority).toBe('high');
    });

    it('rejects task without title', async () => {
      const request = new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'no title' }),
      });
      const response = await handleTasksRoute(request);
      expect(response.status).toBe(400);
      const body = await response.json() as { error: string };
      expect(body.error).toContain('Title is required');
    });

    it('rejects invalid status', async () => {
      const request = new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', status: 'invalid' }),
      });
      const response = await handleTasksRoute(request);
      expect(response.status).toBe(400);
      const body = await response.json() as { error: string };
      expect(body.error).toContain('Invalid status');
    });

    it('rejects invalid priority', async () => {
      const request = new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', priority: 'critical' }),
      });
      const response = await handleTasksRoute(request);
      expect(response.status).toBe(400);
      const body = await response.json() as { error: string };
      expect(body.error).toContain('Invalid priority');
    });

    it('rejects invalid JSON body', async () => {
      const request = new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      });
      const response = await handleTasksRoute(request);
      expect(response.status).toBe(400);
      const body = await response.json() as { error: string };
      expect(body.error).toContain('Invalid JSON');
    });
  });

  describe('PATCH /api/tasks', () => {
    it('updates a task status', async () => {
      // Create a task first
      const createReq = new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Update me' }),
      });
      const createRes = await handleTasksRoute(createReq);
      const created = await createRes.json() as { id: string };

      // Update it
      const updateReq = new Request(`http://localhost/api/tasks?id=${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      });
      const updateRes = await handleTasksRoute(updateReq);
      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json() as { status: string };
      expect(updated.status).toBe('done');
    });

    it('returns 400 when no task ID provided', async () => {
      const request = new Request('http://localhost/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      });
      const response = await handleTasksRoute(request);
      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent task', async () => {
      const request = new Request('http://localhost/api/tasks?id=nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      });
      const response = await handleTasksRoute(request);
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/tasks', () => {
    it('deletes an existing task', async () => {
      // Create a task first
      const createReq = new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Delete me' }),
      });
      const createRes = await handleTasksRoute(createReq);
      const created = await createRes.json() as { id: string };

      // Delete it
      const deleteReq = new Request(`http://localhost/api/tasks?id=${created.id}`, {
        method: 'DELETE',
      });
      const deleteRes = await handleTasksRoute(deleteReq);
      expect(deleteRes.status).toBe(200);
      const body = await deleteRes.json() as { deleted: string };
      expect(body.deleted).toBe(created.id);

      // Verify it's gone
      const listReq = new Request('http://localhost/api/tasks');
      const listRes = await handleTasksRoute(listReq);
      const list = await listRes.json() as { tasks: unknown[] };
      expect(list.tasks).toEqual([]);
    });

    it('returns 400 when no task ID provided', async () => {
      const request = new Request('http://localhost/api/tasks', { method: 'DELETE' });
      const response = await handleTasksRoute(request);
      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent task', async () => {
      const request = new Request('http://localhost/api/tasks?id=nonexistent', { method: 'DELETE' });
      const response = await handleTasksRoute(request);
      expect(response.status).toBe(404);
    });
  });

  describe('Method handling', () => {
    it('returns 405 for PUT method', async () => {
      const request = new Request('http://localhost/api/tasks', { method: 'PUT' });
      const response = await handleTasksRoute(request);
      expect(response.status).toBe(405);
    });
  });
});
