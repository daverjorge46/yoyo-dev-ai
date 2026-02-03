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
  Server,
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
  color: 'cyan' | 'teal' | 'emerald' | 'purple' | 'amber';
  to?: string;
}) {
  const colorClasses = {
    cyan: 'bg-cyan-500/10 text-cyan-400',
    teal: 'bg-teal-500/10 text-teal-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    purple: 'bg-purple-500/10 text-purple-400',
    amber: 'bg-amber-500/10 text-amber-400',
  };

  const content = (
    <Card className={`p-4 ${to ? 'hover:bg-terminal-elevated/50 transition-colors cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-terminal-text-secondary mb-1">{label}</p>
          <p className="text-2xl font-bold text-terminal-text">{value}</p>
          {subvalue && (
            <p className="text-xs text-terminal-text-muted mt-1">{subvalue}</p>
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
    <Card className="p-6 border-l-4 border-l-cyan-500">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${connected ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          {connected ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          ) : (
            <XCircle className="w-8 h-8 text-red-400" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-terminal-text">
            OpenClaw Gateway
          </h3>
          <p className="text-sm text-terminal-text-secondary">
            {connected
              ? `Connected on port ${port}${version ? ` • v${version}` : ''}`
              : 'Not running - Start with: yoyo-ai start'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className={`text-sm font-medium ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
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
      <Card className="p-4 hover:bg-terminal-elevated transition-colors cursor-pointer group">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
            <Icon className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-terminal-text">{label}</h4>
            <p className="text-xs text-terminal-text-secondary">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// Channel health card
function ChannelHealthCard({ channels }: { channels: Array<{ type: string; status: string }> }) {
  const connected = channels.filter(c => c.status === 'connected').length;
  const total = channels.length;

  if (total === 0) {
    return (
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-terminal-text mb-3 flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          Channel Health
        </h3>
        <p className="text-sm text-terminal-text-muted">No channels configured</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-terminal-text mb-3 flex items-center gap-2">
        <Radio className="w-4 h-4 text-cyan-400" />
        Channel Health
      </h3>
      <div className="space-y-2">
        {channels.map((channel, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-terminal-text-secondary capitalize">{channel.type}</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                channel.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
              }`} />
              <span className={`text-xs ${
                channel.status === 'connected' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {channel.status}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-terminal-border">
        <Link to="/channels" className="text-xs text-cyan-400 hover:text-cyan-300">
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-terminal-text">Yoyo AI Assistant</h1>
            <p className="text-sm text-terminal-text-secondary">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          icon={Radio}
          label="Channels"
          value={stats?.channelsConnected ?? 0}
          subvalue={`${stats?.channels ?? 0} total`}
          color="cyan"
          to="/channels"
        />
        <StatsCard
          icon={History}
          label="Active Sessions"
          value={stats?.activeSessions ?? 0}
          subvalue={`${stats?.sessions ?? 0} total`}
          color="teal"
          to="/sessions"
        />
        <StatsCard
          icon={Clock}
          label="Cron Jobs"
          value={stats?.cronJobsEnabled ?? 0}
          subvalue={`${stats?.cronJobs ?? 0} configured`}
          color="emerald"
          to="/cron"
        />
        <StatsCard
          icon={Coins}
          label="Tokens Used"
          value={stats?.totalTokens ? (stats.totalTokens > 1000 ? `${(stats.totalTokens / 1000).toFixed(1)}K` : stats.totalTokens) : 0}
          subvalue="this month"
          color="amber"
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Actions - takes 2 columns */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-terminal-text mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <h2 className="text-lg font-semibold text-terminal-text mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Status
          </h2>
          <ChannelHealthCard channels={stats?.channelList ?? []} />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-terminal-text mb-4">Recent Activity</h2>
        <Card className="p-8 text-center">
          <div className="text-terminal-text-muted mb-2">
            <Activity className="w-12 h-12 mx-auto opacity-50" />
          </div>
          <p className="text-terminal-text-secondary">No recent activity</p>
          <p className="text-xs text-terminal-text-muted mt-1">
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
