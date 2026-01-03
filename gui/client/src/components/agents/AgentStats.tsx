/**
 * AgentStats Component
 *
 * Displays aggregate statistics about agents.
 */

import { Bot, Crown, Cpu, Thermometer } from 'lucide-react';
import type { AgentStats as AgentStatsType } from '../../../../shared/types/agent';

interface AgentStatsProps {
  /** Statistics data */
  stats: AgentStatsType;
  /** Additional className */
  className?: string;
}

export function AgentStats({ stats, className = '' }: AgentStatsProps) {
  // Get most used model
  const topModel = Object.entries(stats.byModel)
    .sort(([, a], [, b]) => b - a)
    [0];

  const formatModelName = (model: string): string => {
    if (model.includes('opus')) return 'Opus';
    if (model.includes('sonnet')) return 'Sonnet';
    if (model.includes('gpt-4o')) return 'GPT-4o';
    if (model.includes('gemini')) return 'Gemini';
    return model.split('-').pop() || model;
  };

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {/* Total Agents */}
      <div className="bg-terminal-bg-secondary border border-terminal-border rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-terminal-cyan/20">
            <Bot className="h-5 w-5 text-terminal-cyan" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-sm text-gray-400">Total Agents</p>
          </div>
        </div>
      </div>

      {/* Primary Agents */}
      <div className="bg-terminal-bg-secondary border border-terminal-border rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-terminal-orange/20">
            <Crown className="h-5 w-5 text-terminal-orange" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stats.byMode.primary}</p>
            <p className="text-sm text-gray-400">Primary</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {stats.byMode.subagent} subagents
        </p>
      </div>

      {/* Top Model */}
      <div className="bg-terminal-bg-secondary border border-terminal-border rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Cpu className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {topModel ? formatModelName(topModel[0]) : '-'}
            </p>
            <p className="text-sm text-gray-400">Top Model</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {topModel ? `${topModel[1]} agents` : 'No data'}
        </p>
      </div>

      {/* Average Temperature */}
      <div className="bg-terminal-bg-secondary border border-terminal-border rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/20">
            <Thermometer className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {stats.avgTemperature.toFixed(1)}
            </p>
            <p className="text-sm text-gray-400">Avg Temp</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Range: 0.0 - 2.0
        </p>
      </div>
    </div>
  );
}

/**
 * AgentStatsSkeleton - Loading state
 */
export function AgentStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-terminal-bg-secondary border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-terminal-bg-tertiary" />
            <div className="flex-1">
              <div className="h-6 w-12 bg-terminal-bg-tertiary rounded mb-1" />
              <div className="h-4 w-20 bg-terminal-bg-tertiary rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
