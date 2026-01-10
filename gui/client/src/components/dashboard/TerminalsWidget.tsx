/**
 * Terminals Dashboard Widget
 *
 * Shows active terminals summary with quick links to the Terminals page.
 */

import { useNavigate } from 'react-router-dom';
import { Terminal, Play, Pause, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { useTerminals } from '../../hooks/useTerminals';

// =============================================================================
// Status Icon Component
// =============================================================================

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return <Play className="h-3 w-3 text-terminal-green fill-terminal-green" />;
    case 'paused':
      return <Pause className="h-3 w-3 text-terminal-yellow fill-terminal-yellow" />;
    case 'completed':
      return <CheckCircle className="h-3 w-3 text-terminal-green" />;
    case 'error':
    case 'cancelled':
      return <XCircle className="h-3 w-3 text-terminal-red" />;
    default:
      return <Terminal className="h-3 w-3 text-terminal-text-muted" />;
  }
}

// =============================================================================
// Main Component
// =============================================================================

export function TerminalsWidget() {
  const navigate = useNavigate();
  const { terminals, stats, isLoading } = useTerminals();

  // Show only running and paused terminals (active ones)
  const activeTerminals = terminals
    ?.filter((t) => t.status === 'running' || t.status === 'paused')
    .slice(0, 4);

  return (
    <div className="terminal-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-brand dark:text-terminal-orange" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-terminal-text uppercase tracking-wide">
            Active Terminals
          </h3>
        </div>
        <button
          onClick={() => navigate('/terminals')}
          className="text-xs text-brand dark:text-terminal-orange hover:underline flex items-center gap-1"
        >
          View all <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Stats Summary */}
      <div className="flex gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-terminal-green animate-pulse" />
          <span className="text-gray-600 dark:text-terminal-text-secondary">
            <span className="font-semibold text-terminal-green">{stats?.running ?? 0}</span> running
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-terminal-yellow" />
          <span className="text-gray-600 dark:text-terminal-text-secondary">
            <span className="font-semibold text-terminal-yellow">{stats?.paused ?? 0}</span> paused
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 dark:text-terminal-text-muted">
            {stats?.total ?? 0}/{stats?.maxConcurrent ?? 12} slots
          </span>
        </div>
      </div>

      {/* Terminal List */}
      <div className="space-y-2">
        {isLoading && (
          <div className="text-center py-4">
            <div className="animate-pulse text-sm text-gray-500 dark:text-terminal-text-muted">
              Loading...
            </div>
          </div>
        )}

        {!isLoading && (!activeTerminals || activeTerminals.length === 0) && (
          <div className="text-center py-4 bg-gray-50 dark:bg-terminal-elevated rounded">
            <p className="text-sm text-gray-500 dark:text-terminal-text-muted mb-2">
              No active terminals
            </p>
            <button
              onClick={() => navigate('/terminals')}
              className="text-xs text-brand dark:text-terminal-orange hover:underline"
            >
              Spawn a terminal
            </button>
          </div>
        )}

        {activeTerminals?.map((terminal) => (
          <button
            key={terminal.id}
            onClick={() => navigate('/terminals')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded bg-gray-50 dark:bg-terminal-elevated hover:bg-gray-100 dark:hover:bg-terminal-bg-hover transition-colors text-left"
          >
            <StatusIcon status={terminal.status} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-terminal-text truncate">
                {terminal.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-terminal-text-muted truncate">
                {terminal.agentType} {terminal.lastOutputLine && `- ${terminal.lastOutputLine}`}
              </div>
            </div>
            {terminal.progress > 0 && terminal.progress < 100 && (
              <div className="flex items-center gap-1">
                <div className="w-12 h-1.5 bg-gray-200 dark:bg-terminal-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-terminal-green rounded-full transition-all"
                    style={{ width: `${terminal.progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-terminal-text-muted">
                  {terminal.progress}%
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
