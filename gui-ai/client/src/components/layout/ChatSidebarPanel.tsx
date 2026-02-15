/**
 * ChatSidebarPanel Component
 *
 * Slide-out right sidebar panel for chat interface.
 * Uses WebSocket streaming via useStreamingChat hook.
 * Resizable on desktop with drag handle.
 *
 * Accessibility:
 * - role="dialog" with aria-label
 * - Focus trap when open
 * - Escape key to close
 * - Focus returns to trigger on close
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  X,
  Send,
  Square,
  User,
  Sparkles,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Wrench,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { ModelSelector } from '../common/ModelSelector';
import { useTheme } from '../ThemeToggle';
import { useStreamingChat, type StreamingMessage } from '../../hooks/useStreamingChat';
import { useGatewayStatus } from '../../hooks/useGatewayStatus';
import type { ToolCall } from '../../lib/gateway-types';

interface ChatSidebarPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Panel size constraints
const MIN_WIDTH = 380;
const MAX_WIDTH = 700;
const DEFAULT_WIDTH = 500;

// Code block with copy button
function CodeBlock({
  language,
  children,
  isDark,
}: {
  language?: string;
  children: string;
  isDark: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 p-1.5 bg-gray-200 dark:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? (
          <Check className="w-3 h-3 text-green-500" />
        ) : (
          <Copy className="w-3 h-3 text-gray-600 dark:text-gray-300" />
        )}
      </button>
      <SyntaxHighlighter
        language={language || 'text'}
        style={isDark ? oneDark : oneLight}
        customStyle={{
          margin: 0,
          borderRadius: '6px',
          fontSize: '12px',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

// Tool call display
function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-left"
      >
        <Wrench className="w-3 h-3 text-amber-500" />
        <span className="font-medium text-gray-700 dark:text-gray-300">{toolCall.name}</span>
        <span className="text-gray-400 dark:text-gray-500 ml-auto">
          {expanded ? 'collapse' : 'expand'}
        </span>
      </button>
      {expanded && (
        <div className="px-3 py-2 text-xs font-mono bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 max-h-40 overflow-auto">
          <div className="mb-1 text-gray-500">args:</div>
          <pre className="whitespace-pre-wrap">{toolCall.arguments}</pre>
          {toolCall.result && (
            <>
              <div className="mt-2 mb-1 text-gray-500">result:</div>
              <pre className="whitespace-pre-wrap">{toolCall.result}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Chat message component
function ChatMessageItem({
  message,
  isDark,
}: {
  message: StreamingMessage;
  isDark: boolean;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 p-4 ${isUser ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
            : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {isUser ? 'You' : 'YoYo AI'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          {message.isStreaming && (
            <span className="text-xs text-amber-500 animate-pulse">streaming...</span>
          )}
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match;
                return isInline ? (
                  <code
                    className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-indigo-600 dark:text-indigo-400 text-xs"
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <CodeBlock language={match[1]} isDark={isDark}>
                    {String(children).replace(/\n$/, '')}
                  </CodeBlock>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        {message.error && (
          <div className="mt-2 flex items-center gap-2 text-xs text-red-500">
            <AlertCircle className="w-3 h-3" />
            <span>{message.error}</span>
          </div>
        )}
        {message.toolCalls &&
          message.toolCalls.map((tc) => <ToolCallCard key={tc.id} toolCall={tc} />)}
      </div>
    </div>
  );
}

export function ChatSidebarPanel({ isOpen, onClose }: ChatSidebarPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [input, setInput] = useState('');
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedModel, setSelectedModel] = useState('default');

  const { isConnected } = useGatewayStatus();

  const {
    messages,
    sendMessage,
    abort,
    isStreaming,
    error,
    clearHistory,
  } = useStreamingChat({ enabled: isOpen });

  // Store previously focused element and focus close button when opening
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });
    } else {
      previousActiveElement.current?.focus();
    }
  }, [isOpen]);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isStreaming]);

  // Handle resize
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);

      const startX = e.clientX;
      const startWidth = width;

      const handleMouseMove = (e: MouseEvent) => {
        const delta = startX - e.clientX;
        const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + delta));
        setWidth(newWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width],
  );

  const handleResizeDoubleClick = useCallback(() => {
    setWidth(DEFAULT_WIDTH);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;

      sendMessage(input.trim(), selectedModel);
      setInput('');
    },
    [input, sendMessage, selectedModel],
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/20 dark:bg-black/40
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          z-40
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Chat panel"
        aria-modal="true"
        aria-hidden={!isOpen}
        style={{ width: `${width}px` }}
        className={`
          fixed top-0 right-0 h-full max-w-[90vw]
          bg-white dark:bg-gray-900
          shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          ${isResizing ? 'transition-none' : ''}
          z-50
          flex flex-col
          border-l border-gray-200 dark:border-gray-700
        `}
      >
        {/* Resize Handle (desktop only) */}
        <div
          className="
            hidden lg:flex
            absolute left-0 top-0 bottom-0 w-3
            cursor-col-resize
            items-center justify-center
            group
            hover:bg-indigo-500/10
            transition-colors duration-150
          "
          onMouseDown={handleResizeStart}
          onDoubleClick={handleResizeDoubleClick}
          title="Drag to resize, double-click to reset"
        >
          <div
            className={`
              w-1 h-16 rounded-full
              transition-colors duration-150
              ${isResizing ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600 group-hover:bg-indigo-400'}
            `}
          />
        </div>

        {/* Panel Header */}
        <div
          className="
            flex items-center justify-between
            px-4 py-3 pl-6
            border-b border-gray-200 dark:border-gray-700
            bg-gray-50 dark:bg-gray-800
          "
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-500 dark:text-amber-400 select-none">{`¯\\_(ツ)_/¯`}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              YoYo AI Chat
            </span>
            {!isConnected && (
              <span className="text-xs text-red-400">(disconnected)</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearHistory}
              className="
                px-2 py-1 rounded text-xs
                text-gray-500 dark:text-gray-400
                hover:bg-gray-200 dark:hover:bg-gray-700
                hover:text-gray-700 dark:hover:text-white
                transition-colors duration-150
              "
            >
              Clear
            </button>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="
                p-1.5 rounded-lg
                text-gray-500 dark:text-gray-400
                hover:bg-gray-200 dark:hover:bg-gray-700
                hover:text-gray-700 dark:hover:text-white
                focus:outline-none focus:ring-2 focus:ring-indigo-500
                transition-colors duration-150
              "
              aria-label="Close chat panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto pl-2 bg-white dark:bg-gray-900">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center mb-4">
                <span className="text-white text-sm font-bold leading-none select-none" aria-label="Yoyo AI">{`¯\\_(ツ)_/¯`}</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                YoYo AI Chat
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[280px]">
                Ask questions or get help with tasks. Messages stream in real-time via
                WebSocket.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {messages.map((message) => (
                <ChatMessageItem key={message.id} message={message} isDark={isDark} />
              ))}

              {/* Streaming indicator (when waiting for first delta) */}
              {isStreaming &&
                messages.length > 0 &&
                !messages[messages.length - 1]?.isStreaming && (
                  <div className="flex gap-3 p-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          YoYo AI
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 pl-5 bg-gray-50 dark:bg-gray-800">
          <Card className="overflow-hidden">
            <form onSubmit={handleSubmit}>
              <div className="flex items-end gap-2 p-2">
                <ModelSelector
                  selectedModel={selectedModel}
                  onSelectModel={setSelectedModel}
                  disabled={isStreaming}
                  compact
                />
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isConnected ? 'Type a message...' : 'Connecting to gateway...'}
                  disabled={!isConnected}
                  className="flex-1 bg-transparent border-none resize-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none min-h-[40px] max-h-[120px] py-2 text-sm disabled:opacity-50"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                {isStreaming ? (
                  <Button
                    type="button"
                    onClick={abort}
                    variant="secondary"
                    icon={<Square className="w-4 h-4" />}
                  >
                    Stop
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!input.trim() || !isConnected}
                    icon={<Send className="w-4 h-4" />}
                  >
                    Send
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}

export default ChatSidebarPanel;
