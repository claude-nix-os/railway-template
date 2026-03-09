'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Send,
  Paperclip,
  Brain,
  Wrench,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Archive,
  Loader2,
  CheckCircle,
  XCircle,
  Search,
  Monitor,
  Terminal as TerminalIcon,
  Bot,
  User,
  Cpu,
  Shield,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useSessionStore } from '../../stores/session-store';
import { useUIStore } from '../../stores/ui-store';
import type {
  PanelProps,
  Message,
  ToolCall,
  ModelId,
  PermissionMode,
} from '../../types';
import { MODELS, PERMISSION_MODES } from '../../types';

/* ------------------------------------------------------------------ */
/*  Chat Panel                                                         */
/* ------------------------------------------------------------------ */

export function ChatPanel({ panelId, tabId, sessionId }: PanelProps) {
  const session = useSessionStore((s) =>
    sessionId ? s.getSession(sessionId) : undefined
  );
  const messages = useSessionStore((s) =>
    sessionId ? s.getMessages(sessionId) : []
  );
  const streamPhase = useSessionStore((s) =>
    sessionId ? s.getStreamPhase(sessionId) : 'idle'
  );
  const isCurrentlyStreaming = useSessionStore((s) =>
    sessionId ? s.isStreaming(sessionId) : false
  );
  const inputDraft = useSessionStore((s) =>
    sessionId ? s.inputDrafts[sessionId] ?? '' : ''
  );
  const setInputDraft = useSessionStore((s) => s.setInputDraft);
  const addMessage = useSessionStore((s) => s.addMessage);
  const archiveSession = useSessionStore((s) => s.archiveSession);
  const updateSession = useSessionStore((s) => s.updateSession);

  const viewMode = useUIStore((s) => s.viewMode);
  const toggleViewMode = useUIStore((s) => s.toggleViewMode);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showPermSelector, setShowPermSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* Auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamPhase]);

  /* Focus input */
  useEffect(() => {
    inputRef.current?.focus();
  }, [sessionId]);

  /* Filter messages */
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        m.toolCalls?.some(
          (tc) =>
            tc.name.toLowerCase().includes(q) ||
            tc.output?.toLowerCase().includes(q)
        )
    );
  }, [messages, searchQuery]);

  /* Send message */
  const handleSend = useCallback(() => {
    if (!sessionId || !inputDraft.trim() || isCurrentlyStreaming) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      sessionId,
      role: 'user',
      content: inputDraft.trim(),
      timestamp: new Date().toISOString(),
    };

    addMessage(sessionId, message);
    setInputDraft(sessionId, '');

    /* The actual WebSocket send is handled by the parent app */
  }, [sessionId, inputDraft, isCurrentlyStreaming, addMessage, setInputDraft]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleModelSelect = useCallback(
    (modelId: ModelId) => {
      if (sessionId) {
        updateSession(sessionId, { model: modelId });
      }
      setShowModelSelector(false);
    },
    [sessionId, updateSession]
  );

  const handlePermSelect = useCallback(
    (mode: PermissionMode) => {
      if (sessionId) {
        updateSession(sessionId, { permissionMode: mode });
      }
      setShowPermSelector(false);
    },
    [sessionId, updateSession]
  );

  if (!sessionId || !session) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-[var(--text-tertiary)]">
          No session selected
        </p>
      </div>
    );
  }

  const currentModel = MODELS.find((m) => m.id === session.model) ?? MODELS[1];
  const currentPerm =
    PERMISSION_MODES.find((p) => p.id === session.permissionMode) ??
    PERMISSION_MODES[0];

  return (
    <div className="flex flex-col h-full" data-testid="chat-panel">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 h-10 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowModelSelector(!showModelSelector);
                setShowPermSelector(false);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors"
              data-testid="model-selector"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{currentModel.shortName}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {showModelSelector && (
              <ModelSelectorDropdown
                currentModel={session.model}
                onSelect={handleModelSelect}
                onClose={() => setShowModelSelector(false)}
              />
            )}
          </div>

          {/* Permission mode selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowPermSelector(!showPermSelector);
                setShowModelSelector(false);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors"
              data-testid="permission-selector"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{currentPerm.label}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {showPermSelector && (
              <PermSelectorDropdown
                currentMode={session.permissionMode}
                onSelect={handlePermSelect}
                onClose={() => setShowPermSelector(false)}
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Search */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className={clsx(
              'flex items-center justify-center w-7 h-7 rounded-sm transition-colors',
              searchOpen
                ? 'text-[var(--accent)] bg-[var(--accent-muted)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'
            )}
            aria-label="Search messages"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* View mode toggle */}
          <button
            onClick={toggleViewMode}
            className="flex items-center justify-center w-7 h-7 rounded-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors"
            title={`Switch to ${viewMode === 'nextjs' ? 'tmux' : 'nextjs'} view`}
          >
            {viewMode === 'nextjs' ? (
              <TerminalIcon className="w-3.5 h-3.5" />
            ) : (
              <Monitor className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Archive session */}
          <button
            onClick={() => archiveSession(sessionId)}
            className="flex items-center justify-center w-7 h-7 rounded-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors"
            title="Archive session"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2 px-4 py-2">
              <Search className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
                autoFocus
              />
              {searchQuery && (
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  {filteredMessages.length} result
                  {filteredMessages.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          {filteredMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isStreaming={
                isCurrentlyStreaming &&
                message.id ===
                  useSessionStore.getState().streamingMessageId[sessionId]
              }
            />
          ))}

          {/* Streaming indicator */}
          {isCurrentlyStreaming && streamPhase === 'thinking' && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <Brain className="w-4 h-4 animate-pulse text-[var(--accent)]" />
              <span>Thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="flex items-end gap-2 rounded-xl px-4 py-3"
            style={{
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* File attachment */}
            <button
              className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors flex-shrink-0"
              aria-label="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Text input */}
            <textarea
              ref={inputRef}
              value={inputDraft}
              onChange={(e) => {
                setInputDraft(sessionId, e.target.value);
                /* Auto-resize */
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(
                  e.target.scrollHeight,
                  200
                )}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none resize-none min-h-[24px] max-h-[200px] leading-6"
              rows={1}
              disabled={isCurrentlyStreaming}
              data-testid="chat-input"
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!inputDraft.trim() || isCurrentlyStreaming}
              className={clsx(
                'flex items-center justify-center w-7 h-7 rounded-md transition-colors flex-shrink-0',
                inputDraft.trim() && !isCurrentlyStreaming
                  ? 'text-white claude-gradient hover:opacity-90'
                  : 'text-[var(--text-tertiary)] cursor-not-allowed'
              )}
              aria-label="Send message"
              data-testid="send-button"
            >
              {isCurrentlyStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Message Bubble                                                     */
/* ------------------------------------------------------------------ */

interface MessageBubbleProps {
  message: Message;
  isStreaming: boolean;
}

function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={clsx('flex gap-3', isUser && 'flex-row-reverse')}
      data-testid={`message-${message.id}`}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 mt-0.5',
          isUser
            ? 'bg-[var(--surface-3)]'
            : 'claude-gradient'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-[var(--text-secondary)]" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={clsx('flex-1 min-w-0', isUser && 'text-right')}>
        {/* Thinking block */}
        {isAssistant && message.thinkingContent && (
          <ThinkingBlock content={message.thinkingContent} />
        )}

        {/* Message content */}
        {message.content && (
          <div
            className={clsx(
              'inline-block text-sm leading-relaxed',
              isUser
                ? 'rounded-2xl rounded-tr-md px-4 py-2 text-left'
                : 'text-left',
              isUser && 'bg-[var(--accent)] text-white',
              isStreaming && !isUser && 'streaming-cursor'
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="markdown-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: CodeBlock as any,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.toolCalls.map((toolCall) => (
              <ToolCallBlock key={toolCall.id} toolCall={toolCall} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div
          className={clsx(
            'text-[10px] text-[var(--text-tertiary)] mt-1',
            isUser ? 'text-right' : 'text-left'
          )}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Code Block with Copy Button                                        */
/* ------------------------------------------------------------------ */

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function CodeBlock({ inline, className, children, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match?.[1] ?? '';
  const code = String(children).replace(/\n$/, '');

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  if (inline) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative group">
      {/* Language tag + copy button */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-t-md bg-[var(--surface-3)] border border-b-0 border-[var(--border-subtle)]">
        <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: '0 0 6px 6px',
          border: '1px solid var(--border-subtle)',
          borderTop: 'none',
          fontSize: '13px',
        }}
        {...props}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Thinking Block                                                     */
/* ------------------------------------------------------------------ */

function ThinkingBlock({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <Brain className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span>Thinking</span>
        {expanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="mt-2 px-3 py-2 rounded-md text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap"
              style={{
                backgroundColor: 'var(--surface-2)',
                borderLeft: '2px solid var(--accent)',
              }}
            >
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tool Call Block                                                    */
/* ------------------------------------------------------------------ */

function ToolCallBlock({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = {
    pending: <Loader2 className="w-3.5 h-3.5 text-[var(--text-tertiary)] animate-spin" />,
    running: <Loader2 className="w-3.5 h-3.5 text-[var(--accent)] animate-spin" />,
    success: <CheckCircle className="w-3.5 h-3.5 text-[var(--success)]" />,
    error: <XCircle className="w-3.5 h-3.5 text-[var(--error)]" />,
  }[toolCall.status];

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--surface-3)] transition-colors"
      >
        {statusIcon}
        <Wrench className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        <span className="font-mono text-[var(--text-primary)]">
          {toolCall.name}
        </span>
        <span className="flex-1" />
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)]" />
        ) : (
          <ChevronRight className="w-3 h-3 text-[var(--text-tertiary)]" />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="px-3 py-2 space-y-2"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              {/* Input */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
                  Input
                </span>
                <pre className="mt-1 text-[11px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap break-all p-2 rounded bg-[var(--surface-1)]">
                  {JSON.stringify(toolCall.input, null, 2)}
                </pre>
              </div>

              {/* Output */}
              {toolCall.output && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
                    Output
                  </span>
                  <pre className="mt-1 text-[11px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap break-all p-2 rounded bg-[var(--surface-1)] max-h-60 overflow-y-auto scrollbar-thin">
                    {toolCall.output}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Model Selector Dropdown                                            */
/* ------------------------------------------------------------------ */

function ModelSelectorDropdown({
  currentModel,
  onSelect,
  onClose,
}: {
  currentModel: ModelId;
  onSelect: (id: ModelId) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-testid="model-selector"]')) {
        onClose();
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="absolute top-full left-0 mt-1 w-56 rounded-lg shadow-lg z-50 py-1"
      style={{
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {MODELS.map((model) => (
        <button
          key={model.id}
          onClick={() => onSelect(model.id)}
          className={clsx(
            'w-full flex flex-col px-3 py-2 text-left hover:bg-[var(--surface-3)] transition-colors',
            currentModel === model.id && 'bg-[var(--accent-muted)]'
          )}
        >
          <span className="text-xs font-medium text-[var(--text-primary)]">
            {model.name}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {model.description}
          </span>
        </button>
      ))}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Permission Selector Dropdown                                       */
/* ------------------------------------------------------------------ */

function PermSelectorDropdown({
  currentMode,
  onSelect,
  onClose,
}: {
  currentMode: PermissionMode;
  onSelect: (mode: PermissionMode) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        !(e.target as HTMLElement).closest(
          '[data-testid="permission-selector"]'
        )
      ) {
        onClose();
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="absolute top-full left-0 mt-1 w-52 rounded-lg shadow-lg z-50 py-1"
      style={{
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {PERMISSION_MODES.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onSelect(mode.id)}
          className={clsx(
            'w-full flex flex-col px-3 py-2 text-left hover:bg-[var(--surface-3)] transition-colors',
            currentMode === mode.id && 'bg-[var(--accent-muted)]'
          )}
        >
          <span className="text-xs font-medium text-[var(--text-primary)]">
            {mode.label}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {mode.description}
          </span>
        </button>
      ))}
    </motion.div>
  );
}
