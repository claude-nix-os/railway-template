import * as vscode from 'vscode';
import { TaskTreeProvider } from '../taskTree/TaskTreeProvider';
import { TaskDataService } from '../services/TaskDataService';
import { TaskScheduler } from '../services/TaskScheduler';
import { TaskTreeItem } from '../taskTree/TaskTreeItem';
import { Task, TaskStatus, TaskPriority, TaskTarget, ExecutionTarget, TaskScheduleOptions } from '../types';

/**
 * Register all task-related commands
 */
export function registerTaskCommands(
  context: vscode.ExtensionContext,
  treeProvider: TaskTreeProvider,
  dataService: TaskDataService,
  taskScheduler: TaskScheduler,
  treeView: vscode.TreeView<vscode.TreeItem>
): void {
  // Create task command
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.createTask', async () => {
      await createTask(dataService, taskScheduler, treeProvider);
    })
  );

  // Edit task command
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.editTask', async (item?: TaskTreeItem) => {
      await editTask(item, dataService, treeProvider);
    })
  );

  // Delete task command
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.deleteTask', async (item: TaskTreeItem) => {
      await deleteTask(item, dataService, treeProvider);
    })
  );

  // Complete task command
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.completeTask', async (item: TaskTreeItem) => {
      await completeTask(item, dataService, treeProvider);
    })
  );

  // Uncomplete task command
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.uncompleteTask', async (item: TaskTreeItem) => {
      await uncompleteTask(item, dataService, treeProvider);
    })
  );

  // Set priority command
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.setPriority', async (item: TaskTreeItem) => {
      await setPriority(item, dataService, treeProvider);
    })
  );

  // Schedule task command (updated with interactive scheduling)
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.scheduleTask', async (item: TaskTreeItem) => {
      await scheduleTaskCommand(item, dataService, taskScheduler, treeProvider);
    })
  );

  // Execute task now command
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.executeTaskNow', async (item: TaskTreeItem) => {
      await executeTaskNowCommand(item, dataService, taskScheduler, treeProvider);
    })
  );

  // View task details command
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.viewTaskDetails', async (item: TaskTreeItem) => {
      await viewTaskDetailsCommand(item);
    })
  );

  // Refresh tasks command
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeos.refreshTasks', () => {
      treeProvider.refresh();
    })
  );
}

/**
 * Create a new task with optional scheduling
 */
async function createTask(
  dataService: TaskDataService,
  taskScheduler: TaskScheduler,
  treeProvider: TaskTreeProvider
): Promise<void> {
  try {
    // Get task title
    const title = await vscode.window.showInputBox({
      prompt: 'Enter task title',
      placeHolder: 'Task title',
      validateInput: (value) => {
        return value.trim().length === 0 ? 'Task title cannot be empty' : undefined;
      }
    });

    if (!title) {
      return;
    }

    // Get task description (optional)
    const description = await vscode.window.showInputBox({
      prompt: 'Enter task description (optional)',
      placeHolder: 'Task description'
    });

    // Get priority
    const priorityItems = [
      { label: '🔴 Urgent', priority: TaskPriority.URGENT },
      { label: '🟠 High', priority: TaskPriority.HIGH },
      { label: '🟡 Medium', priority: TaskPriority.MEDIUM },
      { label: '🟢 Low', priority: TaskPriority.LOW }
    ];

    const selectedPriority = await vscode.window.showQuickPick(priorityItems, {
      placeHolder: 'Select task priority'
    });

    if (!selectedPriority) {
      return;
    }

    // Get target
    const targetItems = [
      { label: '$(file-code) Code', target: TaskTarget.CODE },
      { label: '$(book) Documentation', target: TaskTarget.DOCS },
      { label: '$(beaker) Testing', target: TaskTarget.TEST },
      { label: '$(bug) Bug Fix', target: TaskTarget.BUG },
      { label: '$(star) Feature', target: TaskTarget.FEATURE },
      { label: '$(tools) Refactoring', target: TaskTarget.REFACTOR },
      { label: '$(search) Research', target: TaskTarget.RESEARCH },
      { label: '$(circle-outline) General', target: TaskTarget.GENERAL }
    ];

    const selectedTarget = await vscode.window.showQuickPick(targetItems, {
      placeHolder: 'Select task target/type'
    });

    if (!selectedTarget) {
      return;
    }

    // Ask if user wants to schedule the task
    const scheduleOption = await vscode.window.showQuickPick(
      [
        { label: '$(clock) Schedule for later', value: 'schedule' },
        { label: '$(circle-outline) Create without scheduling', value: 'no-schedule' }
      ],
      { placeHolder: 'Do you want to schedule this task?' }
    );

    if (!scheduleOption) {
      return;
    }

    let doAt: string | undefined;
    let executionTarget: ExecutionTarget | undefined;

    if (scheduleOption.value === 'schedule') {
      // Get scheduling time
      const timeOptions = [
        { label: 'In 1 hour', date: new Date(Date.now() + 60 * 60 * 1000) },
        { label: 'In 3 hours', date: new Date(Date.now() + 3 * 60 * 60 * 1000) },
        { label: 'In 6 hours', date: new Date(Date.now() + 6 * 60 * 60 * 1000) },
        { label: 'Tomorrow', date: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        { label: 'In 3 days', date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
        { label: 'In 1 week', date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { label: 'Custom date/time...', date: null }
      ];

      const selectedTime = await vscode.window.showQuickPick(timeOptions, {
        placeHolder: 'When should this task execute?'
      });

      if (!selectedTime) {
        return;
      }

      if (selectedTime.date === null) {
        // Custom date/time
        const customDateString = await vscode.window.showInputBox({
          prompt: 'Enter date/time (ISO 8601 format)',
          placeHolder: '2026-03-15T14:30:00',
          validateInput: (value) => {
            const date = new Date(value);
            return isNaN(date.getTime()) ? 'Invalid date/time format' : undefined;
          }
        });

        if (!customDateString) {
          return;
        }

        doAt = new Date(customDateString).toISOString();
      } else {
        doAt = selectedTime.date.toISOString();
      }

      // Get execution target
      const executionTargetOptions = [
        { label: '$(add) New session', value: 'new' as ExecutionTarget },
        { label: '$(link) Existing session', value: 'existing' as ExecutionTarget },
        { label: '$(settings-gear) Custom agent', value: 'custom' as ExecutionTarget }
      ];

      const selectedExecutionTarget = await vscode.window.showQuickPick(executionTargetOptions, {
        placeHolder: 'Where should this task execute?'
      });

      if (selectedExecutionTarget) {
        executionTarget = selectedExecutionTarget.value;
      }
    }

    // Create the task
    const newTask = await dataService.createTask({
      title: title.trim(),
      description: description?.trim() || undefined,
      priority: selectedPriority.priority,
      target: selectedTarget.target,
      doAt: doAt || null,
      executionTarget: executionTarget,
      executionStatus: doAt ? 'scheduled' : 'pending'
    });

    // Schedule the task if doAt is set
    if (doAt && newTask) {
      taskScheduler.scheduleTask(newTask);
    }

    treeProvider.refresh();

    if (doAt) {
      vscode.window.showInformationMessage(
        `Task "${title}" created and scheduled for ${new Date(doAt).toLocaleString()}`
      );
    } else {
      vscode.window.showInformationMessage(`Task "${title}" created successfully`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create task: ${error}`);
  }
}

/**
 * Edit an existing task
 */
async function editTask(
  item: TaskTreeItem | undefined,
  dataService: TaskDataService,
  treeProvider: TaskTreeProvider
): Promise<void> {
  try {
    if (!item) {
      vscode.window.showErrorMessage('No task selected');
      return;
    }

    const task = item.task;

    // Edit title
    const newTitle = await vscode.window.showInputBox({
      prompt: 'Edit task title',
      value: task.title,
      validateInput: (value) => {
        return value.trim().length === 0 ? 'Task title cannot be empty' : undefined;
      }
    });

    if (newTitle === undefined) {
      return; // User cancelled
    }

    // Edit description
    const newDescription = await vscode.window.showInputBox({
      prompt: 'Edit task description',
      value: task.description || '',
      placeHolder: 'Task description (optional)'
    });

    if (newDescription === undefined) {
      return; // User cancelled
    }

    // Update the task
    await dataService.updateTask(task.id, {
      title: newTitle.trim(),
      description: newDescription.trim() || undefined
    });

    treeProvider.refresh();
    vscode.window.showInformationMessage(`Task "${newTitle}" updated successfully`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to edit task: ${error}`);
  }
}

/**
 * Delete a task
 */
async function deleteTask(
  item: TaskTreeItem,
  dataService: TaskDataService,
  treeProvider: TaskTreeProvider
): Promise<void> {
  try {
    const task = item.task;

    // Confirm deletion
    const confirm = await vscode.window.showWarningMessage(
      `Are you sure you want to delete task "${task.title}"?`,
      { modal: true },
      'Delete'
    );

    if (confirm !== 'Delete') {
      return;
    }

    await dataService.deleteTask(task.id);
    treeProvider.refresh();
    vscode.window.showInformationMessage(`Task "${task.title}" deleted`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to delete task: ${error}`);
  }
}

/**
 * Mark task as complete
 */
async function completeTask(
  item: TaskTreeItem,
  dataService: TaskDataService,
  treeProvider: TaskTreeProvider
): Promise<void> {
  try {
    await dataService.completeTask(item.task.id);
    treeProvider.refresh();
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to complete task: ${error}`);
  }
}

/**
 * Mark task as incomplete
 */
async function uncompleteTask(
  item: TaskTreeItem,
  dataService: TaskDataService,
  treeProvider: TaskTreeProvider
): Promise<void> {
  try {
    await dataService.uncompleteTask(item.task.id);
    treeProvider.refresh();
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to uncomplete task: ${error}`);
  }
}

/**
 * Set task priority
 */
async function setPriority(
  item: TaskTreeItem,
  dataService: TaskDataService,
  treeProvider: TaskTreeProvider
): Promise<void> {
  try {
    const task = item.task;

    const priorityItems = [
      { label: '🔴 Urgent', priority: TaskPriority.URGENT },
      { label: '🟠 High', priority: TaskPriority.HIGH },
      { label: '🟡 Medium', priority: TaskPriority.MEDIUM },
      { label: '🟢 Low', priority: TaskPriority.LOW }
    ];

    const selected = await vscode.window.showQuickPick(priorityItems, {
      placeHolder: `Select priority for "${task.title}"`
    });

    if (!selected) {
      return;
    }

    await dataService.updateTask(task.id, {
      priority: selected.priority
    });

    treeProvider.refresh();
    vscode.window.showInformationMessage(`Priority updated for "${task.title}"`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to set priority: ${error}`);
  }
}

/**
 * Schedule task with interactive scheduling (execution time, not due date)
 */
async function scheduleTaskCommand(
  item: TaskTreeItem,
  dataService: TaskDataService,
  taskScheduler: TaskScheduler,
  treeProvider: TaskTreeProvider
): Promise<void> {
  try {
    const task = item.task;

    // Quick scheduling options
    const quickOptions = [
      { label: '$(clock) In 1 hour', hours: 1 },
      { label: '$(clock) In 3 hours', hours: 3 },
      { label: '$(clock) In 6 hours', hours: 6 },
      { label: '$(calendar) Tomorrow (9 AM)', hours: null, tomorrow: true },
      { label: '$(calendar) In 3 days', days: 3 },
      { label: '$(calendar) In 1 week', days: 7 },
      { label: '$(edit) Custom date/time...', custom: true },
      { label: '$(trash) Clear schedule', clear: true }
    ];

    const selected = await vscode.window.showQuickPick(quickOptions, {
      placeHolder: `Schedule task "${task.title}"`
    });

    if (!selected) {
      return;
    }

    let doAt: string | null = null;

    if (selected.clear) {
      doAt = null;
    } else if (selected.custom) {
      // Custom date/time
      const customDateString = await vscode.window.showInputBox({
        prompt: 'Enter date/time (ISO 8601 format)',
        placeHolder: '2026-03-15T14:30:00',
        value: task.doAt || new Date().toISOString().slice(0, 16),
        validateInput: (value) => {
          const date = new Date(value);
          return isNaN(date.getTime()) ? 'Invalid date/time format' : undefined;
        }
      });

      if (!customDateString) {
        return;
      }

      doAt = new Date(customDateString).toISOString();
    } else if (selected.tomorrow) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      doAt = tomorrow.toISOString();
    } else if (selected.hours) {
      const scheduledTime = new Date(Date.now() + selected.hours * 60 * 60 * 1000);
      doAt = scheduledTime.toISOString();
    } else if (selected.days) {
      const scheduledTime = new Date(Date.now() + selected.days * 24 * 60 * 60 * 1000);
      doAt = scheduledTime.toISOString();
    }

    // If scheduling (not clearing), ask for execution target
    let executionTarget: ExecutionTarget | undefined;
    let targetSessionId: string | null = null;
    let customAgentPrompt: string | null = null;

    if (doAt) {
      const executionTargetOptions = [
        { label: '$(add) New session', description: 'Create a new session for this task', value: 'new' as ExecutionTarget },
        { label: '$(link) Existing session', description: 'Execute in an existing session', value: 'existing' as ExecutionTarget },
        { label: '$(settings-gear) Custom agent', description: 'Use custom agent instructions', value: 'custom' as ExecutionTarget }
      ];

      const selectedExecutionTarget = await vscode.window.showQuickPick(executionTargetOptions, {
        placeHolder: 'Where should this task execute?'
      });

      if (!selectedExecutionTarget) {
        return;
      }

      executionTarget = selectedExecutionTarget.value;

      // Handle existing session selection
      if (executionTarget === 'existing') {
        const sessionIdInput = await vscode.window.showInputBox({
          prompt: 'Enter session ID',
          placeHolder: 'session-id-here',
          validateInput: (value) => {
            return value.trim().length === 0 ? 'Session ID cannot be empty' : undefined;
          }
        });

        if (!sessionIdInput) {
          return;
        }

        targetSessionId = sessionIdInput.trim();
      }

      // Handle custom agent prompt
      if (executionTarget === 'custom') {
        const customPrompt = await vscode.window.showInputBox({
          prompt: 'Enter custom agent instructions',
          placeHolder: 'You are an expert developer...',
          validateInput: (value) => {
            return value.trim().length === 0 ? 'Custom agent prompt cannot be empty' : undefined;
          }
        });

        if (!customPrompt) {
          return;
        }

        customAgentPrompt = customPrompt.trim();
      }
    }

    // Update the task
    const updatedTask = await dataService.updateTask(task.id, {
      doAt,
      executionTarget,
      targetSessionId,
      customAgentPrompt,
      executionStatus: doAt ? 'scheduled' : 'pending'
    });

    // Schedule with the TaskScheduler if doAt is set
    if (doAt && updatedTask) {
      taskScheduler.scheduleTask(updatedTask);
    }

    treeProvider.refresh();

    if (doAt) {
      vscode.window.showInformationMessage(
        `Task "${task.title}" scheduled for ${new Date(doAt).toLocaleString()}`
      );
    } else {
      vscode.window.showInformationMessage(`Schedule cleared for "${task.title}"`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to schedule task: ${error}`);
  }
}

/**
 * Execute task immediately
 */
async function executeTaskNowCommand(
  item: TaskTreeItem,
  dataService: TaskDataService,
  taskScheduler: TaskScheduler,
  treeProvider: TaskTreeProvider
): Promise<void> {
  try {
    const task = item.task;

    // Confirm execution
    const confirm = await vscode.window.showInformationMessage(
      `Execute task "${task.title}" now?`,
      { modal: true },
      'Execute'
    );

    if (confirm !== 'Execute') {
      return;
    }

    // Show notification that execution is starting
    vscode.window.showInformationMessage(
      `Executing task "${task.title}"...`
    );

    // Execute the task using TaskScheduler
    await taskScheduler.executeTaskById(task.id);

    treeProvider.refresh();
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to execute task: ${error}`);
    treeProvider.refresh();
  }
}

/**
 * View task details in a dedicated panel
 */
async function viewTaskDetailsCommand(item: TaskTreeItem): Promise<void> {
  try {
    const task = item.task;

    // Create a webview panel to show task details
    const panel = vscode.window.createWebviewPanel(
      'taskDetails',
      `Task: ${task.title}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true
      }
    );

    // Build the HTML content
    const html = buildTaskDetailsHtml(task);
    panel.webview.html = html;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to view task details: ${error}`);
  }
}

/**
 * Build HTML for task details webview
 */
function buildTaskDetailsHtml(task: Task): string {
  const statusColor = getStatusColor(task.status);
  const priorityColor = getPriorityColor(task.priority);
  const executionStatusColor = task.executionStatus ? getExecutionStatusColor(task.executionStatus) : '#888';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Task Details</title>
      <style>
        body {
          font-family: var(--vscode-font-family);
          padding: 20px;
          color: var(--vscode-foreground);
          background-color: var(--vscode-editor-background);
        }
        h1 {
          font-size: 24px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--vscode-panel-border);
          padding-bottom: 10px;
        }
        .section {
          margin-bottom: 20px;
        }
        .section h2 {
          font-size: 18px;
          margin-bottom: 10px;
          color: var(--vscode-textLink-foreground);
        }
        .field {
          margin-bottom: 10px;
        }
        .field-label {
          font-weight: bold;
          margin-right: 8px;
        }
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 12px;
          font-weight: bold;
        }
        .status-badge {
          background-color: ${statusColor};
          color: white;
        }
        .priority-badge {
          background-color: ${priorityColor};
          color: white;
        }
        .execution-badge {
          background-color: ${executionStatusColor};
          color: white;
        }
        .description {
          background-color: var(--vscode-textCodeBlock-background);
          padding: 10px;
          border-radius: 4px;
          white-space: pre-wrap;
        }
        .timestamp {
          color: var(--vscode-descriptionForeground);
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(task.title)}</h1>

      ${task.description ? `
        <div class="section">
          <h2>Description</h2>
          <div class="description">${escapeHtml(task.description)}</div>
        </div>
      ` : ''}

      <div class="section">
        <h2>Status & Priority</h2>
        <div class="field">
          <span class="field-label">Status:</span>
          <span class="badge status-badge">${task.status}</span>
        </div>
        <div class="field">
          <span class="field-label">Priority:</span>
          <span class="badge priority-badge">${task.priority}</span>
        </div>
        <div class="field">
          <span class="field-label">Target:</span>
          <span>${task.target}</span>
        </div>
      </div>

      ${task.executionStatus || task.doAt || task.doBy ? `
        <div class="section">
          <h2>Execution Details</h2>
          ${task.executionStatus ? `
            <div class="field">
              <span class="field-label">Execution Status:</span>
              <span class="badge execution-badge">${task.executionStatus}</span>
            </div>
          ` : ''}
          ${task.doAt ? `
            <div class="field">
              <span class="field-label">Scheduled for:</span>
              <span class="timestamp">${new Date(task.doAt).toLocaleString()}</span>
            </div>
          ` : ''}
          ${task.doBy ? `
            <div class="field">
              <span class="field-label">Deadline:</span>
              <span class="timestamp">${new Date(task.doBy).toLocaleString()}</span>
            </div>
          ` : ''}
          ${task.executionTarget ? `
            <div class="field">
              <span class="field-label">Execution Target:</span>
              <span>${task.executionTarget}</span>
            </div>
          ` : ''}
          ${task.targetSessionId ? `
            <div class="field">
              <span class="field-label">Target Session:</span>
              <span>${task.targetSessionId}</span>
            </div>
          ` : ''}
          ${task.executedAt ? `
            <div class="field">
              <span class="field-label">Executed at:</span>
              <span class="timestamp">${new Date(task.executedAt).toLocaleString()}</span>
            </div>
          ` : ''}
          ${task.executionError ? `
            <div class="field">
              <span class="field-label">Execution Error:</span>
              <span style="color: var(--vscode-errorForeground)">${escapeHtml(task.executionError)}</span>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="section">
        <h2>Timestamps</h2>
        <div class="field">
          <span class="field-label">Created:</span>
          <span class="timestamp">${task.createdAt.toLocaleString()}</span>
        </div>
        <div class="field">
          <span class="field-label">Updated:</span>
          <span class="timestamp">${task.updatedAt.toLocaleString()}</span>
        </div>
        ${task.dueDate ? `
          <div class="field">
            <span class="field-label">Due Date:</span>
            <span class="timestamp">${new Date(task.dueDate).toLocaleString()}</span>
          </div>
        ` : ''}
        ${task.completedAt ? `
          <div class="field">
            <span class="field-label">Completed:</span>
            <span class="timestamp">${new Date(task.completedAt).toLocaleString()}</span>
          </div>
        ` : ''}
      </div>

      ${task.tags && task.tags.length > 0 ? `
        <div class="section">
          <h2>Tags</h2>
          <div>${task.tags.join(', ')}</div>
        </div>
      ` : ''}

      ${task.assignee ? `
        <div class="section">
          <h2>Assignee</h2>
          <div>${task.assignee}</div>
        </div>
      ` : ''}
    </body>
    </html>
  `;
}

/**
 * Get color for task status
 */
function getStatusColor(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.COMPLETED: return '#4caf50';
    case TaskStatus.IN_PROGRESS: return '#2196f3';
    case TaskStatus.BLOCKED: return '#ff9800';
    case TaskStatus.CANCELLED: return '#9e9e9e';
    case TaskStatus.TODO: return '#607d8b';
    default: return '#888';
  }
}

/**
 * Get color for priority
 */
function getPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.URGENT: return '#f44336';
    case TaskPriority.HIGH: return '#ff9800';
    case TaskPriority.MEDIUM: return '#2196f3';
    case TaskPriority.LOW: return '#4caf50';
    default: return '#888';
  }
}

/**
 * Get color for execution status
 */
function getExecutionStatusColor(status: string): string {
  switch (status) {
    case 'executing': return '#2196f3';
    case 'executed': return '#4caf50';
    case 'failed': return '#f44336';
    case 'scheduled': return '#ff9800';
    case 'pending': return '#607d8b';
    default: return '#888';
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = { textContent: text } as any;
  const temp = { innerHTML: '' } as any;
  const node = { appendChild: () => {}, firstChild: div };
  temp.appendChild = () => node;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
