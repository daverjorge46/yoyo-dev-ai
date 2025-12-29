/**
 * WebSocket Connection Hook
 *
 * Manages connection to backend API with auto-reconnect.
 * Provides connection state and event handlers.
 */

import { useEffect, useState } from 'react';
import { ApiClient, ConnectionState, getApiClient } from '../api-client.js';

export interface UseApiConnectionOptions {
  autoConnect?: boolean;
  host?: string;
  port?: number;
}

export function useApiConnection(options: UseApiConnectionOptions = {}) {
  const { autoConnect = true, host = 'localhost', port = 3457 } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [client] = useState<ApiClient>(() => getApiClient({ host, port }));

  useEffect(() => {
    // Subscribe to connection state changes
    const handleConnectionState = (state: ConnectionState) => {
      setConnectionState(state);
    };

    client.on('connection_state', handleConnectionState);

    // Auto-connect if enabled
    if (autoConnect && !client.isConnected()) {
      client.connect();
    }

    return () => {
      client.off('connection_state', handleConnectionState);
      // Don't disconnect on unmount - keep connection alive for other components
    };
  }, [client, autoConnect]);

  return {
    client,
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    hasError: connectionState === 'error',
    connect: () => client.connect(),
    disconnect: () => client.disconnect(),
  };
}
