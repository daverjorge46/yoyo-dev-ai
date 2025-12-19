/**
 * useWebSocket Hook
 *
 * React hook for WebSocket connection with auto-reconnect.
 * Uses exponential backoff for reconnection attempts.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// =============================================================================
// Types
// =============================================================================

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WSMessage {
  type: string;
  payload?: {
    path?: string;
    data?: unknown;
    timestamp: number;
    clientId?: string;
  };
}

interface UseWebSocketOptions {
  onMessage?: (message: WSMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  status: ConnectionStatus;
  send: (message: WSMessage) => void;
  reconnect: () => void;
  clientId: string | null;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    autoReconnect = true,
    maxReconnectAttempts = 10,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [clientId, setClientId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const queryClient = useQueryClient();

  // Get WebSocket URL
  const getWsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // In dev mode, Vite proxies /ws to the API server
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        // Handle connection confirmation
        if (message.type === 'connected' && message.payload?.clientId) {
          setClientId(message.payload.clientId as string);
        }

        // Handle pong (connection is alive)
        if (message.type === 'pong') {
          return;
        }

        // Invalidate React Query caches based on message type
        switch (message.type) {
          case 'file:changed':
          case 'file:created':
          case 'file:deleted': {
            const path = message.payload?.path;
            if (path) {
              // Invalidate relevant queries based on path
              if (path.includes('/specs/')) {
                queryClient.invalidateQueries({ queryKey: ['specs'] });
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
              }
              if (path.includes('/fixes/')) {
                queryClient.invalidateQueries({ queryKey: ['fixes'] });
              }
              if (path.includes('/memory/')) {
                queryClient.invalidateQueries({ queryKey: ['memory'] });
              }
            }
            break;
          }
          case 'spec:updated':
            queryClient.invalidateQueries({ queryKey: ['specs'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            break;
          case 'fix:updated':
            queryClient.invalidateQueries({ queryKey: ['fixes'] });
            break;
          case 'task:updated':
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            break;
          case 'execution:progress':
            queryClient.invalidateQueries({ queryKey: ['execution'] });
            queryClient.invalidateQueries({ queryKey: ['status'] });
            break;
          case 'system:status':
            queryClient.invalidateQueries({ queryKey: ['status'] });
            break;
        }

        // Call custom message handler
        onMessage?.(message);
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    },
    [queryClient, onMessage]
  );

  // Calculate reconnect delay with exponential backoff
  const getReconnectDelay = useCallback(() => {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts.current), maxDelay);
    return delay;
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const url = getWsUrl();
    console.log('[WS] Connecting to:', url);

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('[WS] Connected');
        setStatus('connected');
        reconnectAttempts.current = 0;
        onConnect?.();

        // Start ping interval to keep connection alive
        pingInterval.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000); // Ping every 25 seconds
      };

      wsRef.current.onmessage = handleMessage;

      wsRef.current.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code, event.reason);
        setStatus('disconnected');
        setClientId(null);
        onDisconnect?.();

        // Clear ping interval
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }

        // Attempt reconnection if enabled
        if (autoReconnect && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = getReconnectDelay();
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          setStatus('reconnecting');

          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[WS] Error:', error);
      };
    } catch (err) {
      console.error('[WS] Failed to create WebSocket:', err);
      setStatus('disconnected');
    }
  }, [getWsUrl, handleMessage, onConnect, onDisconnect, autoReconnect, maxReconnectAttempts, getReconnectDelay]);

  // Send message
  const send = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Cannot send message: not connected');
    }
  }, []);

  // Manual reconnect
  const reconnect = useCallback(() => {
    // Clear any pending reconnect
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Reset attempts and connect
    reconnectAttempts.current = 0;
    setStatus('connecting');
    connect();
  }, [connect]);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    status,
    send,
    reconnect,
    clientId,
  };
}
