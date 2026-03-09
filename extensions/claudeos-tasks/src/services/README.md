# TaskScheduler Service

The TaskScheduler service manages scheduled task execution for the ClaudeOS Tasks extension. It monitors tasks with `doAt` timestamps and automatically executes them by creating Claude Code sessions at the specified time.

## Features

- **Automatic Scheduling**: Tasks with a `doAt` timestamp are automatically scheduled for execution
- **Session Management**: Creates new sessions, uses existing sessions, or spawns custom agents based on task configuration
- **Persistent Scheduling**: Loads and reschedules pending tasks on extension restart
- **EventEmitter Pattern**: Emits events for task lifecycle (scheduled, executed, failed, cancelled)
- **Graceful Handling**: Handles overdue tasks, network errors, and authentication failures
- **Periodic Backup Check**: Runs a periodic check to catch any tasks that might have been missed

## Architecture

### Core Components

1. **Task Scheduling**
   - Maintains a Map of scheduled tasks with their Node.js timers
   - Schedules tasks based on their `doAt` timestamp
   - Automatically reschedules tasks when they're updated

2. **Session Creation**
   - Integrates with the kernel's `/api/sessions` endpoint
   - Supports three execution targets:
     - `new`: Creates a new Claude Code session
     - `existing`: Uses an existing session (via `targetSessionId`)
     - `custom`: Creates a new session with custom agent prompt

3. **Task Execution**
   - Updates task status to `IN_PROGRESS` during execution
   - Sends task content to the session via WebSocket
   - Updates task with execution results or errors
   - Shows user notifications on completion/failure

4. **Event System**
   - `taskScheduled`: Emitted when a task is scheduled
   - `taskExecuted`: Emitted when a task executes successfully
   - `taskFailed`: Emitted when a task fails to execute
   - `taskCancelled`: Emitted when a scheduled task is cancelled

## Usage

### Initialization

The TaskScheduler is automatically initialized in the extension's `activate()` function:

```typescript
import { TaskScheduler } from './services/TaskScheduler';

// Initialize task scheduler
taskScheduler = new TaskScheduler(taskDataService, context);

// Listen for scheduler events
taskScheduler.on('taskScheduled', (task) => {
  console.log(`Task scheduled: ${task.title}`);
});

taskScheduler.on('taskExecuted', (task) => {
  console.log(`Task executed: ${task.title}`);
});

taskScheduler.on('taskFailed', (task, error) => {
  console.error(`Task failed: ${task.title} - ${error.message}`);
});

// Load pending tasks from disk
await taskScheduler.loadPendingTasks();
```

### Creating Scheduled Tasks

To create a task that will be executed at a specific time:

```typescript
// Create a task with a doAt timestamp
const task = await taskDataService.createTask({
  title: 'Run tests at midnight',
  description: 'Run the full test suite',
  doAt: '2026-03-10T00:00:00.000Z', // ISO 8601 timestamp
  executionTarget: 'new', // Create a new session
});

// The TaskScheduler will automatically schedule this task
```

### Execution Targets

#### New Session

Creates a new Claude Code session for the task:

```typescript
await taskDataService.createTask({
  title: 'Fix bug in auth module',
  description: 'Investigate and fix the authentication bug reported in issue #123',
  doAt: '2026-03-10T09:00:00.000Z',
  executionTarget: 'new',
});
```

#### Existing Session

Executes the task in an existing session:

```typescript
await taskDataService.createTask({
  title: 'Continue refactoring',
  description: 'Continue the database refactoring work',
  doAt: '2026-03-10T14:00:00.000Z',
  executionTarget: 'existing',
  targetSessionId: 'abc123def456', // ID of existing session
});
```

#### Custom Agent

Creates a new session with a custom agent prompt:

```typescript
await taskDataService.createTask({
  title: 'Review pull request',
  description: 'Review PR #456 and provide feedback',
  doAt: '2026-03-10T16:00:00.000Z',
  executionTarget: 'custom',
  customAgentPrompt: 'You are a senior code reviewer. Focus on security and performance.',
});
```

### Manual Execution

To execute a task immediately (bypassing the schedule):

```typescript
// Execute a task by ID
await taskScheduler.executeTaskById('task-id-123');
```

### Cancelling Scheduled Tasks

To cancel a scheduled task:

```typescript
// Cancel the schedule (doesn't delete the task)
taskScheduler.cancelTask('task-id-123');

// Or update the task to remove the doAt timestamp
await taskDataService.updateTask('task-id-123', {
  doAt: null,
});
```

## Configuration

The TaskScheduler uses the following configuration settings:

```json
{
  "claudeos.tasks.apiUrl": "http://localhost:3000/api",
  "claudeos.tasks.wsUrl": "ws://localhost:3000/ws"
}
```

These can be configured in the VS Code settings to point to the ClaudeOS kernel server.

## Task Flow

1. **Task Creation**
   - User creates a task with a `doAt` timestamp
   - TaskDataService persists the task to disk
   - TaskDataService emits `taskUpdate` event
   - TaskScheduler receives the event and schedules the task

2. **Task Scheduling**
   - TaskScheduler calculates the delay until execution
   - Creates a Node.js timer for the task
   - Updates task `executionStatus` to `'scheduled'`
   - Emits `taskScheduled` event

3. **Task Execution**
   - Timer fires at the scheduled time
   - TaskScheduler updates task status to `IN_PROGRESS`
   - Creates/uses a Claude Code session (based on `executionTarget`)
   - Sends task content to the session via WebSocket
   - Updates task with execution results

4. **Completion**
   - Task `executionStatus` is updated to `'executed'` or `'failed'`
   - Task `executedAt` timestamp is recorded
   - TaskScheduler emits `taskExecuted` or `taskFailed` event
   - User receives a notification with option to open the session

## Error Handling

The TaskScheduler handles various error scenarios:

- **Authentication Failures**: Automatically requests a new JWT token
- **Network Errors**: Updates task with error message and status
- **Missing Sessions**: Validates session existence before execution
- **WebSocket Failures**: Includes timeout and error handling
- **Overdue Tasks**: Executes immediately when loaded from disk

## Persistence

Tasks are persisted to disk by the TaskDataService. When the extension restarts:

1. TaskScheduler calls `loadPendingTasks()`
2. All tasks with `doAt` timestamps are loaded
3. Overdue tasks are executed immediately
4. Future tasks are scheduled with new timers

This ensures that scheduled tasks survive VS Code restarts.

## Performance Considerations

- **Timer Management**: Uses Node.js timers for efficient scheduling
- **Periodic Check**: Runs every 60 seconds as a backup (configurable via `CHECK_INTERVAL`)
- **Grace Period**: Tasks can execute up to 5 seconds early (configurable via `EXECUTION_GRACE_PERIOD`)
- **WebSocket Timeout**: 30-second timeout for session communication
- **Memory Usage**: Minimal - only stores task IDs and timers in memory

## Integration with Other Services

The TaskScheduler integrates with:

1. **TaskDataService**: Listens for task updates and persists execution results
2. **Kernel API**: Creates sessions via `/api/sessions` endpoint
3. **Kernel WebSocket**: Sends messages to sessions via WebSocket
4. **VS Code**: Shows notifications and integrates with command system

## Cleanup

The TaskScheduler properly cleans up resources on disposal:

```typescript
export function deactivate() {
  if (taskScheduler) {
    taskScheduler.dispose(); // Cancels all timers and cleans up
    taskScheduler = null;
  }
}
```

This ensures no memory leaks or orphaned timers.
