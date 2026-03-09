import React, { useEffect, useState, useCallback } from 'react';
import type { Task, TaskStatus, TaskPriority, CreateTaskInput, UpdateTaskInput, TaskListResponse } from '../types';

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  'todo': { label: 'To Do', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  'in-progress': { label: 'In Progress', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  'done': { label: 'Done', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  'high': { label: 'High', color: '#ef4444' },
  'medium': { label: 'Medium', color: '#eab308' },
  'low': { label: 'Low', color: '#6b7280' },
};

interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
}

const emptyForm: TaskFormData = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
};

function TaskCard({ task, onUpdate, onDelete }: {
  task: Task;
  onUpdate: (id: string, data: UpdateTaskInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const statusConfig = STATUS_CONFIG[task.status];
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const [expanded, setExpanded] = useState(false);

  const cycleStatus = useCallback(async () => {
    const order: TaskStatus[] = ['todo', 'in-progress', 'done'];
    const currentIdx = order.indexOf(task.status);
    const nextStatus = order[(currentIdx + 1) % order.length];
    await onUpdate(task.id, { status: nextStatus });
  }, [task, onUpdate]);

  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: 10, marginBottom: 8,
      background: 'rgba(255,255,255,0.02)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {/* Status checkbox */}
        <button
          onClick={cycleStatus}
          style={{
            width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
            border: `2px solid ${statusConfig.color}`, background: task.status === 'done' ? statusConfig.color : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 10,
          }}
          aria-label={`Change status from ${statusConfig.label}`}
        >
          {task.status === 'done' ? '\u2713' : ''}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <div style={{
            fontSize: 13, fontWeight: 500, color: task.status === 'done' ? '#6b7280' : '#f9fafb',
            textDecoration: task.status === 'done' ? 'line-through' : 'none',
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {task.title}
          </div>

          {/* Meta row */}
          <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 10,
              background: statusConfig.bg, color: statusConfig.color, fontWeight: 500,
            }}>
              {statusConfig.label}
            </span>
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 10,
              background: `${priorityConfig.color}22`, color: priorityConfig.color, fontWeight: 500,
            }}>
              {priorityConfig.label}
            </span>
            {task.dueDate && (
              <span style={{ fontSize: 10, color: '#6b7280' }}>
                Due: {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Description (expandable) */}
          {task.description && (
            <div
              onClick={() => setExpanded(!expanded)}
              style={{ marginTop: 6, fontSize: 12, color: '#9ca3af', cursor: 'pointer' }}
            >
              {expanded ? task.description : (task.description.length > 80 ? task.description.slice(0, 80) + '...' : task.description)}
            </div>
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={() => onDelete(task.id)}
          style={{
            background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer',
            fontSize: 14, padding: '0 4px', flexShrink: 0, lineHeight: 1,
          }}
          aria-label="Delete task"
        >
          x
        </button>
      </div>

      {/* Session link */}
      {task.sessionId && (
        <div style={{ marginTop: 6, fontSize: 10, color: '#4b5563' }}>
          Session: {task.sessionId}
        </div>
      )}
    </div>
  );
}

export default function TaskPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TaskFormData>({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load tasks');
      const data = await res.json() as TaskListResponse;
      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(async () => {
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const body: CreateTaskInput = {
        title: form.title,
        description: form.description || undefined,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      };
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create task');
      setForm({ ...emptyForm });
      setShowForm(false);
      fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  }, [form, fetchTasks]);

  const updateTask = useCallback(async (id: string, data: UpdateTaskInput) => {
    try {
      const res = await fetch(`/api/tasks?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update task');
      fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  }, [fetchTasks]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
      fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  }, [fetchTasks]);

  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div style={{ color: '#e5e7eb', fontFamily: 'system-ui, sans-serif', fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#f9fafb' }}>Tasks</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: '#3b82f6', color: '#fff', border: 'none',
            padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500,
          }}
        >
          {showForm ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', padding: '8px 12px', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {(['all', 'todo', 'in-progress', 'done'] as const).map(filter => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            style={{
              background: statusFilter === filter ? 'rgba(59,130,246,0.2)' : 'transparent',
              border: statusFilter === filter ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
              color: statusFilter === filter ? '#60a5fa' : '#6b7280',
              padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 500,
            }}
          >
            {filter === 'all' ? `All (${tasks.length})` :
              filter === 'todo' ? `To Do (${todoCount})` :
                filter === 'in-progress' ? `In Progress (${inProgressCount})` :
                  `Done (${doneCount})`}
          </button>
        ))}
      </div>

      {/* New task form */}
      {showForm && (
        <div style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
          <input
            type="text"
            placeholder="Task title..."
            value={form.title}
            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#e5e7eb', padding: '6px 10px', borderRadius: 4, fontSize: 13, outline: 'none', marginBottom: 8,
              boxSizing: 'border-box',
            }}
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#e5e7eb', padding: '6px 10px', borderRadius: 4, fontSize: 12, outline: 'none', marginBottom: 8,
              minHeight: 60, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={form.priority}
              onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#e5e7eb', padding: '4px 8px', borderRadius: 4, fontSize: 12,
              }}
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#e5e7eb', padding: '4px 8px', borderRadius: 4, fontSize: 12,
              }}
            />
            <button
              onClick={createTask}
              disabled={submitting || !form.title.trim()}
              style={{
                marginLeft: 'auto', background: submitting ? '#374151' : '#22c55e', color: '#fff', border: 'none',
                padding: '5px 16px', borderRadius: 4, cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: 12, fontWeight: 500,
              }}
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {error && (
          <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{error}</div>
        )}

        {loading && tasks.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}>Loading tasks...</div>
        )}

        {!loading && tasks.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>No tasks yet</div>
            <div style={{ fontSize: 12 }}>Click "+ New Task" to create one</div>
          </div>
        )}

        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onUpdate={updateTask}
            onDelete={deleteTask}
          />
        ))}
      </div>
    </div>
  );
}
