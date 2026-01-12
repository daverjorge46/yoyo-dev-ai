/**
 * Phase Execution Dashboard Widget
 *
 * Shows current/recent phase executions with quick status and links.
 */

import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Pause,
  Clock,
  Circle,
} from 'lucide-react';
import { usePhaseExecutor } from '../../hooks/usePhaseExecutor';
import type { PhaseExecutionState } from '../../hooks/usePhaseExecutor';

// =============================================================================
// Status Badge
// =============================================================================

function StatusBadge({ status }: { status: PhaseExecutionState['status'] }) {
  const config = {
    pending: {
      icon: Clock,
      text: 'Pending',
      className: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    },
    running: {
      icon: Loader2,
      text: 'Running',
      className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      animate: true,
    },
    paused: {
      icon: Pause,
      text: 'Paused',
      className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    },
    completed: {
      icon: CheckCircle,
      text: 'Completed',
      className: 'bg-terminal-green/10 text-terminal-green',
    },
    failed: {
      icon: XCircle,
      text: 'Failed',
      className: 'bg-terminal-red/10 text-terminal-red',
    },
    cancelled: {
      icon: Circle,
      text: 'Cancelled',
      className: 'bg-gray-100 dark:bg-gray-700 text-gray-500',
    },
  };

  const c = config[status];
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${c.className}`}>
      <Icon className={`h-3 w-3 ${'animate' in c && c.animate ? 'animate-spin' : ''}`} />
      {c.text}
    </span>
  );
}

// =============================================================================
// Execution Row
// =============================================================================

function ExecutionRow({ execution }: { execution: PhaseExecutionState }) {
  const navigate = useNavigate();
  const completedItems = execution.items.filter((i) => i.status === 'completed').length;

  return (
    <button
      onClick={() => navigate('/roadmap')}
      className="w-full flex items-center gap-3 px-3 py-2 rounded bg-gray-50 dark:bg-terminal-elevated hover:bg-gray-100 dark:hover:bg-terminal-bg-hover transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-terminal-text truncate">
          {execution.phaseTitle}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <StatusBadge status={execution.status} />
          <span className="text-xs text-gray-500 dark:text-terminal-text-muted">
            {completedItems}/{execution.items.length} items
          </span>
        </div>
      </div>
      {execution.status === 'running' && (
        <div className="flex items-center gap-1">
          <div className="w-12 h-1.5 bg-gray-200 dark:bg-terminal-border rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all"
              style={{ width: `${execution.progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-terminal-text-muted">
            {execution.progress}%
          </span>
        </div>
      )}
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PhaseExecutionWidget() {
  const navigate = useNavigate();
  const { currentExecution, executions, isLoading, isExecuting } = usePhaseExecutor();

  // Get recent executions (excluding current if it exists)
  const recentExecutions = executions
    .filter((e) => e.id !== currentExecution?.id)
    .slice(0, 3);

  const hasActivity = currentExecution || recentExecutions.length > 0;

  return (
    <div className="terminal-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-brand dark:text-terminal-orange" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-terminal-text uppercase tracking-wide">
            Phase Execution
          </h3>
          {isExecuting && (
            <span className="w-2 h-2 rounded-full bg-terminal-green animate-pulse" />
          )}
        </div>
        <button
          onClick={() => navigate('/roadmap')}
          className="text-xs text-brand dark:text-terminal-orange hover:underline flex items-center gap-1"
        >
          View Roadmap <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-2">
        {isLoading && (
          <div className="text-center py-4">
            <div className="animate-pulse text-sm text-gray-500 dark:text-terminal-text-muted">
              Loading...
            </div>
          </div>
        )}

        {!isLoading && !hasActivity && (
          <div className="text-center py-4 bg-gray-50 dark:bg-terminal-elevated rounded">
            <p className="text-sm text-gray-500 dark:text-terminal-text-muted mb-2">
              No active phase executions
            </p>
            <button
              onClick={() => navigate('/roadmap')}
              className="text-xs text-brand dark:text-terminal-orange hover:underline"
            >
              Start from Roadmap
            </button>
          </div>
        )}

        {/* Current Execution */}
        {currentExecution && (
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-500 dark:text-terminal-text-muted mb-1 uppercase tracking-wide">
              Current
            </div>
            <ExecutionRow execution={currentExecution} />
          </div>
        )}

        {/* Recent Executions */}
        {recentExecutions.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-terminal-text-muted mb-1 uppercase tracking-wide">
              Recent
            </div>
            {recentExecutions.map((execution) => (
              <ExecutionRow key={execution.id} execution={execution} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PhaseExecutionWidget;
