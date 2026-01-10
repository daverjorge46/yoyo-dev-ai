/**
 * WorktreeCard Component
 *
 * Displays a Git worktree with status, branch info, and actions.
 */

import { useState } from 'react';
import {
  GitBranch,
  Folder,
  GitCommit,
  GitMerge,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { WorktreeInfo } from '../../hooks/useWorktrees';

// =============================================================================
// Types
// =============================================================================

export interface WorktreeCardProps {
  worktree: WorktreeInfo;
  onMerge: (specId: string) => Promise<void>;
  onDelete: (specId: string) => Promise<void>;
  isMerging?: boolean;
  isDeleting?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function WorktreeCard({
  worktree,
  onMerge,
  onDelete,
  isMerging = false,
  isDeleting = false,
}: WorktreeCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const statusConfig = {
    active: {
      icon: <Clock className="h-4 w-4" />,
      label: 'Active',
      colorClass: 'text-info dark:text-terminal-blue',
      bgClass: 'bg-info/10 dark:bg-terminal-blue/10',
    },
    completed: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: 'Completed',
      colorClass: 'text-success dark:text-terminal-green',
      bgClass: 'bg-success/10 dark:bg-terminal-green/10',
    },
    orphaned: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: 'Orphaned',
      colorClass: 'text-warning dark:text-terminal-yellow',
      bgClass: 'bg-warning/10 dark:bg-terminal-yellow/10',
    },
  };

  const status = statusConfig[worktree.status];
  const createdAt = new Date(worktree.createdAt);

  const handleMerge = async () => {
    await onMerge(worktree.specId);
  };

  const handleDelete = async () => {
    await onDelete(worktree.specId);
    setShowConfirmDelete(false);
  };

  return (
    <div className="terminal-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-brand dark:text-terminal-orange" />
          <h3 className="font-medium text-gray-900 dark:text-terminal-text truncate">
            {worktree.specId}
          </h3>
        </div>
        <span
          className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
            ${status.colorClass} ${status.bgClass}
          `}
        >
          {status.icon}
          {status.label}
        </span>
      </div>

      {/* Info */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600 dark:text-terminal-text-secondary">
          <Folder className="h-4 w-4 flex-shrink-0" />
          <span className="truncate font-mono text-xs">{worktree.path}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-terminal-text-secondary">
          <GitBranch className="h-4 w-4 flex-shrink-0" />
          <span className="truncate font-mono text-xs">{worktree.branch}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500 dark:text-terminal-text-muted">
            <GitCommit className="h-4 w-4" />
            <span>{worktree.commitCount} commits</span>
          </div>
          <span className="text-xs text-gray-400 dark:text-terminal-text-muted">
            Created {createdAt.toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-terminal-border">
        {!showConfirmDelete ? (
          <>
            <button
              onClick={handleMerge}
              disabled={isMerging || isDeleting}
              className="
                flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded
                text-sm font-medium
                bg-brand/10 dark:bg-terminal-green/10
                text-brand dark:text-terminal-green
                hover:bg-brand/20 dark:hover:bg-terminal-green/20
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              {isMerging ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GitMerge className="h-4 w-4" />
              )}
              {isMerging ? 'Merging...' : 'Merge'}
            </button>
            <button
              onClick={() => setShowConfirmDelete(true)}
              disabled={isMerging || isDeleting}
              className="
                p-1.5 rounded
                text-gray-500 dark:text-terminal-text-muted
                hover:bg-error/10 dark:hover:bg-terminal-red/10
                hover:text-error dark:hover:text-terminal-red
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
              title="Delete worktree"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-terminal-text-secondary">
              Delete worktree?
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setShowConfirmDelete(false)}
              disabled={isDeleting}
              className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-terminal-elevated"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="
                inline-flex items-center gap-1 px-2 py-1 text-sm rounded
                bg-error/10 dark:bg-terminal-red/10
                text-error dark:text-terminal-red
                hover:bg-error/20 dark:hover:bg-terminal-red/20
                disabled:opacity-50
              "
            >
              {isDeleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
