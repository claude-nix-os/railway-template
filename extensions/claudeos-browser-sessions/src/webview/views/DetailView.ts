/**
 * Detail View - Display single session with timeline and controls
 */

import { Timeline } from '../components/Timeline';
import type { BrowserSession } from '../../types';

interface DetailViewCallbacks {
  onBack: () => void;
  onTakeControl: (sessionId: string) => void;
  onHandOffControl: (sessionId: string) => void;
  onNavigate: (sessionId: string, url: string) => void;
  onScrubToFrame: (sessionId: string, frameIndex: number) => void;
  onPlayPause: () => void;
}

export class DetailView {
  private container: HTMLElement;
  private callbacks: DetailViewCallbacks;
  private currentSession: BrowserSession | null = null;
  private timeline: Timeline | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isPlaying = false;

  constructor(container: HTMLElement, callbacks: DetailViewCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  /**
   * Show the detail view
   */
  public show(session: BrowserSession) {
    this.currentSession = session;
    this.container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'detail-view';

    // Header
    const header = this.createHeader(session);
    wrapper.appendChild(header);

    // Canvas container
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'canvas-container';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'screenshot-canvas';
    this.canvas.width = session.config.viewport?.width || 1280;
    this.canvas.height = session.config.viewport?.height || 720;
    this.ctx = this.canvas.getContext('2d');

    canvasContainer.appendChild(this.canvas);
    wrapper.appendChild(canvasContainer);

    // Info bar
    const infoBar = this.createInfoBar(session);
    wrapper.appendChild(infoBar);

    // Timeline
    this.timeline = new Timeline(
      session.screenshotCount,
      (frameIndex) => this.callbacks.onScrubToFrame(session.id, frameIndex),
      () => this.callbacks.onPlayPause()
    );
    wrapper.appendChild(this.timeline.render());

    // Controls
    const controls = this.createControls(session);
    wrapper.appendChild(controls);

    this.container.appendChild(wrapper);

    // Draw placeholder
    this.drawPlaceholder();
  }

  /**
   * Hide the detail view
   */
  public hide() {
    this.container.innerHTML = '';
    this.currentSession = null;
    this.timeline = null;
    this.canvas = null;
    this.ctx = null;
  }

  /**
   * Update session data
   */
  public updateSession(session: BrowserSession) {
    this.currentSession = session;

    // Update info if visible
    const urlElement = this.container.querySelector('.session-url');
    if (urlElement) {
      urlElement.textContent = session.currentUrl || 'No URL';
    }

    const stateElement = this.container.querySelector('.session-state');
    if (stateElement) {
      stateElement.textContent = session.state;
      stateElement.className = `session-state state-${session.state}`;
    }
  }

  /**
   * Update screenshot
   */
  public updateScreenshot(imageData: string, timestamp: number) {
    if (!this.canvas || !this.ctx) return;

    const img = new Image();
    img.onload = () => {
      if (this.canvas && this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      }
    };
    img.src = imageData;
  }

  /**
   * Update control status
   */
  public updateControlStatus(controlledBy: string | null) {
    const controlBtn = this.container.querySelector('.control-button');
    if (controlBtn) {
      if (controlledBy) {
        controlBtn.textContent = '🛑 Hand Off Control';
        controlBtn.className = 'control-button controlled';
      } else {
        controlBtn.textContent = '🎮 Take Control';
        controlBtn.className = 'control-button';
      }
    }

    const statusElement = this.container.querySelector('.control-status');
    if (statusElement) {
      statusElement.textContent = controlledBy ? `Controlled by ${controlledBy}` : 'Agent control';
    }
  }

  /**
   * Set playing state
   */
  public setPlaying(playing: boolean) {
    this.isPlaying = playing;
    if (this.timeline) {
      this.timeline.setPlaying(playing);
    }
  }

  /**
   * Create header
   */
  private createHeader(session: BrowserSession): HTMLElement {
    const header = document.createElement('div');
    header.className = 'detail-header';

    const backBtn = document.createElement('button');
    backBtn.className = 'icon-button';
    backBtn.innerHTML = '← Back';
    backBtn.onclick = () => this.callbacks.onBack();
    header.appendChild(backBtn);

    const title = document.createElement('h2');
    title.textContent = `Session ${session.id.substring(0, 8)}`;
    header.appendChild(title);

    const state = document.createElement('span');
    state.className = `session-state state-${session.state}`;
    state.textContent = session.state;
    header.appendChild(state);

    return header;
  }

  /**
   * Create info bar
   */
  private createInfoBar(session: BrowserSession): HTMLElement {
    const infoBar = document.createElement('div');
    infoBar.className = 'info-bar';

    const urlLabel = document.createElement('span');
    urlLabel.className = 'info-label';
    urlLabel.textContent = 'URL:';
    infoBar.appendChild(urlLabel);

    const url = document.createElement('span');
    url.className = 'session-url';
    url.textContent = session.currentUrl || 'No URL';
    infoBar.appendChild(url);

    const navigateBtn = document.createElement('button');
    navigateBtn.className = 'icon-button';
    navigateBtn.innerHTML = '→';
    navigateBtn.title = 'Navigate';
    navigateBtn.onclick = () => {
      const newUrl = prompt('Enter URL:', session.currentUrl || '');
      if (newUrl) {
        this.callbacks.onNavigate(session.id, newUrl);
      }
    };
    infoBar.appendChild(navigateBtn);

    return infoBar;
  }

  /**
   * Create controls
   */
  private createControls(session: BrowserSession): HTMLElement {
    const controls = document.createElement('div');
    controls.className = 'detail-controls';

    const controlBtn = document.createElement('button');
    controlBtn.className = 'control-button';
    controlBtn.textContent = session.controlledBy ? '🛑 Hand Off Control' : '🎮 Take Control';
    controlBtn.onclick = () => {
      if (session.controlledBy) {
        this.callbacks.onHandOffControl(session.id);
      } else {
        this.callbacks.onTakeControl(session.id);
      }
    };
    controls.appendChild(controlBtn);

    const status = document.createElement('span');
    status.className = 'control-status';
    status.textContent = session.controlledBy ? `Controlled by ${session.controlledBy}` : 'Agent control';
    controls.appendChild(status);

    return controls;
  }

  /**
   * Draw placeholder on canvas
   */
  private drawPlaceholder() {
    if (!this.canvas || !this.ctx) return;

    this.ctx.fillStyle = 'var(--vscode-editor-background)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = 'var(--vscode-foreground)';
    this.ctx.font = '24px var(--vscode-font-family)';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(
      'Waiting for screenshot...',
      this.canvas.width / 2,
      this.canvas.height / 2
    );
  }
}
