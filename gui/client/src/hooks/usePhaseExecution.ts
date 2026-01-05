/**
 * usePhaseExecution Hook
 *
 * React hook for phase execution control and monitoring.
 * Combines Zustand store state with API calls and WebSocket integration.
 */

import { useCallback, useEffect } from 'react';
import { usePhaseExecutionStore } from '../stores/phaseExecutionStore';
import type { WSMessage } from './useWebSocket';

// =============================================================================
// Types
// =============================================================================

interface ExecutionPreview {
  phaseId: string;
  phaseTitle: string;
  phaseGoal: string;
  items: Array<{
    title: string;
    specExists: boolean;
    specPath: string | null;
    tasksExist: boolean;
    taskCount: number;
    completedTasks: number;
    willCreate: string[];
  }>;
  estimatedSteps: number;
  estimatedDuration: string;
}

interface FetchLogsOptions {
  limit?: number;
  offset?: number;
  level?: 'info' | 'warn' | 'error' | 'debug';
}

interface LogsResponse {
  logs: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    specId?: string;
    taskId?: string;
  }>;
  total: number;
  hasMore: boolean;
}

// =============================================================================
// API Helpers
// =============================================================================

const API_BASE = '/api/roadmap';

async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'API request failed');
  }

  return response.json();
}

// =============================================================================
// Hook
// =============================================================================

export function usePhaseExecution() {
  // Get store state and actions
  const store = usePhaseExecutionStore();

  // ===========================================================================
  // API Actions
  // ===========================================================================

  /**
   * Start execution for a phase
   */
  const startExecution = useCallback(
    async (
      phaseId: string,
      selectedSpecs?: string[],
      options?: { continueOnError?: boolean; dryRun?: boolean }
    ) => {
      const result = await apiCall<{
        executionId: string;
        phaseId: string;
        phaseTitle?: string;
        phaseGoal?: string;
        status: string;
        specsToExecute: Array<{
          id: string;
          title: string;
          hasSpec: boolean;
          hasTasks: boolean;
        }>;
      }>(`/phases/${phaseId}/execute`, {
        method: 'POST',
        body: JSON.stringify({ selectedSpecs, options }),
      });

      // Update store with started state
      store.setStarted({
        executionId: result.executionId,
        phaseId: result.phaseId,
        phaseTitle: result.phaseTitle || phaseId,
        phaseGoal: result.phaseGoal,
        specs: result.specsToExecute.map((spec) => ({
          id: spec.id,
          title: spec.title,
          status: 'pending' as const,
          progress: 0,
        })),
      });

      return result;
    },
    [store]
  );

  /**
   * Pause current execution
   */
  const pauseExecution = useCallback(async () => {
    const result = await apiCall<{
      executionId: string;
      status: string;
    }>('/execution/pause', {
      method: 'POST',
    });

    store.setPaused();
    return result;
  }, [store]);

  /**
   * Resume paused execution
   */
  const resumeExecution = useCallback(async () => {
    const result = await apiCall<{
      executionId: string;
      status: string;
    }>('/execution/resume', {
      method: 'POST',
    });

    store.setResumed();
    return result;
  }, [store]);

  /**
   * Stop current execution
   */
  const stopExecution = useCallback(
    async (reason?: string) => {
      const result = await apiCall<{
        executionId: string;
        status: string;
      }>('/execution/stop', {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });

      store.setStopped(reason);
      return result;
    },
    [store]
  );

  /**
   * Fetch current execution status
   */
  const fetchStatus = useCallback(async () => {
    const result = await apiCall<{
      executionId: string | null;
      status: string;
      phaseId: string | null;
      phaseTitle: string | null;
      progress: {
        overall: number;
        currentSpec?: {
          id: string;
          title: string;
          progress: number;
          currentTask?: string;
        };
      };
      specs: Array<{
        id: string;
        title: string;
        status: string;
        progress: number;
      }>;
      metrics: {
        startedAt: string;
        elapsedSeconds: number;
        completedTasks: number;
        totalTasks: number;
        loopCount: number;
        apiCalls: number;
      } | null;
      error: string | null;
    }>('/execution/status');

    // Update store based on status
    if (result.executionId && result.status === 'running') {
      store.updateProgress({
        overallProgress: result.progress.overall,
        currentSpec: result.progress.currentSpec,
        elapsedSeconds: result.metrics?.elapsedSeconds,
        completedTasks: result.metrics?.completedTasks,
        totalTasks: result.metrics?.totalTasks,
      });
    }

    return result;
  }, [store]);

  /**
   * Fetch execution logs
   */
  const fetchLogs = useCallback(async (options?: FetchLogsOptions): Promise<LogsResponse> => {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.level) params.set('level', options.level);

    const queryString = params.toString();
    const endpoint = queryString ? `/execution/logs?${queryString}` : '/execution/logs';

    return apiCall<LogsResponse>(endpoint);
  }, []);

  /**
   * Fetch execution preview for a phase
   */
  const fetchPreview = useCallback(
    async (phaseId: string): Promise<ExecutionPreview> => {
      return apiCall<ExecutionPreview>(`/phases/${phaseId}/execution-preview`);
    },
    []
  );

  // ===========================================================================
  // WebSocket Event Handler
  // ===========================================================================

  /**
   * Handle incoming WebSocket messages for phase execution
   */
  const handleWebSocketMessage = useCallback(
    (message: WSMessage) => {
      const { type, payload } = message;

      switch (type) {
        case 'sync:response':
          // Handle state sync on reconnect
          if (payload?.data) {
            const data = payload.data as {
              status: 'idle' | 'starting' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed';
              executionId: string | null;
              phaseId: string | null;
              phaseTitle: string | null;
              phaseGoal: string | null;
              overallProgress: number;
              currentSpec: { id: string; title: string; progress: number; currentTask?: string } | null;
              specs: Array<{ id: string; title: string; status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'; progress: number }>;
              metrics: {
                startedAt: string;
                elapsedSeconds: number;
                completedSpecs: number;
                totalSpecs: number;
                completedTasks: number;
                totalTasks: number;
              } | null;
              error: string | null;
              errorCode?: string;
            };

            if (data.status === 'idle' || data.status === 'stopped' || data.status === 'completed') {
              store.reset();
            } else if (data.status === 'starting' && data.executionId) {
              store.setStarting({
                executionId: data.executionId,
                phaseId: data.phaseId ?? '',
                phaseTitle: data.phaseTitle ?? '',
                phaseGoal: data.phaseGoal ?? undefined,
              });
            } else if (data.status === 'running' && data.executionId) {
              store.setStarted({
                executionId: data.executionId,
                phaseId: data.phaseId ?? '',
                phaseTitle: data.phaseTitle ?? '',
                phaseGoal: data.phaseGoal ?? undefined,
                specs: data.specs,
              });
              if (data.overallProgress > 0) {
                store.updateProgress({
                  overallProgress: data.overallProgress,
                  currentSpec: data.currentSpec ?? undefined,
                  completedSpecs: data.metrics?.completedSpecs,
                  totalSpecs: data.metrics?.totalSpecs,
                  completedTasks: data.metrics?.completedTasks,
                  totalTasks: data.metrics?.totalTasks,
                  elapsedSeconds: data.metrics?.elapsedSeconds,
                });
              }
            } else if (data.status === 'paused') {
              store.setPaused();
            } else if (data.status === 'failed' && data.error) {
              store.setFailed(data.error);
            }
          }
          break;

        case 'phase:execution:starting':
          // Handle starting state (pre-flight validation in progress)
          if (payload?.data) {
            const data = payload.data as {
              executionId: string;
              phaseId: string;
              phaseTitle: string;
              phaseGoal?: string;
            };
            store.setStarting({
              executionId: data.executionId,
              phaseId: data.phaseId,
              phaseTitle: data.phaseTitle,
              phaseGoal: data.phaseGoal,
            });
          }
          break;

        case 'phase:execution:started':
          if (payload?.data) {
            const data = payload.data as {
              executionId: string;
              phaseId: string;
              phaseTitle: string;
              phaseGoal?: string;
              specs?: Array<{ id: string; title: string }>;
            };
            store.setStarted({
              executionId: data.executionId,
              phaseId: data.phaseId,
              phaseTitle: data.phaseTitle,
              phaseGoal: data.phaseGoal,
              specs:
                data.specs?.map((s) => ({
                  id: s.id,
                  title: s.title,
                  status: 'pending' as const,
                  progress: 0,
                })) || [],
            });
          }
          break;

        case 'phase:execution:progress':
          if (payload?.data) {
            const data = payload.data as {
              overallProgress: number;
              currentSpec?: { id: string; title: string; progress: number; currentTask?: string };
              completedSpecs?: number;
              totalSpecs?: number;
              elapsedSeconds?: number;
            };
            store.updateProgress({
              overallProgress: data.overallProgress,
              currentSpec: data.currentSpec,
              completedSpecs: data.completedSpecs,
              totalSpecs: data.totalSpecs,
              elapsedSeconds: data.elapsedSeconds,
            });
          }
          break;

        case 'phase:execution:paused':
          store.setPaused();
          break;

        case 'phase:execution:resumed':
          store.setResumed();
          break;

        case 'phase:execution:stopped':
          if (payload?.data) {
            const data = payload.data as { reason?: string };
            store.setStopped(data.reason);
          } else {
            store.setStopped();
          }
          break;

        case 'phase:execution:completed':
          store.setCompleted();
          break;

        case 'phase:execution:failed':
          if (payload?.data) {
            const data = payload.data as {
              error: string;
              failedSpec?: string;
              failedTask?: string;
            };
            store.setFailed(data.error, data.failedSpec, data.failedTask);
          }
          break;

        case 'phase:execution:log':
          if (payload?.data) {
            const data = payload.data as {
              timestamp: string;
              level: 'info' | 'warn' | 'error' | 'debug';
              message: string;
              specId?: string;
              taskId?: string;
            };
            store.addLog(data);
          }
          break;
      }
    },
    [store]
  );

  // ===========================================================================
  // Return Value
  // ===========================================================================

  return {
    // Store state
    executionId: store.executionId,
    phaseId: store.phaseId,
    phaseTitle: store.phaseTitle,
    phaseGoal: store.phaseGoal,
    status: store.status,
    error: store.error,
    overallProgress: store.overallProgress,
    currentSpec: store.currentSpec,
    specs: store.specs,
    logs: store.logs,
    metrics: store.metrics,

    // Computed state
    isStarting: store.isStarting(),
    isRunning: store.isRunning(),
    isPaused: store.isPaused(),
    isActive: store.isActive(),
    canStart: store.canStart(),
    canPause: store.canPause(),
    canResume: store.canResume(),
    canStop: store.canStop(),

    // API actions
    startExecution,
    pauseExecution,
    resumeExecution,
    stopExecution,
    fetchStatus,
    fetchLogs,
    fetchPreview,

    // WebSocket handler
    handleWebSocketMessage,

    // Store actions
    reset: store.reset,
    addLog: store.addLog,
    clearLogs: store.clearLogs,
  };
}

export default usePhaseExecution;
