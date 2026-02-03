import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  CheckSquare,
  Wand2,
  Zap,
  Clock,
  TrendingUp,
  Activity,
  Plug,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ProgressBar } from '../components/common/ProgressBar';
import { PageLoader } from '../components/common/LoadingSpinner';
import type { AnalyticsSummary, ActivityItem, QuickAction, Task, Connection } from '../types';

// Stats card component
function StatsCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  trend?: string;
  color: 'primary' | 'accent' | 'success' | 'info';
}) {
  const colorClasses = {
    primary: 'bg-primary-500/10 text-primary-400',
    accent: 'bg-accent-500/10 text-accent-400',
    success: 'bg-success/10 text-success-light',
    info: 'bg-info/10 text-info-light',
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-terminal-text-secondary mb-1">{label}</p>
          <p className="text-2xl font-bold text-terminal-text">{value}</p>
          {trend && (
            <p className="text-xs text-success-light flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-2 rounded-md ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}

// Task summary widget
function TaskSummaryWidget({ tasks }: { tasks: Task[] }) {
  const queued = tasks.filter((t) => t.status === 'queued').length;
  const running = tasks.filter((t) => t.status === 'running').length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const total = tasks.length;

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-terminal-text mb-4 flex items-center gap-2">
        <CheckSquare className="w-4 h-4 text-primary-400" />
        Tasks Overview
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-terminal-text-secondary">Queued</span>
          <Badge variant="muted">{queued}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-terminal-text-secondary">Running</span>
          <Badge variant="primary">{running}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-terminal-text-secondary">Completed</span>
          <Badge variant="success">{completed}</Badge>
        </div>
        <ProgressBar value={completed} max={total || 1} className="mt-2" />
        <p className="text-xs text-terminal-text-muted text-center">
          {completed} of {total} tasks completed
        </p>
      </div>
    </Card>
  );
}

// Quick actions widget
function QuickActionsWidget({ actions }: { actions: QuickAction[] }) {
  const pendingActions = actions.filter((a) => a.status === 'pending').slice(0, 3);

  return (
    <Card variant="accent-gold" className="p-4">
      <h3 className="text-sm font-semibold text-terminal-text mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4 text-accent-400" />
        Suggested Actions
      </h3>
      {pendingActions.length > 0 ? (
        <div className="space-y-3">
          {pendingActions.map((action) => (
            <div
              key={action.id}
              className="p-3 bg-terminal-elevated/50 rounded-md border border-terminal-border"
            >
              <p className="text-sm text-terminal-text mb-1">{action.title}</p>
              <p className="text-xs text-terminal-text-secondary mb-2">{action.description}</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="primary">
                  Execute
                </Button>
                <Button size="sm" variant="ghost">
                  Schedule
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-terminal-text-secondary text-center py-4">
          No pending suggestions
        </p>
      )}
    </Card>
  );
}

// Recent activity widget
function RecentActivityWidget({ activities }: { activities: ActivityItem[] }) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-terminal-text mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary-400" />
        Recent Activity
      </h3>
      <div className="space-y-3">
        {activities.slice(0, 5).map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div
              className={`w-2 h-2 rounded-full mt-1.5 ${
                activity.status === 'success'
                  ? 'bg-success'
                  : activity.status === 'error'
                  ? 'bg-error'
                  : 'bg-terminal-text-muted'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-terminal-text truncate">{activity.title}</p>
              <p className="text-xs text-terminal-text-muted">
                {new Date(activity.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <p className="text-sm text-terminal-text-secondary text-center py-4">
            No recent activity
          </p>
        )}
      </div>
    </Card>
  );
}

// Connections widget
function ConnectionsWidget({ connections }: { connections: Connection[] }) {
  const connectedCount = connections.filter((c) => c.connected).length;

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-terminal-text mb-4 flex items-center gap-2">
        <Plug className="w-4 h-4 text-primary-400" />
        Connected Services
      </h3>
      <div className="space-y-2">
        {connections.slice(0, 4).map((conn) => (
          <div key={conn.id} className="flex items-center justify-between py-1">
            <span className="text-sm text-terminal-text">{conn.name}</span>
            <div
              className={`w-2 h-2 rounded-full ${
                conn.connected ? 'bg-success' : 'bg-terminal-text-muted'
              }`}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-terminal-text-muted mt-3 text-center">
        {connectedCount} of {connections.length} services connected
      </p>
    </Card>
  );
}

// Scheduled tasks widget
function ScheduledWidget({ tasks }: { tasks: Task[] }) {
  const scheduled = tasks
    .filter((t) => t.scheduledAt && t.status === 'queued')
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    .slice(0, 3);

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-terminal-text mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary-400" />
        Upcoming Scheduled
      </h3>
      {scheduled.length > 0 ? (
        <div className="space-y-3">
          {scheduled.map((task) => (
            <div key={task.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-terminal-elevated flex items-center justify-center text-xs text-terminal-text-secondary">
                {new Date(task.scheduledAt!).toLocaleDateString('en', { weekday: 'short' })}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-terminal-text truncate">{task.name}</p>
                <p className="text-xs text-terminal-text-muted">
                  {new Date(task.scheduledAt!).toLocaleTimeString('en', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-terminal-text-secondary text-center py-4">
          No scheduled tasks
        </p>
      )}
    </Card>
  );
}

export default function Dashboard() {
  // Fetch dashboard data
  const { data: analytics, isLoading: loadingAnalytics } = useQuery<AnalyticsSummary>({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/summary');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
  });

  const { data: activities = [], isLoading: loadingActivities } = useQuery<ActivityItem[]>({
    queryKey: ['analytics', 'activity'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/activity');
      if (!res.ok) throw new Error('Failed to fetch activity');
      const data = await res.json();
      return data.activities || [];
    },
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      return data.tasks || [];
    },
  });

  const { data: quickActions = [], isLoading: loadingActions } = useQuery<QuickAction[]>({
    queryKey: ['quick-actions'],
    queryFn: async () => {
      const res = await fetch('/api/quick-actions');
      if (!res.ok) throw new Error('Failed to fetch quick actions');
      const data = await res.json();
      return data.actions || [];
    },
  });

  const { data: connections = [], isLoading: loadingConnections } = useQuery<Connection[]>({
    queryKey: ['connections'],
    queryFn: async () => {
      const res = await fetch('/api/connections');
      if (!res.ok) throw new Error('Failed to fetch connections');
      const data = await res.json();
      return data.connections || [];
    },
  });

  const isLoading =
    loadingAnalytics || loadingActivities || loadingTasks || loadingActions || loadingConnections;

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-terminal-text">Dashboard</h1>
        <p className="text-sm text-terminal-text-secondary mt-1">
          Welcome to your YoYo AI Workspace
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          icon={MessageSquare}
          label="Messages Processed"
          value={analytics?.messagesProcessed || 0}
          trend="+12% from yesterday"
          color="primary"
        />
        <StatsCard
          icon={CheckSquare}
          label="Tasks Completed"
          value={analytics?.tasksCompleted || 0}
          trend="+5% from yesterday"
          color="success"
        />
        <StatsCard
          icon={Wand2}
          label="Automations Run"
          value={analytics?.automationsRun || 0}
          color="accent"
        />
        <StatsCard
          icon={Zap}
          label="Pending Actions"
          value={quickActions.filter((a) => a.status === 'pending').length}
          color="info"
        />
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <QuickActionsWidget actions={quickActions} />
          <RecentActivityWidget activities={activities} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <TaskSummaryWidget tasks={tasks} />
          <ConnectionsWidget connections={connections} />
          <ScheduledWidget tasks={tasks} />
        </div>
      </div>
    </div>
  );
}
