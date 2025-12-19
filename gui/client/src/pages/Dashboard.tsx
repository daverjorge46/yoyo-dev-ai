import { useQuery } from '@tanstack/react-query';
import { FileText, CheckSquare, TrendingUp, Settings } from 'lucide-react';
import { GitStatusCard } from '../components/GitStatusCard';
import { MCPStatusCard } from '../components/MCPStatusCard';
import { ExecutionProgressCard } from '../components/ExecutionProgressCard';
import { MemoryOverviewCard } from '../components/MemoryOverviewCard';
import { SkillsSummaryCard } from '../components/SkillsSummaryCard';
import { SkeletonDashboard } from '../components/SkeletonLoader';

interface StatusResponse {
  projectRoot: string;
  yoyoDevInstalled: boolean;
  hasMemorySystem: boolean;
  hasSkillsSystem: boolean;
  specsCount: number;
  activeSpec: string | null;
}

interface TasksSummary {
  totalSpecs: number;
  totalTasks: number;
  completedTasks: number;
  progress: number;
}

async function fetchStatus(): Promise<StatusResponse> {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

async function fetchTasksSummary(): Promise<{ summary: TasksSummary }> {
  const res = await fetch('/api/tasks');
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'indigo',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof FileText;
  color?: 'indigo' | 'green' | 'yellow' | 'red' | 'blue';
}) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 card-hover">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ progress, label }: { progress: number; label?: string }) {
  return (
    <div
      className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Progress'}
    >
      <div
        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default function Dashboard() {
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['status'],
    queryFn: fetchStatus,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasksSummary,
  });

  if (statusLoading || tasksLoading) {
    return <SkeletonDashboard />;
  }

  const summary = tasks?.summary;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Overview of your Yoyo Dev project
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Specs"
          value={summary?.totalSpecs ?? 0}
          subtitle="Feature specifications"
          icon={FileText}
          color="indigo"
        />
        <StatCard
          title="Tasks"
          value={summary?.totalTasks ?? 0}
          subtitle={`${summary?.completedTasks ?? 0} completed`}
          icon={CheckSquare}
          color="blue"
        />
        <StatCard
          title="Progress"
          value={`${summary?.progress ?? 0}%`}
          subtitle="Overall completion"
          icon={TrendingUp}
          color={summary?.progress === 100 ? 'green' : 'yellow'}
        />
        <StatCard
          title="Systems"
          value={
            (status?.hasMemorySystem ? 1 : 0) + (status?.hasSkillsSystem ? 1 : 0)
          }
          subtitle="Memory & Skills"
          icon={Settings}
          color={status?.hasMemorySystem && status?.hasSkillsSystem ? 'green' : 'yellow'}
        />
      </div>

      {/* Overall Progress Bar */}
      {summary && summary.totalTasks > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Progress
            </h2>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {summary.completedTasks} / {summary.totalTasks} tasks
            </span>
          </div>
          <ProgressBar progress={summary.progress} label="Overall task completion" />
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Execution & Git */}
        <div className="space-y-6">
          <ExecutionProgressCard />
          <GitStatusCard />
        </div>

        {/* Middle Column - MCP & Memory */}
        <div className="space-y-6">
          <MCPStatusCard />
          <MemoryOverviewCard />
        </div>

        {/* Right Column - Skills & System Status */}
        <div className="space-y-6">
          <SkillsSummaryCard />

          {/* System Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              System Status
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Framework</span>
                <span
                  className={`badge ${
                    status?.yoyoDevInstalled ? 'badge-success' : 'badge-error'
                  }`}
                >
                  {status?.yoyoDevInstalled ? 'Installed' : 'Not installed'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Memory</span>
                <span
                  className={`badge ${
                    status?.hasMemorySystem ? 'badge-success' : 'badge-neutral'
                  }`}
                >
                  {status?.hasMemorySystem ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Skills</span>
                <span
                  className={`badge ${
                    status?.hasSkillsSystem ? 'badge-success' : 'badge-neutral'
                  }`}
                >
                  {status?.hasSkillsSystem ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Project Path */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">Project</span>
              <p className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate mt-0.5">
                {status?.projectRoot ?? 'Unknown'}
              </p>
            </div>

            {/* Active Spec */}
            {status?.activeSpec && (
              <div className="mt-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Active Spec</span>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 truncate mt-0.5">
                  {status.activeSpec}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
