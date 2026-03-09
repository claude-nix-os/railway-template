import * as vscode from 'vscode';
import { Session } from '../types';
import { SessionTreeItem } from './SessionTreeItem';
import { SectionTreeItem } from './SectionTreeItem';
import { ZombieDetector } from '../services/ZombieDetector';

/**
 * Tree data provider for the sessions tree view
 * Implements vscode.TreeDataProvider interface
 */
export class SessionTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> =
    new vscode.EventEmitter<vscode.TreeItem | undefined | void>();

  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> =
    this._onDidChangeTreeData.event;

  private sessions: Session[] = [];
  private streamingSessions: Set<string> = new Set();
  private zombieSessions: Set<string> = new Set();
  private zombieDetector: ZombieDetector;

  constructor() {
    // Initialize with empty sessions
    // Sessions will be populated via updateSessions() or addSession()
    this.zombieDetector = new ZombieDetector();
  }

  /**
   * Refresh the tree view
   * Triggers a full rebuild of the tree
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Refresh a specific item in the tree
   * For now, this triggers a full refresh
   */
  public refreshItem(item: vscode.TreeItem): void {
    this._onDidChangeTreeData.fire(item);
  }

  /**
   * Get tree item representation of an element
   */
  public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children of an element
   * - If element is undefined, return section items (root level)
   * - If element is a section, return session items for that section
   */
  public getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (!element) {
      // Root level - return section items
      return Promise.resolve(this.getSectionItems());
    }

    if (element instanceof SectionTreeItem) {
      // Section level - return session items
      return Promise.resolve(this.getSessionItems(element));
    }

    // Session items have no children
    return Promise.resolve([]);
  }

  /**
   * Get section items for the root level
   */
  private getSectionItems(): vscode.TreeItem[] {
    const sections: vscode.TreeItem[] = [];

    // Active Sessions section
    sections.push(new SectionTreeItem('Active Sessions', 'active'));

    // Archived Sessions section
    sections.push(new SectionTreeItem('Archived Sessions', 'archived'));

    return sections;
  }

  /**
   * Get session items for a specific section
   */
  private getSessionItems(section: SectionTreeItem): vscode.TreeItem[] {
    const isArchivedSection = section.type === 'archived';

    // Filter sessions based on section type
    const filteredSessions = this.sessions.filter(
      (session) => session.archived === isArchivedSection
    );

    // Sort sessions by lastModified (most recent first)
    filteredSessions.sort((a, b) => {
      return b.lastModified.getTime() - a.lastModified.getTime();
    });

    // Convert to tree items
    const treeItems = filteredSessions.map((session) => {
      const isZombie = this.zombieSessions.has(session.id);
      const item = new SessionTreeItem(session, isZombie);

      // Update icon if session is streaming (but not if it's a zombie)
      if (this.streamingSessions.has(session.id) && !isZombie) {
        item.updateForStreaming(true);
      }

      return item;
    });

    return treeItems;
  }

  /**
   * Update the entire sessions array
   */
  public updateSessions(sessions: Session[]): void {
    this.sessions = sessions;
    this.refresh();
  }

  /**
   * Add a new session
   */
  public addSession(session: Session): void {
    this.sessions.push(session);
    this.refresh();
  }

  /**
   * Update an existing session
   */
  public updateSession(session: Session): void {
    const index = this.sessions.findIndex((s) => s.id === session.id);
    if (index !== -1) {
      this.sessions[index] = session;
      this.refresh();
    }
  }

  /**
   * Remove a session
   */
  public removeSession(sessionId: string): void {
    this.sessions = this.sessions.filter((s) => s.id !== sessionId);
    this.streamingSessions.delete(sessionId);
    this.refresh();
  }

  /**
   * Get a session by ID
   */
  public getSession(sessionId: string): Session | undefined {
    return this.sessions.find((s) => s.id === sessionId);
  }

  /**
   * Mark a session as streaming (shows spinning icon)
   */
  public setSessionStreaming(sessionId: string, isStreaming: boolean): void {
    if (isStreaming) {
      this.streamingSessions.add(sessionId);
    } else {
      this.streamingSessions.delete(sessionId);
    }
    this.refresh();
  }

  /**
   * Get all sessions
   */
  public getSessions(): Session[] {
    return [...this.sessions];
  }

  /**
   * Clear all sessions
   */
  public clear(): void {
    this.sessions = [];
    this.streamingSessions.clear();
    this.zombieSessions.clear();
    this.refresh();
  }

  /**
   * Update the zombie sessions set
   * This should be called periodically to detect stale active sessions
   */
  public updateZombies(): void {
    const zombieIds = this.zombieDetector.detectZombies(this.sessions);
    this.zombieSessions = new Set(zombieIds);
    this.refresh();
  }

  /**
   * Get all zombie session IDs
   */
  public getZombies(): string[] {
    return Array.from(this.zombieSessions);
  }
}
