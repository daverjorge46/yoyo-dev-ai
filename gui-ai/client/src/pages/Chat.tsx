import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Square,
  User,
  Sparkles,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Wrench,
  MessageSquare,
  Plus,
  Trash2,
  Clock,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ModelSelector } from '../components/common/ModelSelector';
import { useStreamingChat, type StreamingMessage } from '../hooks/useStreamingChat';
import { useGatewayQuery } from '../hooks/useGatewayRPC';
import { useGatewayStatus } from '../hooks/useGatewayStatus';
import type { SessionsListResponse, ToolCall } from '../lib/gateway-types';

// Code block with copy button
function CodeBlock({ language, children }: { language?: string; children: string }) {
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
        className="absolute right-2 top-2 p-1.5 bg-terminal-elevated rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
      </button>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '6px',
          fontSize: '13px',
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
    <div className="mt-2 border border-terminal-border rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-terminal-elevated hover:bg-terminal-surface transition-colors text-left"
      >
        <Wrench className="w-3 h-3 text-primary-400" />
        <span className="font-medium text-terminal-text">{toolCall.name}</span>
        <span className="text-terminal-text-muted ml-auto">
          {expanded ? 'collapse' : 'expand'}
        </span>
      </button>
      {expanded && (
        <div className="px-3 py-2 text-xs font-mono bg-terminal-surface text-terminal-text-secondary max-h-40 overflow-auto">
          <div className="mb-1 text-terminal-text-muted">args:</div>
          <pre className="whitespace-pre-wrap">{toolCall.arguments}</pre>
          {toolCall.result && (
            <>
              <div className="mt-2 mb-1 text-terminal-text-muted">result:</div>
              <pre className="whitespace-pre-wrap">{toolCall.result}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Chat message component
function ChatMessageItem({ message }: { message: StreamingMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 p-4 ${isUser ? 'bg-terminal-elevated/30' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-primary-500/20 text-primary-400' : 'bg-accent-500/20 text-accent-400'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-terminal-text">
            {isUser ? 'You' : 'YoYo AI'}
          </span>
          <span className="text-xs text-terminal-text-muted">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          {message.isStreaming && (
            <span className="text-xs text-primary-400 animate-pulse">streaming...</span>
          )}
        </div>
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match;
                return isInline ? (
                  <code
                    className="px-1 py-0.5 bg-terminal-elevated rounded text-primary-400"
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <CodeBlock language={match[1]}>
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
          <div className="mt-2 flex items-center gap-2 text-xs text-error">
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

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return 'unknown';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Chat() {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('default');
  const [activeSessionKey, setActiveSessionKey] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isConnected, reconnect } = useGatewayStatus();

  const {
    messages,
    sendMessage,
    abort,
    isStreaming,
    isLoading,
    error,
    clearHistory,
    sessionKey,
  } = useStreamingChat({
    sessionKey: activeSessionKey,
  });

  // Fetch sessions list for sidebar
  const { data: sessionsData } = useGatewayQuery<SessionsListResponse>(
    'sessions.list',
    { limit: 30, includeGlobal: true },
    { staleTime: 30_000 },
  );

  const sessions = sessionsData?.sessions || [];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

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
    <div className="flex h-full">
      {/* Sessions Sidebar */}
      <div className="w-64 border-r border-terminal-border bg-terminal-surface flex flex-col">
        <div className="p-3 border-b border-terminal-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-terminal-text">Sessions</h2>
            <button
              onClick={clearHistory}
              className="p-1 hover:bg-terminal-elevated rounded transition-colors text-terminal-text-muted hover:text-terminal-text"
              title="New conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {/* Current session */}
          <button
            className={`w-full text-left px-3 py-2 text-sm border-b border-terminal-border/50 transition-colors ${
              !activeSessionKey || activeSessionKey === sessionKey
                ? 'bg-primary-500/10 text-primary-400'
                : 'text-terminal-text-secondary hover:bg-terminal-elevated'
            }`}
            onClick={() => setActiveSessionKey(undefined)}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate font-medium">Current Chat</span>
            </div>
            <div className="text-xs text-terminal-text-muted mt-0.5 truncate">
              {sessionKey}
            </div>
          </button>

          {/* Gateway sessions */}
          {sessions
            .filter((s) => s.key !== sessionKey)
            .map((session) => (
              <button
                key={session.key}
                className={`w-full text-left px-3 py-2 text-sm border-b border-terminal-border/50 transition-colors ${
                  activeSessionKey === session.key
                    ? 'bg-primary-500/10 text-primary-400'
                    : 'text-terminal-text-secondary hover:bg-terminal-elevated'
                }`}
                onClick={() => setActiveSessionKey(session.key)}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">
                    {session.label || session.key}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-terminal-text-muted mt-0.5">
                  {session.messageCount != null && (
                    <span>{session.messageCount} msgs</span>
                  )}
                  {session.lastActivity && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTimeAgo(session.lastActivity)}
                    </span>
                  )}
                </div>
              </button>
            ))}

          {sessions.length === 0 && (
            <div className="p-4 text-xs text-terminal-text-muted text-center">
              No sessions yet
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <h1 className="panel-title">Chat</h1>
            {!isConnected && (
              <button
                onClick={reconnect}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                (disconnected - click to reconnect)
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={clearHistory} icon={<Trash2 className="w-3 h-3" />}>
              Clear
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-terminal-text mb-2">
                Welcome to YoYo AI Chat
              </h2>
              <p className="text-sm text-terminal-text-secondary max-w-md">
                Messages stream in real-time via WebSocket RPC. Ask me anything.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-terminal-border/50">
              {messages.map((message) => (
                <ChatMessageItem key={message.id} message={message} />
              ))}

              {/* Streaming indicator (when waiting for first delta) */}
              {isStreaming &&
                messages.length > 0 &&
                !messages[messages.length - 1]?.isStreaming && (
                  <div className="flex gap-3 p-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-accent-500/20 text-accent-400">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-terminal-text">
                          YoYo AI
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-accent-400" />
                        <span className="text-sm text-terminal-text-muted">
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
          <div className="px-4 py-2 bg-error/10 border-t border-error/30">
            <div className="flex items-center gap-2 text-sm text-error">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-terminal-border p-4">
          <Card className="overflow-hidden">
            <form onSubmit={handleSubmit}>
              <div className="flex items-end gap-2 p-2">
                <ModelSelector
                  selectedModel={selectedModel}
                  onSelectModel={setSelectedModel}
                  disabled={isStreaming}
                />
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isConnected ? 'Type your message...' : 'Connecting to gateway...'
                  }
                  disabled={!isConnected}
                  className="flex-1 bg-transparent border-none resize-none text-terminal-text placeholder-terminal-text-muted focus:outline-none min-h-[40px] max-h-[200px] py-2 disabled:opacity-50"
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
    </div>
  );
}
