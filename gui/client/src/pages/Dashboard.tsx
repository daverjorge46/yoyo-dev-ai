import { useQuery } from '@tanstack/react-query';

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
  color = 'indigo',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 card-hover">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <div className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
      <div
        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const summary = tasks?.summary;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Overview of your Yoyo Dev project
        </p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Specs"
          value={summary?.totalSpecs ?? 0}
          subtitle="Feature specifications"
          color="indigo"
        />
        <StatCard
          title="Total Tasks"
          value={summary?.totalTasks ?? 0}
          subtitle={`${summary?.completedTasks ?? 0} completed`}
          color="blue"
        />
        <StatCard
          title="Progress"
          value={`${summary?.progress ?? 0}%`}
          subtitle="Overall completion"
          color={summary?.progress === 100 ? 'green' : 'yellow'}
        />
        <StatCard
          title="Systems"
          value={
            (status?.hasMemorySystem ? 1 : 0) + (status?.hasSkillsSystem ? 1 : 0)
          }
          subtitle="Memory & Skills"
          color={status?.hasMemorySystem && status?.hasSkillsSystem ? 'green' : 'yellow'}
        />
      </div>

      {/* Progress section */}
      {summary && summary.totalTasks > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Overall Progress
            </h2>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {summary.completedTasks} / {summary.totalTasks} tasks
            </span>
          </div>
          <ProgressBar progress={summary.progress} />
        </div>
      )}

      {/* System status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yoyo Dev Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Yoyo Dev Framework
              </span>
              <span
                className={`badge ${
                  status?.yoyoDevInstalled ? 'badge-success' : 'badge-error'
                }`}
              >
                {status?.yoyoDevInstalled ? 'Installed' : 'Not installed'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Memory System
              </span>
              <span
                className={`badge ${
                  status?.hasMemorySystem ? 'badge-success' : 'badge-neutral'
                }`}
              >
                {status?.hasMemorySystem ? 'Active' : 'Not initialized'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Skills System
              </span>
              <span
                className={`badge ${
                  status?.hasSkillsSystem ? 'badge-success' : 'badge-neutral'
                }`}
              >
                {status?.hasSkillsSystem ? 'Active' : 'Not initialized'}
              </span>
            </div>
          </div>
        </div>

        {/* Project Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Project Info
          </h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Project Root
              </span>
              <p className="text-gray-900 dark:text-white font-mono text-sm truncate">
                {status?.projectRoot ?? 'Unknown'}
              </p>
            </div>
            {status?.activeSpec && (
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Active Spec
                </span>
                <p className="text-gray-900 dark:text-white">
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
