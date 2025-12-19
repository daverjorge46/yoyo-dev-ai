/**
 * GitStatusCard Component
 *
 * Displays git repository status.
 */

import { useQuery } from '@tanstack/react-query';
import { GitBranch, GitCommit, ArrowUp, ArrowDown, AlertCircle, CheckCircle } from 'lucide-react';

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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32" />
      </div>
    );
  }

  if (error || !git) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <GitBranch className="h-4 w-4" />
          <span className="text-sm font-medium">Git Status</span>
        </div>
        <p className="text-sm text-red-500 mt-2">Failed to load</p>
      </div>
    );
  }

  if (!git.isRepo) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <GitBranch className="h-4 w-4" />
          <span className="text-sm font-medium">Git Status</span>
        </div>
        <p className="text-sm text-gray-400 mt-2">Not a git repository</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <GitBranch className="h-4 w-4" />
          <span className="text-sm font-medium">Git Status</span>
        </div>
        {git.clean ? (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            Clean
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="h-3 w-3" />
            {git.uncommitted} changes
          </span>
        )}
      </div>

      {/* Branch */}
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-sm font-mono">
          {git.branch}
        </span>

        {/* Ahead/Behind */}
        {(git.ahead > 0 || git.behind > 0) && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {git.ahead > 0 && (
              <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
                <ArrowUp className="h-3 w-3" />
                {git.ahead}
              </span>
            )}
            {git.behind > 0 && (
              <span className="flex items-center gap-0.5 text-orange-600 dark:text-orange-400">
                <ArrowDown className="h-3 w-3" />
                {git.behind}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded">
          <div className="font-medium text-gray-900 dark:text-white">{git.staged}</div>
          <div className="text-gray-500 dark:text-gray-400">Staged</div>
        </div>
        <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded">
          <div className="font-medium text-gray-900 dark:text-white">{git.untracked}</div>
          <div className="text-gray-500 dark:text-gray-400">Untracked</div>
        </div>
        <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded">
          <div className="font-medium text-gray-900 dark:text-white">{git.conflicts}</div>
          <div className="text-gray-500 dark:text-gray-400">Conflicts</div>
        </div>
      </div>

      {/* Last Commit */}
      {git.lastCommit && (
        <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2">
          <div className="flex items-center gap-1.5">
            <GitCommit className="h-3 w-3" />
            <span className="font-mono text-gray-600 dark:text-gray-300">{git.lastCommit.hash}</span>
            <span className="truncate">{git.lastCommit.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
