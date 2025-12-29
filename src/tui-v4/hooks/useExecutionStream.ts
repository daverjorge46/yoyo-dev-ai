/**
 * useExecutionStream Hook
 *
 * Subscribes to execution_log WebSocket events from backend.
 * Provides log history and streaming updates.
 */

import { useState, useEffect } from 'react';
import { useApiConnection } from '../client/hooks/useApiConnection.js';
import { LogEntry } from '../components/LogViewer.js';

export interface ExecutionState {
  taskId: string;
  taskName: string;
  status: 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  logs: LogEntry[];
  testResults?: any;
}

export interface UseExecutionStreamResult {
  execution: ExecutionState | null;
  isStreaming: boolean;
}

export function useExecutionStream(): UseExecutionStreamResult {
  const { client, isConnected } = useApiConnection();
  const [execution, setExecution] = useState<ExecutionState | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!client || !isConnected) {
      return;
    }

    // Subscribe to execution_log events
    const handleExecutionLog = (data: any) => {
      setIsStreaming(true);

      if (data.type === 'start') {
        // New execution started
        setExecution({
          taskId: data.taskId,
          taskName: data.taskName,
          status: 'running',
          progress: 0,
          logs: [],
        });
      } else if (data.type === 'log') {
        // New log entry
        setExecution(prev => {
          if (!prev) return null;

          return {
            ...prev,
            logs: [
              ...prev.logs,
              {
                timestamp: data.timestamp || new Date().toLocaleTimeString(),
                level: data.level || 'info',
                message: data.message,
              },
            ],
          };
        });
      } else if (data.type === 'progress') {
        // Progress update
        setExecution(prev => {
          if (!prev) return null;
          return {
            ...prev,
            progress: data.progress,
          };
        });
      } else if (data.type === 'complete') {
        // Execution completed
        setExecution(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: 'completed',
            progress: 100,
            testResults: data.testResults,
          };
        });
        setIsStreaming(false);
      } else if (data.type === 'error') {
        // Execution failed
        setExecution(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: 'failed',
            logs: [
              ...prev.logs,
              {
                timestamp: new Date().toLocaleTimeString(),
                level: 'error',
                message: data.error || 'Execution failed',
              },
            ],
          };
        });
        setIsStreaming(false);
      }
    };

    client.on('execution_log', handleExecutionLog);

    return () => {
      client.off('execution_log', handleExecutionLog);
    };
  }, [client, isConnected]);

  return {
    execution,
    isStreaming,
  };
}
