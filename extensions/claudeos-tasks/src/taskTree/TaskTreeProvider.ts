import * as vscode from 'vscode';
import { Task, TaskStatus, TaskPriority, TaskTarget, TaskGroup, ExecutionStatus } from '../types';
import { TaskDataService } from '../services/TaskDataService';
import { TaskTreeItem } from './TaskTreeItem';
import { GroupTreeItem } from './GroupTreeItem';

/**
 * Tree data provider for the task list view
 */
export class TaskTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private taskDataService: TaskDataService) {}

  /**
   * Refresh the tree view
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get tree item representation
   */
  public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children for a tree element
   */
  public async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (!element) {
      // Root level - return groups or tasks
      return this.getRootItems();
    }

    if (element instanceof GroupTreeItem) {
      // Return tasks in this group
      return this.getTaskItems(element.tasks);
    }

    // No children for task items
    return [];
  }

  /**
   * Get root level items (groups or tasks)
   */
  private async getRootItems(): Promise<vscode.TreeItem[]> {
    const config = vscode.workspace.getConfiguration('claudeos.tasks');
    const groupBy = config.get<string>('groupBy', 'priority');
    const showCompleted = config.get<boolean>('showCompletedTasks', true);
    const groupByExecution = config.get<boolean>('groupByExecutionStatus', false);

    // Get tasks with filter
    const tasks = await this.taskDataService.getTasks({
      includeCompleted: showCompleted
    });

    if (tasks.length === 0) {
      // Return empty state item
      const emptyItem = new vscode.TreeItem('No tasks yet');
      emptyItem.description = 'Create a task to get started';
      emptyItem.iconPath = new vscode.ThemeIcon('info');
      return [emptyItem];
    }

    // Group by execution status if enabled (takes priority)
    if (groupByExecution) {
      return this.getExecutionGroupedItems(tasks);
    }

    // Group tasks if needed
    if (groupBy !== 'none') {
      return this.getGroupedItems(tasks, groupBy);
    }

    // Return flat list of tasks
    return this.getTaskItems(tasks);
  }

  /**
   * Group tasks and return group items
   */
  private getGroupedItems(tasks: Task[], groupBy: string): vscode.TreeItem[] {
    const groups = this.groupTasks(tasks, groupBy);
    const sortedGroups = this.sortGroups(groups, groupBy);

    return sortedGroups.map(group => new GroupTreeItem(group));
  }

  /**
   * Get task tree items
   */
  private getTaskItems(tasks: Task[]): vscode.TreeItem[] {
    const config = vscode.workspace.getConfiguration('claudeos.tasks');
    const sortBy = config.get<string>('sortBy', 'priority');

    const sortedTasks = this.sortTasks(tasks, sortBy);
    return sortedTasks.map(task => new TaskTreeItem(task));
  }

  /**
   * Get execution status grouped items
   */
  private getExecutionGroupedItems(tasks: Task[]): vscode.TreeItem[] {
    const now = new Date();

    // Categorize tasks by execution status
    const overdueTasks: Task[] = [];
    const scheduledTasks: Task[] = [];
    const inProgressTasks: Task[] = [];
    const executedTasks: Task[] = [];
    const failedTasks: Task[] = [];
    const pendingTasks: Task[] = [];

    tasks.forEach(task => {
      if (task.executionStatus === 'executing') {
        inProgressTasks.push(task);
      } else if (task.executionStatus === 'executed') {
        executedTasks.push(task);
      } else if (task.executionStatus === 'failed') {
        failedTasks.push(task);
      } else if (task.doAt) {
        const scheduledTime = new Date(task.doAt);
        if (scheduledTime.getTime() < now.getTime() &&
            task.executionStatus !== 'executed' &&
            task.executionStatus !== 'executing') {
          overdueTasks.push(task);
        } else {
          scheduledTasks.push(task);
        }
      } else {
        pendingTasks.push(task);
      }
    });

    const groups: vscode.TreeItem[] = [];

    // Add Overdue section if there are overdue tasks
    if (overdueTasks.length > 0) {
      const sortedOverdue = this.sortTasksByDoAt(overdueTasks);
      groups.push(new GroupTreeItem({
        id: 'overdue',
        label: 'Overdue',
        tasks: sortedOverdue,
        type: 'custom',
        icon: 'warning'
      }));
    }

    // Add In Progress section
    if (inProgressTasks.length > 0) {
      groups.push(new GroupTreeItem({
        id: 'executing',
        label: 'In Progress',
        tasks: inProgressTasks,
        type: 'custom',
        icon: 'sync~spin'
      }));
    }

    // Add Scheduled section
    if (scheduledTasks.length > 0) {
      const sortedScheduled = this.sortTasksByDoAt(scheduledTasks);
      groups.push(new GroupTreeItem({
        id: 'scheduled',
        label: 'Scheduled',
        tasks: sortedScheduled,
        type: 'custom',
        icon: 'clock'
      }));
    }

    // Add Failed section
    if (failedTasks.length > 0) {
      groups.push(new GroupTreeItem({
        id: 'failed',
        label: 'Failed',
        tasks: failedTasks,
        type: 'custom',
        icon: 'error'
      }));
    }

    // Add Completed section
    if (executedTasks.length > 0) {
      groups.push(new GroupTreeItem({
        id: 'executed',
        label: 'Completed',
        tasks: executedTasks,
        type: 'custom',
        icon: 'check'
      }));
    }

    // Add Pending section
    if (pendingTasks.length > 0) {
      const config = vscode.workspace.getConfiguration('claudeos.tasks');
      const sortBy = config.get<string>('sortBy', 'priority');
      const sortedPending = this.sortTasks(pendingTasks, sortBy);
      groups.push(new GroupTreeItem({
        id: 'pending',
        label: 'Pending',
        tasks: sortedPending,
        type: 'custom',
        icon: 'circle-outline'
      }));
    }

    return groups;
  }

  /**
   * Sort tasks by doAt timestamp (soonest first)
   */
  private sortTasksByDoAt(tasks: Task[]): Task[] {
    return tasks.sort((a, b) => {
      if (!a.doAt && !b.doAt) return 0;
      if (!a.doAt) return 1;
      if (!b.doAt) return -1;
      return new Date(a.doAt).getTime() - new Date(b.doAt).getTime();
    });
  }

  /**
   * Group tasks by specified criteria
   */
  private groupTasks(tasks: Task[], groupBy: string): TaskGroup[] {
    const groupMap = new Map<string, Task[]>();

    tasks.forEach(task => {
      let key: string;
      let label: string;

      switch (groupBy) {
        case 'priority':
          key = task.priority;
          label = this.getPriorityLabel(task.priority);
          break;
        case 'status':
          key = task.status;
          label = this.getStatusLabel(task.status);
          break;
        case 'target':
          key = task.target;
          label = this.getTargetLabel(task.target);
          break;
        default:
          key = 'all';
          label = 'All Tasks';
      }

      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(task);
    });

    // Convert to TaskGroup array
    const groups: TaskGroup[] = [];
    groupMap.forEach((tasks, key) => {
      groups.push({
        id: key,
        label: this.getGroupLabel(key, groupBy),
        tasks,
        type: groupBy as any,
        icon: this.getGroupIcon(key, groupBy)
      });
    });

    return groups;
  }

  /**
   * Sort task groups
   */
  private sortGroups(groups: TaskGroup[], groupBy: string): TaskGroup[] {
    if (groupBy === 'priority') {
      const priorityOrder = [TaskPriority.URGENT, TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW];
      return groups.sort((a, b) => {
        return priorityOrder.indexOf(a.id as TaskPriority) - priorityOrder.indexOf(b.id as TaskPriority);
      });
    } else if (groupBy === 'status') {
      const statusOrder = [TaskStatus.IN_PROGRESS, TaskStatus.TODO, TaskStatus.BLOCKED, TaskStatus.COMPLETED, TaskStatus.CANCELLED];
      return groups.sort((a, b) => {
        return statusOrder.indexOf(a.id as TaskStatus) - statusOrder.indexOf(b.id as TaskStatus);
      });
    }

    return groups.sort((a, b) => a.label.localeCompare(b.label));
  }

  /**
   * Sort tasks within a group
   */
  private sortTasks(tasks: Task[], sortBy: string): Task[] {
    return tasks.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = [TaskPriority.URGENT, TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW];
          return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.getTime() - b.dueDate.getTime();
        case 'doAt':
          // Sort by scheduled time (soonest first)
          if (!a.doAt && !b.doAt) return 0;
          if (!a.doAt) return 1;
          if (!b.doAt) return -1;
          return new Date(a.doAt).getTime() - new Date(b.doAt).getTime();
        case 'createdDate':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'name':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }

  /**
   * Get group label with task count
   */
  private getGroupLabel(key: string, groupBy: string): string {
    let baseLabel: string;

    switch (groupBy) {
      case 'priority':
        baseLabel = this.getPriorityLabel(key as TaskPriority);
        break;
      case 'status':
        baseLabel = this.getStatusLabel(key as TaskStatus);
        break;
      case 'target':
        baseLabel = this.getTargetLabel(key as TaskTarget);
        break;
      default:
        baseLabel = key;
    }

    return baseLabel;
  }

  /**
   * Get icon for group
   */
  private getGroupIcon(key: string, groupBy: string): string {
    if (groupBy === 'priority') {
      switch (key) {
        case TaskPriority.URGENT: return 'flame';
        case TaskPriority.HIGH: return 'arrow-up';
        case TaskPriority.MEDIUM: return 'dash';
        case TaskPriority.LOW: return 'arrow-down';
      }
    } else if (groupBy === 'status') {
      switch (key) {
        case TaskStatus.TODO: return 'circle-outline';
        case TaskStatus.IN_PROGRESS: return 'sync';
        case TaskStatus.COMPLETED: return 'check';
        case TaskStatus.BLOCKED: return 'warning';
        case TaskStatus.CANCELLED: return 'x';
      }
    } else if (groupBy === 'target') {
      switch (key) {
        case TaskTarget.CODE: return 'code';
        case TaskTarget.DOCS: return 'book';
        case TaskTarget.TEST: return 'beaker';
        case TaskTarget.BUG: return 'bug';
        case TaskTarget.FEATURE: return 'star';
        case TaskTarget.REFACTOR: return 'tools';
        case TaskTarget.RESEARCH: return 'search';
      }
    }

    return 'folder';
  }

  /**
   * Get priority label
   */
  private getPriorityLabel(priority: TaskPriority): string {
    switch (priority) {
      case TaskPriority.URGENT: return 'Urgent';
      case TaskPriority.HIGH: return 'High Priority';
      case TaskPriority.MEDIUM: return 'Medium Priority';
      case TaskPriority.LOW: return 'Low Priority';
      default: return priority;
    }
  }

  /**
   * Get status label
   */
  private getStatusLabel(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.TODO: return 'To Do';
      case TaskStatus.IN_PROGRESS: return 'In Progress';
      case TaskStatus.COMPLETED: return 'Completed';
      case TaskStatus.BLOCKED: return 'Blocked';
      case TaskStatus.CANCELLED: return 'Cancelled';
      default: return status;
    }
  }

  /**
   * Get target label
   */
  private getTargetLabel(target: TaskTarget): string {
    switch (target) {
      case TaskTarget.CODE: return 'Code';
      case TaskTarget.DOCS: return 'Documentation';
      case TaskTarget.TEST: return 'Testing';
      case TaskTarget.BUG: return 'Bug Fix';
      case TaskTarget.FEATURE: return 'Feature';
      case TaskTarget.REFACTOR: return 'Refactoring';
      case TaskTarget.RESEARCH: return 'Research';
      case TaskTarget.GENERAL: return 'General';
      default: return target;
    }
  }
}
