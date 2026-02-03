import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Brain,
  Zap,
  Bot,
  Activity,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { PageLoader } from '../components/common/LoadingSpinner';

// Stats card component
function StatsCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: 'cyan' | 'teal' | 'emerald' | 'purple';
}) {
  const colorClasses = {
    cyan: 'bg-cyan-500/10 text-cyan-400',
    teal: 'bg-teal-500/10 text-teal-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    purple: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-terminal-text-secondary mb-1">{label}</p>
          <p className="text-2xl font-bold text-terminal-text">{value}</p>
        </div>
        <div className={`p-2 rounded-md ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}

// OpenClaw status card
function OpenClawStatusCard({ connected, port }: { connected: boolean; port: number }) {
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
            OpenClaw Daemon
          </h3>
          <p className="text-sm text-terminal-text-secondary">
            {connected
              ? `Connected on port ${port}`
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
          conversations: 0,
          memories: 0,
          skills: 0,
          agents: 6,
        };
      }
      return res.json();
    },
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
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          icon={MessageSquare}
          label="Conversations"
          value={stats?.conversations ?? 0}
          color="cyan"
        />
        <StatsCard
          icon={Brain}
          label="Memories"
          value={stats?.memories ?? 0}
          color="teal"
        />
        <StatsCard
          icon={Zap}
          label="Skills"
          value={stats?.skills ?? 0}
          color="emerald"
        />
        <StatsCard
          icon={Bot}
          label="Agents"
          value={stats?.agents ?? 6}
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-terminal-text mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionButton
            to="/chat"
            icon={MessageSquare}
            label="Start Chat"
            description="Begin a conversation with Yoyo AI"
          />
          <QuickActionButton
            to="/memory"
            icon={Brain}
            label="Browse Memory"
            description="View and manage stored memories"
          />
          <QuickActionButton
            to="/skills"
            icon={Zap}
            label="View Skills"
            description="Explore learned skills and capabilities"
          />
        </div>
      </div>

      {/* Recent Activity Placeholder */}
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
