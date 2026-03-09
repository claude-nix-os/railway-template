/**
 * Timeline Component - Time scrubbing bar with action markers
 */

export class Timeline {
  private totalFrames: number;
  private currentFrame = 0;
  private isPlaying = false;
  private onScrub: (frameIndex: number) => void;
  private onPlayPause: () => void;
  private element: HTMLElement | null = null;
  private playInterval: number | null = null;

  constructor(
    totalFrames: number,
    onScrub: (frameIndex: number) => void,
    onPlayPause: () => void
  ) {
    this.totalFrames = totalFrames;
    this.onScrub = onScrub;
    this.onPlayPause = onPlayPause;
  }

  /**
   * Render the timeline
   */
  public render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'timeline-container';

    // Playback controls
    const controls = document.createElement('div');
    controls.className = 'playback-controls';

    const playBtn = document.createElement('button');
    playBtn.className = 'play-button';
    playBtn.innerHTML = '▶';
    playBtn.onclick = () => {
      this.togglePlayPause();
      this.onPlayPause();
    };
    controls.appendChild(playBtn);

    const frameCounter = document.createElement('span');
    frameCounter.className = 'frame-counter';
    frameCounter.textContent = `0 / ${this.totalFrames}`;
    controls.appendChild(frameCounter);

    container.appendChild(controls);

    // Timeline bar
    const timeline = document.createElement('div');
    timeline.className = 'timeline-bar';

    const progress = document.createElement('div');
    progress.className = 'timeline-progress';
    progress.style.width = '0%';
    timeline.appendChild(progress);

    const scrubber = document.createElement('div');
    scrubber.className = 'timeline-scrubber';
    scrubber.style.left = '0%';
    timeline.appendChild(scrubber);

    // Action markers (example markers for demonstration)
    if (this.totalFrames > 0) {
      const markerPositions = this.generateMarkerPositions();
      for (const marker of markerPositions) {
        const markerEl = document.createElement('div');
        markerEl.className = `timeline-marker marker-${marker.type}`;
        markerEl.style.left = `${marker.position}%`;
        markerEl.title = `${marker.type} at ${marker.position.toFixed(1)}%`;
        timeline.appendChild(markerEl);
      }
    }

    // Make timeline interactive
    timeline.onclick = (e) => {
      const rect = timeline.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const frameIndex = Math.floor(percentage * this.totalFrames);
      this.scrubToFrame(frameIndex);
    };

    container.appendChild(timeline);

    this.element = container;
    return container;
  }

  /**
   * Scrub to a specific frame
   */
  private scrubToFrame(frameIndex: number) {
    this.currentFrame = Math.max(0, Math.min(frameIndex, this.totalFrames - 1));
    this.updateDisplay();
    this.onScrub(this.currentFrame);
  }

  /**
   * Toggle play/pause
   */
  private togglePlayPause() {
    this.isPlaying = !this.isPlaying;

    const playBtn = this.element?.querySelector('.play-button');
    if (playBtn) {
      playBtn.innerHTML = this.isPlaying ? '⏸' : '▶';
    }

    if (this.isPlaying) {
      this.startPlayback();
    } else {
      this.stopPlayback();
    }
  }

  /**
   * Start playback
   */
  private startPlayback() {
    if (this.playInterval) return;

    this.playInterval = window.setInterval(() => {
      if (this.currentFrame >= this.totalFrames - 1) {
        // Loop back to start
        this.currentFrame = 0;
      } else {
        this.currentFrame++;
      }
      this.updateDisplay();
      this.onScrub(this.currentFrame);
    }, 1000); // 1 frame per second
  }

  /**
   * Stop playback
   */
  private stopPlayback() {
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  /**
   * Update display
   */
  private updateDisplay() {
    if (!this.element) return;

    const percentage = this.totalFrames > 0 ? (this.currentFrame / this.totalFrames) * 100 : 0;

    const progress = this.element.querySelector('.timeline-progress') as HTMLElement;
    if (progress) {
      progress.style.width = `${percentage}%`;
    }

    const scrubber = this.element.querySelector('.timeline-scrubber') as HTMLElement;
    if (scrubber) {
      scrubber.style.left = `${percentage}%`;
    }

    const counter = this.element.querySelector('.frame-counter');
    if (counter) {
      counter.textContent = `${this.currentFrame} / ${this.totalFrames}`;
    }
  }

  /**
   * Set playing state (from external control)
   */
  public setPlaying(playing: boolean) {
    if (this.isPlaying === playing) return;

    this.isPlaying = playing;

    const playBtn = this.element?.querySelector('.play-button');
    if (playBtn) {
      playBtn.innerHTML = this.isPlaying ? '⏸' : '▶';
    }

    if (this.isPlaying) {
      this.startPlayback();
    } else {
      this.stopPlayback();
    }
  }

  /**
   * Generate example marker positions
   * In a real implementation, these would come from actual browser action data
   */
  private generateMarkerPositions(): Array<{ type: string; position: number }> {
    const markers: Array<{ type: string; position: number }> = [];
    const types = ['navigate', 'click', 'type', 'screenshot'];

    // Generate some random markers for demonstration
    for (let i = 0; i < Math.min(10, this.totalFrames); i++) {
      markers.push({
        type: types[Math.floor(Math.random() * types.length)],
        position: (i / this.totalFrames) * 100
      });
    }

    return markers;
  }

  /**
   * Update total frames (when session is updated)
   */
  public updateTotalFrames(totalFrames: number) {
    this.totalFrames = totalFrames;
    this.updateDisplay();
  }
}
