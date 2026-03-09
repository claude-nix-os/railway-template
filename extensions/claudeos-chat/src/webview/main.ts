/**
 * Main webview script for ClaudeOS Chat
 * Lightweight vanilla TypeScript implementation with no framework dependencies
 */

import type {
  AppState,
  UIMessage,
  UIToolCall,
  UISession,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from './types';

/* ------------------------------------------------------------------ */
/*  VS Code API                                                       */
/* ------------------------------------------------------------------ */

// Acquire VS Code API (must be called once)
const vscode = acquireVsCodeApi<AppState>();

/* ------------------------------------------------------------------ */
/*  State Management                                                  */
/* ------------------------------------------------------------------ */

let state: AppState = {
  connectionStatus: 'connecting',
  sessions: [],
  currentSessionId: null,
  messages: [],
  inputValue: '',
  isLoading: false,
  error: null,
};

// Restore previous state if available
const previousState = vscode.getState();
if (previousState) {
  state = previousState;
}

function updateState(updates: Partial<AppState>): void {
  state = { ...state, ...updates };
  vscode.setState(state);
  render();
}

/* ------------------------------------------------------------------ */
/*  Message Passing with Extension                                    */
/* ------------------------------------------------------------------ */

function postMessage(message: WebviewToExtensionMessage): void {
  vscode.postMessage(message);
}

// Handle messages from extension
window.addEventListener('message', (event) => {
  const message: ExtensionToWebviewMessage = event.data;

  switch (message.type) {
    case 'connectionStatus':
      handleConnectionStatus(message.data.status);
      break;

    case 'wsEvent':
      handleWSEvent(message.data);
      break;
  }
});

/* ------------------------------------------------------------------ */
/*  WebSocket Event Handlers                                          */
/* ------------------------------------------------------------------ */

function handleConnectionStatus(
  status: 'connected' | 'connecting' | 'disconnected' | 'error'
): void {
  updateState({ connectionStatus: status });

  // Request sessions list when connected
  if (status === 'connected') {
    postMessage({ type: 'requestSessions' });
  }
}

function handleWSEvent(event: any): void {
  const { type, sessionId, data } = event;

  switch (type) {
    case 'sessions_list':
      handleSessionsList(data.sessions);
      break;

    case 'session_state':
      handleSessionState(data.session, data.messages);
      break;

    case 'message':
      handleMessage(data.message);
      break;

    case 'stream':
      handleStream(data.messageId, data.delta);
      break;

    case 'thinking':
      handleThinking(data.messageId, data.content);
      break;

    case 'tool_use':
      handleToolUse(data.messageId, data.toolCall);
      break;

    case 'tool_result':
      handleToolResult(data.messageId, data.toolCallId, data.output, data.status);
      break;

    case 'done':
      handleDone(data.messageId);
      break;

    case 'error':
      handleError(data);
      break;
  }
}

function handleSessionsList(sessions: any[]): void {
  const uiSessions: UISession[] = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    model: s.model,
    unreadCount: s.unreadCount || 0,
    lastMessage: s.lastMessage,
    updatedAt: s.updatedAt,
  }));

  updateState({ sessions: uiSessions });

  // Auto-select first session if none selected
  if (!state.currentSessionId && uiSessions.length > 0) {
    selectSession(uiSessions[0].id);
  }
}

function handleSessionState(session: any, messages: any[]): void {
  const uiMessages: UIMessage[] = messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
    thinkingContent: m.thinkingContent,
    toolCalls: m.toolCalls?.map((tc: any) => ({
      ...tc,
      expanded: false,
    })),
    isStreaming: m.isStreaming,
  }));

  updateState({
    currentSessionId: session.id,
    messages: uiMessages,
  });

  scrollToBottom();
}

function handleMessage(message: any): void {
  const uiMessage: UIMessage = {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
    thinkingContent: message.thinkingContent,
    toolCalls: message.toolCalls?.map((tc: any) => ({
      ...tc,
      expanded: false,
    })),
    isStreaming: message.isStreaming,
  };

  updateState({
    messages: [...state.messages, uiMessage],
  });

  scrollToBottom();
}

function handleStream(messageId: string, delta: string): void {
  const messages = [...state.messages];
  const msgIndex = messages.findIndex((m) => m.id === messageId);

  if (msgIndex >= 0) {
    messages[msgIndex] = {
      ...messages[msgIndex],
      content: messages[msgIndex].content + delta,
      isStreaming: true,
    };

    updateState({ messages });
    scrollToBottom();
  }
}

function handleThinking(messageId: string, content: string): void {
  const messages = [...state.messages];
  const msgIndex = messages.findIndex((m) => m.id === messageId);

  if (msgIndex >= 0) {
    messages[msgIndex] = {
      ...messages[msgIndex],
      thinkingContent: content,
    };

    updateState({ messages });
  }
}

function handleToolUse(messageId: string, toolCall: any): void {
  const messages = [...state.messages];
  const msgIndex = messages.findIndex((m) => m.id === messageId);

  if (msgIndex >= 0) {
    const toolCalls = messages[msgIndex].toolCalls || [];
    const existingIndex = toolCalls.findIndex((tc) => tc.id === toolCall.id);

    if (existingIndex >= 0) {
      toolCalls[existingIndex] = { ...toolCall, expanded: toolCalls[existingIndex].expanded };
    } else {
      toolCalls.push({ ...toolCall, expanded: false });
    }

    messages[msgIndex] = {
      ...messages[msgIndex],
      toolCalls,
    };

    updateState({ messages });
  }
}

function handleToolResult(
  messageId: string,
  toolCallId: string,
  output: string,
  status: 'success' | 'error'
): void {
  const messages = [...state.messages];
  const msgIndex = messages.findIndex((m) => m.id === messageId);

  if (msgIndex >= 0) {
    const toolCalls = messages[msgIndex].toolCalls || [];
    const toolCallIndex = toolCalls.findIndex((tc) => tc.id === toolCallId);

    if (toolCallIndex >= 0) {
      toolCalls[toolCallIndex] = {
        ...toolCalls[toolCallIndex],
        output,
        status,
      };

      messages[msgIndex] = {
        ...messages[msgIndex],
        toolCalls,
      };

      updateState({ messages });
    }
  }
}

function handleDone(messageId: string): void {
  const messages = [...state.messages];
  const msgIndex = messages.findIndex((m) => m.id === messageId);

  if (msgIndex >= 0) {
    messages[msgIndex] = {
      ...messages[msgIndex],
      isStreaming: false,
    };

    updateState({ messages });
  }
}

function handleError(error: any): void {
  updateState({
    error: error.message || 'An error occurred',
    isLoading: false,
  });
}

/* ------------------------------------------------------------------ */
/*  User Actions                                                      */
/* ------------------------------------------------------------------ */

function selectSession(sessionId: string): void {
  // Unsubscribe from current session
  if (state.currentSessionId) {
    postMessage({
      type: 'unsubscribe',
      sessionId: state.currentSessionId,
    });
  }

  // Subscribe to new session
  postMessage({
    type: 'subscribe',
    sessionId,
  });

  updateState({
    currentSessionId: sessionId,
    messages: [],
  });
}

function sendMessage(): void {
  const content = state.inputValue.trim();
  if (!content || !state.currentSessionId) return;

  postMessage({
    type: 'sendMessage',
    sessionId: state.currentSessionId,
    content,
  });

  updateState({
    inputValue: '',
    isLoading: true,
  });
}

function toggleToolCall(messageId: string, toolCallId: string): void {
  const messages = [...state.messages];
  const msgIndex = messages.findIndex((m) => m.id === messageId);

  if (msgIndex >= 0) {
    const toolCalls = messages[msgIndex].toolCalls || [];
    const toolCallIndex = toolCalls.findIndex((tc) => tc.id === toolCallId);

    if (toolCallIndex >= 0) {
      toolCalls[toolCallIndex] = {
        ...toolCalls[toolCallIndex],
        expanded: !toolCalls[toolCallIndex].expanded,
      };

      messages[msgIndex] = {
        ...messages[msgIndex],
        toolCalls,
      };

      updateState({ messages });
    }
  }
}

function reconnect(): void {
  postMessage({ type: 'reconnect' });
  updateState({ connectionStatus: 'connecting' });
}

/* ------------------------------------------------------------------ */
/*  Rendering                                                         */
/* ------------------------------------------------------------------ */

function render(): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    ${renderToolbar()}
    ${renderConnectionBanner()}
    ${renderMessageList()}
    ${renderInputArea()}
  `;

  attachEventListeners();
}

function renderToolbar(): string {
  const currentSession = state.sessions.find((s) => s.id === state.currentSessionId);
  const sessionTitle = currentSession?.title || 'No session selected';
  const modelName = currentSession?.model || '';

  return `
    <div class="toolbar">
      <div class="toolbar-section">
        <label for="session-select">Session:</label>
        <select id="session-select" class="session-select">
          ${state.sessions.map((s) => `
            <option value="${s.id}" ${s.id === state.currentSessionId ? 'selected' : ''}>
              ${escapeHtml(s.title)}
            </option>
          `).join('')}
        </select>
      </div>
      <div class="toolbar-section">
        <span class="model-badge">${escapeHtml(modelName)}</span>
      </div>
    </div>
  `;
}

function renderConnectionBanner(): string {
  if (state.connectionStatus === 'connected') return '';

  const statusClass = `connection-banner connection-banner--${state.connectionStatus}`;
  const statusText = {
    connecting: 'Connecting to ClaudeOS...',
    disconnected: 'Disconnected from ClaudeOS',
    error: 'Connection error',
  }[state.connectionStatus] || '';

  return `
    <div class="${statusClass}">
      <span>${statusText}</span>
      ${state.connectionStatus === 'disconnected' || state.connectionStatus === 'error'
        ? '<button class="reconnect-btn" data-action="reconnect">Reconnect</button>'
        : ''}
    </div>
  `;
}

function renderMessageList(): string {
  if (state.messages.length === 0) {
    return `
      <div class="message-list message-list--empty">
        <div class="empty-state">
          <p>No messages yet. Start a conversation!</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="message-list" id="message-list">
      ${state.messages.map((msg) => renderMessage(msg)).join('')}
    </div>
  `;
}

function renderMessage(message: UIMessage): string {
  const roleClass = `message message--${message.role}`;
  const streamingClass = message.isStreaming ? 'message--streaming' : '';

  return `
    <div class="${roleClass} ${streamingClass}" data-message-id="${message.id}">
      <div class="message-header">
        <span class="message-role">${message.role}</span>
        <span class="message-timestamp">${formatTimestamp(message.timestamp)}</span>
      </div>

      ${message.thinkingContent ? renderThinkingBlock(message.id, message.thinkingContent) : ''}

      <div class="message-content">
        ${renderMarkdown(message.content)}
      </div>

      ${message.toolCalls && message.toolCalls.length > 0
        ? `<div class="tool-calls">
             ${message.toolCalls.map((tc) => renderToolCall(message.id, tc)).join('')}
           </div>`
        : ''}

      ${message.isStreaming ? '<div class="streaming-indicator"></div>' : ''}
    </div>
  `;
}

function renderThinkingBlock(messageId: string, content: string): string {
  return `
    <details class="thinking-block">
      <summary class="thinking-header">
        <span class="thinking-icon">💭</span>
        <span class="thinking-label">Thinking</span>
      </summary>
      <div class="thinking-content">
        ${escapeHtml(content)}
      </div>
    </details>
  `;
}

function renderToolCall(messageId: string, toolCall: UIToolCall): string {
  const statusIcon = {
    pending: '⏳',
    running: '⚙️',
    success: '✅',
    error: '❌',
  }[toolCall.status];

  const statusClass = `tool-call--${toolCall.status}`;

  return `
    <details class="tool-call ${statusClass}" ${toolCall.expanded ? 'open' : ''}>
      <summary class="tool-call-header" data-message-id="${messageId}" data-tool-call-id="${toolCall.id}">
        <span class="tool-call-icon">${statusIcon}</span>
        <span class="tool-call-name">${escapeHtml(toolCall.name)}</span>
      </summary>
      <div class="tool-call-details">
        <div class="tool-call-input">
          <strong>Input:</strong>
          <pre><code>${escapeHtml(JSON.stringify(toolCall.input, null, 2))}</code></pre>
        </div>
        ${toolCall.output ? `
          <div class="tool-call-output">
            <strong>Output:</strong>
            <pre><code>${escapeHtml(toolCall.output)}</code></pre>
          </div>
        ` : ''}
      </div>
    </details>
  `;
}

function renderInputArea(): string {
  const disabled = !state.currentSessionId || state.connectionStatus !== 'connected';

  return `
    <div class="input-area">
      <textarea
        id="message-input"
        class="message-input"
        placeholder="${disabled ? 'Connect to a session to send messages' : 'Type a message...'}"
        rows="3"
        ${disabled ? 'disabled' : ''}
      >${escapeHtml(state.inputValue)}</textarea>
      <button
        id="send-btn"
        class="send-btn"
        ${disabled || !state.inputValue.trim() ? 'disabled' : ''}
      >Send</button>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/*  Event Listeners                                                   */
/* ------------------------------------------------------------------ */

function attachEventListeners(): void {
  // Session select
  const sessionSelect = document.getElementById('session-select') as HTMLSelectElement;
  if (sessionSelect) {
    sessionSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      selectSession(target.value);
    });
  }

  // Message input
  const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
  if (messageInput) {
    messageInput.addEventListener('input', (e) => {
      const target = e.target as HTMLTextAreaElement;
      updateState({ inputValue: target.value });
    });

    // Send on Ctrl+Enter or Cmd+Enter
    messageInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Send button
  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      sendMessage();
    });
  }

  // Reconnect button
  const reconnectBtn = document.querySelector('[data-action="reconnect"]');
  if (reconnectBtn) {
    reconnectBtn.addEventListener('click', () => {
      reconnect();
    });
  }

  // Tool call toggles (use event delegation)
  const toolCallHeaders = document.querySelectorAll('.tool-call-header');
  toolCallHeaders.forEach((header) => {
    header.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const messageId = target.dataset.messageId;
      const toolCallId = target.dataset.toolCallId;
      if (messageId && toolCallId) {
        toggleToolCall(messageId, toolCallId);
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Utility Functions                                                 */
/* ------------------------------------------------------------------ */

function scrollToBottom(): void {
  // Delay scroll to next tick to ensure DOM is updated
  setTimeout(() => {
    const messageList = document.getElementById('message-list');
    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight;
    }
  }, 0);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMarkdown(content: string): string {
  // Use marked.js if available (injected via CDN in HTML)
  if (typeof (window as any).marked !== 'undefined') {
    try {
      return (window as any).marked.parse(content);
    } catch (e) {
      console.error('Markdown rendering error:', e);
      return `<pre>${escapeHtml(content)}</pre>`;
    }
  }

  // Fallback to plain text with basic formatting
  return `<pre>${escapeHtml(content)}</pre>`;
}

/* ------------------------------------------------------------------ */
/*  Initialize                                                        */
/* ------------------------------------------------------------------ */

// Initial render
render();

// Request sessions on load
postMessage({ type: 'requestSessions' });
