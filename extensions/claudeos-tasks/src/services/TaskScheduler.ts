import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import { Task, TaskStatus, ExecutionStatus, ExecutionTarget } from '../types';
import { TaskDataService } from './TaskDataService';

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

const CHECK_INTERVAL = 60000; // Check for tasks to execute every minute
const EXECUTION_GRACE_PERIOD = 5000; // Execute tasks up to 5 seconds early

/* ------------------------------------------------------------------ */
/*  Scheduler Event Types                                             */
/* ------------------------------------------------------------------ */

export interface TaskSchedulerEvents {
  taskScheduled: (task: Task) => void;
  taskExecuted: (task: Task) => void;
  taskFailed: (task: Task, error: Error) => void;
  taskCancelled: (taskId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Scheduled Task Entry                                              */
/* ------------------------------------------------------------------ */

interface ScheduledTask {
  taskId: string;
  doAt: Date;
  timer: NodeJS.Timeout;
}

/* ------------------------------------------------------------------ */
/*  Task Scheduler Service                                            */
/* ------------------------------------------------------------------ */

/**
 * Service for managing scheduled task execution
 *
 * Features:
 * - Schedules tasks based on their doAt timestamp
 * - Executes tasks by creating Claude Code sessions
 * - Supports new sessions, existing sessions, and custom agents
 * - Reschedules pending tasks on startup
 * - EventEmitter pattern for lifecycle events
 */
export class TaskScheduler extends EventEmitter {
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private disposed = false;
  private apiUrl: string;
  private wsUrl: string;
  private jwtToken: string | null = null;

  constructor(
    private taskDataService: TaskDataService,
    private context: vscode.ExtensionContext
  ) {
    super();

    // Get kernel URLs from configuration
    const config = vscode.workspace.getConfiguration('claudeos.tasks');
    this.apiUrl = config.get<string>('apiUrl', 'http://localhost:3000/api');
    this.wsUrl = config.get<string>('wsUrl', 'ws://localhost:3000/ws');

    // Listen for task changes
    this.taskDataService.onTaskUpdate((task) => this.handleTaskUpdate(task));

    // Initialize JWT token
    this.initializeAuth().catch(err => {
      console.error('[TaskScheduler] Failed to initialize auth:', err);
      vscode.window.showErrorMessage(`Failed to initialize task scheduler auth: ${err.message}`);
    });

    // Start periodic check interval
    this.startCheckInterval();
  }

  /* ------------------------------------------------------------------ */
  /*  Initialization                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Initialize authentication with the kernel
   */
  private async initializeAuth(): Promise<void> {
    try {
      // Get auth token from global state or generate new one
      this.jwtToken = this.context.globalState.get<string>('claudeos.jwtToken') || null;

      if (!this.jwtToken) {
        // Request JWT token from kernel
        const response = await fetch(`${this.apiUrl}/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Auth failed: ${response.statusText}`);
        }

        const data = await response.json();
        this.jwtToken = data.token;

        // Store token in global state
        await this.context.globalState.update('claudeos.jwtToken', this.jwtToken);
      }

      console.log('[TaskScheduler] Auth initialized successfully');
    } catch (error) {
      console.error('[TaskScheduler] Auth initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load and reschedule all pending tasks from disk
   */
  public async loadPendingTasks(): Promise<void> {
    try {
      const tasks = await this.taskDataService.getTasks();
      const now = new Date();

      for (const task of tasks) {
        // Skip completed, cancelled, or failed tasks
        if (
          task.status === TaskStatus.COMPLETED ||
          task.status === TaskStatus.CANCELLED ||
          task.executionStatus === 'executed' ||
          task.executionStatus === 'failed'
        ) {
          continue;
        }

        // Schedule tasks that have a doAt timestamp
        if (task.doAt) {
          const doAt = new Date(task.doAt);

          // If the task is in the past, execute it immediately
          if (doAt <= now) {
            console.log(`[TaskScheduler] Task ${task.id} is overdue, executing immediately`);
            this.executeTask(task).catch(err => {
              console.error(`[TaskScheduler] Failed to execute overdue task ${task.id}:`, err);
            });
          } else {
            // Schedule for future execution
            this.scheduleTask(task);
          }
        }
      }

      console.log(`[TaskScheduler] Loaded and scheduled ${this.scheduledTasks.size} pending tasks`);
    } catch (error) {
      console.error('[TaskScheduler] Failed to load pending tasks:', error);
      vscode.window.showErrorMessage(`Failed to load scheduled tasks: ${error}`);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Task Scheduling                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Schedule a task for execution at its doAt timestamp
   */
  public scheduleTask(task: Task): void {
    if (this.disposed) {
      return;
    }

    // Cancel any existing schedule for this task
    this.cancelTask(task.id);

    // Only schedule if task has a doAt timestamp
    if (!task.doAt) {
      return;
    }

    const doAt = new Date(task.doAt);
    const now = new Date();

    // Calculate delay until execution (allow grace period for early execution)
    const delay = Math.max(0, doAt.getTime() - now.getTime() - EXECUTION_GRACE_PERIOD);

    // Create timer for task execution
    const timer = setTimeout(() => {
      this.executeTask(task).catch(err => {
        console.error(`[TaskScheduler] Failed to execute task ${task.id}:`, err);
        this.emit('taskFailed', task, err);
      });
    }, delay);

    // Store scheduled task
    this.scheduledTasks.set(task.id, {
      taskId: task.id,
      doAt,
      timer,
    });

    // Update task execution status
    this.taskDataService.updateTask(task.id, {
      executionStatus: 'scheduled',
    }).catch(err => {
      console.error(`[TaskScheduler] Failed to update task status:`, err);
    });

    console.log(`[TaskScheduler] Scheduled task ${task.id} for execution at ${doAt.toISOString()}`);
    this.emit('taskScheduled', task);
  }

  /**
   * Cancel a scheduled task
   */
  public cancelTask(taskId: string): void {
    const scheduled = this.scheduledTasks.get(taskId);
    if (scheduled) {
      clearTimeout(scheduled.timer);
      this.scheduledTasks.delete(taskId);
      console.log(`[TaskScheduler] Cancelled scheduled task ${taskId}`);
      this.emit('taskCancelled', taskId);
    }
  }

  /**
   * Execute a task immediately
   */
  public async executeTaskById(taskId: string): Promise<void> {
    const task = await this.taskDataService.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    await this.executeTask(task);
  }

  /* ------------------------------------------------------------------ */
  /*  Task Execution                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Execute a task by creating a Claude Code session
   */
  private async executeTask(task: Task): Promise<void> {
    // Remove from scheduled tasks
    this.scheduledTasks.delete(task.id);

    try {
      console.log(`[TaskScheduler] Executing task: ${task.id} - "${task.title}"`);

      // Update task status to IN_PROGRESS
      await this.taskDataService.updateTask(task.id, {
        status: TaskStatus.IN_PROGRESS,
        executionStatus: 'executing',
      });

      // Ensure we have authentication
      if (!this.jwtToken) {
        await this.initializeAuth();
      }

      // Determine execution target and create session
      const sessionId = await this.createSession(task);

      // Send the task content to the session
      await this.sendTaskToSession(sessionId, task);

      // Update task with execution details
      await this.taskDataService.updateTask(task.id, {
        executionStatus: 'executed',
        executedAt: new Date().toISOString(),
        metadata: {
          ...task.metadata,
          sessionId,
        },
      });

      console.log(`[TaskScheduler] Successfully executed task ${task.id} in session ${sessionId}`);
      this.emit('taskExecuted', task);

      // Show notification
      const action = await vscode.window.showInformationMessage(
        `Task executed: ${task.title}`,
        'Open Session'
      );

      if (action === 'Open Session') {
        // Open the session in the chat view
        vscode.commands.executeCommand('claudeos.openSession', sessionId);
      }
    } catch (error) {
      console.error(`[TaskScheduler] Failed to execute task ${task.id}:`, error);

      // Update task with error
      await this.taskDataService.updateTask(task.id, {
        status: TaskStatus.BLOCKED,
        executionStatus: 'failed',
        executionError: error instanceof Error ? error.message : String(error),
      });

      this.emit('taskFailed', task, error instanceof Error ? error : new Error(String(error)));

      // Show error notification
      vscode.window.showErrorMessage(`Failed to execute task: ${task.title}\n${error}`);
    }
  }

  /**
   * Create a session based on the task's execution target
   */
  private async createSession(task: Task): Promise<string> {
    const executionTarget = task.executionTarget || 'new';

    switch (executionTarget) {
      case 'new': {
        // Create a new session
        return await this.createNewSession(task.title);
      }

      case 'existing': {
        // Use an existing session
        if (!task.targetSessionId) {
          throw new Error('No target session ID specified for existing session execution');
        }
        return task.targetSessionId;
      }

      case 'custom': {
        // Create a new session with custom agent prompt
        const sessionId = await this.createNewSession(task.title);

        // The custom agent prompt will be prepended to the task content
        // when sending the message
        return sessionId;
      }

      default:
        throw new Error(`Unknown execution target: ${executionTarget}`);
    }
  }

  /**
   * Create a new Claude Code session via the kernel API
   */
  private async createNewSession(title: string): Promise<string> {
    if (!this.jwtToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.apiUrl}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.jwtToken}`,
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create session: ${response.statusText} - ${error}`);
    }

    const data = await response.json();
    return data.session.id;
  }

  /**
   * Send the task content to a session via WebSocket
   */
  private async sendTaskToSession(sessionId: string, task: Task): Promise<void> {
    // Build the message to send to Claude
    let message = task.description || task.title;

    // For custom agent execution, prepend the custom prompt
    if (task.executionTarget === 'custom' && task.customAgentPrompt) {
      message = `${task.customAgentPrompt}\n\n${message}`;
    }

    // Add task metadata to the message
    if (task.metadata) {
      const metadata: string[] = [];

      if (task.metadata.relatedFiles && task.metadata.relatedFiles.length > 0) {
        metadata.push(`Related files: ${task.metadata.relatedFiles.join(', ')}`);
      }

      if (task.metadata.relatedUrls && task.metadata.relatedUrls.length > 0) {
        metadata.push(`Related URLs: ${task.metadata.relatedUrls.join(', ')}`);
      }

      if (metadata.length > 0) {
        message += `\n\n${metadata.join('\n')}`;
      }
    }

    // Import WebSocket dynamically
    const WS = await import('ws');
    const WebSocket = WS.default;

    return new Promise((resolve, reject) => {
      const wsUrl = `${this.wsUrl}?token=${this.jwtToken}&sessionId=${sessionId}`;
      const ws = new WebSocket(wsUrl);

      let hasResponded = false;
      const timeout = setTimeout(() => {
        if (!hasResponded) {
          ws.close();
          reject(new Error('Timeout waiting for session response'));
        }
      }, 30000); // 30 second timeout

      ws.on('open', () => {
        console.log(`[TaskScheduler] WebSocket connected for task execution`);

        // Send the task message
        ws.send(JSON.stringify({
          type: 'send_message',
          sessionId,
          content: message,
        }));
      });

      ws.on('message', (data: Buffer) => {
        try {
          const event = JSON.parse(data.toString());

          // Wait for the message to be acknowledged
          if (event.type === 'message' && event.message?.role === 'user') {
            hasResponded = true;
            clearTimeout(timeout);
            ws.close();
            resolve();
          }
        } catch (error) {
          console.error('[TaskScheduler] Failed to parse WebSocket message:', error);
        }
      });

      ws.on('error', (error: Error) => {
        hasResponded = true;
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${error.message}`));
      });

      ws.on('close', () => {
        if (!hasResponded) {
          hasResponded = true;
          clearTimeout(timeout);
          reject(new Error('WebSocket closed before receiving response'));
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Event Handlers                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Handle task updates from the data service
   */
  private handleTaskUpdate(task: Task): void {
    // If task was deleted or cancelled, cancel the schedule
    if (task.status === TaskStatus.CANCELLED || task.status === TaskStatus.COMPLETED) {
      this.cancelTask(task.id);
      return;
    }

    // If task has a doAt timestamp and is not yet executed, schedule it
    if (task.doAt && task.executionStatus !== 'executed' && task.executionStatus !== 'failed') {
      this.scheduleTask(task);
    } else if (!task.doAt) {
      // If doAt was removed, cancel any existing schedule
      this.cancelTask(task.id);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Periodic Check                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Start periodic check for tasks that need execution
   * This serves as a backup in case timers are missed
   */
  private startCheckInterval(): void {
    this.checkInterval = setInterval(() => {
      this.checkForDueTasks().catch(err => {
        console.error('[TaskScheduler] Error checking for due tasks:', err);
      });
    }, CHECK_INTERVAL);
  }

  /**
   * Check for tasks that are due for execution but not yet scheduled
   */
  private async checkForDueTasks(): Promise<void> {
    try {
      const tasks = await this.taskDataService.getTasks();
      const now = new Date();

      for (const task of tasks) {
        // Skip tasks that are already scheduled or completed
        if (
          this.scheduledTasks.has(task.id) ||
          task.status === TaskStatus.COMPLETED ||
          task.status === TaskStatus.CANCELLED ||
          task.executionStatus === 'executed' ||
          task.executionStatus === 'failed'
        ) {
          continue;
        }

        // Check if task is due for execution
        if (task.doAt) {
          const doAt = new Date(task.doAt);

          if (doAt <= now) {
            console.log(`[TaskScheduler] Found overdue task ${task.id}, executing now`);
            await this.executeTask(task);
          }
        }
      }
    } catch (error) {
      console.error('[TaskScheduler] Error in periodic check:', error);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Cleanup                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Dispose of resources and clean up timers
   */
  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    // Clear check interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Cancel all scheduled tasks
    for (const [taskId, scheduled] of this.scheduledTasks.entries()) {
      clearTimeout(scheduled.timer);
      console.log(`[TaskScheduler] Cancelled scheduled task ${taskId} during dispose`);
    }
    this.scheduledTasks.clear();

    // Remove all event listeners
    this.removeAllListeners();

    console.log('[TaskScheduler] Disposed successfully');
  }

  /* ------------------------------------------------------------------ */
  /*  TypeScript EventEmitter Type Overrides                            */
  /* ------------------------------------------------------------------ */

  on<K extends keyof TaskSchedulerEvents>(
    event: K,
    listener: TaskSchedulerEvents[K]
  ): this {
    return super.on(event, listener as (...args: any[]) => void);
  }

  once<K extends keyof TaskSchedulerEvents>(
    event: K,
    listener: TaskSchedulerEvents[K]
  ): this {
    return super.once(event, listener as (...args: any[]) => void);
  }

  off<K extends keyof TaskSchedulerEvents>(
    event: K,
    listener: TaskSchedulerEvents[K]
  ): this {
    return super.off(event, listener as (...args: any[]) => void);
  }

  emit<K extends keyof TaskSchedulerEvents>(
    event: K,
    ...args: Parameters<TaskSchedulerEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
