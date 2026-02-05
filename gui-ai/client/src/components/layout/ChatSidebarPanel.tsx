/**
 * ChatSidebarPanel Component
 *
 * Slide-out right sidebar panel for chat interface.
 * Allows users to chat while exploring other pages.
 * Resizable on desktop with drag handle.
 * Supports light and dark themes.
 *
 * Accessibility:
 * - role="dialog" with aria-label
 * - Focus trap when open
 * - Escape key to close
 * - Focus returns to trigger on close
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Send,
  Paperclip,
  User,
  Sparkles,
  Copy,
  Check,
  FileText,
  Image,
  Loader2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { ModelSelector, DEFAULT_MODELS, type Model } from '../common/ModelSelector';
import { SlashCommands } from '../common/SlashCommands';
import { useTheme } from '../ThemeToggle';
import type { ChatMessage } from '../../types';

interface ChatSidebarPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Panel size constraints
const MIN_WIDTH = 380;
const MAX_WIDTH = 700;
const DEFAULT_WIDTH = 500;

// Code block with copy button
function CodeBlock({ language, children, isDark }: { language?: string; children: string; isDark: boolean }) {
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
        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-600 dark:text-gray-300" />}
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

// Chat message component
function ChatMessageItem({ message, isDark }: { message: ChatMessage; isDark: boolean }) {
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
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match;
                return isInline ? (
                  <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-indigo-600 dark:text-indigo-400 text-xs" {...props}>
                    {children}
                  </code>
                ) : (
                  <CodeBlock language={match[1]} isDark={isDark}>{String(children).replace(/\n$/, '')}</CodeBlock>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300"
              >
                <FileText className="w-3 h-3" />
                {att.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Attachment preview
function AttachmentPreview({
  attachments,
  onRemove,
}: {
  attachments: File[];
  onRemove: (index: number) => void;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 p-2 border-t border-gray-200 dark:border-gray-700">
      {attachments.map((file, index) => (
        <div
          key={index}
          className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300"
        >
          {file.type.startsWith('image/') ? (
            <Image className="w-3 h-3" />
          ) : (
            <FileText className="w-3 h-3" />
          )}
          <span className="max-w-[100px] truncate">{file.name}</span>
          <button
            onClick={() => onRemove(index)}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ChatSidebarPanel({ isOpen, onClose }: ChatSidebarPanelProps) {
  const queryClient = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('default');

  // Fetch available models
  const { data: models = DEFAULT_MODELS } = useQuery<Model[]>({
    queryKey: ['models'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/models');
        if (!res.ok) return DEFAULT_MODELS;
        const data = await res.json();
        return data.models?.length > 0 ? data.models : DEFAULT_MODELS;
      } catch {
        return DEFAULT_MODELS;
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: isOpen,
  });

  // Fetch chat history
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['chat', 'history'],
    queryFn: async () => {
      const res = await fetch('/api/chat/history');
      if (!res.ok) throw new Error('Failed to fetch chat history');
      const data = await res.json();
      return data.messages || [];
    },
    enabled: isOpen,
  });

  // Send message mutation with optimistic update
  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      files,
      model,
    }: {
      content: string;
      files?: File[];
      model?: string;
    }) => {
      const formData = new FormData();
      formData.append('content', content);
      if (model && model !== 'default') {
        formData.append('model', model);
      }
      if (files) {
        files.forEach((file) => formData.append('attachments', file));
      }

      const res = await fetch('/api/chat/message', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onMutate: async ({ content }) => {
      // Show user message immediately (optimistic update)
      setPendingUserMessage(content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'history'] });
    },
    onSettled: () => {
      // Clear pending message when done (success or error)
      setPendingUserMessage(null);
    },
  });

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
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Scroll to bottom when messages change or when pending message appears
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, pendingUserMessage, sendMessage.isPending]);

  // Handle resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate new width (resize from left edge, so invert delta)
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
  }, [width]);

  // Double-click to reset width
  const handleResizeDoubleClick = useCallback(() => {
    setWidth(DEFAULT_WIDTH);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() && attachments.length === 0) return;

      sendMessage.mutate({
        content: input.trim(),
        files: attachments.length > 0 ? attachments : undefined,
        model: selectedModel,
      });

      setInput('');
      setAttachments([]);
    },
    [input, attachments, sendMessage, selectedModel]
  );

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
    e.target.value = '';
  }, []);

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
            <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              YoYo AI Chat
            </span>
          </div>
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

        {/* Messages */}
        <div className="flex-1 overflow-auto pl-2 bg-white dark:bg-gray-900">
          {messages.length === 0 && !pendingUserMessage ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                YoYo AI Chat
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[280px]">
                Ask questions, upload documents, or get help with tasks.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {messages.map((message) => (
                <ChatMessageItem key={message.id} message={message} isDark={isDark} />
              ))}

              {/* Pending user message (optimistic update) */}
              {pendingUserMessage && (
                <div className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-800/50">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">You</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-gray-900 dark:text-gray-100">{pendingUserMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Thinking indicator */}
              {sendMessage.isPending && (
                <div className="flex gap-3 p-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">YoYo AI</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 pl-5 bg-gray-50 dark:bg-gray-800">
          <Card className="overflow-hidden relative">
            {/* Slash command autocomplete */}
            <SlashCommands
              input={input}
              visible={input.startsWith('/') && !input.includes(' ')}
              onSelectCommand={(cmd) => setInput(cmd)}
            />

            <form onSubmit={handleSubmit}>
              <div className="flex items-end gap-2 p-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt,.md"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <ModelSelector
                  models={models}
                  selectedModel={selectedModel}
                  onSelectModel={setSelectedModel}
                  disabled={sendMessage.isPending}
                  compact
                />
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message... (/ for commands)"
                  className="flex-1 bg-transparent border-none resize-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none min-h-[40px] max-h-[120px] py-2 text-sm"
                  rows={1}
                  onKeyDown={(e) => {
                    // Don't submit if slash commands menu is visible
                    if (input.startsWith('/') && !input.includes(' ')) {
                      if (e.key === 'Tab' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        return; // Let SlashCommands handle these
                      }
                    }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={!input.trim() && attachments.length === 0}
                  loading={sendMessage.isPending}
                  icon={<Send className="w-4 h-4" />}
                >
                  Send
                </Button>
              </div>
            </form>
            <AttachmentPreview
              attachments={attachments}
              onRemove={(index) =>
                setAttachments((prev) => prev.filter((_, i) => i !== index))
              }
            />
          </Card>
        </div>
      </div>
    </>
  );
}

export default ChatSidebarPanel;
