/**
 * TerminalCard Component
 *
 * Displays a terminal session in a card format with:
 * - Status indicator (running/paused/completed/error)
 * - Progress bar
 * - Last output line preview
 * - Quick action buttons (pause/resume/kill/focus)
 */

import { Play, Pause, Square, Terminal, ExternalLink, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import type { AgentTerminal, TerminalStatus } from '../../types/terminal';
import { AGENT_TYPE_LABELS, AGENT_TYPE_COLORS } from '../../types/terminal';

// =============================================================================
// Status Helpers
// =============================================================================

const STATUS_CONFIG: Record<TerminalStatus, { icon: typeof Terminal; color: string; label: string }> = {
  idle: { icon: Clock, color: 'text-gray-400 dark:text-terminal-text-muted', label: 'Idle' },
  running: { icon: Loader2, color: 'text-blue-500 dark:text-terminal-cyan', label: 'Running' },
  paused: { icon: Pause, color: 'text-yellow-500 dark:text-terminal-yellow', label: 'Paused' },
  completed: { icon: CheckCircle, color: 'text-green-500 dark:text-terminal-green', label: 'Completed' },
  error: { icon: AlertCircle, color: 'text-red-500 dark:text-terminal-red', label: 'Error' },
  cancelled: { icon: Square, color: 'text-gray-500 dark:text-terminal-text-muted', label: 'Cancelled' },
};

// =============================================================================
// Component
// =============================================================================

export interface TerminalCardProps {
  terminal: AgentTerminal;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onKill: (id: string) => void;
  onFocus: (id: string) => void;
}

export function TerminalCard({ terminal, onPause, onResume, onKill, onFocus }: TerminalCardProps) {
  const statusConfig = STATUS_CONFIG[terminal.status];
  const StatusIcon = statusConfig.icon;
  const agentColor = AGENT_TYPE_COLORS[terminal.agentType];

  const isActive = terminal.status === 'running' || terminal.status === 'paused';
  const canPause = terminal.status === 'running';
  const canResume = terminal.status === 'paused';

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  return (
    <div
      className={`
        terminal-card p-4 rounded-lg
        hover:bg-gray-50 dark:hover:bg-terminal-bg-hover
        transition-colors cursor-pointer
        border-l-4
      `}
      style={{ borderLeftColor: `var(--terminal-${agentColor}, var(--brand))` }}
      onClick={() => onFocus(terminal.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onFocus(terminal.id);
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-gray-500 dark:text-terminal-text-muted" />
          <span className="font-medium text-gray-900 dark:text-terminal-text">
            {terminal.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusIcon
            className={`h-4 w-4 ${statusConfig.color} ${terminal.status === 'running' ? 'animate-spin' : ''}`}
          />
          <span className={`text-xs font-medium ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Agent Type Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: `var(--terminal-${agentColor}, var(--brand))`,
            color: 'white',
            opacity: 0.9,
          }}
        >
          {AGENT_TYPE_LABELS[terminal.agentType]}
        </span>
        {terminal.boundTaskId && (
          <span className="text-xs text-gray-500 dark:text-terminal-text-muted">
            Task: {terminal.boundTaskId.slice(0, 8)}...
          </span>
        )}
      </div>

      {/* Progress Bar (for running terminals) */}
      {isActive && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500 dark:text-terminal-text-muted">Progress</span>
            <span className="text-gray-700 dark:text-terminal-text">{terminal.progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-terminal-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 dark:bg-terminal-cyan transition-all duration-300"
              style={{ width: `${terminal.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Last Output Line */}
      {terminal.lastOutputLine && (
        <div className="mb-3">
          <p className="text-xs text-gray-600 dark:text-terminal-text-muted font-mono truncate">
            {terminal.lastOutputLine}
          </p>
        </div>
      )}

      {/* Error Message */}
      {terminal.errorMessage && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-terminal-red/10 rounded">
          <p className="text-xs text-red-600 dark:text-terminal-red truncate">
            {terminal.errorMessage}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-terminal-text-muted">
          {formatRelativeTime(terminal.lastActivityAt)}
        </span>

        {/* Action Buttons */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {canPause && (
            <button
              onClick={() => onPause(terminal.id)}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-terminal-bg-hover transition-colors"
              title="Pause"
            >
              <Pause className="h-3.5 w-3.5 text-yellow-500 dark:text-terminal-yellow" />
            </button>
          )}
          {canResume && (
            <button
              onClick={() => onResume(terminal.id)}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-terminal-bg-hover transition-colors"
              title="Resume"
            >
              <Play className="h-3.5 w-3.5 text-green-500 dark:text-terminal-green" />
            </button>
          )}
          {isActive && (
            <button
              onClick={() => onKill(terminal.id)}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-terminal-bg-hover transition-colors"
              title="Kill"
            >
              <Square className="h-3.5 w-3.5 text-red-500 dark:text-terminal-red" />
            </button>
          )}
          <button
            onClick={() => onFocus(terminal.id)}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-terminal-bg-hover transition-colors"
            title="View Details"
          >
            <ExternalLink className="h-3.5 w-3.5 text-gray-500 dark:text-terminal-text-muted" />
          </button>
        </div>
      </div>
    </div>
  );
}
