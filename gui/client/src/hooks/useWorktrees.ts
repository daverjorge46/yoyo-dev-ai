/**
 * useWorktrees Hook
 *
 * Manages Git worktrees for isolated spec execution.
 * Provides CRUD operations and status tracking via React Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// Types
// =============================================================================

export interface WorktreeInfo {
  specId: string;
  path: string;
  branch: string;
  createdAt: string;
  commitCount: number;
  status: 'active' | 'completed' | 'orphaned';
  headCommit?: string;
}

export interface MergeResult {
  success: boolean;
  conflicts?: boolean;
  conflictFiles?: string[];
  message: string;
}

interface WorktreesResponse {
  worktrees: WorktreeInfo[];
  count: number;
}

interface CreateWorktreeResponse extends WorktreeInfo {}

interface MergeWorktreeResponse extends MergeResult {}

interface CleanupResponse {
  success: boolean;
  cleaned: number;
  message: string;
}

// =============================================================================
// API Functions
// =============================================================================

const API_BASE = '/api/worktrees';

async function fetchWorktrees(): Promise<WorktreesResponse> {
  const response = await fetch(API_BASE);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch worktrees' }));
    throw new Error(error.error || 'Failed to fetch worktrees');
  }
  return response.json();
}

async function fetchWorktreeStatus(specId: string): Promise<WorktreeInfo> {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(specId)}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Worktree not found' }));
    throw new Error(error.error || 'Worktree not found');
  }
  return response.json();
}

async function createWorktree(specId: string): Promise<CreateWorktreeResponse> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ specId }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create worktree' }));
    throw new Error(error.error || 'Failed to create worktree');
  }
  return response.json();
}

async function deleteWorktree(specId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(specId)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete worktree' }));
    throw new Error(error.error || 'Failed to delete worktree');
  }
}

async function mergeWorktree(specId: string, targetBranch?: string): Promise<MergeWorktreeResponse> {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(specId)}/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetBranch }),
  });
  // Don't throw on 409 (conflicts) - we want to return the conflict info
  if (!response.ok && response.status !== 409) {
    const error = await response.json().catch(() => ({ error: 'Failed to merge worktree' }));
    throw new Error(error.error || 'Failed to merge worktree');
  }
  return response.json();
}

async function cleanupWorktrees(): Promise<CleanupResponse> {
  const response = await fetch(`${API_BASE}/cleanup`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to cleanup worktrees' }));
    throw new Error(error.error || 'Failed to cleanup worktrees');
  }
  return response.json();
}

// =============================================================================
// Query Keys
// =============================================================================

export const worktreeKeys = {
  all: ['worktrees'] as const,
  list: () => [...worktreeKeys.all, 'list'] as const,
  detail: (specId: string) => [...worktreeKeys.all, 'detail', specId] as const,
};

// =============================================================================
// Hook
// =============================================================================

export function useWorktrees() {
  const queryClient = useQueryClient();

  // Fetch all worktrees
  const {
    data: worktreesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: worktreeKeys.list(),
    queryFn: fetchWorktrees,
    staleTime: 30_000, // 30 seconds
  });

  // Create worktree mutation
  const createMutation = useMutation({
    mutationFn: createWorktree,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: worktreeKeys.all });
    },
  });

  // Delete worktree mutation
  const deleteMutation = useMutation({
    mutationFn: deleteWorktree,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: worktreeKeys.all });
    },
  });

  // Merge worktree mutation
  const mergeMutation = useMutation({
    mutationFn: ({ specId, targetBranch }: { specId: string; targetBranch?: string }) =>
      mergeWorktree(specId, targetBranch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: worktreeKeys.all });
    },
  });

  // Cleanup worktrees mutation
  const cleanupMutation = useMutation({
    mutationFn: cleanupWorktrees,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: worktreeKeys.all });
    },
  });

  return {
    // Data
    worktrees: worktreesData?.worktrees ?? [],
    count: worktreesData?.count ?? 0,

    // Loading states
    isLoading,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMerging: mergeMutation.isPending,
    isCleaning: cleanupMutation.isPending,

    // Error states
    error: error as Error | null,
    createError: createMutation.error as Error | null,
    deleteError: deleteMutation.error as Error | null,
    mergeError: mergeMutation.error as Error | null,

    // Actions
    create: createMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    merge: (specId: string, targetBranch?: string) =>
      mergeMutation.mutateAsync({ specId, targetBranch }),
    cleanup: cleanupMutation.mutateAsync,
    refetch,

    // Get worktree by specId
    getWorktree: (specId: string) =>
      worktreesData?.worktrees.find((w) => w.specId === specId),

    // Check if worktree exists
    hasWorktree: (specId: string) =>
      worktreesData?.worktrees.some((w) => w.specId === specId) ?? false,
  };
}

// =============================================================================
// Status Hook for Single Worktree
// =============================================================================

export function useWorktreeStatus(specId: string | null) {
  return useQuery({
    queryKey: worktreeKeys.detail(specId ?? ''),
    queryFn: () => fetchWorktreeStatus(specId!),
    enabled: !!specId,
    staleTime: 10_000, // 10 seconds
  });
}
