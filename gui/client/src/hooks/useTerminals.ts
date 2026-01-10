/**
 * useTerminals Hook
 *
 * State management for Agent Terminals including:
 * - Terminal list with pool statistics
 * - Spawn, pause, resume, kill operations
 * - Real-time updates via WebSocket
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type {
  AgentTerminal,
  TerminalContext,
  TerminalListResponse,
  SpawnTerminalRequest,
} from '../types/terminal';

// =============================================================================
// API Functions
// =============================================================================

async function fetchTerminals(): Promise<TerminalListResponse> {
  const res = await fetch('/api/terminals');
  if (!res.ok) throw new Error('Failed to fetch terminals');
  return res.json();
}

async function spawnTerminal(request: SpawnTerminalRequest): Promise<AgentTerminal> {
  const res = await fetch('/api/terminals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to spawn terminal');
  }
  return res.json();
}

async function killTerminal(terminalId: string): Promise<void> {
  const res = await fetch(`/api/terminals/${terminalId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to kill terminal');
}

async function pauseTerminal(terminalId: string): Promise<void> {
  const res = await fetch(`/api/terminals/${terminalId}/pause`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Failed to pause terminal');
}

async function resumeTerminal(terminalId: string): Promise<void> {
  const res = await fetch(`/api/terminals/${terminalId}/resume`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Failed to resume terminal');
}

async function injectContext(
  terminalId: string,
  context: TerminalContext,
  append = false
): Promise<void> {
  const res = await fetch(`/api/terminals/${terminalId}/inject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, append }),
  });
  if (!res.ok) throw new Error('Failed to inject context');
}

async function killAllTerminals(): Promise<{ count: number }> {
  const res = await fetch('/api/terminals', {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to kill all terminals');
  return res.json();
}

// =============================================================================
// Hook
// =============================================================================

export interface UseTerminalsReturn {
  /** List of terminals */
  terminals: AgentTerminal[];
  /** Pool statistics */
  stats: TerminalListResponse['stats'];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Spawn a new terminal */
  spawn: (request: SpawnTerminalRequest) => Promise<AgentTerminal>;
  /** Kill a terminal */
  kill: (terminalId: string) => Promise<void>;
  /** Pause a terminal */
  pause: (terminalId: string) => Promise<void>;
  /** Resume a terminal */
  resume: (terminalId: string) => Promise<void>;
  /** Inject context into a terminal */
  inject: (terminalId: string, context: TerminalContext, append?: boolean) => Promise<void>;
  /** Kill all terminals */
  killAll: () => Promise<{ count: number }>;
  /** Refresh terminals list */
  refresh: () => void;
  /** Is spawn in progress */
  isSpawning: boolean;
}

export function useTerminals(): UseTerminalsReturn {
  const queryClient = useQueryClient();

  // Query for terminal list
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['terminals'],
    queryFn: fetchTerminals,
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Spawn mutation
  const spawnMutation = useMutation({
    mutationFn: spawnTerminal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminals'] });
    },
  });

  // Kill mutation
  const killMutation = useMutation({
    mutationFn: killTerminal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminals'] });
    },
  });

  // Pause mutation
  const pauseMutation = useMutation({
    mutationFn: pauseTerminal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminals'] });
    },
  });

  // Resume mutation
  const resumeMutation = useMutation({
    mutationFn: resumeTerminal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminals'] });
    },
  });

  // Inject mutation
  const injectMutation = useMutation({
    mutationFn: ({ terminalId, context, append }: { terminalId: string; context: TerminalContext; append?: boolean }) =>
      injectContext(terminalId, context, append),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminals'] });
    },
  });

  // Kill all mutation
  const killAllMutation = useMutation({
    mutationFn: killAllTerminals,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminals'] });
    },
  });

  // Callbacks
  const spawn = useCallback(
    async (request: SpawnTerminalRequest) => {
      return spawnMutation.mutateAsync(request);
    },
    [spawnMutation]
  );

  const kill = useCallback(
    async (terminalId: string) => {
      return killMutation.mutateAsync(terminalId);
    },
    [killMutation]
  );

  const pause = useCallback(
    async (terminalId: string) => {
      return pauseMutation.mutateAsync(terminalId);
    },
    [pauseMutation]
  );

  const resume = useCallback(
    async (terminalId: string) => {
      return resumeMutation.mutateAsync(terminalId);
    },
    [resumeMutation]
  );

  const inject = useCallback(
    async (terminalId: string, context: TerminalContext, append = false) => {
      return injectMutation.mutateAsync({ terminalId, context, append });
    },
    [injectMutation]
  );

  const killAll = useCallback(async () => {
    return killAllMutation.mutateAsync();
  }, [killAllMutation]);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    terminals: data?.terminals ?? [],
    stats: data?.stats ?? {
      total: 0,
      running: 0,
      paused: 0,
      completed: 0,
      error: 0,
      maxConcurrent: 12,
    },
    isLoading,
    error: error as Error | null,
    spawn,
    kill,
    pause,
    resume,
    inject,
    killAll,
    refresh,
    isSpawning: spawnMutation.isPending,
  };
}
