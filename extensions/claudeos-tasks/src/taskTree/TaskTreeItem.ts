import * as vscode from 'vscode';
import { Task, TaskStatus, TaskPriority, ExecutionStatus } from '../types';

/**
 * Tree item representing a task in the tree view
 */
export class TaskTreeItem extends vscode.TreeItem {
  constructor(public readonly task: Task) {
    super(task.title, vscode.TreeItemCollapsibleState.None);

    this.description = this.getDescription();
    this.tooltip = this.getTooltip();
    this.iconPath = this.getIcon();
    this.contextValue = this.getContextValue();

    // Add command to view task details on click
    this.command = {
      command: 'claudeos.viewTaskDetails',
      title: 'View Task Details',
      arguments: [this]
    };
  }

  /**
   * Get task description (shows to the right of title)
   */
  private getDescription(): string {
    const parts: string[] = [];

    // Add execution status first if present
    if (this.task.executionStatus && this.task.executionStatus !== 'pending') {
      parts.push(this.formatExecutionStatus(this.task.executionStatus));
    }

    // Add scheduled time (doAt) if present
    if (this.task.doAt) {
      const scheduledTime = new Date(this.task.doAt);
      const now = new Date();
      const isOverdue = scheduledTime.getTime() < now.getTime() &&
                        this.task.executionStatus !== 'executed' &&
                        this.task.executionStatus !== 'executing';

      if (isOverdue) {
        const hoursOverdue = Math.ceil((now.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60));
        if (hoursOverdue < 24) {
          parts.push(`Overdue ${hoursOverdue}h`);
        } else {
          const daysOverdue = Math.ceil(hoursOverdue / 24);
          parts.push(`Overdue ${daysOverdue}d`);
        }
      } else if (this.task.executionStatus !== 'executed') {
        parts.push(this.formatScheduledTime(scheduledTime));
      }
    }

    // Add due date if present (different from doAt)
    if (this.task.dueDate) {
      const now = new Date();
      const dueDate = new Date(this.task.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilDue < 0) {
        parts.push(`Due overdue ${Math.abs(daysUntilDue)}d`);
      } else if (daysUntilDue === 0) {
        parts.push('Due today');
      } else if (daysUntilDue === 1) {
        parts.push('Due tomorrow');
      } else if (daysUntilDue <= 7) {
        parts.push(`Due in ${daysUntilDue}d`);
      }
    }

    // Add target if not general
    if (this.task.target !== 'general') {
      parts.push(this.task.target);
    }

    return parts.join(' · ');
  }

  /**
   * Format scheduled time for display
   */
  private formatScheduledTime(scheduledTime: Date): string {
    const now = new Date();
    const hoursUntil = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil < 1) {
      const minutesUntil = Math.ceil(hoursUntil * 60);
      return `in ${minutesUntil}m`;
    } else if (hoursUntil < 24) {
      return `in ${Math.ceil(hoursUntil)}h`;
    } else if (hoursUntil < 48) {
      return 'tomorrow';
    } else {
      const daysUntil = Math.ceil(hoursUntil / 24);
      return `in ${daysUntil}d`;
    }
  }

  /**
   * Format execution status for display
   */
  private formatExecutionStatus(status: ExecutionStatus): string {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'executing': return 'Executing';
      case 'executed': return 'Executed';
      case 'failed': return 'Failed';
      default: return '';
    }
  }

  /**
   * Get task tooltip
   */
  private getTooltip(): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();
    tooltip.isTrusted = true;

    // Title
    tooltip.appendMarkdown(`**${this.task.title}**\n\n`);

    // Description
    if (this.task.description) {
      tooltip.appendMarkdown(`${this.task.description}\n\n`);
    }

    // Status and Priority
    tooltip.appendMarkdown(`**Status:** ${this.formatStatus(this.task.status)}\n\n`);
    tooltip.appendMarkdown(`**Priority:** ${this.formatPriority(this.task.priority)}\n\n`);

    // Execution Status
    if (this.task.executionStatus) {
      const statusEmoji = this.getExecutionStatusEmoji(this.task.executionStatus);
      tooltip.appendMarkdown(`**Execution:** ${statusEmoji} ${this.formatExecutionStatus(this.task.executionStatus)}\n\n`);
    }

    // Target
    tooltip.appendMarkdown(`**Target:** ${this.task.target}\n\n`);

    // Scheduled time (doAt)
    if (this.task.doAt) {
      const scheduledTime = new Date(this.task.doAt);
      tooltip.appendMarkdown(`**Scheduled for:** ${scheduledTime.toLocaleString()}\n\n`);
    }

    // Deadline (doBy)
    if (this.task.doBy) {
      const deadline = new Date(this.task.doBy);
      tooltip.appendMarkdown(`**Deadline:** ${deadline.toLocaleString()}\n\n`);
    }

    // Dates
    tooltip.appendMarkdown(`**Created:** ${this.task.createdAt.toLocaleDateString()}\n\n`);
    if (this.task.dueDate) {
      tooltip.appendMarkdown(`**Due:** ${new Date(this.task.dueDate).toLocaleDateString()}\n\n`);
    }
    if (this.task.completedAt) {
      tooltip.appendMarkdown(`**Completed:** ${new Date(this.task.completedAt).toLocaleDateString()}\n\n`);
    }
    if (this.task.executedAt) {
      const executedTime = new Date(this.task.executedAt);
      tooltip.appendMarkdown(`**Executed:** ${executedTime.toLocaleString()}\n\n`);
    }

    // Execution target
    if (this.task.executionTarget) {
      tooltip.appendMarkdown(`**Execution Target:** ${this.task.executionTarget}\n\n`);
      if (this.task.executionTarget === 'existing' && this.task.targetSessionId) {
        tooltip.appendMarkdown(`**Target Session:** ${this.task.targetSessionId}\n\n`);
      }
    }

    // Execution error
    if (this.task.executionError) {
      tooltip.appendMarkdown(`**Error:** ${this.task.executionError}\n\n`);
    }

    // Tags
    if (this.task.tags && this.task.tags.length > 0) {
      tooltip.appendMarkdown(`**Tags:** ${this.task.tags.join(', ')}\n\n`);
    }

    // Assignee
    if (this.task.assignee) {
      tooltip.appendMarkdown(`**Assignee:** ${this.task.assignee}\n\n`);
    }

    return tooltip;
  }

  /**
   * Get emoji for execution status
   */
  private getExecutionStatusEmoji(status: ExecutionStatus): string {
    switch (status) {
      case 'pending': return '⚪';
      case 'scheduled': return '🕐';
      case 'executing': return '⚙️';
      case 'executed': return '✅';
      case 'failed': return '❌';
      default: return '⚪';
    }
  }

  /**
   * Get task icon based on execution status, task status, and priority
   */
  private getIcon(): vscode.ThemeIcon {
    let iconId: string;
    let color: vscode.ThemeColor | undefined;

    // Execution status takes priority
    if (this.task.executionStatus) {
      switch (this.task.executionStatus) {
        case 'executing':
          iconId = 'loading~spin';
          color = new vscode.ThemeColor('charts.blue');
          return new vscode.ThemeIcon(iconId, color);
        case 'executed':
          iconId = 'check-all';
          color = new vscode.ThemeColor('charts.green');
          return new vscode.ThemeIcon(iconId, color);
        case 'failed':
          iconId = 'error';
          color = new vscode.ThemeColor('errorForeground');
          return new vscode.ThemeIcon(iconId, color);
        case 'scheduled':
          // Check if overdue
          if (this.task.doAt && new Date(this.task.doAt).getTime() < new Date().getTime()) {
            iconId = 'warning';
            color = new vscode.ThemeColor('charts.orange');
            return new vscode.ThemeIcon(iconId, color);
          }
          iconId = 'clock';
          color = new vscode.ThemeColor('charts.blue');
          return new vscode.ThemeIcon(iconId, color);
      }
    }

    // Check if task has doAt scheduled time (but no execution status)
    if (this.task.doAt) {
      const scheduledTime = new Date(this.task.doAt);
      const now = new Date();
      if (scheduledTime.getTime() < now.getTime()) {
        // Overdue scheduled task
        iconId = 'warning';
        color = new vscode.ThemeColor('charts.red');
        return new vscode.ThemeIcon(iconId, color);
      } else {
        // Scheduled task
        iconId = 'clock';
        color = new vscode.ThemeColor('charts.blue');
        return new vscode.ThemeIcon(iconId, color);
      }
    }

    // Icon based on task status
    if (this.task.status === TaskStatus.COMPLETED) {
      iconId = 'check-all';
      color = new vscode.ThemeColor('charts.green');
    } else if (this.task.status === TaskStatus.IN_PROGRESS) {
      iconId = 'sync';
      color = new vscode.ThemeColor('charts.blue');
    } else if (this.task.status === TaskStatus.BLOCKED) {
      iconId = 'warning';
      color = new vscode.ThemeColor('charts.orange');
    } else if (this.task.status === TaskStatus.CANCELLED) {
      iconId = 'x';
      color = new vscode.ThemeColor('charts.gray');
    } else {
      // TODO status - use priority-based icon
      switch (this.task.priority) {
        case TaskPriority.URGENT:
          iconId = 'flame';
          color = new vscode.ThemeColor('charts.red');
          break;
        case TaskPriority.HIGH:
          iconId = 'arrow-up';
          color = new vscode.ThemeColor('charts.orange');
          break;
        case TaskPriority.MEDIUM:
          iconId = 'circle-outline';
          color = new vscode.ThemeColor('charts.blue');
          break;
        case TaskPriority.LOW:
          iconId = 'arrow-down';
          color = new vscode.ThemeColor('charts.gray');
          break;
        default:
          iconId = 'circle-outline';
      }
    }

    return new vscode.ThemeIcon(iconId, color);
  }

  /**
   * Get context value for menu contributions
   */
  private getContextValue(): string {
    const values: string[] = ['task'];

    // Add task status
    const status = this.task.status === TaskStatus.COMPLETED ? 'complete' : 'incomplete';
    values.push(status);

    // Add execution status if present
    if (this.task.executionStatus) {
      values.push(this.task.executionStatus);
    }

    // Add scheduled context if doAt is present
    if (this.task.doAt) {
      values.push('scheduled');

      // Check if overdue
      const scheduledTime = new Date(this.task.doAt);
      if (scheduledTime.getTime() < new Date().getTime() &&
          this.task.executionStatus !== 'executed' &&
          this.task.executionStatus !== 'executing') {
        values.push('overdue');
      }
    }

    return values.join('.');
  }

  /**
   * Format status for display
   */
  private formatStatus(status: TaskStatus): string {
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
   * Format priority for display
   */
  private formatPriority(priority: TaskPriority): string {
    switch (priority) {
      case TaskPriority.URGENT: return '🔴 Urgent';
      case TaskPriority.HIGH: return '🟠 High';
      case TaskPriority.MEDIUM: return '🟡 Medium';
      case TaskPriority.LOW: return '🟢 Low';
      default: return priority;
    }
  }
}
