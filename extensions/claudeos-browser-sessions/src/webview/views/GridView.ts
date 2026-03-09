/**
 * Grid View - Display all browser sessions as thumbnails
 */

import { SessionCard } from '../components/SessionCard';
import type { BrowserSession } from '../../types';

interface GridViewCallbacks {
  onSessionClick: (sessionId: string) => void;
  onNewSession: () => void;
  onRefresh: () => void;
}

export class GridView {
  private container: HTMLElement;
  private callbacks: GridViewCallbacks;
  private sessionCards: Map<string, SessionCard> = new Map();

  constructor(container: HTMLElement, callbacks: GridViewCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  /**
   * Show the grid view
   */
  public show(sessions: BrowserSession[]) {
    this.container.innerHTML = '';
    this.sessionCards.clear();

    const wrapper = document.createElement('div');
    wrapper.className = 'grid-view';

    // Header with actions
    const header = document.createElement('div');
    header.className = 'grid-header';

    const title = document.createElement('h2');
    title.textContent = 'Browser Sessions';
    header.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'grid-actions';

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'icon-button';
    refreshBtn.innerHTML = '↻';
    refreshBtn.title = 'Refresh';
    refreshBtn.onclick = () => this.callbacks.onRefresh();
    actions.appendChild(refreshBtn);

    const newBtn = document.createElement('button');
    newBtn.className = 'primary-button';
    newBtn.innerHTML = '+ New Session';
    newBtn.onclick = () => this.callbacks.onNewSession();
    actions.appendChild(newBtn);

    header.appendChild(actions);
    wrapper.appendChild(header);

    // Session grid
    const grid = document.createElement('div');
    grid.className = 'session-grid';

    if (sessions.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <div class="empty-icon">🌐</div>
        <p>No browser sessions yet</p>
        <button class="primary-button" onclick="this.parentElement.nextElementSibling?.click()">
          Create Your First Session
        </button>
      `;
      grid.appendChild(empty);

      const hiddenBtn = document.createElement('button');
      hiddenBtn.style.display = 'none';
      hiddenBtn.onclick = () => this.callbacks.onNewSession();
      grid.appendChild(hiddenBtn);
    } else {
      for (const session of sessions) {
        const card = new SessionCard(session, (sessionId) => {
          this.callbacks.onSessionClick(sessionId);
        });
        this.sessionCards.set(session.id, card);
        grid.appendChild(card.render());
      }
    }

    wrapper.appendChild(grid);
    this.container.appendChild(wrapper);
  }

  /**
   * Hide the grid view
   */
  public hide() {
    this.container.innerHTML = '';
    this.sessionCards.clear();
  }

  /**
   * Update sessions
   */
  public updateSessions(sessions: BrowserSession[]) {
    // Re-render the grid with updated sessions
    this.show(sessions);
  }

  /**
   * Update a specific session's screenshot
   */
  public updateScreenshot(sessionId: string, imageData: string) {
    const card = this.sessionCards.get(sessionId);
    if (card) {
      card.updateScreenshot(imageData);
    }
  }
}
