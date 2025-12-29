/**
 * AgentProgressDashboard Component
 *
 * Multi-agent overview with aggregate progress and individual cards.
 */

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { AgentProgressCard, type AgentProgress } from './AgentProgressCard';
import type { AgentStatus } from './AgentControls';

interface AggregateProgress {
  total: number;
  completed: number;
  running: number;
  failed: number;
  percentage: number;
}

interface AgentsResponse {
  agents: AgentProgress[];
  aggregate: AggregateProgress;
}

async function fetchAgentsProgress(): Promise<AgentsResponse> {
  const res = await fetch('/api/agents/progress');
  if (!res.ok) throw new Error('Failed to fetch agents progress');
  return res.json();
}

async function cancelAgent(agentId: string): Promise<void> {
  const res = await fetch(`/api/agents/${agentId}/cancel`, { method: 'POST' });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to cancel agent');
  }
}

async function removeAgent(agentId: string): Promise<void> {
  const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to remove agent');
  }
}

async function clearFinishedAgents(): Promise<void> {
  const res = await fetch('/api/agents/finished', { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear finished agents');
}

interface AgentProgressDashboardProps {
  showEmpty?: boolean;
  compact?: boolean;
  className?: string;
}

export function AgentProgressDashboard({
  showEmpty = true,
  compact = false,
  className = '',
}: AgentProgressDashboardProps) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<AgentStatus | 'all'>('all');

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['agents-progress'],
    queryFn: fetchAgentsProgress,
    refetchInterval: 2000, // Refresh every 2s when active
  });

  // WebSocket updates for real-time progress
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;

    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Handle agent events
          if (
            message.type === 'agent:started' ||
            message.type === 'agent:progress' ||
            message.type === 'agent:completed' ||
            message.type === 'agent:failed' ||
            message.type === 'agent:log'
          ) {
            queryClient.invalidateQueries({ queryKey: ['agents-progress'] });
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        // Reconnect after 3 seconds
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [queryClient]);

  const handleCancel = useCallback(
    async (agentId: string) => {
      await cancelAgent(agentId);
      queryClient.invalidateQueries({ queryKey: ['agents-progress'] });
    },
    [queryClient]
  );

  const handleRemove = useCallback(
    async (agentId: string) => {
      await removeAgent(agentId);
      queryClient.invalidateQueries({ queryKey: ['agents-progress'] });
    },
    [queryClient]
  );

  const handleClearFinished = useCallback(async () => {
    await clearFinishedAgents();
    queryClient.invalidateQueries({ queryKey: ['agents-progress'] });
  }, [queryClient]);

  const agents = data?.agents ?? [];
  const aggregate = data?.aggregate ?? { total: 0, completed: 0, running: 0, failed: 0, percentage: 0 };

  const filteredAgents = filter === 'all'
    ? agents
    : agents.filter((a) => a.status === filter);

  const hasFinishedAgents = agents.some(
    (a) => a.status === 'completed' || a.status === 'failed' || a.status === 'cancelled'
  );

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading agents...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-500">
          <XCircle className="h-4 w-4" />
          <span className="text-sm">Failed to load agents</span>
        </div>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm text-blue-500 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!showEmpty && agents.length === 0) {
    return null;
  }

  if (agents.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-3">
          <Bot className="h-4 w-4" />
          <span className="text-sm font-medium">Agent Progress</span>
        </div>
        <div className="text-center py-4">
          <Bot className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No active agents</p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Bot className="h-4 w-4" />
            <span className="text-sm font-medium">Agent Progress</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-blue-500">
              <Loader2 className="h-3 w-3" />
              {aggregate.running}
            </span>
            <span className="flex items-center gap-1 text-green-500">
              <CheckCircle className="h-3 w-3" />
              {aggregate.completed}
            </span>
            {aggregate.failed > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <XCircle className="h-3 w-3" />
                {aggregate.failed}
              </span>
            )}
          </div>
        </div>

        {/* Aggregate progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>{aggregate.total} agents</span>
            <span>{aggregate.percentage}% overall</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${aggregate.percentage}%` }}
              role="progressbar"
              aria-valuenow={aggregate.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Compact agent list */}
        <div className="space-y-2">
          {agents.slice(0, 3).map((agent) => (
            <div
              key={agent.id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-700 dark:text-gray-300 truncate">
                  {agent.type}
                </span>
                {agent.status === 'running' && (
                  <Loader2 className="h-3 w-3 text-blue-500 animate-spin shrink-0" />
                )}
                {agent.status === 'completed' && (
                  <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                )}
                {agent.status === 'failed' && (
                  <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                )}
              </div>
              <span className="text-xs text-gray-500">{agent.progress}%</span>
            </div>
          ))}
          {agents.length > 3 && (
            <p className="text-xs text-gray-400 text-center">
              +{agents.length - 3} more agents
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with aggregate stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <h2 className="font-medium text-gray-900 dark:text-white">
              Agent Progress
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Refresh"
              aria-label="Refresh agent progress"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            {hasFinishedAgents && (
              <button
                onClick={handleClearFinished}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
                title="Clear finished agents"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear finished</span>
              </button>
            )}
          </div>
        </div>

        {/* Aggregate stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
            <div className="font-medium text-gray-900 dark:text-white">
              {aggregate.total}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
          </div>
          <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
            <div className="font-medium text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1">
              {aggregate.running > 0 && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {aggregate.running}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Running</div>
          </div>
          <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
            <div className="font-medium text-green-600 dark:text-green-400">
              {aggregate.completed}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Done</div>
          </div>
          <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
            <div className="font-medium text-red-600 dark:text-red-400">
              {aggregate.failed}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Failed</div>
          </div>
        </div>

        {/* Aggregate progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Overall Progress</span>
            <span>{aggregate.percentage}%</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${aggregate.percentage}%` }}
              role="progressbar"
              aria-valuenow={aggregate.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Overall agent progress"
            />
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {(['all', 'running', 'completed', 'failed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
              filter === status
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-1.5 text-xs">
                ({agents.filter((a) => a.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Agent cards */}
      <div className="space-y-3">
        {filteredAgents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No {filter === 'all' ? '' : filter} agents</p>
          </div>
        ) : (
          filteredAgents.map((agent) => (
            <AgentProgressCard
              key={agent.id}
              agent={agent}
              onCancel={handleCancel}
              onRemove={handleRemove}
              defaultExpanded={agent.status === 'running'}
            />
          ))
        )}
      </div>
    </div>
  );
}
