/**
 * usePhaseExecutor Hook
 *
 * React hook for managing automated phase execution via agent terminals.
 * Handles starting, pausing, resuming, and cancelling phase executions
 * with real-time status updates via WebSocket.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import type { WSMessage } from './useWebSocket';

// =============================================================================
// Types
// =============================================================================

export type PhaseExecutionStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ItemExecutionStep =
  | 'pending'
  | 'spec_creating'
  | 'spec_created'
  | 'tasks_creating'
  | 'tasks_created'
  | 'executing'
  | 'testing'
  | 'qa_reviewing'
  | 'qa_fixing'
  | 'completed'
  | 'failed';

export interface PhaseItem {
  id: string;
  number: number;
  title: string;
  completed: boolean;
  effort: 'XS' | 'S' | 'M' | 'L' | 'XL' | null;
  description?: string;
  linkedSpec?: string;
}

export interface ItemExecutionState {
  itemId: string;
  itemTitle: string;
  status: ItemExecutionStep;
  specId?: string;
  terminalId?: string;
  qaSessionId?: string;
  qaIterations: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface PhaseExecutionState {
  id: string;
  phaseId: string;
  phaseTitle: string;
  status: PhaseExecutionStatus;
  currentItemId: string | null;
  currentStep: ItemExecutionStep;
  progress: number;
  items: ItemExecutionState[];
  config: ExecutionOptions;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface ExecutionOptions {
  autoCreateSpecs: boolean;
  autoCreateTasks: boolean;
  runQA: boolean;
  maxQAIterations: number;
  stopOnError: boolean;
  useWorktrees: boolean;
  selectedItemIds?: string[];
}

export interface ExecutePhaseRequest {
  phaseId: string;
  phaseTitle: string;
  items: PhaseItem[];
  options: ExecutionOptions;
}

export interface ExecutionListResponse {
  executions: PhaseExecutionState[];
  count: number;
}

export interface ExecutionStatusResponse {
  isExecuting: boolean;
  execution: PhaseExecutionState | null;
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchExecutions(limit = 20): Promise<ExecutionListResponse> {
  const res = await fetch(`/api/phase-executor?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch executions');
  return res.json();
}

async function fetchExecutionStatus(): Promise<ExecutionStatusResponse> {
  const res = await fetch('/api/phase-executor/status');
  if (!res.ok) throw new Error('Failed to fetch execution status');
  return res.json();
}

async function fetchExecution(executionId: string): Promise<PhaseExecutionState> {
  const res = await fetch(`/api/phase-executor/${executionId}`);
  if (!res.ok) throw new Error('Failed to fetch execution');
  return res.json();
}

async function startExecution(request: ExecutePhaseRequest): Promise<{ success: boolean; execution: PhaseExecutionState }> {
  const res = await fetch('/api/phase-executor/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to start execution');
  }
  return res.json();
}

async function pauseExecution(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/phase-executor/pause', {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to pause execution');
  }
  return res.json();
}

async function resumeExecution(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/phase-executor/resume', {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to resume execution');
  }
  return res.json();
}

async function cancelExecution(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/phase-executor/cancel', {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to cancel execution');
  }
  return res.json();
}

// =============================================================================
// Hook
// =============================================================================

export interface UsePhaseExecutorReturn {
  /** Current execution state */
  currentExecution: PhaseExecutionState | null;
  /** Whether an execution is currently running */
  isExecuting: boolean;
  /** Recent executions history */
  executions: PhaseExecutionState[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Start a new phase execution */
  start: (request: ExecutePhaseRequest) => Promise<void>;
  /** Pause the current execution */
  pause: () => Promise<void>;
  /** Resume a paused execution */
  resume: () => Promise<void>;
  /** Cancel the current execution */
  cancel: () => Promise<void>;
  /** Refresh the execution status */
  refresh: () => void;
  /** Is start in progress */
  isStarting: boolean;
  /** Is pause in progress */
  isPausing: boolean;
  /** Is resume in progress */
  isResuming: boolean;
  /** Is cancel in progress */
  isCancelling: boolean;
  /** Handle WebSocket messages */
  handleWebSocketMessage: (message: WSMessage) => void;
}

export function usePhaseExecutor(): UsePhaseExecutorReturn {
  const queryClient = useQueryClient();
  const [localExecution, setLocalExecution] = useState<PhaseExecutionState | null>(null);

  // Query for current execution status
  const {
    data: statusData,
    isLoading: isStatusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['phase-executor', 'status'],
    queryFn: fetchExecutionStatus,
    refetchInterval: (query) => {
      // Poll more frequently when executing
      const data = query.state.data as ExecutionStatusResponse | undefined;
      return data?.isExecuting ? 1000 : 5000;
    },
  });

  // Query for execution history
  const {
    data: executionsData,
    isLoading: isExecutionsLoading,
    error: executionsError,
  } = useQuery({
    queryKey: ['phase-executor', 'list'],
    queryFn: () => fetchExecutions(20),
    refetchInterval: 10000,
  });

  // Sync local state with query data
  useEffect(() => {
    if (statusData?.execution) {
      setLocalExecution(statusData.execution);
    } else {
      setLocalExecution(null);
    }
  }, [statusData]);

  // Start mutation
  const startMutation = useMutation({
    mutationFn: startExecution,
    onSuccess: (data) => {
      setLocalExecution(data.execution);
      queryClient.invalidateQueries({ queryKey: ['phase-executor'] });
    },
  });

  // Pause mutation
  const pauseMutation = useMutation({
    mutationFn: pauseExecution,
    onSuccess: () => {
      if (localExecution) {
        setLocalExecution({ ...localExecution, status: 'paused' });
      }
      queryClient.invalidateQueries({ queryKey: ['phase-executor'] });
    },
  });

  // Resume mutation
  const resumeMutation = useMutation({
    mutationFn: resumeExecution,
    onSuccess: () => {
      if (localExecution) {
        setLocalExecution({ ...localExecution, status: 'running' });
      }
      queryClient.invalidateQueries({ queryKey: ['phase-executor'] });
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: cancelExecution,
    onSuccess: () => {
      setLocalExecution(null);
      queryClient.invalidateQueries({ queryKey: ['phase-executor'] });
    },
  });

  // Callbacks
  const start = useCallback(
    async (request: ExecutePhaseRequest) => {
      await startMutation.mutateAsync(request);
    },
    [startMutation]
  );

  const pause = useCallback(async () => {
    await pauseMutation.mutateAsync();
  }, [pauseMutation]);

  const resume = useCallback(async () => {
    await resumeMutation.mutateAsync();
  }, [resumeMutation]);

  const cancel = useCallback(async () => {
    await cancelMutation.mutateAsync();
  }, [cancelMutation]);

  const refresh = useCallback(() => {
    refetchStatus();
    queryClient.invalidateQueries({ queryKey: ['phase-executor', 'list'] });
  }, [refetchStatus, queryClient]);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback(
    (message: WSMessage) => {
      const { type, payload } = message;

      switch (type) {
        case 'phase:execution:started':
          queryClient.invalidateQueries({ queryKey: ['phase-executor'] });
          break;

        case 'phase:execution:item:started':
          if (localExecution && payload?.data) {
            const data = payload.data as { itemId: string };
            setLocalExecution({
              ...localExecution,
              currentItemId: data.itemId,
            });
          }
          break;

        case 'phase:execution:item:step':
          if (localExecution && payload?.data) {
            const data = payload.data as { itemId: string; step: ItemExecutionStep };
            const updatedItems = localExecution.items.map((item) =>
              item.itemId === data.itemId ? { ...item, status: data.step } : item
            );
            setLocalExecution({
              ...localExecution,
              currentStep: data.step,
              items: updatedItems,
            });
          }
          break;

        case 'phase:execution:item:completed':
          if (localExecution && payload?.data) {
            const data = payload.data as { itemId: string };
            const updatedItems = localExecution.items.map((item) =>
              item.itemId === data.itemId
                ? { ...item, status: 'completed' as ItemExecutionStep }
                : item
            );
            const completed = updatedItems.filter(
              (i) => i.status === 'completed' || i.status === 'failed'
            ).length;
            setLocalExecution({
              ...localExecution,
              items: updatedItems,
              progress: Math.round((completed / updatedItems.length) * 100),
            });
          }
          queryClient.invalidateQueries({ queryKey: ['roadmap'] });
          break;

        case 'phase:execution:item:failed':
          if (localExecution && payload?.data) {
            const data = payload.data as { itemId: string; error: string };
            const updatedItems = localExecution.items.map((item) =>
              item.itemId === data.itemId
                ? { ...item, status: 'failed' as ItemExecutionStep, error: data.error }
                : item
            );
            setLocalExecution({
              ...localExecution,
              items: updatedItems,
            });
          }
          break;

        case 'phase:execution:paused':
          if (localExecution) {
            setLocalExecution({ ...localExecution, status: 'paused' });
          }
          break;

        case 'phase:execution:resumed':
          if (localExecution) {
            setLocalExecution({ ...localExecution, status: 'running' });
          }
          break;

        case 'phase:execution:completed':
          if (localExecution) {
            setLocalExecution({
              ...localExecution,
              status: 'completed',
              progress: 100,
            });
          }
          queryClient.invalidateQueries({ queryKey: ['phase-executor'] });
          queryClient.invalidateQueries({ queryKey: ['roadmap'] });
          break;

        case 'phase:execution:failed':
          if (localExecution && payload?.data) {
            const data = payload.data as { error: string };
            setLocalExecution({
              ...localExecution,
              status: 'failed',
              errorMessage: data.error,
            });
          }
          queryClient.invalidateQueries({ queryKey: ['phase-executor'] });
          break;

        case 'phase:execution:cancelled':
          setLocalExecution(null);
          queryClient.invalidateQueries({ queryKey: ['phase-executor'] });
          break;
      }
    },
    [localExecution, queryClient]
  );

  return {
    currentExecution: localExecution,
    isExecuting: localExecution?.status === 'running',
    executions: executionsData?.executions ?? [],
    isLoading: isStatusLoading || isExecutionsLoading,
    error: (statusError || executionsError) as Error | null,
    start,
    pause,
    resume,
    cancel,
    refresh,
    isStarting: startMutation.isPending,
    isPausing: pauseMutation.isPending,
    isResuming: resumeMutation.isPending,
    isCancelling: cancelMutation.isPending,
    handleWebSocketMessage,
  };
}

export default usePhaseExecutor;
