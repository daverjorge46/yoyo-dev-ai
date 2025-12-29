/**
 * Spec State Hook
 *
 * Subscribes to spec updates from backend via WebSocket.
 * Provides loading/error states and offline fallback.
 */

import { useEffect, useState } from 'react';
import { useAppStore } from '../../backend/state-manager.js';
import { useApiConnection } from './useApiConnection.js';

export interface UseSpecStateResult {
  specs: any[];
  activeSpec: any | null;
  isLoading: boolean;
  error: Error | null;
  isOffline: boolean;
  refresh: () => void;
}

export function useSpecState(): UseSpecStateResult {
  const { client, isConnected } = useApiConnection();
  const specs = useAppStore((state) => state.specs);
  const activeSpec = useAppStore((state) => state.activeSpec);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Subscribe to spec updates
    const handleSpecChange = (data: any) => {
      setIsLoading(false);
      setError(null);

      // Update store (events from backend already trigger store updates)
      // This handler is for additional UI-specific logic if needed
    };

    const handleError = (err: Error) => {
      setIsLoading(false);
      setError(err);
    };

    client.on('spec_changed', handleSpecChange);
    client.on('error', handleError);

    return () => {
      client.off('spec_changed', handleSpecChange);
      client.off('error', handleError);
    };
  }, [client]);

  const refresh = () => {
    if (!isConnected) {
      setError(new Error('Cannot refresh: not connected to backend'));
      return;
    }

    setIsLoading(true);
    setError(null);

    // Request fresh data from server
    client.send({ type: 'request_specs' });
  };

  return {
    specs,
    activeSpec,
    isLoading,
    error,
    isOffline: !isConnected,
    refresh,
  };
}
