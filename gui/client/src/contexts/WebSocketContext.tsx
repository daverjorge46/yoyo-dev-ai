/**
 * WebSocket Context
 *
 * Provides WebSocket connection state to the entire app.
 * Callbacks are memoized to prevent unnecessary reconnections.
 */

import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useWebSocket, type ConnectionStatus, type WSMessage } from '../hooks/useWebSocket';

interface WebSocketContextValue {
  status: ConnectionStatus;
  send: (message: WSMessage) => void;
  reconnect: () => void;
  clientId: string | null;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  // Memoize callbacks to prevent unnecessary hook re-runs
  // Note: With the new ref-based hook, this is optional but good practice
  const handleConnect = useCallback(() => {
    console.log('[App] WebSocket connected');
  }, []);

  const handleDisconnect = useCallback(() => {
    console.log('[App] WebSocket disconnected');
  }, []);

  const handleMessage = useCallback((message: WSMessage) => {
    // Log non-pong messages for debugging
    if (message.type !== 'pong' && message.type !== 'connected') {
      console.log('[App] WebSocket message:', message.type, message.payload?.path || '');
    }
  }, []);

  const ws = useWebSocket({
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onMessage: handleMessage,
  });

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}
