/**
 * Task State Hook
 *
 * Subscribes to task updates from backend via WebSocket.
 * Provides loading/error states and offline fallback.
 */

import { useEffect, useState } from 'react';
import { useAppStore } from '../../backend/state-manager.js';
import { useApiConnection } from './useApiConnection.js';

export interface UseTaskStateResult {
  tasks: any[];
  isLoading: boolean;
  error: Error | null;
  isOffline: boolean;
  refresh: () => void;
}

export function useTaskState(): UseTaskStateResult {
  const { client, isConnected } = useApiConnection();
  const tasks = useAppStore((state) => state.tasks);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Subscribe to task updates
    const handleTaskUpdate = (data: any) => {
      setIsLoading(false);
      setError(null);

      // Update store (events from backend already trigger store updates)
      // This handler is for additional UI-specific logic if needed
    };

    const handleError = (err: Error) => {
      setIsLoading(false);
      setError(err);
    };

    client.on('task_updated', handleTaskUpdate);
    client.on('error', handleError);

    return () => {
      client.off('task_updated', handleTaskUpdate);
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
    client.send({ type: 'request_tasks' });
  };

  return {
    tasks,
    isLoading,
    error,
    isOffline: !isConnected,
    refresh,
  };
}
