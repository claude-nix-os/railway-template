/**
 * Session Card Component - Thumbnail card for grid view
 */

import type { BrowserSession } from '../../types';

export class SessionCard {
  private session: BrowserSession;
  private onClick: (sessionId: string) => void;
  private element: HTMLElement | null = null;

  constructor(session: BrowserSession, onClick: (sessionId: string) => void) {
    this.session = session;
    this.onClick = onClick;
  }

  /**
   * Render the session card
   */
  public render(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'session-card';
    card.onclick = () => this.onClick(this.session.id);

    // Thumbnail container
    const thumbnail = document.createElement('div');
    thumbnail.className = 'session-thumbnail';
    thumbnail.setAttribute('data-session-id', this.session.id);

    // Placeholder or screenshot
    const placeholder = document.createElement('div');
    placeholder.className = 'thumbnail-placeholder';
    placeholder.innerHTML = `
      <div class="placeholder-icon">🌐</div>
      <div class="placeholder-text">Loading...</div>
    `;
    thumbnail.appendChild(placeholder);

    card.appendChild(thumbnail);

    // Info section
    const info = document.createElement('div');
    info.className = 'session-info';

    const header = document.createElement('div');
    header.className = 'session-header';

    const id = document.createElement('div');
    id.className = 'session-id';
    id.textContent = this.session.id.substring(0, 8);
    header.appendChild(id);

    const state = document.createElement('div');
    state.className = `session-state state-${this.session.state}`;
    state.textContent = this.session.state;
    header.appendChild(state);

    info.appendChild(header);

    const url = document.createElement('div');
    url.className = 'session-url';
    url.textContent = this.session.currentUrl || 'No URL';
    url.title = this.session.currentUrl || '';
    info.appendChild(url);

    const meta = document.createElement('div');
    meta.className = 'session-meta';

    const screenshots = document.createElement('span');
    screenshots.textContent = `📸 ${this.session.screenshotCount}`;
    screenshots.title = 'Screenshots';
    meta.appendChild(screenshots);

    if (this.session.controlledBy) {
      const controlled = document.createElement('span');
      controlled.textContent = '🎮';
      controlled.title = `Controlled by ${this.session.controlledBy}`;
      controlled.className = 'controlled-indicator';
      meta.appendChild(controlled);
    }

    const created = document.createElement('span');
    const createdDate = new Date(this.session.createdAt);
    created.textContent = `${createdDate.toLocaleTimeString()}`;
    created.title = createdDate.toLocaleString();
    meta.appendChild(created);

    info.appendChild(meta);
    card.appendChild(info);

    this.element = card;
    return card;
  }

  /**
   * Update screenshot
   */
  public updateScreenshot(imageData: string) {
    if (!this.element) return;

    const thumbnail = this.element.querySelector('.session-thumbnail');
    if (!thumbnail) return;

    // Remove placeholder
    const placeholder = thumbnail.querySelector('.thumbnail-placeholder');
    if (placeholder) {
      placeholder.remove();
    }

    // Check if image already exists
    let img = thumbnail.querySelector('img') as HTMLImageElement;
    if (!img) {
      img = document.createElement('img');
      img.className = 'thumbnail-image';
      thumbnail.appendChild(img);
    }

    img.src = imageData;
  }

  /**
   * Get session ID
   */
  public getSessionId(): string {
    return this.session.id;
  }
}
