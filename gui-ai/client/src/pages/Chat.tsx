import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  Mic,
  Paperclip,
  User,
  Sparkles,
  Square,
  Copy,
  Check,
  X,
  FileText,
  Image,
  Loader2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { PageLoader } from '../components/common/LoadingSpinner';
import { ModelSelector, DEFAULT_MODELS, type Model } from '../components/common/ModelSelector';
import { SlashCommands } from '../components/common/SlashCommands';
import type { ChatMessage, Attachment } from '../types';

// Voice recorder component
function VoiceRecorder({
  onRecordingComplete,
  onCancel,
}: {
  onRecordingComplete: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    let stream: MediaStream;

    const startRecording = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          onRecordingComplete(blob);
        };

        mediaRecorder.start();
        intervalRef.current = setInterval(() => {
          setDuration((d) => d + 1);
        }, 1000);
      } catch (error) {
        console.error('Failed to start recording:', error);
        onCancel();
      }
    };

    startRecording();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [onRecordingComplete, onCancel]);

  const handleStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-terminal-elevated rounded-lg border border-primary-500/50">
      <div className="w-3 h-3 rounded-full bg-error animate-pulse" />
      <span className="text-sm text-terminal-text">Recording... {formatDuration(duration)}</span>
      <div className="flex-1" />
      <Button size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
      <Button size="sm" onClick={handleStop}>
        Send
      </Button>
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
    <div className="flex flex-wrap gap-2 p-2 border-t border-terminal-border">
      {attachments.map((file, index) => (
        <div
          key={index}
          className="flex items-center gap-2 px-2 py-1 bg-terminal-elevated rounded text-xs"
        >
          {file.type.startsWith('image/') ? (
            <Image className="w-3 h-3" />
          ) : (
            <FileText className="w-3 h-3" />
          )}
          <span className="max-w-[100px] truncate">{file.name}</span>
          <button
            onClick={() => onRemove(index)}
            className="p-0.5 hover:bg-terminal-surface rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

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

// Chat message component
function ChatMessageItem({ message }: { message: ChatMessage }) {
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
        </div>
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match;
                return isInline ? (
                  <code className="px-1 py-0.5 bg-terminal-elevated rounded text-primary-400" {...props}>
                    {children}
                  </code>
                ) : (
                  <CodeBlock language={match[1]}>{String(children).replace(/\n$/, '')}</CodeBlock>
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
                className="flex items-center gap-1 px-2 py-1 bg-terminal-elevated rounded text-xs text-terminal-text-secondary"
              >
                <FileText className="w-3 h-3" />
                {att.name}
              </div>
            ))}
          </div>
        )}
        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.suggestedActions.map((action) => (
              <Button key={action.id} size="sm" variant="secondary">
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Chat() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('default');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  });

  // Fetch chat history
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['chat', 'history'],
    queryFn: async () => {
      const res = await fetch('/api/chat/history');
      if (!res.ok) throw new Error('Failed to fetch chat history');
      const data = await res.json();
      return data.messages || [];
    },
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

  // Scroll to bottom when messages change or when pending message appears
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingUserMessage, sendMessage.isPending]);

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

  const handleVoiceRecordingComplete = useCallback(
    (blob: Blob) => {
      setIsRecording(false);
      // Send voice message
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      fetch('/api/chat/voice', {
        method: 'POST',
        body: formData,
      })
        .then((res) => res.json())
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['chat', 'history'] });
        })
        .catch(console.error);
    },
    [queryClient]
  );

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="panel-header">
        <h1 className="panel-title">Chat</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost">
            Clear History
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto">
        {messages.length === 0 && !pendingUserMessage ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-terminal-text mb-2">
              Welcome to YoYo AI Chat
            </h2>
            <p className="text-sm text-terminal-text-secondary max-w-md">
              Ask me anything, upload documents for analysis, or use voice input.
              I can help with tasks, answer questions, and automate your workflows.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-terminal-border/50">
            {messages.map((message) => (
              <ChatMessageItem key={message.id} message={message} />
            ))}

            {/* Pending user message (optimistic update) */}
            {pendingUserMessage && (
              <div className="flex gap-3 p-4 bg-terminal-elevated/30">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary-500/20 text-primary-400">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-terminal-text">You</span>
                    <span className="text-xs text-terminal-text-muted">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <p>{pendingUserMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Thinking indicator */}
            {sendMessage.isPending && (
              <div className="flex gap-3 p-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-accent-500/20 text-accent-400">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-terminal-text">YoYo AI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-accent-400" />
                    <span className="text-sm text-terminal-text-muted">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-terminal-border p-4">
        {isRecording ? (
          <VoiceRecorder
            onRecordingComplete={handleVoiceRecordingComplete}
            onCancel={() => setIsRecording(false)}
          />
        ) : (
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
                  className="p-2 hover:bg-terminal-elevated rounded transition-colors text-terminal-text-secondary hover:text-terminal-text"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <ModelSelector
                  models={models}
                  selectedModel={selectedModel}
                  onSelectModel={setSelectedModel}
                  disabled={sendMessage.isPending}
                />
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message... (/ for commands)"
                  className="flex-1 bg-transparent border-none resize-none text-terminal-text placeholder-terminal-text-muted focus:outline-none min-h-[40px] max-h-[200px] py-2"
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
                <button
                  type="button"
                  onClick={() => setIsRecording(true)}
                  className="p-2 hover:bg-terminal-elevated rounded transition-colors text-terminal-text-secondary hover:text-terminal-text"
                >
                  <Mic className="w-5 h-5" />
                </button>
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
        )}
      </div>
    </div>
  );
}
