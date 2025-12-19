/**
 * SkillsSummaryCard Component
 *
 * Displays top skills by usage with success rates.
 */

import { useQuery } from '@tanstack/react-query';
import { Zap, TrendingUp, Award } from 'lucide-react';

interface SkillStats {
  id: string;
  name: string;
  totalUsage: number;
  successRate: number;
  lastUsed: string | null;
}

interface SkillsData {
  skills: SkillStats[];
  count: number;
  totalUsage: number;
  avgSuccessRate: number;
}

async function fetchSkillsStats(): Promise<SkillsData> {
  const res = await fetch('/api/skills/stats');
  if (!res.ok) throw new Error('Failed to fetch skills stats');
  return res.json();
}

function SuccessBadge({ rate }: { rate: number }) {
  const color =
    rate >= 80
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : rate >= 50
      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${color}`}>
      {rate.toFixed(0)}%
    </span>
  );
}

export function SkillsSummaryCard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['skills', 'stats'],
    queryFn: fetchSkillsStats,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Zap className="h-4 w-4" />
          <span className="text-sm font-medium">Skills</span>
        </div>
        <p className="text-sm text-red-500 mt-2">Failed to load</p>
      </div>
    );
  }

  const topSkills = (stats?.skills || [])
    .sort((a, b) => b.totalUsage - a.totalUsage)
    .slice(0, 5);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Zap className="h-4 w-4" />
          <span className="text-sm font-medium">Skills</span>
        </div>
        <span className="text-xs text-gray-400">
          {stats?.count || 0} total
        </span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {stats?.totalUsage || 0}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Usage</div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
          <div className="flex items-center justify-center gap-1">
            <Award className="h-3.5 w-3.5 text-green-500" />
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {(stats?.avgSuccessRate || 0).toFixed(0)}%
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Avg Success</div>
        </div>
      </div>

      {/* Top Skills */}
      {topSkills.length > 0 ? (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Top Skills
          </h4>
          {topSkills.map((skill, index) => (
            <div
              key={skill.id}
              className="flex items-center justify-between text-sm py-1.5 px-2 bg-gray-50 dark:bg-gray-700/50 rounded"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-400 w-4">{index + 1}.</span>
                <span className="text-gray-700 dark:text-gray-300 truncate">
                  {skill.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{skill.totalUsage}x</span>
                <SuccessBadge rate={skill.successRate} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-2">No skills used yet</p>
      )}
    </div>
  );
}
