/**
 * WorktreeList Component
 *
 * Displays a list of Git worktrees with management actions.
 */

import { useState } from 'react';
import {
  GitBranch,
  RefreshCw,
  Trash2,
  Loader2,
  AlertCircle,
  FolderGit,
} from 'lucide-react';
import { useWorktrees, type MergeResult } from '../../hooks/useWorktrees';
import { WorktreeCard } from './WorktreeCard';

// =============================================================================
// Types
// =============================================================================

export interface WorktreeListProps {
  onMergeResult?: (result: MergeResult) => void;
}

// =============================================================================
// Component
// =============================================================================

export function WorktreeList({ onMergeResult }: WorktreeListProps) {
  const {
    worktrees,
    isLoading,
    isMerging,
    isDeleting,
    isCleaning,
    error,
    merge,
    delete: deleteWorktree,
    cleanup,
    refetch,
  } = useWorktrees();

  const [operatingSpecId, setOperatingSpecId] = useState<string | null>(null);

  const handleMerge = async (specId: string) => {
    setOperatingSpecId(specId);
    try {
      const result = await merge(specId);
      onMergeResult?.(result);
    } catch {
      // Error handled by mutation
    } finally {
      setOperatingSpecId(null);
    }
  };

  const handleDelete = async (specId: string) => {
    setOperatingSpecId(specId);
    try {
      await deleteWorktree(specId);
    } catch {
      // Error handled by mutation
    } finally {
      setOperatingSpecId(null);
    }
  };

  const handleCleanup = async () => {
    await cleanup();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-brand dark:text-terminal-orange" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-error dark:text-terminal-red">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="font-medium">Failed to load worktrees</p>
        <p className="text-sm text-gray-500 dark:text-terminal-text-muted">
          {error.message}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 terminal-btn-secondary"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderGit className="h-5 w-5 text-brand dark:text-terminal-orange" />
          <h2 className="text-lg font-medium text-gray-900 dark:text-terminal-text">
            Git Worktrees
          </h2>
          <span className="text-sm text-gray-500 dark:text-terminal-text-muted">
            ({worktrees.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCleanup}
            disabled={isCleaning || worktrees.length === 0}
            className="terminal-btn-ghost text-sm"
            title="Clean up orphaned worktrees"
          >
            {isCleaning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Cleanup
          </button>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="terminal-btn-ghost text-sm"
            title="Refresh worktrees"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {worktrees.length === 0 ? (
        <div className="terminal-card p-8 text-center">
          <GitBranch className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-terminal-text-muted" />
          <h3 className="font-medium text-gray-900 dark:text-terminal-text mb-1">
            No worktrees
          </h3>
          <p className="text-sm text-gray-500 dark:text-terminal-text-muted">
            Worktrees are created automatically when you spawn terminals for specs
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {worktrees.map((worktree) => (
            <WorktreeCard
              key={worktree.specId}
              worktree={worktree}
              onMerge={handleMerge}
              onDelete={handleDelete}
              isMerging={isMerging && operatingSpecId === worktree.specId}
              isDeleting={isDeleting && operatingSpecId === worktree.specId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
