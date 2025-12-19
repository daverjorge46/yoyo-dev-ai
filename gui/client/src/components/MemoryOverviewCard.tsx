/**
 * MemoryOverviewCard Component
 *
 * Displays memory system overview with block type breakdown.
 */

import { useQuery } from '@tanstack/react-query';
import { Brain, User, Settings, AlertCircle, Database } from 'lucide-react';

interface MemoryBlock {
  type: string;
  content: unknown;
  version: number;
  updatedAt: string;
}

interface MemoryData {
  blocks: MemoryBlock[];
  count: number;
  scope: string;
}

async function fetchMemory(): Promise<MemoryData> {
  const res = await fetch('/api/memory');
  if (!res.ok) throw new Error('Failed to fetch memory');
  return res.json();
}

const BLOCK_CONFIG: Record<string, { icon: typeof Brain; color: string; label: string }> = {
  persona: { icon: Brain, color: 'text-purple-500', label: 'Persona' },
  project: { icon: Settings, color: 'text-blue-500', label: 'Project' },
  user: { icon: User, color: 'text-green-500', label: 'User' },
  corrections: { icon: AlertCircle, color: 'text-orange-500', label: 'Corrections' },
};

export function MemoryOverviewCard() {
  const { data: memory, isLoading, error } = useQuery({
    queryKey: ['memory'],
    queryFn: fetchMemory,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Database className="h-4 w-4" />
          <span className="text-sm font-medium">Memory System</span>
        </div>
        <p className="text-sm text-red-500 mt-2">Failed to load</p>
      </div>
    );
  }

  // Group blocks by type
  const blocksByType = (memory?.blocks || []).reduce<Record<string, number>>((acc, block) => {
    acc[block.type] = (acc[block.type] || 0) + 1;
    return acc;
  }, {});

  const totalBlocks = memory?.count || 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Database className="h-4 w-4" />
          <span className="text-sm font-medium">Memory System</span>
        </div>
        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
          {memory?.scope || 'project'}
        </span>
      </div>

      {/* Block Count Summary */}
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        {totalBlocks}
        <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
          block{totalBlocks !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Block Type Breakdown */}
      <div className="space-y-2">
        {Object.entries(BLOCK_CONFIG).map(([type, config]) => {
          const count = blocksByType[type] || 0;
          const Icon = config.icon;
          const percentage = totalBlocks > 0 ? (count / totalBlocks) * 100 : 0;

          return (
            <div key={type} className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${config.color}`} />
              <span className="text-sm text-gray-600 dark:text-gray-300 w-20">
                {config.label}
              </span>
              <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    type === 'persona' ? 'bg-purple-500' :
                    type === 'project' ? 'bg-blue-500' :
                    type === 'user' ? 'bg-green-500' :
                    'bg-orange-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 w-6 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Last Updated */}
      {memory?.blocks && memory.blocks.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
          Last updated:{' '}
          {new Date(
            Math.max(...memory.blocks.map((b) => new Date(b.updatedAt).getTime()))
          ).toLocaleString()}
        </div>
      )}
    </div>
  );
}
