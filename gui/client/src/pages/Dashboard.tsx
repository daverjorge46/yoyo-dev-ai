import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckSquare,
  Bug,
  GitBranch,
  Terminal,
  Activity,
  Cpu,
  Database,
  Zap,
  ChevronRight,
  Circle,
  ArrowUpRight,
} from 'lucide-react';
import { GitStatusCard } from '../components/GitStatusCard';
import { MCPStatusCard } from '../components/MCPStatusCard';
import { ExecutionProgressCard } from '../components/ExecutionProgressCard';
import { SkeletonDashboard } from '../components/SkeletonLoader';
import { TerminalsWidget, QAWidget } from '../components/dashboard';

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
// Terminal Command Line Component
// =============================================================================

function TerminalHeader({ projectName }: { projectName: string }) {
  return (
    <div className="terminal-card-gradient-top p-4 mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-terminal-red" />
          <span className="w-3 h-3 rounded-full bg-accent" />
          <span className="w-3 h-3 rounded-full bg-terminal-green" />
        </div>
        <span className="text-xs text-gray-500 dark:text-terminal-text-muted font-mono">
          yoyo-dev — <span className="text-primary dark:text-terminal-orange">{projectName}</span>
        </span>
      </div>
      <div className="font-mono text-sm text-gray-700 dark:text-terminal-text">
        <span className="text-terminal-green">$</span>{' '}
        <span className="text-primary dark:text-terminal-orange font-semibold">yoyo</span>{' '}
        <span className="text-accent dark:text-terminal-yellow">status</span>
        <span className="animate-cursor-blink text-primary dark:text-terminal-orange ml-1">_</span>
      </div>
    </div>
  );
}

// =============================================================================
// Quick Stat Card Component - Terminal Style
// =============================================================================

interface QuickStatProps {
  label: string;
  value: string | number;
  subvalue?: string;
  icon: React.ElementType;
  href: string;
  color: 'orange' | 'green' | 'blue' | 'purple' | 'yellow' | 'red';
  badge?: string;
}

function QuickStat({ label, value, subvalue, icon: Icon, href, color, badge }: QuickStatProps) {
  const navigate = useNavigate();

  const colorClasses = {
    orange: 'text-primary dark:text-terminal-orange border-primary/30 dark:border-terminal-orange/30 hover:border-primary dark:hover:border-terminal-orange hover:shadow-glow-primary/20',
    green: 'text-success dark:text-terminal-green border-success/30 dark:border-terminal-green/30 hover:border-success dark:hover:border-terminal-green',
    blue: 'text-info dark:text-terminal-blue border-info/30 dark:border-terminal-blue/30 hover:border-info dark:hover:border-terminal-blue',
    purple: 'text-purple-500 dark:text-terminal-purple border-purple-500/30 dark:border-terminal-purple/30 hover:border-purple-500 dark:hover:border-terminal-purple',
    yellow: 'text-accent dark:text-terminal-yellow border-accent/30 dark:border-terminal-yellow/30 hover:border-accent dark:hover:border-terminal-yellow hover:shadow-glow-accent/20',
    red: 'text-error dark:text-terminal-red border-error/30 dark:border-terminal-red/30 hover:border-error dark:hover:border-terminal-red',
  };

  return (
    <button
      onClick={() => navigate(href)}
      className={`
        group relative p-4 rounded-lg border-2 transition-all duration-150
        bg-white dark:bg-terminal-card
        ${colorClasses[color]}
        hover:shadow-md dark:hover:shadow-lg
        focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-terminal-orange focus:ring-offset-2 dark:focus:ring-offset-terminal-bg
        text-left w-full
      `}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-terminal-text-muted">
            {label}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-terminal-text">{value}</span>
            {badge && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${colorClasses[color].split(' ')[0]} bg-current/10`}>
                {badge}
              </span>
            )}
          </div>
          {subvalue && (
            <div className="text-xs text-gray-500 dark:text-terminal-text-muted">{subvalue}</div>
          )}
        </div>
        <div className={`p-2 rounded-lg bg-current/5 ${colorClasses[color].split(' ')[0]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowUpRight className="h-4 w-4 text-gray-400 dark:text-terminal-text-muted" />
      </div>
    </button>
  );
}

// =============================================================================
// Progress Ring Component
// =============================================================================

function ProgressRing({ progress, size = 120 }: { progress: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Use gradient ID for SVG gradient
  const gradientId = `progress-gradient-${size}`;
  const isComplete = progress === 100;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Define gradient */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E85D04" />
            <stop offset="100%" stopColor="#D29922" />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          className="text-gray-200 dark:text-terminal-border"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle with gradient or green when complete */}
        <circle
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke={isComplete ? '#3fb950' : `url(#${gradientId})`}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-500"
          style={{
            filter: progress > 0 && !isComplete ? 'drop-shadow(0 0 6px rgb(232 93 4 / 0.4))' : undefined,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${
          isComplete
            ? 'text-terminal-green'
            : 'text-gray-900 dark:text-terminal-text'
        }`}>
          {progress}%
        </span>
        <span className="text-xs text-gray-500 dark:text-terminal-text-muted">complete</span>
      </div>
    </div>
  );
}

// =============================================================================
// System Status Component
// =============================================================================

function SystemStatus({ status }: { status: StatusResponse }) {
  const systems = [
    {
      name: 'Framework',
      active: status?.framework?.installed,
      icon: Terminal,
      detail: status?.framework?.installed ? 'Installed' : 'Not installed',
    },
    {
      name: 'Memory',
      active: status?.memory?.initialized,
      icon: Database,
      detail: status?.memory?.initialized ? `${status.memory.blocksCount} blocks` : 'Not initialized',
    },
    {
      name: 'Skills',
      active: status?.skills?.initialized,
      icon: Zap,
      detail: status?.skills?.initialized ? `${status.skills.skillsCount} skills` : 'Not initialized',
    },
  ];

  return (
    <div className="terminal-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="h-4 w-4 text-brand dark:text-terminal-orange" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-terminal-text uppercase tracking-wide">
          System Status
        </h3>
      </div>
      <div className="space-y-3">
        {systems.map((system) => (
          <div
            key={system.name}
            className="flex items-center justify-between py-2 px-3 rounded bg-gray-50 dark:bg-terminal-elevated"
          >
            <div className="flex items-center gap-3">
              <system.icon className="h-4 w-4 text-gray-400 dark:text-terminal-text-muted" />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-terminal-text">
                  {system.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-terminal-text-muted">
                  {system.detail}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Circle
                className={`h-2 w-2 ${
                  system.active
                    ? 'text-terminal-green fill-terminal-green'
                    : 'text-gray-300 dark:text-terminal-text-muted fill-current'
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  system.active
                    ? 'text-terminal-green'
                    : 'text-gray-400 dark:text-terminal-text-muted'
                }`}
              >
                {system.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Quick Actions Component
// =============================================================================

function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { label: 'View Specs', icon: FileText, href: '/specs' },
    { label: 'Task Board', icon: CheckSquare, href: '/tasks' },
    { label: 'Roadmap', icon: GitBranch, href: '/roadmap' },
  ];

  return (
    <div className="terminal-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <ChevronRight className="h-4 w-4 text-brand dark:text-terminal-orange" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-terminal-text uppercase tracking-wide">
          Quick Actions
        </h3>
      </div>
      <div className="space-y-2">
        {actions.map((action) => (
          <button
            key={action.href}
            onClick={() => navigate(action.href)}
            className="
              w-full flex items-center gap-3 px-3 py-2 rounded
              text-sm text-left
              text-gray-700 dark:text-terminal-text-secondary
              hover:bg-gray-50 dark:hover:bg-terminal-elevated
              hover:text-brand dark:hover:text-terminal-orange
              transition-colors
            "
          >
            <action.icon className="h-4 w-4" />
            <span>{action.label}</span>
            <ChevronRight className="h-3 w-3 ml-auto opacity-50" />
          </button>
        ))}
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Terminal Header */}
      <TerminalHeader projectName={status?.name || 'project'} />

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStat
          label="Specifications"
          value={summary?.totalSpecs ?? 0}
          subvalue="Feature specs"
          icon={FileText}
          href="/specs"
          color="orange"
        />
        <QuickStat
          label="Tasks"
          value={summary?.totalTasks ?? 0}
          subvalue={`${summary?.completedTasks ?? 0} completed`}
          icon={CheckSquare}
          href="/tasks"
          color="blue"
          badge={summary?.completedTasks === summary?.totalTasks && (summary?.totalTasks ?? 0) > 0 ? 'Done' : undefined}
        />
        <QuickStat
          label="Bug Fixes"
          value={fixesCount}
          subvalue="Fix records"
          icon={Bug}
          href="/fixes"
          color={fixesCount > 0 ? 'yellow' : 'green'}
        />
        <QuickStat
          label="Progress"
          value={`${summary?.progress ?? 0}%`}
          subvalue="Overall completion"
          icon={Activity}
          href="/tasks"
          color={summary?.progress === 100 ? 'green' : 'purple'}
        />
      </div>

      {/* Progress Section - Elegant Gradient Design */}
      {summary && summary.totalTasks > 0 && (
        <div className="terminal-card-gradient-top p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-terminal-text uppercase tracking-wide mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary dark:text-terminal-orange" />
                Overall Progress
              </h3>
              <div className="space-y-3">
                {/* Gradient progress bar */}
                <div className="progress-gradient h-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      summary.progress === 100
                        ? 'bg-terminal-green'
                        : 'progress-gradient-bar'
                    } ${summary.progress > 0 && summary.progress < 100 ? 'progress-glow' : ''}`}
                    style={{ width: `${summary.progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-terminal-text-secondary">
                    <span className="font-semibold text-primary dark:text-terminal-orange">{summary.completedTasks}</span>
                    {' '}of{' '}
                    <span className="font-semibold">{summary.totalTasks}</span>
                    {' '}tasks completed
                  </span>
                  <span className={`font-bold ${
                    summary.progress === 100
                      ? 'text-terminal-green'
                      : 'text-primary dark:text-accent'
                  }`}>
                    {summary.progress}%
                  </span>
                </div>
              </div>
            </div>
            <div className="ml-8 hidden sm:block">
              <ProgressRing progress={summary.progress} size={100} />
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <TerminalsWidget />
          <QAWidget />
          <QuickActions />
        </div>

        {/* Middle Column */}
        <div className="space-y-6">
          <ExecutionProgressCard />
          <GitStatusCard />
          <MCPStatusCard />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <SystemStatus status={status!} />
          {/* Project Info */}
          <div className="terminal-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="h-4 w-4 text-brand dark:text-terminal-orange" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-terminal-text uppercase tracking-wide">
                Project Info
              </h3>
            </div>
            <div className="space-y-3">
              <div className="py-2 px-3 rounded bg-gray-50 dark:bg-terminal-elevated">
                <div className="text-xs text-gray-500 dark:text-terminal-text-muted mb-1">Name</div>
                <div className="text-sm font-mono text-gray-900 dark:text-terminal-text truncate">
                  {status?.name ?? 'Unknown'}
                </div>
              </div>
              <div className="py-2 px-3 rounded bg-gray-50 dark:bg-terminal-elevated">
                <div className="text-xs text-gray-500 dark:text-terminal-text-muted mb-1">Path</div>
                <div className="text-xs font-mono text-gray-500 dark:text-terminal-text-muted truncate">
                  {status?.path ?? 'Unknown'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
