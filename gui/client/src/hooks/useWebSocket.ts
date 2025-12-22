/**
 * useWebSocket Hook
 *
 * React hook for WebSocket connection with auto-reconnect.
 * Uses exponential backoff for reconnection attempts.
 *
 * IMPORTANT: This hook uses refs for callbacks to prevent unnecessary
 * reconnections when callbacks change. The connection lifecycle is
 * independent of callback updates.
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

  // WebSocket and timer refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConnecting = useRef(false);
  const isMounted = useRef(true);

  // Callback refs - allows callbacks to update without triggering reconnection
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);

  // Config refs - allows config to update without triggering reconnection
  const autoReconnectRef = useRef(autoReconnect);
  const maxReconnectAttemptsRef = useRef(maxReconnectAttempts);

  const queryClient = useQueryClient();

  // Update callback refs when callbacks change (no effect re-run)
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onConnectRef.current = onConnect;
  }, [onConnect]);

  useEffect(() => {
    onDisconnectRef.current = onDisconnect;
  }, [onDisconnect]);

  useEffect(() => {
    autoReconnectRef.current = autoReconnect;
  }, [autoReconnect]);

  useEffect(() => {
    maxReconnectAttemptsRef.current = maxReconnectAttempts;
  }, [maxReconnectAttempts]);

  // Get WebSocket URL - stable, no dependencies
  const getWsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // In dev mode (port 5173), connect directly to API server (port 3456)
    // Vite's WebSocket proxy is unreliable, so bypass it
    const isDev = window.location.port === '5173';
    if (isDev) {
      return `${protocol}//${window.location.hostname}:3456/ws`;
    }
    // In production, use same host (API server serves both)
    return `${protocol}//${window.location.host}/ws`;
  }, []);

  // Calculate reconnect delay with exponential backoff
  const getReconnectDelay = useCallback(() => {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts.current), maxDelay);
    return delay;
  }, []);

  // Connect to WebSocket - stable function that reads from refs
  const connect = useCallback(() => {
    // Prevent concurrent connection attempts
    if (isConnecting.current) {
      return;
    }

    // Don't connect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Don't connect if component is unmounted
    if (!isMounted.current) {
      return;
    }

    isConnecting.current = true;

    const url = getWsUrl();
    console.log('[WS] Connecting to:', url);

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        if (!isMounted.current) return;

        console.log('[WS] Connected');
        isConnecting.current = false;
        setStatus('connected');
        reconnectAttempts.current = 0;

        // Call callback from ref
        onConnectRef.current?.();

        // Start ping interval to keep connection alive
        pingInterval.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000); // Ping every 25 seconds
      };

      wsRef.current.onmessage = (event: MessageEvent) => {
        if (!isMounted.current) return;

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

          // Call custom message handler from ref
          onMessageRef.current?.(message);
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      };

      wsRef.current.onclose = (event) => {
        if (!isMounted.current) return;

        console.log('[WS] Disconnected:', event.code, event.reason);
        isConnecting.current = false;
        setStatus('disconnected');
        setClientId(null);

        // Call callback from ref
        onDisconnectRef.current?.();

        // Clear ping interval
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }

        // Attempt reconnection if enabled (read from refs)
        if (autoReconnectRef.current && reconnectAttempts.current < maxReconnectAttemptsRef.current) {
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
        isConnecting.current = false;
      };
    } catch (err) {
      console.error('[WS] Failed to create WebSocket:', err);
      isConnecting.current = false;
      setStatus('disconnected');
    }
  }, [getWsUrl, getReconnectDelay, queryClient]);

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

    // Close existing connection with proper code
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual reconnect');
      wsRef.current = null;
    }

    // Reset state
    isConnecting.current = false;
    reconnectAttempts.current = 0;
    setStatus('connecting');
    connect();
  }, [connect]);

  // Connect on mount - empty dependency array for single connection
  useEffect(() => {
    isMounted.current = true;
    connect();

    return () => {
      // Mark as unmounted to prevent state updates
      isMounted.current = false;

      // Cleanup on unmount
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
        pingInterval.current = null;
      }
      if (wsRef.current) {
        // Use proper close code for clean shutdown
        wsRef.current.close(1000, 'Component unmount');
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
