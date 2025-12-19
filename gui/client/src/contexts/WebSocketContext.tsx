/**
 * WebSocket Context
 *
 * Provides WebSocket connection state to the entire app.
 */

import { createContext, useContext, type ReactNode } from 'react';
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
  const ws = useWebSocket({
    onConnect: () => {
      console.log('[App] WebSocket connected');
    },
    onDisconnect: () => {
      console.log('[App] WebSocket disconnected');
    },
    onMessage: (message) => {
      // Log non-pong messages for debugging
      if (message.type !== 'pong' && message.type !== 'connected') {
        console.log('[App] WebSocket message:', message.type, message.payload?.path || '');
      }
    },
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
