import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Radio,
  History,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Coins,
  Bot,
  Cpu,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { GatewayConfigCard } from '../components/dashboard/GatewayConfigCard';
import { useGatewayQuery } from '../hooks/useGatewayRPC';
import { useGatewayStatus } from '../hooks/useGatewayStatus';
import { useGatewayTick } from '../hooks/useGatewayEvent';
import type {
  HealthResponse,
  SessionsListResponse,
  ChannelsStatusResponse,
  CronListResponse,
  ModelsListResponse,
  AgentsListResponse,
} from '../lib/gateway-types';
import { normalizeChannels } from '../lib/gateway-types';

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

// Gateway connection status card
function GatewayStatusCard({
  connected,
  version,
  reconnect,
}: {
  connected: boolean;
  version: string | null;
  reconnect: () => void;
}) {
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
            YoyoClaw Gateway
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-terminal-text-secondary truncate">
            {connected
              ? `Connected via WebSocket${version ? ` · v${version}` : ''}`
              : 'Not connected — Start with: yoyo-ai --start'}
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-center">
          {!connected && (
            <button
              onClick={reconnect}
              className="p-1.5 rounded-md hover:bg-terminal-elevated transition-colors"
              title="Reconnect"
            >
              <RefreshCw className="w-4 h-4 text-terminal-text-secondary" />
            </button>
          )}
          <div className="flex items-center gap-2">
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
  if (!channels || channels.length === 0) {
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
  const queryClient = useQueryClient();
  const { isConnected, gatewayVersion, reconnect } = useGatewayStatus();

  // Fetch data from OpenClaw gateway via WebSocket RPC
  const { data: health } = useGatewayQuery<HealthResponse>('health', undefined, {
    staleTime: 15_000,
  });

  const { data: sessions } = useGatewayQuery<SessionsListResponse>(
    'sessions.list',
    { limit: 50, includeGlobal: true },
    { staleTime: 15_000 },
  );

  const { data: channelsData } = useGatewayQuery<ChannelsStatusResponse>(
    'channels.status',
    { probe: false },
    { staleTime: 15_000 },
  );

  const { data: cronData } = useGatewayQuery<CronListResponse>('cron.list', undefined, {
    staleTime: 30_000,
  });

  const { data: modelsData } = useGatewayQuery<ModelsListResponse>('models.list', undefined, {
    staleTime: 60_000,
  });

  const { data: agentsData } = useGatewayQuery<AgentsListResponse>('agents.list', undefined, {
    staleTime: 30_000,
  });

  // Auto-refresh on gateway tick events (~30s)
  const handleTick = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['gateway', 'health'] });
    queryClient.invalidateQueries({ queryKey: ['gateway', 'sessions.list'] });
    queryClient.invalidateQueries({ queryKey: ['gateway', 'channels.status'] });
    queryClient.invalidateQueries({ queryKey: ['gateway', 'cron.list'] });
  }, [queryClient]);

  useGatewayTick(handleTick);

  // Derive stats from RPC responses
  const sessionList = sessions?.sessions ?? [];
  const channelList = normalizeChannels(channelsData?.channels);
  const cronJobs = cronData?.jobs ?? [];
  const models = modelsData?.models ?? [];
  const agents = agentsData?.agents ?? [];

  const connectedChannels = channelList.filter((ch) => ch.status === 'connected').length;
  const activeSessions = sessionList.length;
  const enabledCronJobs = cronJobs.filter((j) => j.enabled !== false).length;
  const totalTokens = sessionList.reduce((sum, s) => sum + (s.tokenUsage?.total ?? 0), 0);

  // Map channels to the format ChannelHealthCard expects
  const channelHealth = channelList.map((ch) => ({
    type: ch.type || ch.name || 'unknown',
    status: ch.status === 'connected' ? 'connected' : 'disconnected',
  }));

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <img src="/yoyo.svg" alt="Yoyo AI" className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-terminal-text">Yoyo AI Assistant</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-terminal-text-secondary">
              Your Business and Personal AI Assistant
            </p>
          </div>
        </div>
      </div>

      {/* Gateway Connection Status */}
      <div className="mb-6">
        <GatewayStatusCard
          connected={isConnected}
          version={gatewayVersion || (health as Record<string, unknown>)?.version as string || null}
          reconnect={reconnect}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatsCard
          icon={Radio}
          label="Channels"
          value={connectedChannels}
          subvalue={`${channelList.length} total`}
          color="primary"
          to="/channels"
        />
        <StatsCard
          icon={History}
          label="Sessions"
          value={activeSessions}
          subvalue="active"
          color="accent"
          to="/sessions"
        />
        <StatsCard
          icon={Bot}
          label="Agents"
          value={agents.length}
          subvalue={agentsData?.defaultId ? `default: ${agentsData.defaultId}` : undefined}
          color="info"
          to="/agents"
        />
        <StatsCard
          icon={Clock}
          label="Cron Jobs"
          value={enabledCronJobs}
          subvalue={`${cronJobs.length} configured`}
          color="success"
          to="/cron"
        />
        <StatsCard
          icon={Coins}
          label="Tokens Used"
          value={totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}K` : totalTokens}
          subvalue={`${models.length} models available`}
          color="warning"
          to="/models"
        />
      </div>

      {/* Gateway Configuration */}
      <div className="mb-6 sm:mb-8">
        <GatewayConfigCard />
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
              to="/agents"
              icon={Bot}
              label="View Agents"
              description="Monitor and manage AI agents"
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
            <QuickActionButton
              to="/gateway"
              icon={Cpu}
              label="Gateway"
              description="Gateway status and live logs"
            />
          </div>
        </div>

        {/* Channel Health - takes 1 column */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-terminal-text mb-3 sm:mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary dark:text-terminal-orange" />
            Status
          </h2>
          <div className="space-y-4">
            <ChannelHealthCard channels={channelHealth} />

            {/* Agents summary card */}
            {agents.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-terminal-text mb-3 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary dark:text-terminal-orange" />
                  Agents
                </h3>
                <div className="space-y-2">
                  {agents.map((agent) => (
                    <div key={agent.id || agent.key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-terminal-text-secondary">
                        {agent.identity?.name || agent.key || agent.id}
                      </span>
                      <div className="flex items-center gap-2">
                        {agent.isDefault && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary dark:text-terminal-orange">
                            default
                          </span>
                        )}
                        <Zap className="w-3 h-3 text-terminal-green" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-terminal-border">
                  <Link to="/agents" className="text-xs text-primary dark:text-terminal-orange hover:text-primary-600 dark:hover:text-terminal-orange/80">
                    View all agents →
                  </Link>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-terminal-text mb-3 sm:mb-4">Recent Sessions</h2>
        {sessionList.length > 0 ? (
          <div className="space-y-2">
            {sessionList.slice(0, 5).map((session) => (
              <Card key={session.key} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-terminal-text truncate">
                      {session.label || session.key}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-terminal-text-muted">
                      {session.model || 'default model'}
                      {session.messageCount ? ` · ${session.messageCount} messages` : ''}
                    </p>
                  </div>
                  {session.lastActivity && (
                    <span className="text-xs text-gray-400 dark:text-terminal-text-muted whitespace-nowrap ml-4">
                      {formatTimeAgo(session.lastActivity)}
                    </span>
                  )}
                </div>
              </Card>
            ))}
            <div className="text-center pt-2">
              <Link to="/sessions" className="text-xs text-primary dark:text-terminal-orange hover:text-primary-600">
                View all sessions →
              </Link>
            </div>
          </div>
        ) : (
          <Card className="p-6 sm:p-8 text-center">
            <div className="text-gray-300 dark:text-terminal-text-muted mb-2">
              <Activity className="w-10 sm:w-12 h-10 sm:h-12 mx-auto opacity-50" />
            </div>
            <p className="text-gray-600 dark:text-terminal-text-secondary">No active sessions</p>
            <p className="text-xs text-gray-400 dark:text-terminal-text-muted mt-1">
              Start a conversation to see your sessions here
            </p>
            <Link to="/chat">
              <Button className="mt-4">Start Chatting</Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return dateStr;
  }
}
