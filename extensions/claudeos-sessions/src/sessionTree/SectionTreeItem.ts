import * as vscode from 'vscode';

/**
 * Tree item representing a section in the sessions tree view
 */
export class SectionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly type: 'active' | 'archived'
  ) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);

    this.contextValue = 'sessionSection';

    // Set appropriate icon based on section type
    if (type === 'active') {
      this.iconPath = new vscode.ThemeIcon('folder');
    } else {
      this.iconPath = new vscode.ThemeIcon('archive');
    }
  }
}
