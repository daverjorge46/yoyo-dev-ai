/**
 * useChat Hook
 *
 * Manages chat state, history persistence, and Claude Code CLI communication.
 * Uses Server-Sent Events (SSE) for streaming responses.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

// =============================================================================
// Types
// =============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  references?: FileReference[];
}

export interface FileReference {
  path: string;
  lineNumber?: number;
  endLineNumber?: number;
  snippet?: string;
}

export interface ClaudeAvailability {
  available: boolean;
  version?: string;
  error?: string;
}

export interface UseChatOptions {
  /** localStorage key for history */
  storageKey?: string;
  /** Maximum messages to keep in history */
  maxHistory?: number;
  /** API endpoint */
  endpoint?: string;
}

export interface UseChatReturn {
  /** Current messages */
  messages: ChatMessage[];
  /** Whether a request is in progress */
  isLoading: boolean;
  /** Current error, if any */
  error: Error | null;
  /** Send a new message */
  sendMessage: (content: string) => void;
  /** Clear all messages */
  clearHistory: () => void;
  /** Retry last failed message */
  retry: () => void;
  /** Abort current request */
  abort: () => void;
  /** Whether Claude Code CLI is available */
  isAvailable: boolean;
  /** Claude Code version if available */
  claudeVersion?: string;
  /** Availability error message if not available */
  availabilityError?: string;
  /** Whether availability check is in progress */
  isCheckingAvailability: boolean;
  /** Current session ID for conversation continuity */
  sessionId: string | null;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_STORAGE_KEY = 'yoyo-chat-history';
const DEFAULT_MAX_HISTORY = 100;
const DEFAULT_ENDPOINT = '/api/chat';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Generate unique message ID
 */
function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Load messages from localStorage
 */
function loadMessages(storageKey: string): ChatMessage[] {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load chat history:', err);
  }
  return [];
}

/**
 * Save messages to localStorage
 */
function saveMessages(storageKey: string, messages: ChatMessage[], maxHistory: number): void {
  try {
    // Keep only the most recent messages
    const toSave = messages.slice(-maxHistory);
    localStorage.setItem(storageKey, JSON.stringify(toSave));
  } catch (err) {
    console.error('Failed to save chat history:', err);
  }
}

/**
 * Parse SSE data line
 */
function parseSSEData(line: string): { content?: string; error?: string; done?: boolean } | null {
  if (!line.startsWith('data: ')) {
    return null;
  }

  const data = line.slice(6); // Remove 'data: ' prefix

  if (data === '[DONE]') {
    return { done: true };
  }

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// =============================================================================
// Hook
// =============================================================================

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    maxHistory = DEFAULT_MAX_HISTORY,
    endpoint = DEFAULT_ENDPOINT,
  } = options;

  // State
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadMessages(storageKey)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const lastFailedMessageRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentAssistantIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Check Claude availability
  const {
    data: availability,
    isLoading: isCheckingAvailability,
    error: availabilityQueryError,
  } = useQuery<ClaudeAvailability>({
    queryKey: ['claude-availability', endpoint],
    queryFn: async () => {
      const response = await fetch(`${endpoint}/status`);
      if (!response.ok) {
        throw new Error('Failed to check Claude availability');
      }
      return response.json();
    },
    staleTime: 30000, // Cache for 30 seconds
    retry: 1,
  });

  // Derived availability state
  const isAvailable = availability?.available ?? false;
  const claudeVersion = availability?.version;
  const availabilityError =
    availability?.error ?? availabilityQueryError?.message;

  // Save messages to localStorage when they change
  useEffect(() => {
    saveMessages(storageKey, messages, maxHistory);
  }, [messages, storageKey, maxHistory]);

  // Stream chat response
  const streamChat = useCallback(
    async (message: string, assistantMessageId: string) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      currentAssistantIdRef.current = assistantMessageId;

      // Generate sessionId on first message if not set
      if (!sessionIdRef.current) {
        sessionIdRef.current = crypto.randomUUID();
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message, sessionId: sessionIdRef.current }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(errorData.error || errorData.message || 'Failed to send message');
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedContent = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            const parsed = parseSSEData(trimmedLine);
            if (!parsed) continue;

            if (parsed.done) {
              // Stream complete
              break;
            }

            if (parsed.error) {
              throw new Error(parsed.error);
            }

            if (parsed.content) {
              accumulatedContent += parsed.content;

              // Update assistant message with accumulated content
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulatedContent }
                    : msg
                )
              );
            }
          }
        }

        setError(null);
        lastFailedMessageRef.current = null;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was aborted, don't set error
          return;
        }

        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        lastFailedMessageRef.current = message;
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
        currentAssistantIdRef.current = null;
      }
    },
    [endpoint]
  );

  // Send message
  const sendMessage = useCallback(
    (content: string) => {
      const trimmedContent = content.trim();
      if (!trimmedContent) return;

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: trimmedContent,
        timestamp: Date.now(),
      };

      // Add placeholder assistant message
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setError(null);
      setIsLoading(true);

      // Start streaming
      streamChat(trimmedContent, assistantMessage.id);
    },
    [streamChat]
  );

  // Clear history
  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
    lastFailedMessageRef.current = null;
    sessionIdRef.current = null; // Reset session for new conversation
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // Retry last failed message
  const retry = useCallback(() => {
    if (lastFailedMessageRef.current) {
      const failedMessage = lastFailedMessageRef.current;
      // Remove the failed user message and empty assistant message
      setMessages((prev) => prev.slice(0, -2));
      // Resend
      sendMessage(failedMessage);
    }
  }, [sendMessage]);

  // Abort current request
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Also call the abort endpoint to kill the subprocess
    fetch(`${endpoint}/abort`, { method: 'POST' }).catch(() => {
      // Ignore abort endpoint errors
    });
  }, [endpoint]);

  return {
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
    sessionId: sessionIdRef.current,
  };
}

export default useChat;
