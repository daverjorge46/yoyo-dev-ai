/**
 * useQA Hook
 *
 * Manages QA sessions for the review pipeline.
 * Provides operations for starting reviews, tracking issues, and fixing.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  QASession,
  QASessionListResponse,
  QAStats,
  StartQARequest,
  IssueStatus,
} from '../types/qa';

// =============================================================================
// API Functions
// =============================================================================

const API_BASE = '/api/qa';

async function fetchQASessions(): Promise<QASessionListResponse> {
  const response = await fetch(API_BASE);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch QA sessions' }));
    throw new Error(error.error || 'Failed to fetch QA sessions');
  }
  return response.json();
}

async function fetchQASession(sessionId: string): Promise<QASession> {
  const response = await fetch(`${API_BASE}/${sessionId}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Session not found' }));
    throw new Error(error.error || 'Session not found');
  }
  return response.json();
}

async function startQAReview(request: StartQARequest): Promise<QASession> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to start QA review' }));
    throw new Error(error.error || 'Failed to start QA review');
  }
  return response.json();
}

async function startFixing(sessionId: string): Promise<QASession> {
  const response = await fetch(`${API_BASE}/${sessionId}/fix`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to start fixing' }));
    throw new Error(error.error || 'Failed to start fixing');
  }
  return response.json();
}

async function updateIssueStatus(
  sessionId: string,
  issueId: string,
  status: IssueStatus
): Promise<QASession> {
  const response = await fetch(`${API_BASE}/${sessionId}/issues/${issueId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update issue' }));
    throw new Error(error.error || 'Failed to update issue');
  }
  return response.json();
}

async function cancelQASession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${sessionId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to cancel session' }));
    throw new Error(error.error || 'Failed to cancel session');
  }
}

// =============================================================================
// Query Keys
// =============================================================================

export const qaKeys = {
  all: ['qa'] as const,
  list: () => [...qaKeys.all, 'list'] as const,
  detail: (sessionId: string) => [...qaKeys.all, 'detail', sessionId] as const,
};

// =============================================================================
// Hook
// =============================================================================

export interface UseQAReturn {
  /** List of QA sessions */
  sessions: QASession[];
  /** QA stats */
  stats: QAStats;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Start a new QA review */
  startReview: (request: StartQARequest) => Promise<QASession>;
  /** Start fixing issues in a session */
  startFix: (sessionId: string) => Promise<QASession>;
  /** Update issue status */
  updateIssue: (sessionId: string, issueId: string, status: IssueStatus) => Promise<QASession>;
  /** Cancel a QA session */
  cancel: (sessionId: string) => Promise<void>;
  /** Refresh sessions */
  refresh: () => void;
  /** Is review starting */
  isStarting: boolean;
  /** Is fixing in progress */
  isFixing: boolean;
}

const DEFAULT_STATS: QAStats = {
  totalSessions: 0,
  pendingSessions: 0,
  activeSessions: 0,
  completedSessions: 0,
  failedSessions: 0,
  totalIssues: 0,
  openIssues: 0,
  fixedIssues: 0,
  issuesBySeverity: {
    critical: 0,
    major: 0,
    minor: 0,
    suggestion: 0,
  },
};

export function useQA(): UseQAReturn {
  const queryClient = useQueryClient();

  // Fetch sessions
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: qaKeys.list(),
    queryFn: fetchQASessions,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Start review mutation
  const startReviewMutation = useMutation({
    mutationFn: startQAReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qaKeys.all });
    },
  });

  // Start fix mutation
  const startFixMutation = useMutation({
    mutationFn: startFixing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qaKeys.all });
    },
  });

  // Update issue mutation
  const updateIssueMutation = useMutation({
    mutationFn: ({ sessionId, issueId, status }: { sessionId: string; issueId: string; status: IssueStatus }) =>
      updateIssueStatus(sessionId, issueId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qaKeys.all });
    },
  });

  // Cancel session mutation
  const cancelMutation = useMutation({
    mutationFn: cancelQASession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qaKeys.all });
    },
  });

  return {
    sessions: data?.sessions ?? [],
    stats: data?.stats ?? DEFAULT_STATS,
    isLoading,
    error: error as Error | null,
    startReview: startReviewMutation.mutateAsync,
    startFix: startFixMutation.mutateAsync,
    updateIssue: (sessionId, issueId, status) =>
      updateIssueMutation.mutateAsync({ sessionId, issueId, status }),
    cancel: cancelMutation.mutateAsync,
    refresh: () => refetch(),
    isStarting: startReviewMutation.isPending,
    isFixing: startFixMutation.isPending,
  };
}

// =============================================================================
// Single Session Hook
// =============================================================================

export function useQASession(sessionId: string | null) {
  return useQuery({
    queryKey: qaKeys.detail(sessionId ?? ''),
    queryFn: () => fetchQASession(sessionId!),
    enabled: !!sessionId,
    refetchInterval: 3000,
  });
}
