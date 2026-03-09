import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';
import { Task, TaskStatus, TaskPriority, TaskTarget, ITaskProvider, TaskFilter } from '../types';

/**
 * Service for managing task data persistence and operations
 */
export class TaskDataService implements ITaskProvider {
  private tasks: Map<string, Task> = new Map();
  private dataFilePath: string;
  private listeners: Set<(task: Task) => void> = new Set();
  private changeListeners: Set<() => void> = new Set();

  constructor(
    private context: vscode.ExtensionContext,
    customPath?: string
  ) {
    // Determine data file path
    if (customPath && customPath.length > 0) {
      this.dataFilePath = customPath;
    } else {
      // Use workspace storage or global storage
      const storageUri = context.storageUri || context.globalStorageUri;
      if (!storageUri) {
        throw new Error('No storage URI available for task data');
      }

      // Ensure storage directory exists
      if (!fs.existsSync(storageUri.fsPath)) {
        fs.mkdirSync(storageUri.fsPath, { recursive: true });
      }

      this.dataFilePath = path.join(storageUri.fsPath, 'tasks.json');
    }

    // Load existing tasks
    this.loadTasks();
  }

  /**
   * Load tasks from disk
   */
  private loadTasks(): void {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const data = fs.readFileSync(this.dataFilePath, 'utf-8');
        const taskArray = JSON.parse(data) as Task[];

        // Convert date strings back to Date objects
        taskArray.forEach(task => {
          task.createdAt = new Date(task.createdAt);
          task.updatedAt = new Date(task.updatedAt);
          if (task.dueDate) {
            task.dueDate = new Date(task.dueDate);
          }
          if (task.completedAt) {
            task.completedAt = new Date(task.completedAt);
          }
          this.tasks.set(task.id, task);
        });

        console.log(`Loaded ${this.tasks.size} tasks from ${this.dataFilePath}`);
      } else {
        console.log('No existing task data file found, starting with empty task list');
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      vscode.window.showErrorMessage(`Failed to load tasks: ${error}`);
    }
  }

  /**
   * Save tasks to disk
   */
  private saveTasks(): void {
    try {
      const taskArray = Array.from(this.tasks.values());
      const data = JSON.stringify(taskArray, null, 2);

      // Ensure directory exists
      const dir = path.dirname(this.dataFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.dataFilePath, data, 'utf-8');
      console.log(`Saved ${taskArray.length} tasks to ${this.dataFilePath}`);

      // Notify change listeners
      this.notifyChanges();
    } catch (error) {
      console.error('Failed to save tasks:', error);
      vscode.window.showErrorMessage(`Failed to save tasks: ${error}`);
    }
  }

  /**
   * Notify all listeners of changes
   */
  private notifyChanges(): void {
    this.changeListeners.forEach(listener => listener());
  }

  /**
   * Listen for task data changes
   */
  public onTasksChanged(listener: () => void): void {
    this.changeListeners.add(listener);
  }

  /**
   * Get all tasks
   */
  public async getTasks(filter?: TaskFilter): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values());

    // Apply filters if provided
    if (filter) {
      if (filter.status && filter.status.length > 0) {
        tasks = tasks.filter(t => filter.status!.includes(t.status));
      }

      if (filter.priority && filter.priority.length > 0) {
        tasks = tasks.filter(t => filter.priority!.includes(t.priority));
      }

      if (filter.target && filter.target.length > 0) {
        tasks = tasks.filter(t => filter.target!.includes(t.target));
      }

      if (filter.tags && filter.tags.length > 0) {
        tasks = tasks.filter(t =>
          t.tags && t.tags.some(tag => filter.tags!.includes(tag))
        );
      }

      if (filter.includeCompleted === false) {
        tasks = tasks.filter(t => t.status !== TaskStatus.COMPLETED);
      }

      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        tasks = tasks.filter(t =>
          t.title.toLowerCase().includes(searchLower) ||
          (t.description && t.description.toLowerCase().includes(searchLower))
        );
      }
    }

    return tasks;
  }

  /**
   * Get a specific task by ID
   */
  public async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  /**
   * Create a new task
   */
  public async createTask(taskData: Partial<Task>): Promise<Task> {
    const now = new Date();
    const config = vscode.workspace.getConfiguration('claudeos.tasks');

    const task: Task = {
      id: nanoid(),
      title: taskData.title || 'Untitled Task',
      description: taskData.description,
      status: taskData.status || TaskStatus.TODO,
      priority: taskData.priority || config.get<TaskPriority>('defaultPriority', TaskPriority.MEDIUM),
      target: taskData.target || TaskTarget.GENERAL,
      createdAt: now,
      updatedAt: now,
      dueDate: taskData.dueDate,
      tags: taskData.tags || [],
      assignee: taskData.assignee,
      parentId: taskData.parentId,
      metadata: taskData.metadata,
      doAt: taskData.doAt,
      doBy: taskData.doBy,
      executionTarget: taskData.executionTarget,
      targetSessionId: taskData.targetSessionId,
      customAgentPrompt: taskData.customAgentPrompt,
      executionStatus: taskData.executionStatus,
      executedAt: taskData.executedAt,
      executionError: taskData.executionError
    };

    this.tasks.set(task.id, task);
    this.saveTasks();
    this.notifyListeners(task);

    return task;
  }

  /**
   * Update an existing task
   */
  public async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    // Apply updates
    Object.assign(task, updates, {
      updatedAt: new Date()
    });

    this.tasks.set(id, task);
    this.saveTasks();
    this.notifyListeners(task);

    return task;
  }

  /**
   * Delete a task
   */
  public async deleteTask(id: string): Promise<void> {
    if (!this.tasks.has(id)) {
      throw new Error(`Task not found: ${id}`);
    }

    this.tasks.delete(id);
    this.saveTasks();
  }

  /**
   * Mark task as complete
   */
  public async completeTask(id: string): Promise<Task> {
    return this.updateTask(id, {
      status: TaskStatus.COMPLETED,
      completedAt: new Date()
    });
  }

  /**
   * Mark task as incomplete
   */
  public async uncompleteTask(id: string): Promise<Task> {
    return this.updateTask(id, {
      status: TaskStatus.TODO,
      completedAt: undefined
    });
  }

  /**
   * Listen for task updates
   */
  public onTaskUpdate(listener: (task: Task) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Notify all listeners of a task update
   */
  private notifyListeners(task: Task): void {
    this.listeners.forEach(listener => listener(task));
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.listeners.clear();
    this.changeListeners.clear();
  }
}
