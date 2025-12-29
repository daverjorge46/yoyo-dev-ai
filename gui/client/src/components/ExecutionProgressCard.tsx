/**
 * ExecutionProgressCard Component
 *
 * Displays current task execution progress with animated ring.
 * Integrates with parallel agent progress tracking.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, Pause, CheckCircle, ChevronDown, ChevronUp, Bot } from 'lucide-react';
import { AgentProgressDashboard } from './agents';

interface ExecutionProgress {
  isRunning: boolean;
  specOrFixName: string | null;
  type: 'spec' | 'fix' | null;
  currentPhase: string | null;
  currentParentTask: string | null;
  currentSubtask: string | null;
  totalParentTasks: number;
  completedParentTasks: number;
  totalSubtasks: number;
  completedSubtasks: number;
  percentage: number;
  currentAction: string | null;
  startedAt: string | null;
  lastUpdated: string | null;
}

async function fetchExecution(): Promise<ExecutionProgress> {
  const res = await fetch('/api/execution');
  if (!res.ok) throw new Error('Failed to fetch execution');
  return res.json();
}

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

function ProgressRing({ percentage, size = 80, strokeWidth = 6 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-indigo-500 transition-all duration-500 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}

export function ExecutionProgressCard() {
  const [showAgents, setShowAgents] = useState(false);

  const { data: execution, isLoading } = useQuery({
    queryKey: ['execution'],
    queryFn: fetchExecution,
    refetchInterval: 3000, // Refresh every 3s when running
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-3" />
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  if (!execution?.isRunning) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-3">
          <Pause className="h-4 w-4" />
          <span className="text-sm font-medium">Execution Status</span>
        </div>
        <div className="flex items-center justify-center py-4">
          <div className="text-center">
            <CheckCircle className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No active execution</p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = execution.specOrFixName?.replace(/^\d{4}-\d{2}-\d{2}-/, '') || 'Unknown';

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Play className="h-4 w-4 text-green-500" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Executing
            </span>
          </div>
          <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
            {execution.type === 'fix' ? 'Fix' : 'Spec'}
          </span>
        </div>

        {/* Progress Ring and Details */}
        <div className="flex items-start gap-4">
          <ProgressRing percentage={execution.percentage} />

          <div className="flex-1 min-w-0">
            {/* Name */}
            <h4 className="font-medium text-gray-900 dark:text-white truncate">
              {displayName}
            </h4>

            {/* Phase */}
            {execution.currentPhase && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Phase: {execution.currentPhase}
              </p>
            )}

            {/* Current Task */}
            {execution.currentParentTask && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 truncate">
                {execution.currentParentTask}
              </p>
            )}

            {/* Current Subtask */}
            {execution.currentSubtask && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {execution.currentSubtask}
              </p>
            )}
          </div>
        </div>

        {/* Task Counts */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-2 text-xs">
          <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded">
            <div className="font-medium text-gray-900 dark:text-white">
              {execution.completedParentTasks}/{execution.totalParentTasks}
            </div>
            <div className="text-gray-500 dark:text-gray-400">Tasks</div>
          </div>
          <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded">
            <div className="font-medium text-gray-900 dark:text-white">
              {execution.completedSubtasks}/{execution.totalSubtasks}
            </div>
            <div className="text-gray-500 dark:text-gray-400">Subtasks</div>
          </div>
        </div>

        {/* Toggle Agents View */}
        <button
          onClick={() => setShowAgents(!showAgents)}
          className="w-full mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          aria-expanded={showAgents}
          aria-label={showAgents ? 'Hide agent progress' : 'Show agent progress'}
        >
          <Bot className="h-3.5 w-3.5" />
          <span>{showAgents ? 'Hide' : 'Show'} Agent Progress</span>
          {showAgents ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Agent Progress Dashboard */}
      {showAgents && (
        <AgentProgressDashboard showEmpty={false} />
      )}
    </div>
  );
}
