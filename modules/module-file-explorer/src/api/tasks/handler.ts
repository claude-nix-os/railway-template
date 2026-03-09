import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskListResponse, TaskStatus } from '../../types';

/** Path to the tasks storage file */
const TASKS_FILE = '/data/tasks.json';

/** Generate a unique task ID */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `task-${timestamp}-${random}`;
}

/** Read tasks from disk */
async function readTasks(): Promise<Task[]> {
  try {
    const content = await readFile(TASKS_FILE, 'utf-8');
    const data = JSON.parse(content);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.tasks)) return data.tasks;
    return [];
  } catch {
    return [];
  }
}

/** Write tasks to disk */
async function writeTasks(tasks: Task[]): Promise<void> {
  await mkdir(dirname(TASKS_FILE), { recursive: true });
  await writeFile(TASKS_FILE, JSON.stringify({ tasks }, null, 2), 'utf-8');
}

/** Validate task status */
function isValidStatus(status: string): status is TaskStatus {
  return ['todo', 'in-progress', 'done'].includes(status);
}

/** Validate task priority */
function isValidPriority(priority: string): priority is Task['priority'] {
  return ['low', 'medium', 'high'].includes(priority);
}

/** Handle GET /api/tasks - List all tasks, optionally filtered */
async function handleList(searchParams: URLSearchParams): Promise<Response> {
  const tasks = await readTasks();
  const statusFilter = searchParams.get('status');
  const priorityFilter = searchParams.get('priority');
  const sessionIdFilter = searchParams.get('sessionId');

  let filtered = tasks;

  if (statusFilter && isValidStatus(statusFilter)) {
    filtered = filtered.filter(t => t.status === statusFilter);
  }
  if (priorityFilter && isValidPriority(priorityFilter)) {
    filtered = filtered.filter(t => t.priority === priorityFilter);
  }
  if (sessionIdFilter) {
    filtered = filtered.filter(t => t.sessionId === sessionIdFilter);
  }

  // Sort by: priority (high first), then by creation date (newest first)
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  filtered.sort((a, b) => {
    const pDiff = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
    if (pDiff !== 0) return pDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const response: TaskListResponse = { tasks: filtered, total: filtered.length };
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Handle POST /api/tasks - Create a new task */
async function handleCreate(request: Request): Promise<Response> {
  let body: CreateTaskInput;
  try {
    body = await request.json() as CreateTaskInput;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Title is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (body.status && !isValidStatus(body.status)) {
    return new Response(JSON.stringify({ error: 'Invalid status. Must be: todo, in-progress, done' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (body.priority && !isValidPriority(body.priority)) {
    return new Response(JSON.stringify({ error: 'Invalid priority. Must be: low, medium, high' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = new Date().toISOString();
  const task: Task = {
    id: generateId(),
    title: body.title.trim(),
    description: body.description?.trim() ?? '',
    status: body.status ?? 'todo',
    priority: body.priority ?? 'medium',
    dueDate: body.dueDate ?? null,
    sessionId: body.sessionId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const tasks = await readTasks();
  tasks.push(task);
  await writeTasks(tasks);

  return new Response(JSON.stringify(task), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Handle PATCH /api/tasks - Update a task */
async function handleUpdate(request: Request, searchParams: URLSearchParams): Promise<Response> {
  const taskId = searchParams.get('id');
  if (!taskId) {
    return new Response(JSON.stringify({ error: 'Task ID is required (?id=...)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: UpdateTaskInput;
  try {
    body = await request.json() as UpdateTaskInput;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (body.status !== undefined && !isValidStatus(body.status)) {
    return new Response(JSON.stringify({ error: 'Invalid status. Must be: todo, in-progress, done' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (body.priority !== undefined && !isValidPriority(body.priority)) {
    return new Response(JSON.stringify({ error: 'Invalid priority. Must be: low, medium, high' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const tasks = await readTasks();
  const index = tasks.findIndex(t => t.id === taskId);

  if (index === -1) {
    return new Response(JSON.stringify({ error: 'Task not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const updated: Task = {
    ...tasks[index],
    ...(body.title !== undefined && { title: body.title.trim() }),
    ...(body.description !== undefined && { description: body.description.trim() }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.priority !== undefined && { priority: body.priority }),
    ...(body.dueDate !== undefined && { dueDate: body.dueDate }),
    ...(body.sessionId !== undefined && { sessionId: body.sessionId }),
    updatedAt: new Date().toISOString(),
  };

  tasks[index] = updated;
  await writeTasks(tasks);

  return new Response(JSON.stringify(updated), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Handle DELETE /api/tasks - Delete a task */
async function handleDelete(searchParams: URLSearchParams): Promise<Response> {
  const taskId = searchParams.get('id');
  if (!taskId) {
    return new Response(JSON.stringify({ error: 'Task ID is required (?id=...)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const tasks = await readTasks();
  const index = tasks.findIndex(t => t.id === taskId);

  if (index === -1) {
    return new Response(JSON.stringify({ error: 'Task not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const deleted = tasks.splice(index, 1)[0];
  await writeTasks(tasks);

  return new Response(JSON.stringify({ deleted: deleted.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handle /api/tasks routes
 */
export async function handleTasksRoute(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);

    switch (request.method) {
      case 'GET':
        return handleList(url.searchParams);
      case 'POST':
        return handleCreate(request);
      case 'PATCH':
        return handleUpdate(request, url.searchParams);
      case 'DELETE':
        return handleDelete(url.searchParams);
      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
