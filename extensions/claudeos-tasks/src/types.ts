/**
 * Task status enumeration
 */
export enum TaskStatus {
  /** Task is not yet started */
  TODO = 'todo',

  /** Task is currently in progress */
  IN_PROGRESS = 'in_progress',

  /** Task is complete */
  COMPLETED = 'completed',

  /** Task is blocked/on hold */
  BLOCKED = 'blocked',

  /** Task was cancelled */
  CANCELLED = 'cancelled'
}

/**
 * Task priority levels
 */
export enum TaskPriority {
  /** Low priority task */
  LOW = 'low',

  /** Medium priority task */
  MEDIUM = 'medium',

  /** High priority task */
  HIGH = 'high',

  /** Urgent priority task */
  URGENT = 'urgent'
}

/**
 * Task target/scope
 */
export enum TaskTarget {
  /** General/unspecified target */
  GENERAL = 'general',

  /** Code implementation task */
  CODE = 'code',

  /** Documentation task */
  DOCS = 'docs',

  /** Testing task */
  TEST = 'test',

  /** Bug fix task */
  BUG = 'bug',

  /** Feature development task */
  FEATURE = 'feature',

  /** Refactoring task */
  REFACTOR = 'refactor',

  /** Research/investigation task */
  RESEARCH = 'research'
}

/**
 * Task execution target type
 */
export type ExecutionTarget = 'new' | 'existing' | 'custom';

/**
 * Task execution status
 */
export type ExecutionStatus = 'pending' | 'scheduled' | 'executing' | 'executed' | 'failed';

/**
 * Represents a task
 */
export interface Task {
  /** Unique task identifier */
  id: string;

  /** Task title/name */
  title: string;

  /** Optional detailed description */
  description?: string;

  /** Current task status */
  status: TaskStatus;

  /** Task priority */
  priority: TaskPriority;

  /** Task target/scope */
  target: TaskTarget;

  /** Timestamp when task was created */
  createdAt: Date;

  /** Timestamp when task was last modified */
  updatedAt: Date;

  /** Optional due date */
  dueDate?: Date;

  /** Optional completion date */
  completedAt?: Date;

  /** Optional task tags */
  tags?: string[];

  /** Optional assignee */
  assignee?: string;

  /** Optional parent task ID for subtasks */
  parentId?: string;

  /** Optional task metadata */
  metadata?: {
    /** Estimated effort/time */
    estimatedEffort?: string;

    /** Actual time spent */
    actualEffort?: string;

    /** Related file paths */
    relatedFiles?: string[];

    /** Related URLs/references */
    relatedUrls?: string[];

    /** Custom user data */
    [key: string]: any;
  };

  /** ISO 8601 timestamp for when the task should execute */
  doAt?: string | null;

  /** ISO 8601 timestamp for deadline (different from doAt) */
  doBy?: string | null;

  /** What kind of session to create */
  executionTarget?: ExecutionTarget;

  /** For executionTarget='existing', which session to use */
  targetSessionId?: string | null;

  /** For executionTarget='custom', the agent instructions */
  customAgentPrompt?: string | null;

  /** Execution state */
  executionStatus?: ExecutionStatus;

  /** When it was actually executed */
  executedAt?: string | null;

  /** Error message if execution failed */
  executionError?: string | null;
}

/**
 * Task group for organizing tasks in tree view
 */
export interface TaskGroup {
  /** Group identifier */
  id: string;

  /** Group label */
  label: string;

  /** Tasks in this group */
  tasks: Task[];

  /** Group type */
  type: 'priority' | 'status' | 'target' | 'custom';

  /** Group icon */
  icon?: string;
}

/**
 * Task provider interface for fetching and managing tasks
 */
export interface ITaskProvider {
  /** Fetch all tasks */
  getTasks(): Promise<Task[]>;

  /** Get a specific task by ID */
  getTask(id: string): Promise<Task | undefined>;

  /** Create a new task */
  createTask(task: Partial<Task>): Promise<Task>;

  /** Update an existing task */
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;

  /** Delete a task */
  deleteTask(id: string): Promise<void>;

  /** Mark task as complete */
  completeTask(id: string): Promise<Task>;

  /** Mark task as incomplete */
  uncompleteTask(id: string): Promise<Task>;

  /** Listen for task updates */
  onTaskUpdate(listener: (task: Task) => void): void;
}

/**
 * Task filter options
 */
export interface TaskFilter {
  /** Filter by status */
  status?: TaskStatus[];

  /** Filter by priority */
  priority?: TaskPriority[];

  /** Filter by target */
  target?: TaskTarget[];

  /** Filter by tags */
  tags?: string[];

  /** Include completed tasks */
  includeCompleted?: boolean;

  /** Search query */
  search?: string;
}

/**
 * Result of executing a task
 */
export interface TaskExecutionResult {
  /** Task ID that was executed */
  taskId: string;

  /** Whether execution was successful */
  success: boolean;

  /** Timestamp when execution started */
  startedAt: string;

  /** Timestamp when execution completed */
  completedAt: string;

  /** Session ID where the task was executed */
  sessionId?: string;

  /** Error message if execution failed */
  error?: string;

  /** Execution output or result data */
  output?: any;
}

/**
 * Options for scheduling a task
 */
export interface TaskScheduleOptions {
  /** When the task should execute (ISO 8601 timestamp) */
  doAt?: string;

  /** Deadline for task completion (ISO 8601 timestamp) */
  doBy?: string;

  /** What kind of session to create for execution */
  executionTarget?: ExecutionTarget;

  /** For executionTarget='existing', which session to use */
  targetSessionId?: string;

  /** For executionTarget='custom', the agent instructions */
  customAgentPrompt?: string;
}
