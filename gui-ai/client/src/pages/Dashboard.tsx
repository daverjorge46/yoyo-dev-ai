import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Radio,
  History,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  Sparkles,
  TrendingUp,
  Coins,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { PageLoader } from '../components/common/LoadingSpinner';

// Stats card component
function StatsCard({
  icon: Icon,
  label,
  value,
  subvalue,
  color,
  to,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  subvalue?: string;
  color: 'primary' | 'accent' | 'success' | 'info' | 'warning';
  to?: string;
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary dark:text-terminal-orange',
    accent: 'bg-accent/10 text-accent dark:text-terminal-yellow',
    success: 'bg-success/10 text-success dark:text-terminal-green',
    info: 'bg-info/10 text-info dark:text-terminal-blue',
    warning: 'bg-warning/10 text-warning dark:text-terminal-yellow',
  };

  const content = (
    <Card className={`p-4 ${to ? 'hover:bg-gray-50 dark:hover:bg-terminal-elevated/50 transition-colors cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-terminal-text-secondary mb-1">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-terminal-text">{value}</p>
          {subvalue && (
            <p className="text-xs text-gray-400 dark:text-terminal-text-muted mt-1">{subvalue}</p>
          )}
        </div>
        <div className={`p-2 rounded-md ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }
  return content;
}

// OpenClaw status card
function OpenClawStatusCard({ connected, port, version }: { connected: boolean; port: number; version?: string }) {
  return (
    <Card className="p-4 sm:p-6 border-l-4 border-l-primary dark:border-l-terminal-orange">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className={`p-3 rounded-lg self-start ${connected ? 'bg-success/10' : 'bg-error/10'}`}>
          {connected ? (
            <CheckCircle2 className="w-6 sm:w-8 h-6 sm:h-8 text-success dark:text-terminal-green" />
          ) : (
            <XCircle className="w-6 sm:w-8 h-6 sm:h-8 text-error dark:text-terminal-red" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-terminal-text">
            OpenClaw Gateway
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-terminal-text-secondary truncate">
            {connected
              ? `Connected on port ${port}${version ? ` • v${version}` : ''}`
              : 'Not running - Start with: yoyo-ai start'}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div
            className={`w-3 h-3 rounded-full ${
              connected ? 'bg-success dark:bg-terminal-green animate-pulse' : 'bg-error dark:bg-terminal-red'
            }`}
          />
          <span className={`text-sm font-medium ${connected ? 'text-success dark:text-terminal-green' : 'text-error dark:text-terminal-red'}`}>
            {connected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    </Card>
  );
}

// Quick action button
function QuickActionButton({
  to,
  icon: Icon,
  label,
  description,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  description: string;
}) {
  return (
    <Link to={to}>
      <Card className="p-4 hover:bg-gray-50 dark:hover:bg-terminal-elevated transition-colors cursor-pointer group h-full">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Icon className="w-5 sm:w-6 h-5 sm:h-6 text-primary dark:text-terminal-orange" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-terminal-text">{label}</h4>
            <p className="text-xs text-gray-500 dark:text-terminal-text-secondary truncate">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// Channel health card
function ChannelHealthCard({ channels }: { channels: Array<{ type: string; status: string }> }) {
  const total = channels.length;

  if (total === 0) {
    return (
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-terminal-text mb-3 flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary dark:text-terminal-orange" />
          Channel Health
        </h3>
        <p className="text-sm text-gray-400 dark:text-terminal-text-muted">No channels configured</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-terminal-text mb-3 flex items-center gap-2">
        <Radio className="w-4 h-4 text-primary dark:text-terminal-orange" />
        Channel Health
      </h3>
      <div className="space-y-2">
        {channels.map((channel, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-terminal-text-secondary capitalize">{channel.type}</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                channel.status === 'connected' ? 'bg-success dark:bg-terminal-green' : 'bg-error dark:bg-terminal-red'
              }`} />
              <span className={`text-xs ${
                channel.status === 'connected' ? 'text-success dark:text-terminal-green' : 'text-error dark:text-terminal-red'
              }`}>
                {channel.status}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-terminal-border">
        <Link to="/channels" className="text-xs text-primary dark:text-terminal-orange hover:text-primary-600 dark:hover:text-terminal-orange/80">
          View all channels →
        </Link>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  // Fetch OpenClaw status
  const { data: openclawStatus, isLoading: loadingStatus } = useQuery({
    queryKey: ['openclaw-status'],
    queryFn: async () => {
      const res = await fetch('/api/status/openclaw');
      if (!res.ok) return { connected: false, port: 18789 };
      return res.json();
    },
    refetchInterval: 5000,
  });

  // Fetch dashboard stats
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/status/stats');
      if (!res.ok) {
        return {
          channels: 0,
          channelsConnected: 0,
          sessions: 0,
          activeSessions: 0,
          cronJobs: 0,
          cronJobsEnabled: 0,
          totalTokens: 0,
          channelList: [],
        };
      }
      return res.json();
    },
    refetchInterval: 10000,
  });

  const isLoading = loadingStatus || loadingStats;

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-5 sm:w-7 h-5 sm:h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-terminal-text">Yoyo AI Assistant</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-terminal-text-secondary">
              Your personal and business AI assistant
            </p>
          </div>
        </div>
      </div>

      {/* OpenClaw Status */}
      <div className="mb-6">
        <OpenClawStatusCard
          connected={openclawStatus?.connected ?? false}
          port={openclawStatus?.port ?? 18789}
          version={openclawStatus?.version}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatsCard
          icon={Radio}
          label="Channels"
          value={stats?.channelsConnected ?? 0}
          subvalue={`${stats?.channels ?? 0} total`}
          color="primary"
          to="/channels"
        />
        <StatsCard
          icon={History}
          label="Active Sessions"
          value={stats?.activeSessions ?? 0}
          subvalue={`${stats?.sessions ?? 0} total`}
          color="accent"
          to="/sessions"
        />
        <StatsCard
          icon={Clock}
          label="Cron Jobs"
          value={stats?.cronJobsEnabled ?? 0}
          subvalue={`${stats?.cronJobs ?? 0} configured`}
          color="success"
          to="/cron"
        />
        <StatsCard
          icon={Coins}
          label="Tokens Used"
          value={stats?.totalTokens ? (stats.totalTokens > 1000 ? `${(stats.totalTokens / 1000).toFixed(1)}K` : stats.totalTokens) : 0}
          subvalue="this month"
          color="warning"
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Quick Actions - takes 2 columns */}
        <div className="lg:col-span-2">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-terminal-text mb-3 sm:mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary dark:text-terminal-orange" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <QuickActionButton
              to="/chat"
              icon={MessageSquare}
              label="Start Chat"
              description="Begin a conversation with Yoyo AI"
            />
            <QuickActionButton
              to="/channels"
              icon={Radio}
              label="Manage Channels"
              description="Configure messaging integrations"
            />
            <QuickActionButton
              to="/sessions"
              icon={History}
              label="View Sessions"
              description="Monitor active conversations"
            />
            <QuickActionButton
              to="/cron"
              icon={Clock}
              label="Scheduled Tasks"
              description="Manage automated jobs"
            />
          </div>
        </div>

        {/* Channel Health - takes 1 column */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-terminal-text mb-3 sm:mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary dark:text-terminal-orange" />
            Status
          </h2>
          <ChannelHealthCard channels={stats?.channelList ?? []} />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-terminal-text mb-3 sm:mb-4">Recent Activity</h2>
        <Card className="p-6 sm:p-8 text-center">
          <div className="text-gray-300 dark:text-terminal-text-muted mb-2">
            <Activity className="w-10 sm:w-12 h-10 sm:h-12 mx-auto opacity-50" />
          </div>
          <p className="text-gray-600 dark:text-terminal-text-secondary">No recent activity</p>
          <p className="text-xs text-gray-400 dark:text-terminal-text-muted mt-1">
            Start a conversation to see your activity here
          </p>
          <Link to="/chat">
            <Button className="mt-4">Start Chatting</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
