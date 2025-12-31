/**
 * CodebaseChat Component
 *
 * Main chat interface for codebase exploration.
 * Provides ChatGPT-style conversation with code syntax highlighting.
 * Uses Claude Code CLI for responses.
 *
 * Accessibility:
 * - Keyboard navigation support
 * - Screen reader announcements
 * - Focus management
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Trash2,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { useChat } from '../../hooks/useChat';

// =============================================================================
// Types
// =============================================================================

export interface CodebaseChatProps {
  /** Additional class names */
  className?: string;
}

type ConnectionStatus = 'checking' | 'available' | 'unavailable' | 'error';

// =============================================================================
// Connection Status Component
// =============================================================================

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  version?: string;
  error?: string;
}

function ConnectionStatusIndicator({
  status,
  version,
  error,
}: ConnectionStatusIndicatorProps) {
  const statusConfig = {
    checking: {
      icon: Loader2,
      iconClass: 'animate-spin text-gray-500',
      bgClass: 'bg-gray-100 dark:bg-gray-800',
      borderClass: 'border-gray-300 dark:border-gray-600',
      textClass: 'text-gray-600 dark:text-gray-400',
      label: 'Checking Claude Code CLI...',
    },
    available: {
      icon: CheckCircle2,
      iconClass: 'text-green-500',
      bgClass: 'bg-green-50 dark:bg-green-900/20',
      borderClass: 'border-green-200 dark:border-green-800',
      textClass: 'text-green-700 dark:text-green-400',
      label: version ? `Connected: ${version}` : 'Claude Code CLI connected',
    },
    unavailable: {
      icon: XCircle,
      iconClass: 'text-amber-500',
      bgClass: 'bg-amber-50 dark:bg-amber-900/20',
      borderClass: 'border-amber-200 dark:border-amber-800',
      textClass: 'text-amber-700 dark:text-amber-400',
      label: 'Claude Code CLI not found',
    },
    error: {
      icon: AlertCircle,
      iconClass: 'text-red-500',
      bgClass: 'bg-red-50 dark:bg-red-900/20',
      borderClass: 'border-red-200 dark:border-red-800',
      textClass: 'text-red-700 dark:text-red-400',
      label: error || 'Connection error',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      data-testid="connection-status"
      data-status={status}
      className={`
        flex flex-col items-center justify-center
        p-6 rounded-lg border
        ${config.bgClass} ${config.borderClass}
        text-center
      `}
    >
      <Icon className={`h-8 w-8 mb-3 ${config.iconClass}`} />
      <p className={`text-sm font-medium ${config.textClass}`}>{config.label}</p>

      {/* Installation instructions for unavailable state */}
      {status === 'unavailable' && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Install Claude Code CLI to use the codebase chat feature.
          </p>
          <a
            href="https://claude.ai/download"
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center gap-2
              px-4 py-2 rounded-lg
              bg-indigo-600 text-white
              hover:bg-indigo-700
              transition-colors duration-150
              text-sm font-medium
            "
          >
            Download Claude Code
            <ExternalLink className="h-4 w-4" />
          </a>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            After installation, run <code className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700">claude</code> in your terminal to authenticate.
          </p>
        </div>
      )}

      {/* Authentication instructions for auth errors */}
      {status === 'error' && error?.toLowerCase().includes('auth') && (
        <div className="mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Run <code className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700">claude</code> in your terminal to authenticate.
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function CodebaseChat({ className = '' }: CodebaseChatProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
    retry,
    abort,
    isAvailable,
    claudeVersion,
    availabilityError,
    isCheckingAvailability,
  } = useChat();

  // Derive connection status
  const connectionStatus: ConnectionStatus = isCheckingAvailability
    ? 'checking'
    : isAvailable
      ? 'available'
      : availabilityError
        ? 'error'
        : 'unavailable';

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    // Safely call scrollIntoView only if it exists (not available in jsdom)
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input on mount when available
  useEffect(() => {
    if (isAvailable) {
      inputRef.current?.focus();
    }
  }, [isAvailable]);

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      const message = input;
      setInput('');
      sendMessage(message);
    },
    [input, isLoading, sendMessage]
  );

  // Handle Enter key (Shift+Enter for newline)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  const hasMessages = messages.length > 0;
  const canSend = input.trim().length > 0 && !isLoading && isAvailable;

  return (
    <div
      className={`
        flex flex-col h-full
        bg-white dark:bg-gray-800
        ${className}
      `.trim()}
    >
      {/* Header */}
      <div
        className="
          flex items-center justify-between
          px-4 py-3
          border-b border-gray-200 dark:border-gray-700
        "
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Codebase Chat
          </h2>
          {/* Connection indicator dot */}
          {connectionStatus === 'available' && (
            <span className="w-2 h-2 rounded-full bg-green-500" title="Connected" />
          )}
          {connectionStatus === 'checking' && (
            <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
          )}
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2">
          {/* Abort button */}
          {isLoading && (
            <button
              onClick={abort}
              className="
                flex items-center gap-1.5
                px-2 py-1 rounded
                text-sm font-medium
                text-red-600 dark:text-red-400
                hover:bg-red-50 dark:hover:bg-red-900/20
                transition-colors duration-150
              "
              aria-label="Stop response"
            >
              <XCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          )}

          {/* Clear history button */}
          <button
            onClick={clearHistory}
            disabled={!hasMessages}
            className="
              flex items-center gap-1.5
              px-2 py-1 rounded
              text-sm font-medium
              text-gray-600 dark:text-gray-400
              hover:bg-gray-100 dark:hover:bg-gray-700
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150
            "
            aria-label="Clear chat history"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div
        className="
          flex-1 overflow-y-auto
          px-4 py-4
          space-y-4
        "
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {/* Connection Status - show when not available */}
        {connectionStatus !== 'available' && (
          <div className="flex items-center justify-center h-full">
            <div className="w-full max-w-md">
              <ConnectionStatusIndicator
                status={connectionStatus}
                version={claudeVersion}
                error={availabilityError}
              />
            </div>
          </div>
        )}

        {/* Chat content - show when available */}
        {connectionStatus === 'available' && (
          <>
            {/* Empty state */}
            {!hasMessages && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div
                  className="
                    w-16 h-16 rounded-full
                    bg-indigo-100 dark:bg-indigo-900/30
                    flex items-center justify-center
                    mb-4
                  "
                >
                  <MessageSquare className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Ask questions about your codebase
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                  I can help you understand code, find patterns, explain implementations,
                  or answer questions about your project structure.
                </p>

                {/* Example prompts */}
                <div className="mt-6 space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide">
                    Example questions
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      'How does authentication work?',
                      'Explain the API structure',
                      'What patterns are used?',
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => {
                          setInput(prompt);
                          inputRef.current?.focus();
                        }}
                        className="
                          px-3 py-1.5 rounded-full
                          text-sm
                          bg-gray-100 dark:bg-gray-700
                          text-gray-700 dark:text-gray-300
                          hover:bg-indigo-50 dark:hover:bg-indigo-900/30
                          hover:text-indigo-700 dark:hover:text-indigo-300
                          transition-colors duration-150
                        "
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={new Date(message.timestamp)}
              />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div
                data-testid="chat-loading"
                aria-live="polite"
                aria-busy="true"
                className="flex items-center gap-2 text-gray-500 dark:text-gray-400"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div
                className="
                  flex items-start gap-3 p-4 rounded-lg
                  bg-red-50 dark:bg-red-900/20
                  text-red-700 dark:text-red-400
                "
                role="alert"
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Failed to get response</p>
                  <p className="text-sm mt-1 opacity-80">{error.message}</p>
                  <button
                    onClick={retry}
                    className="
                      flex items-center gap-1.5 mt-2
                      text-sm font-medium
                      hover:underline
                    "
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div
        className="
          px-4 py-3
          border-t border-gray-200 dark:border-gray-700
          bg-gray-50 dark:bg-gray-900/50
        "
      >
        <form onSubmit={handleSubmit} className="flex gap-3">
          {/* Textarea input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isAvailable ? 'Ask about your codebase...' : 'Claude Code CLI not available'}
              rows={1}
              disabled={isLoading || !isAvailable}
              className="
                w-full px-4 py-2.5 rounded-lg
                bg-white dark:bg-gray-800
                border border-gray-300 dark:border-gray-600
                text-gray-900 dark:text-white
                placeholder-gray-500 dark:placeholder-gray-400
                focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
                resize-none
                min-h-[42px]
              "
              aria-label="Message input. Press Enter to send, Shift+Enter for new line."
            />
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!canSend}
            className="
              flex items-center justify-center
              px-4 py-2.5 rounded-lg
              bg-indigo-600 text-white
              hover:bg-indigo-700
              focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150
            "
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>

        {/* Keyboard hint */}
        {isAvailable && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Press <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono">Enter</kbd> to send,{' '}
            <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono">Shift+Enter</kbd> for new line
          </p>
        )}
      </div>
    </div>
  );
}

export default CodebaseChat;
