import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckSquare,
  Bug,
  GitBranch,
  Server,
  Brain,
  Zap,
  ChevronRight,
  Terminal,
  Activity,
} from 'lucide-react';
import { GitStatusCard } from '../components/GitStatusCard';
import { MCPStatusCard } from '../components/MCPStatusCard';
import { ExecutionProgressCard } from '../components/ExecutionProgressCard';
import { MemoryOverviewCard } from '../components/MemoryOverviewCard';
import { SkillsSummaryCard } from '../components/SkillsSummaryCard';
import { SkeletonDashboard } from '../components/SkeletonLoader';

interface StatusResponse {
  name: string;
  path: string;
  framework: {
    installed: boolean;
    hasProduct: boolean;
    specsCount: number;
    fixesCount: number;
  };
  memory: {
    initialized: boolean;
    blocksCount: number;
    databasePath: string | null;
  };
  skills: {
    initialized: boolean;
    skillsCount: number;
    databasePath: string | null;
  };
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

// =============================================================================
// Terminal-style Stat Card Component
// =============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: 'brand' | 'success' | 'info' | 'warning' | 'error';
  href: string;
  badge?: string;
}

function StatCard({ title, value, subtitle, icon: Icon, color, href, badge }: StatCardProps) {
  const navigate = useNavigate();

  const colorMap = {
    brand: {
      icon: 'text-brand dark:text-terminal-yellow',
      bg: 'bg-brand/5 dark:bg-terminal-yellow/10',
      border: 'border-brand/20 dark:border-terminal-yellow/20',
      glow: 'hover:shadow-glow-brand',
    },
    success: {
      icon: 'text-success dark:text-terminal-green',
      bg: 'bg-success/5 dark:bg-terminal-green/10',
      border: 'border-success/20 dark:border-terminal-green/20',
      glow: 'hover:shadow-glow-success',
    },
    info: {
      icon: 'text-info dark:text-terminal-blue',
      bg: 'bg-info/5 dark:bg-terminal-blue/10',
      border: 'border-info/20 dark:border-terminal-blue/20',
      glow: 'hover:shadow-glow-info',
    },
    warning: {
      icon: 'text-warning dark:text-terminal-orange',
      bg: 'bg-warning/5 dark:bg-terminal-orange/10',
      border: 'border-warning/20 dark:border-terminal-orange/20',
      glow: 'hover:shadow-glow-brand',
    },
    error: {
      icon: 'text-error dark:text-terminal-red',
      bg: 'bg-error/5 dark:bg-terminal-red/10',
      border: 'border-error/20 dark:border-terminal-red/20',
      glow: 'hover:shadow-glow-error',
    },
  };

  const styles = colorMap[color];

  return (
    <button
      onClick={() => navigate(href)}
      className={`
        w-full text-left terminal-card-interactive p-4
        ${styles.glow}
        group
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-terminal-text-muted">
              {title}
            </span>
            {badge && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${styles.bg} ${styles.icon}`}>
                {badge}
              </span>
            )}
          </div>
          <div className="terminal-stat">{value}</div>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500 dark:text-terminal-text-muted truncate">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded ${styles.bg} border ${styles.border}`}>
          <Icon className={`h-5 w-5 ${styles.icon}`} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-gray-400 dark:text-terminal-text-muted group-hover:text-brand dark:group-hover:text-terminal-yellow transition-colors">
        <span>View details</span>
        <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

// =============================================================================
// Progress Display Component
// =============================================================================

function ProgressDisplay({ progress, completed, total }: { progress: number; completed: number; total: number }) {
  const getProgressColor = () => {
    if (progress === 100) return 'bg-terminal-green';
    if (progress >= 75) return 'bg-terminal-cyan';
    if (progress >= 50) return 'bg-terminal-yellow';
    if (progress >= 25) return 'bg-terminal-orange';
    return 'bg-terminal-text-muted';
  };

  return (
    <div className="terminal-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="terminal-header mb-0">Overall Progress</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-gray-900 dark:text-terminal-text">
            {progress}%
          </span>
          <span className="text-xs text-gray-500 dark:text-terminal-text-muted">
            {completed}/{total}
          </span>
        </div>
      </div>
      <div className="terminal-progress">
        <div
          className={`terminal-progress-bar ${getProgressColor()}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-gray-400 dark:text-terminal-text-muted">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// =============================================================================
// System Status Card Component
// =============================================================================

function SystemStatusCard({ status }: { status: StatusResponse }) {
  const systems = [
    {
      name: 'Framework',
      active: status?.framework?.installed,
      icon: Terminal,
    },
    {
      name: 'Memory',
      active: status?.memory?.initialized,
      icon: Brain,
    },
    {
      name: 'Skills',
      active: status?.skills?.initialized,
      icon: Zap,
    },
  ];

  return (
    <div className="terminal-card p-4">
      <div className="terminal-header">System Status</div>
      <div className="space-y-2">
        {systems.map((system) => (
          <div
            key={system.name}
            className="flex items-center justify-between py-1.5"
          >
            <div className="flex items-center gap-2">
              <system.icon className="h-4 w-4 text-gray-400 dark:text-terminal-text-muted" />
              <span className="text-sm text-gray-600 dark:text-terminal-text-secondary">
                {system.name}
              </span>
            </div>
            <span
              className={
                system.active
                  ? 'terminal-badge-success'
                  : 'terminal-badge-neutral'
              }
            >
              {system.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        ))}
      </div>

      {/* Project Info */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-terminal-border">
        <div className="space-y-2">
          <div>
            <span className="text-xs text-gray-500 dark:text-terminal-text-muted">
              Project
            </span>
            <p className="terminal-code mt-0.5 block truncate">
              {status?.name ?? 'Unknown'}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500 dark:text-terminal-text-muted">
              Path
            </span>
            <p className="text-xs font-mono text-gray-500 dark:text-terminal-text-muted truncate mt-0.5">
              {status?.path ?? 'Unknown'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Dashboard Page Component
// =============================================================================

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
  const fixesCount = status?.framework?.fixesCount ?? 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-terminal-text flex items-center gap-2">
            <Activity className="h-6 w-6 text-brand dark:text-terminal-yellow" />
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-terminal-text-muted">
            <span className="terminal-prompt">{status?.name || 'project'}</span>
          </p>
        </div>
        {summary && summary.totalTasks > 0 && (
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900 dark:text-terminal-text">
              {summary.progress}
              <span className="text-lg text-gray-400 dark:text-terminal-text-muted">%</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-terminal-text-muted">
              complete
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Grid - Clickable Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Specs"
          value={summary?.totalSpecs ?? 0}
          subtitle="Feature specifications"
          icon={FileText}
          color="brand"
          href="/specs"
        />
        <StatCard
          title="Tasks"
          value={summary?.totalTasks ?? 0}
          subtitle={`${summary?.completedTasks ?? 0} completed`}
          icon={CheckSquare}
          color="info"
          href="/tasks"
          badge={summary?.completedTasks === summary?.totalTasks && summary?.totalTasks > 0 ? 'Done' : undefined}
        />
        <StatCard
          title="Fixes"
          value={fixesCount}
          subtitle="Bug fix records"
          icon={Bug}
          color={fixesCount > 0 ? 'warning' : 'success'}
          href="/fixes"
        />
        <StatCard
          title="Progress"
          value={`${summary?.progress ?? 0}%`}
          subtitle="Overall completion"
          icon={GitBranch}
          color={summary?.progress === 100 ? 'success' : 'info'}
          href="/tasks/kanban"
        />
      </div>

      {/* Progress Bar */}
      {summary && summary.totalTasks > 0 && (
        <ProgressDisplay
          progress={summary.progress}
          completed={summary.completedTasks}
          total={summary.totalTasks}
        />
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <ExecutionProgressCard />
          <GitStatusCard />
        </div>

        {/* Middle Column */}
        <div className="space-y-6">
          <MCPStatusCard />
          <MemoryOverviewCard />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <SkillsSummaryCard />
          <SystemStatusCard status={status!} />
        </div>
      </div>
    </div>
  );
}
