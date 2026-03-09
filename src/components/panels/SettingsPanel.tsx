'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Key,
  Shield,
  Cpu,
  Palette,
  Eye,
  EyeOff,
  Check,
  Copy,
  AlertCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useUIStore } from '@/stores/ui-store';
import type { PanelProps, ModelId, PermissionMode } from '@/types';
import { MODELS, PERMISSION_MODES } from '@/types';

/* ------------------------------------------------------------------ */
/*  Settings Panel                                                     */
/* ------------------------------------------------------------------ */

export function SettingsPanel({ panelId, tabId }: PanelProps) {
  return (
    <div
      className="h-full overflow-y-auto scrollbar-thin"
      style={{ backgroundColor: 'var(--surface-0)' }}
      data-testid="settings-panel"
    >
      <div className="max-w-xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            Settings
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Configure your ClaudeOS environment
          </p>
        </div>

        <AuthenticationSection />
        <ModelSection />
        <PermissionSection />
        <ThemeSection />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Authentication Section                                             */
/* ------------------------------------------------------------------ */

function AuthenticationSection() {
  const apiKey = useUIStore((s) => s.apiKey);
  const oauthToken = useUIStore((s) => s.oauthToken);
  const setApiKey = useUIStore((s) => s.setApiKey);
  const setOAuthToken = useUIStore((s) => s.setOAuthToken);

  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(apiKey ?? '');
  const [saved, setSaved] = useState(false);

  const handleSaveApiKey = useCallback(() => {
    setApiKey(apiKeyInput.trim() || null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [apiKeyInput, setApiKey]);

  const maskedApiKey = apiKey
    ? `${apiKey.slice(0, 7)}${'*'.repeat(Math.max(0, apiKey.length - 11))}${apiKey.slice(-4)}`
    : '';

  return (
    <SettingsSection
      icon={Key}
      title="Authentication"
      description="Configure your API credentials"
    >
      <div className="space-y-4">
        {/* API Key */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            API Key
          </label>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center flex-1 rounded-md overflow-hidden"
              style={{
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-ant-..."
                className="flex-1 px-3 py-2 bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none font-mono"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <button
              onClick={handleSaveApiKey}
              className={clsx(
                'px-3 py-2 rounded-md text-xs font-medium transition-colors',
                saved
                  ? 'bg-[var(--success)] text-white'
                  : 'bg-[var(--accent)] text-white hover:opacity-90'
              )}
            >
              {saved ? (
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Saved
                </span>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>

        {/* OAuth Token Display */}
        {oauthToken && (
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              OAuth Token
            </label>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-md"
              style={{
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span className="flex-1 text-xs font-mono text-[var(--text-secondary)] truncate">
                {`${oauthToken.slice(0, 12)}...${oauthToken.slice(-8)}`}
              </span>
              <CopyButton text={oauthToken} />
            </div>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}

/* ------------------------------------------------------------------ */
/*  Model Section                                                      */
/* ------------------------------------------------------------------ */

function ModelSection() {
  const [selectedModel, setSelectedModel] = useState<ModelId>(
    'claude-sonnet-4-20250514'
  );

  return (
    <SettingsSection
      icon={Cpu}
      title="Model Preference"
      description="Select your default model"
    >
      <div className="space-y-1">
        {MODELS.map((model) => (
          <button
            key={model.id}
            onClick={() => setSelectedModel(model.id)}
            className={clsx(
              'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
              selectedModel === model.id
                ? 'bg-[var(--accent-muted)] border-[var(--accent)]'
                : 'hover:bg-[var(--surface-3)]'
            )}
            style={{
              border:
                selectedModel === model.id
                  ? '1px solid var(--accent)'
                  : '1px solid transparent',
            }}
          >
            <div
              className={clsx(
                'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                selectedModel === model.id
                  ? 'border-[var(--accent)]'
                  : 'border-[var(--text-tertiary)]'
              )}
            >
              {selectedModel === model.id && (
                <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              )}
            </div>
            <div>
              <span className="text-xs font-medium text-[var(--text-primary)] block">
                {model.name}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">
                {model.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    </SettingsSection>
  );
}

/* ------------------------------------------------------------------ */
/*  Permission Section                                                 */
/* ------------------------------------------------------------------ */

function PermissionSection() {
  const [selectedMode, setSelectedMode] = useState<PermissionMode>('default');

  return (
    <SettingsSection
      icon={Shield}
      title="Permission Mode"
      description="Control how Claude executes actions"
    >
      <div className="space-y-1">
        {PERMISSION_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setSelectedMode(mode.id)}
            className={clsx(
              'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
              selectedMode === mode.id
                ? 'bg-[var(--accent-muted)]'
                : 'hover:bg-[var(--surface-3)]'
            )}
            style={{
              border:
                selectedMode === mode.id
                  ? '1px solid var(--accent)'
                  : '1px solid transparent',
            }}
          >
            <div
              className={clsx(
                'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                selectedMode === mode.id
                  ? 'border-[var(--accent)]'
                  : 'border-[var(--text-tertiary)]'
              )}
            >
              {selectedMode === mode.id && (
                <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              )}
            </div>
            <div>
              <span className="text-xs font-medium text-[var(--text-primary)] block">
                {mode.label}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">
                {mode.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    </SettingsSection>
  );
}

/* ------------------------------------------------------------------ */
/*  Theme Section                                                      */
/* ------------------------------------------------------------------ */

function ThemeSection() {
  return (
    <SettingsSection
      icon={Palette}
      title="Theme"
      description="Appearance preferences"
    >
      <div
        className="flex items-center gap-3 p-3 rounded-lg"
        style={{
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--accent)',
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--surface-0)' }}
        >
          <div className="w-4 h-4 rounded-sm bg-[var(--surface-4)]" />
        </div>
        <div>
          <span className="text-xs font-medium text-[var(--text-primary)] block">
            Dark
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)]">
            Default dark theme
          </span>
        </div>
        <Check className="w-4 h-4 text-[var(--accent)] ml-auto" />
      </div>
      <div className="mt-2 flex items-start gap-2 px-1">
        <AlertCircle className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0 mt-0.5" />
        <span className="text-[10px] text-[var(--text-tertiary)]">
          Additional themes coming soon
        </span>
      </div>
    </SettingsSection>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings Section wrapper                                           */
/* ------------------------------------------------------------------ */

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl p-5"
      style={{
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-[var(--accent)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
      </div>
      <p className="text-[11px] text-[var(--text-tertiary)] mb-4">
        {description}
      </p>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Copy Button                                                        */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-[var(--success)]" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
