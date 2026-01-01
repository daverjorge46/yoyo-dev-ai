/**
 * GitStatusCard Component
 *
 * Terminal-styled display of git repository status.
 */

import { useQuery } from '@tanstack/react-query';
import {
  GitBranch,
  GitCommit,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  CheckCircle,
  Circle,
} from 'lucide-react';

interface GitStatus {
  isRepo: boolean;
  branch: string | null;
  clean: boolean;
  uncommitted: number;
  staged: number;
  untracked: number;
  conflicts: number;
  ahead: number;
  behind: number;
  remoteUrl: string | null;
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    date: string;
  } | null;
}

async function fetchGitStatus(): Promise<GitStatus> {
  const res = await fetch('/api/git');
  if (!res.ok) throw new Error('Failed to fetch git status');
  return res.json();
}

export function GitStatusCard() {
  const { data: git, isLoading, error } = useQuery({
    queryKey: ['git'],
    queryFn: fetchGitStatus,
    refetchInterval: 30000, // Refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="terminal-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-4 bg-gray-200 dark:bg-terminal-elevated rounded animate-pulse" />
          <div className="h-4 w-20 bg-gray-200 dark:bg-terminal-elevated rounded animate-pulse" />
        </div>
        <div className="h-8 bg-gray-200 dark:bg-terminal-elevated rounded animate-pulse" />
      </div>
    );
  }

  if (error || !git) {
    return (
      <div className="terminal-card p-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-terminal-text-muted">
          <GitBranch className="h-4 w-4" />
          <span className="text-sm font-medium uppercase tracking-wide">Git Status</span>
        </div>
        <p className="text-sm text-error dark:text-terminal-red mt-2">Failed to load</p>
      </div>
    );
  }

  if (!git.isRepo) {
    return (
      <div className="terminal-card p-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-terminal-text-muted">
          <GitBranch className="h-4 w-4" />
          <span className="text-sm font-medium uppercase tracking-wide">Git Status</span>
        </div>
        <p className="text-sm text-gray-400 dark:text-terminal-text-muted mt-2">Not a git repository</p>
      </div>
    );
  }

  return (
    <div className="terminal-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-brand dark:text-terminal-orange" />
          <span className="text-sm font-semibold text-gray-900 dark:text-terminal-text uppercase tracking-wide">
            Git Status
          </span>
        </div>
        {git.clean ? (
          <span className="flex items-center gap-1.5 text-xs text-success dark:text-terminal-green font-medium">
            <Circle className="h-2 w-2 fill-current" />
            Clean
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-warning-dark dark:text-terminal-yellow font-medium">
            <AlertCircle className="h-3 w-3" />
            {git.uncommitted} changes
          </span>
        )}
      </div>

      {/* Branch */}
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2.5 py-1 bg-brand/10 dark:bg-terminal-orange/10 text-brand dark:text-terminal-orange rounded-md text-sm font-mono font-medium">
          {git.branch}
        </span>

        {/* Ahead/Behind */}
        {(git.ahead > 0 || git.behind > 0) && (
          <div className="flex items-center gap-2 text-xs">
            {git.ahead > 0 && (
              <span className="flex items-center gap-0.5 text-success dark:text-terminal-green">
                <ArrowUp className="h-3 w-3" />
                {git.ahead}
              </span>
            )}
            {git.behind > 0 && (
              <span className="flex items-center gap-0.5 text-warning-dark dark:text-terminal-yellow">
                <ArrowDown className="h-3 w-3" />
                {git.behind}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs mb-4">
        <div className="text-center py-2 px-2 bg-gray-50 dark:bg-terminal-elevated rounded">
          <div className={`font-bold text-lg ${git.staged > 0 ? 'text-terminal-green' : 'text-gray-900 dark:text-terminal-text'}`}>
            {git.staged}
          </div>
          <div className="text-gray-500 dark:text-terminal-text-muted">Staged</div>
        </div>
        <div className="text-center py-2 px-2 bg-gray-50 dark:bg-terminal-elevated rounded">
          <div className={`font-bold text-lg ${git.untracked > 0 ? 'text-terminal-blue' : 'text-gray-900 dark:text-terminal-text'}`}>
            {git.untracked}
          </div>
          <div className="text-gray-500 dark:text-terminal-text-muted">Untracked</div>
        </div>
        <div className="text-center py-2 px-2 bg-gray-50 dark:bg-terminal-elevated rounded">
          <div className={`font-bold text-lg ${git.conflicts > 0 ? 'text-terminal-red' : 'text-gray-900 dark:text-terminal-text'}`}>
            {git.conflicts}
          </div>
          <div className="text-gray-500 dark:text-terminal-text-muted">Conflicts</div>
        </div>
      </div>

      {/* Last Commit */}
      {git.lastCommit && (
        <div className="text-xs border-t border-gray-100 dark:border-terminal-border pt-3">
          <div className="flex items-center gap-2 text-gray-500 dark:text-terminal-text-muted">
            <GitCommit className="h-3 w-3" />
            <span className="font-mono text-gray-700 dark:text-terminal-text-secondary">
              {git.lastCommit.hash}
            </span>
          </div>
          <p className="mt-1 text-gray-600 dark:text-terminal-text-secondary truncate">
            {git.lastCommit.message}
          </p>
        </div>
      )}
    </div>
  );
}
