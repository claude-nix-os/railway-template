import * as vscode from 'vscode';
import { Session, SessionStatus } from '../types';

/**
 * Tree item representing a session in the sessions tree view
 */
export class SessionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly session: Session,
    public readonly isZombie: boolean = false
  ) {
    super(session.name, vscode.TreeItemCollapsibleState.None);

    // Set icon based on session status (zombie takes priority)
    this.iconPath = this.getIconForStatus(session.status, isZombie);

    // Set description for unread/message count (appears to the right of label)
    if (isZombie) {
      this.description = '(zombie)';
    } else if (session.messageCount > 0) {
      this.description = `${session.messageCount} msg${session.messageCount !== 1 ? 's' : ''}`;
    }

    // Set badge for unread count (if applicable)
    // For now, we'll use messageCount as a proxy for unread count
    // This can be enhanced when we have actual unread tracking
    if (session.messageCount > 0 && session.status === SessionStatus.ACTIVE) {
      // VS Code will show this as a badge if the tree view supports it
    }

    // Set context value based on status (for context menus)
    this.contextValue = this.getContextValue(session);

    // Set command to open session when clicked
    this.command = {
      command: 'claudeos.openSession',
      title: 'Open Session',
      arguments: [session.id]
    };

    // Set tooltip with markdown (session name, message count, last active time)
    this.tooltip = this.createTooltip(session);
  }

  /**
   * Get the appropriate icon for the session status
   */
  private getIconForStatus(status: SessionStatus, isZombie: boolean = false): vscode.ThemeIcon {
    // Zombie sessions get special error icon with red color
    if (isZombie) {
      return new vscode.ThemeIcon(
        'error',
        new vscode.ThemeColor('errorForeground')
      );
    }

    switch (status) {
      case SessionStatus.ACTIVE:
        // Check if streaming (this would need to be tracked in metadata)
        // For now, we'll just use a green comment-discussion icon
        return new vscode.ThemeIcon(
          'comment-discussion',
          new vscode.ThemeColor('charts.green')
        );

      case SessionStatus.IDLE:
        return new vscode.ThemeIcon('comment-discussion');

      case SessionStatus.ARCHIVED:
        return new vscode.ThemeIcon(
          'archive',
          new vscode.ThemeColor('descriptionForeground')
        );

      case SessionStatus.ERROR:
        return new vscode.ThemeIcon(
          'error',
          new vscode.ThemeColor('errorForeground')
        );

      default:
        return new vscode.ThemeIcon('comment-discussion');
    }
  }

  /**
   * Get context value based on session state
   * This is used for context menu contributions
   */
  private getContextValue(session: Session): string {
    const values: string[] = ['session'];

    if (session.archived) {
      values.push('archived');
    } else {
      values.push('active');
    }

    values.push(session.status);

    return values.join('.');
  }

  /**
   * Create a markdown tooltip with session information
   */
  private createTooltip(session: Session): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();
    tooltip.supportHtml = true;
    tooltip.isTrusted = true;

    // Session name
    tooltip.appendMarkdown(`**${session.name}**\n\n`);

    // Zombie warning (if applicable)
    if (this.isZombie) {
      tooltip.appendMarkdown('**⚠️ ZOMBIE SESSION**\n\n');
      tooltip.appendMarkdown('This session is stuck in ACTIVE state with no recent activity.\n');
      tooltip.appendMarkdown('It may have crashed or lost connection.\n\n');
      tooltip.appendMarkdown('---\n\n');
    }

    // Message count
    tooltip.appendMarkdown(
      `Messages: ${session.messageCount}\n\n`
    );

    // Last active time
    const timeAgo = this.getTimeAgo(session.lastModified);
    tooltip.appendMarkdown(`Last active: ${timeAgo}\n\n`);

    // Status
    const statusEmoji = this.getStatusEmoji(session.status);
    tooltip.appendMarkdown(`Status: ${statusEmoji} ${session.status}\n\n`);

    // Created date
    tooltip.appendMarkdown(
      `Created: ${session.createdAt.toLocaleDateString()}\n\n`
    );

    // Last message preview (if available)
    if (session.metadata?.lastMessage) {
      const preview = session.metadata.lastMessage.substring(0, 100);
      tooltip.appendMarkdown(`---\n\n*${preview}${session.metadata.lastMessage.length > 100 ? '...' : ''}*`);
    }

    return tooltip;
  }

  /**
   * Get emoji for session status
   */
  private getStatusEmoji(status: SessionStatus): string {
    switch (status) {
      case SessionStatus.ACTIVE:
        return '🟢';
      case SessionStatus.IDLE:
        return '⚪';
      case SessionStatus.ARCHIVED:
        return '📦';
      case SessionStatus.ERROR:
        return '🔴';
      default:
        return '⚪';
    }
  }

  /**
   * Calculate time ago display
   */
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
      return 'just now';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 30) {
      return `${days}d ago`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months}mo ago`;
    }

    const years = Math.floor(months / 12);
    return `${years}y ago`;
  }

  /**
   * Update icon if session is streaming
   * This should be called when streaming status changes
   */
  public updateForStreaming(isStreaming: boolean): void {
    if (isStreaming && this.session.status === SessionStatus.ACTIVE && !this.isZombie) {
      // Use spinning icon for active streaming (but not for zombies)
      this.iconPath = new vscode.ThemeIcon(
        'loading~spin',
        new vscode.ThemeColor('charts.green')
      );
    } else {
      // Revert to normal icon
      this.iconPath = this.getIconForStatus(this.session.status, this.isZombie);
    }
  }
}
