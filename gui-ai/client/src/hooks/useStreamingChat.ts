import { useState, useCallback, useRef, useEffect } from 'react';
import { useGateway } from '../contexts/GatewayContext';
import { useGatewayEvent } from './useGatewayEvent';
import type {
  ChatEvent,
  ChatSendParams,
  ChatSendResponse,
  ChatHistoryResponse,
  ToolCall,
} from '../lib/gateway-types';

const SESSION_KEY_STORAGE = 'yoyo-ai-session-key';

export interface StreamingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  toolCalls?: ToolCall[];
  error?: string;
}

interface UseStreamingChatOptions {
  sessionKey?: string;
  enabled?: boolean;
  onError?: (error: string) => void;
}

interface UseStreamingChatReturn {
  messages: StreamingMessage[];
  sendMessage: (content: string) => void;
  abort: () => void;
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  clearHistory: () => void;
  sessionKey: string;
}

function getOrCreateSessionKey(): string {
  let key = localStorage.getItem(SESSION_KEY_STORAGE);
  if (!key) {
    key = `gui-${((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2)).slice(0, 8)}`;
    localStorage.setItem(SESSION_KEY_STORAGE, key);
  }
  return key;
}

export function useStreamingChat(options?: UseStreamingChatOptions): UseStreamingChatReturn {
  const { client, state } = useGateway();
  const [sessionKey, setSessionKey] = useState<string>(
    () => options?.sessionKey || getOrCreateSessionKey(),
  );
  const [messages, setMessages] = useState<StreamingMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeRunId = useRef<string | null>(null);
  const streamingContent = useRef<string>('');
  const streamingToolCalls = useRef<ToolCall[]>([]);
  const onErrorRef = useRef(options?.onError);
  onErrorRef.current = options?.onError;

  const enabled = options?.enabled !== false;

  // Update sessionKey if provided via options
  useEffect(() => {
    if (options?.sessionKey && options.sessionKey !== sessionKey) {
      setSessionKey(options.sessionKey);
    }
  }, [options?.sessionKey, sessionKey]);

  // Load chat history from gateway on connect
  useEffect(() => {
    if (state !== 'connected' || !client || !enabled) {
      if (!enabled) setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadHistory() {
      try {
        console.debug('[useStreamingChat] Loading history for session:', sessionKey);
        const res = await client!.request<ChatHistoryResponse>('chat.history', {
          sessionKey,
          limit: 100,
        });

        if (cancelled) return;

        const loaded: StreamingMessage[] = (res?.messages || []).map((m, i) => ({
          id: `hist-${sessionKey}-${i}`,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp || new Date().toISOString(),
          toolCalls: m.toolCalls,
        }));

        console.debug('[useStreamingChat] Loaded', loaded.length, 'messages from history');
        setMessages(loaded);
      } catch (err) {
        // Chat history might not exist for new sessions - that's fine
        console.debug('[useStreamingChat] Failed to load history (normal for new sessions):', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [client, state, sessionKey, enabled]);

  // Listen for chat.event (streaming deltas, final, abort, error)
  useGatewayEvent(
    'chat.event',
    useCallback((payload: unknown) => {
      const event = payload as ChatEvent;
      console.debug('[useStreamingChat] chat.event received:', event.state, 'runId:', event.runId, 'activeRunId:', activeRunId.current);

      // Only process events for our active run
      if (!activeRunId.current || event.runId !== activeRunId.current) {
        console.debug('[useStreamingChat] Ignoring event - runId mismatch');
        return;
      }

      switch (event.state) {
        case 'delta': {
          const delta = event.message?.content || '';
          streamingContent.current += delta;

          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.isStreaming) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: streamingContent.current },
              ];
            }
            // Create new streaming message
            return [
              ...prev,
              {
                id: `stream-${event.runId}`,
                role: 'assistant' as const,
                content: streamingContent.current,
                timestamp: new Date().toISOString(),
                isStreaming: true,
              },
            ];
          });
          break;
        }

        case 'final': {
          const finalContent = event.message?.content || streamingContent.current;
          const toolCalls =
            streamingToolCalls.current.length > 0
              ? [...streamingToolCalls.current]
              : undefined;

          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.isStreaming) {
              return [
                ...prev.slice(0, -1),
                {
                  ...last,
                  content: finalContent,
                  isStreaming: false,
                  toolCalls,
                },
              ];
            }
            return [
              ...prev,
              {
                id: `final-${event.runId}`,
                role: 'assistant' as const,
                content: finalContent,
                timestamp: new Date().toISOString(),
                isStreaming: false,
                toolCalls,
              },
            ];
          });

          activeRunId.current = null;
          streamingContent.current = '';
          streamingToolCalls.current = [];
          setIsStreaming(false);
          break;
        }

        case 'aborted': {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.isStreaming) {
              return [
                ...prev.slice(0, -1),
                {
                  ...last,
                  content: streamingContent.current || '(aborted)',
                  isStreaming: false,
                },
              ];
            }
            return prev;
          });

          activeRunId.current = null;
          streamingContent.current = '';
          streamingToolCalls.current = [];
          setIsStreaming(false);
          break;
        }

        case 'error': {
          const errMsg = event.message?.content || 'Unknown error during chat';
          setError(errMsg);
          onErrorRef.current?.(errMsg);

          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.isStreaming) {
              return [
                ...prev.slice(0, -1),
                {
                  ...last,
                  content: streamingContent.current,
                  isStreaming: false,
                  error: errMsg,
                },
              ];
            }
            return prev;
          });

          activeRunId.current = null;
          streamingContent.current = '';
          streamingToolCalls.current = [];
          setIsStreaming(false);
          break;
        }
      }
    }, []),
  );

  // Listen for agent.event (tool calls)
  useGatewayEvent(
    'agent.event',
    useCallback((payload: unknown) => {
      const event = payload as {
        runId: string;
        data: { toolCalls?: ToolCall[] };
      };
      if (!activeRunId.current || event.runId !== activeRunId.current) return;

      if (event.data?.toolCalls) {
        streamingToolCalls.current.push(...event.data.toolCalls);
      }
    }, []),
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!client?.isConnected || !content.trim()) return;

      setError(null);

      // Add user message immediately
      const userMsg: StreamingMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Reset streaming state
      streamingContent.current = '';
      streamingToolCalls.current = [];
      setIsStreaming(true);

      try {
        const idempotencyKey = ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2));
        const params: ChatSendParams = {
          sessionKey,
          message: content.trim(),
          idempotencyKey,
          deliver: true,
        };

        console.debug('[useStreamingChat] Sending message:', { sessionKey, messageLength: content.trim().length });
        const res = await client.request<ChatSendResponse>('chat.send', params);
        console.debug('[useStreamingChat] Message sent, runId:', res.runId);
        activeRunId.current = res.runId;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to send message';
        console.error('[useStreamingChat] Send failed:', msg, err);
        setError(msg);
        setIsStreaming(false);
        onErrorRef.current?.(msg);
      }
    },
    [client, sessionKey],
  );

  const abort = useCallback(async () => {
    if (!client?.isConnected || !activeRunId.current) return;

    try {
      await client.request('chat.abort', { runId: activeRunId.current });
    } catch {
      // Abort is best-effort
    }
  }, [client]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
    activeRunId.current = null;
    streamingContent.current = '';
    streamingToolCalls.current = [];
    setIsStreaming(false);

    // Generate new session key
    const newKey = `gui-${((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2)).slice(0, 8)}`;
    localStorage.setItem(SESSION_KEY_STORAGE, newKey);
    setSessionKey(newKey);

    // Clear SQLite backup (non-critical)
    fetch('/api/chat/history', { method: 'DELETE' }).catch(() => {});
  }, []);

  return {
    messages,
    sendMessage,
    abort,
    isStreaming,
    isLoading,
    error,
    clearHistory,
    sessionKey,
  };
}
