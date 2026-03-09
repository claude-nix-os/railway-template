/**
 * Main webview entry point
 * Manages view state and coordinates between grid and detail views
 */

import { GridView } from './views/GridView';
import { DetailView } from './views/DetailView';
import type { BrowserSession, ToWebviewMessage, FromWebviewMessage, ViewState } from '../types';

// VS Code API
declare function acquireVsCodeApi(): {
  postMessage(message: FromWebviewMessage): void;
  setState(state: unknown): void;
  getState(): unknown;
};

const vscode = acquireVsCodeApi();

// Application state
let viewState: ViewState = {
  mode: 'grid',
  selectedSessionId: null,
  selectedFrameIndex: 0,
  isPlaying: false,
};

let sessions: BrowserSession[] = [];
let connected = false;

// View instances
let gridView: GridView | null = null;
let detailView: DetailView | null = null;

/**
 * Initialize the application
 */
function init() {
  console.log('[Browser Sessions] Initializing webview...');

  // Create views
  gridView = new GridView(
    document.getElementById('app')!,
    {
      onSessionClick: handleSessionClick,
      onNewSession: handleNewSession,
      onRefresh: handleRefresh,
    }
  );

  detailView = new DetailView(
    document.getElementById('app')!,
    {
      onBack: handleBackToGrid,
      onTakeControl: handleTakeControl,
      onHandOffControl: handleHandOffControl,
      onNavigate: handleNavigate,
      onScrubToFrame: handleScrubToFrame,
      onPlayPause: handlePlayPause,
    }
  );

  // Show initial view
  showGridView();

  // Listen for messages from extension
  window.addEventListener('message', handleExtensionMessage);

  // Notify extension that webview is ready
  sendMessage({ type: 'ready' });

  console.log('[Browser Sessions] Webview initialized');
}

/**
 * Handle messages from the extension
 */
function handleExtensionMessage(event: MessageEvent<ToWebviewMessage>) {
  const message = event.data;

  switch (message.type) {
    case 'sessionsUpdate':
      sessions = message.data;
      if (viewState.mode === 'grid' && gridView) {
        gridView.updateSessions(sessions);
      } else if (viewState.mode === 'detail' && detailView && viewState.selectedSessionId) {
        const session = sessions.find(s => s.id === viewState.selectedSessionId);
        if (session) {
          detailView.updateSession(session);
        }
      }
      break;

    case 'screenshotUpdate':
      // Handle live screenshot updates
      if (viewState.mode === 'grid' && gridView) {
        gridView.updateScreenshot(message.data.sessionId, message.data.imageData);
      } else if (viewState.mode === 'detail' && detailView && viewState.selectedSessionId === message.data.sessionId) {
        detailView.updateScreenshot(message.data.imageData, message.data.timestamp);
      }
      break;

    case 'controlStatus':
      // Handle control status changes
      if (viewState.mode === 'detail' && detailView && viewState.selectedSessionId === message.data.sessionId) {
        detailView.updateControlStatus(message.data.controlledBy);
      }
      break;

    case 'connectionStatus':
      connected = message.data.connected;
      updateConnectionStatus(connected);
      break;

    case 'error':
      showError(message.data.message);
      break;
  }
}

/**
 * Send message to extension
 */
function sendMessage(message: FromWebviewMessage) {
  vscode.postMessage(message);
}

/**
 * Show grid view
 */
function showGridView() {
  viewState.mode = 'grid';
  viewState.selectedSessionId = null;

  if (gridView) {
    gridView.show(sessions);
  }
  if (detailView) {
    detailView.hide();
  }
}

/**
 * Show detail view
 */
function showDetailView(sessionId: string) {
  viewState.mode = 'detail';
  viewState.selectedSessionId = sessionId;
  viewState.selectedFrameIndex = 0;
  viewState.isPlaying = false;

  const session = sessions.find(s => s.id === sessionId);
  if (!session) {
    console.error('[Browser Sessions] Session not found:', sessionId);
    return;
  }

  if (gridView) {
    gridView.hide();
  }
  if (detailView) {
    detailView.show(session);
  }
}

/**
 * Handle session click
 */
function handleSessionClick(sessionId: string) {
  showDetailView(sessionId);
  sendMessage({ type: 'openSession', data: { sessionId } });
}

/**
 * Handle new session button
 */
function handleNewSession() {
  const url = prompt('Enter URL to navigate (optional):');
  const headless = confirm('Run in headless mode?');

  sendMessage({
    type: 'createSession',
    data: { url: url || undefined, headless }
  });
}

/**
 * Handle refresh button
 */
function handleRefresh() {
  sendMessage({ type: 'refreshSessions' });
}

/**
 * Handle back to grid
 */
function handleBackToGrid() {
  showGridView();
}

/**
 * Handle take control
 */
function handleTakeControl(sessionId: string) {
  sendMessage({ type: 'takeControl', data: { sessionId } });
}

/**
 * Handle hand off control
 */
function handleHandOffControl(sessionId: string) {
  sendMessage({ type: 'handOffControl', data: { sessionId } });
}

/**
 * Handle navigate
 */
function handleNavigate(sessionId: string, url: string) {
  sendMessage({ type: 'navigate', data: { sessionId, url } });
}

/**
 * Handle scrub to frame
 */
function handleScrubToFrame(sessionId: string, frameIndex: number) {
  viewState.selectedFrameIndex = frameIndex;
  sendMessage({ type: 'scrubToFrame', data: { sessionId, frameIndex } });
}

/**
 * Handle play/pause
 */
function handlePlayPause() {
  viewState.isPlaying = !viewState.isPlaying;
  if (detailView) {
    detailView.setPlaying(viewState.isPlaying);
  }
}

/**
 * Update connection status indicator
 */
function updateConnectionStatus(isConnected: boolean) {
  // This could show a status indicator in the UI
  console.log('[Browser Sessions] Connection status:', isConnected ? 'connected' : 'disconnected');
}

/**
 * Show error message
 */
function showError(message: string) {
  // Create a simple error toast
  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
