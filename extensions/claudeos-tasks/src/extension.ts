import * as vscode from 'vscode';
import { TaskTreeProvider } from './taskTree/TaskTreeProvider';
import { TaskDataService } from './services/TaskDataService';
import { TaskScheduler } from './services/TaskScheduler';
import { registerTaskCommands } from './commands/taskCommands';

// Global state for cleanup
let taskDataService: TaskDataService | null = null;
let taskScheduler: TaskScheduler | null = null;

/**
 * Extension activation entry point
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('ClaudeOS Tasks extension is now active');

  // Get configuration
  const config = vscode.workspace.getConfiguration('claudeos.tasks');
  const dataPath = config.get<string>('dataPath', '');

  // Initialize task data service
  taskDataService = new TaskDataService(context, dataPath);

  // Initialize task scheduler
  taskScheduler = new TaskScheduler(taskDataService, context);

  // Create task tree provider
  const treeProvider = new TaskTreeProvider(taskDataService);

  // Register tree view
  const treeView = vscode.window.createTreeView('claudeos.taskList', {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
    canSelectMany: false
  });

  // Listen for configuration changes
  const configListener = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('claudeos.tasks')) {
      console.log('Task configuration changed, refreshing view');
      treeProvider.refresh();
    }
  });

  // Listen for task data changes
  taskDataService.onTasksChanged(() => {
    console.log('Task data changed, refreshing view');
    treeProvider.refresh();
  });

  // Listen for task scheduler events
  taskScheduler.on('taskScheduled', (task) => {
    console.log(`Task scheduled: ${task.title} at ${task.doAt}`);
    treeProvider.refresh();
  });

  taskScheduler.on('taskExecuted', (task) => {
    console.log(`Task executed: ${task.title}`);
    treeProvider.refresh();
  });

  taskScheduler.on('taskFailed', (task, error) => {
    console.error(`Task failed: ${task.title} - ${error.message}`);
    treeProvider.refresh();
  });

  // Load pending tasks for scheduling
  taskScheduler.loadPendingTasks().catch(err => {
    console.error('Failed to load pending tasks:', err);
    vscode.window.showErrorMessage(`Failed to load scheduled tasks: ${err.message}`);
  });

  // Register all task commands
  registerTaskCommands(context, treeProvider, taskDataService, taskScheduler, treeView);

  // Add disposables to context
  context.subscriptions.push(
    treeView,
    configListener
  );

  console.log('ClaudeOS Tasks extension activated successfully');
}

/**
 * Extension deactivation entry point
 * Called when the extension is deactivated
 */
export function deactivate() {
  console.log('ClaudeOS Tasks extension is now deactivated');

  // Cleanup task scheduler
  if (taskScheduler) {
    taskScheduler.dispose();
    taskScheduler = null;
  }

  // Cleanup task data service
  if (taskDataService) {
    taskDataService.dispose();
    taskDataService = null;
  }
}
