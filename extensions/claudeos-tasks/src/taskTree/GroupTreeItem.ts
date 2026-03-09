import * as vscode from 'vscode';
import { TaskGroup } from '../types';

/**
 * Tree item representing a task group in the tree view
 */
export class GroupTreeItem extends vscode.TreeItem {
  constructor(public readonly group: TaskGroup) {
    super(group.label, vscode.TreeItemCollapsibleState.Expanded);

    this.description = `${group.tasks.length} task${group.tasks.length === 1 ? '' : 's'}`;
    this.iconPath = new vscode.ThemeIcon(group.icon || 'folder');
    this.contextValue = 'taskGroup';
  }

  /**
   * Expose tasks for children
   */
  public get tasks() {
    return this.group.tasks;
  }
}
