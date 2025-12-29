/**
 * AgentProgressCard Component
 *
 * Individual agent progress card with status, logs, and controls.
 */

import { useState } from 'react';
import {
  Bot,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AgentLogStream, type AgentLog } from './AgentLogStream';
import { AgentControls, type AgentStatus } from './AgentControls';

export interface AgentProgress {
  id: string;
  type: string;
  status: AgentStatus;
  currentTask: string | null;
  startTime: number | null;
  endTime: number | null;
  progress: number;
  logs: AgentLog[];
  error: string | null;
  specId: string | null;
  taskGroupId: string | null;
  duration?: number | null;
}

interface AgentProgressCardProps {
  agent: AgentProgress;
  onCancel?: (agentId: string) => Promise<void>;
  onRemove?: (agentId: string) => Promise<void>;
  defaultExpanded?: boolean;
  className?: string;
}

const statusConfig: Record<
  AgentStatus,
  { icon: typeof CheckCircle; color: string; bgColor: string; label: string }
> = {
  waiting: {
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    label: 'Waiting',
  },
  running: {
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Running',
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    label: 'Completed',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    label: 'Failed',
  },
  cancelled: {
    icon: AlertCircle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    label: 'Cancelled',
  },
};

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '--';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export function AgentProgressCard({
  agent,
  onCancel,
  onRemove,
  defaultExpanded = false,
  className = '',
}: AgentProgressCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [logsExpanded, setLogsExpanded] = useState(false);

  const config = statusConfig[agent.status];
  const StatusIcon = config.icon;
  const isRunning = agent.status === 'running';

  // Calculate duration
  const duration = agent.duration ?? (
    agent.startTime
      ? (agent.endTime ?? Date.now()) - agent.startTime
      : null
  );

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${className}`}
      role="article"
      aria-label={`Agent ${agent.type} - ${config.label}`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Agent info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              <Bot className={`h-5 w-5 ${config.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                  {agent.type}
                </h3>
                <span
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.bgColor} ${config.color}`}
                >
                  <StatusIcon
                    className={`h-3 w-3 ${isRunning ? 'animate-spin' : ''}`}
                  />
                  {config.label}
                </span>
              </div>

              {agent.currentTask && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {agent.currentTask}
                </p>
              )}

              {agent.error && (
                <p className="text-sm text-red-500 mt-1 truncate" title={agent.error}>
                  {agent.error}
                </p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <AgentControls
              agentId={agent.id}
              status={agent.status}
              onCancel={onCancel}
              onRemove={onRemove}
              compact
            />
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              {expanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>{agent.progress}% complete</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(duration)}
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                agent.status === 'failed'
                  ? 'bg-red-500'
                  : agent.status === 'cancelled'
                  ? 'bg-yellow-500'
                  : agent.status === 'completed'
                  ? 'bg-green-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${agent.progress}%` }}
              role="progressbar"
              aria-valuenow={agent.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-4">
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-4">
            <div>
              <span className="text-gray-500 dark:text-gray-400">ID:</span>
              <span className="ml-2 font-mono text-gray-700 dark:text-gray-300">
                {agent.id.slice(0, 16)}...
              </span>
            </div>
            {agent.specId && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Spec:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {agent.specId}
                </span>
              </div>
            )}
            {agent.taskGroupId && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Task Group:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {agent.taskGroupId}
                </span>
              </div>
            )}
            {agent.startTime && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Started:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {new Date(agent.startTime).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {/* Logs */}
          <AgentLogStream
            logs={agent.logs}
            expanded={logsExpanded}
            onToggleExpand={() => setLogsExpanded(!logsExpanded)}
          />
        </div>
      )}
    </div>
  );
}
