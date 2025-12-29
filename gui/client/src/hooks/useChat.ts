/**
 * useChat Hook
 *
 * Manages chat state, history persistence, and API communication.
 * Persists chat history to localStorage.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';

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

export interface ChatResponse {
  response: string;
  references: FileReference[];
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
 * Send chat message to API
 */
async function sendChatRequest(
  endpoint: string,
  message: string,
  context?: ChatMessage[]
): Promise<ChatResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      context: context?.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Failed to send message');
  }

  return response.json();
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
  const [error, setError] = useState<Error | null>(null);

  // Track last failed message for retry
  const lastFailedMessageRef = useRef<string | null>(null);

  // Save messages to localStorage when they change
  useEffect(() => {
    saveMessages(storageKey, messages, maxHistory);
  }, [messages, storageKey, maxHistory]);

  // Mutation for sending messages
  const mutation = useMutation({
    mutationFn: async (content: string) => {
      // Get recent context (last 10 messages for context window)
      const recentMessages = messages.slice(-10);
      return sendChatRequest(endpoint, content, recentMessages);
    },
    onSuccess: (data) => {
      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
        references: data.references,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setError(null);
      lastFailedMessageRef.current = null;
    },
    onError: (err: Error, content: string) => {
      setError(err);
      lastFailedMessageRef.current = content;
    },
  });

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

      setMessages((prev) => [...prev, userMessage]);
      setError(null);

      // Send to API (use mutate instead of mutateAsync to avoid unhandled rejections)
      mutation.mutate(trimmedContent);
    },
    [mutation]
  );

  // Clear history
  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
    lastFailedMessageRef.current = null;
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // Retry last failed message
  const retry = useCallback(() => {
    if (lastFailedMessageRef.current) {
      // Remove the failed user message first
      setMessages((prev) => prev.slice(0, -1));
      // Resend
      sendMessage(lastFailedMessageRef.current);
    }
  }, [sendMessage]);

  return {
    messages,
    isLoading: mutation.isPending,
    error,
    sendMessage,
    clearHistory,
    retry,
  };
}

export default useChat;
