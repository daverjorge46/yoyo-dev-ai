import {
  Radio,
  MessageCircle,
  Phone,
  Mail,
  Globe,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Loader2,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useGatewayQuery, useGatewayMutation } from '../hooks/useGatewayRPC';
import { useGatewayTick } from '../hooks/useGatewayEvent';
import { useGatewayStatus } from '../hooks/useGatewayStatus';
import type { ChannelsStatusResponse, Channel } from '../lib/gateway-types';

const channelIcons: Record<string, React.ElementType> = {
  whatsapp: MessageCircle,
  telegram: Phone,
  discord: MessageCircle,
  email: Mail,
  web: Globe,
  sms: Phone,
};

const statusConfig: Record<string, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  label: string;
  badgeVariant: 'success' | 'error' | 'warning' | 'default';
}> = {
  connected: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    label: 'Connected',
    badgeVariant: 'success',
  },
  disconnected: {
    icon: XCircle,
    color: 'text-terminal-text-muted',
    bgColor: 'bg-terminal-elevated',
    label: 'Disconnected',
    badgeVariant: 'default',
  },
  error: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    label: 'Error',
    badgeVariant: 'error',
  },
  unknown: {
    icon: RefreshCw,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    label: 'Unknown',
    badgeVariant: 'warning',
  },
};

function ChannelCard({
  channel,
  onLogout,
}: {
  channel: Channel;
  onLogout: () => void;
}) {
  const Icon = channelIcons[channel.type] || Globe;
  const status = statusConfig[channel.status] || statusConfig.unknown;
  const StatusIcon = status.icon;

  const logoutMutation = useGatewayMutation<{ channel: string }, unknown>(
    'channels.logout',
    {
      onSuccess: onLogout,
      invalidateQueries: ['channels.status'],
    },
  );

  return (
    <Card className="p-4 hover:bg-terminal-elevated/50 transition-colors group">
      <div className="flex items-start gap-4">
        {/* Channel icon */}
        <div className={`p-3 rounded-lg ${status.bgColor}`}>
          <Icon className={`w-6 h-6 ${status.color}`} />
        </div>

        {/* Channel info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-terminal-text capitalize">
              {channel.name || channel.type}
            </h3>
            <Badge variant={status.badgeVariant}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </Badge>
          </div>

          {/* Account info */}
          {(channel.account || channel.phone || channel.username) && (
            <p className="text-sm text-terminal-text-secondary mb-1.5">
              {channel.account || channel.phone || channel.username}
            </p>
          )}

          {/* Auth age */}
          {channel.authAge && (
            <p className="text-xs text-terminal-text-muted">
              Auth age: {channel.authAge}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {channel.status === 'connected' && (
            <Button
              size="sm"
              variant="ghost"
              title="Logout channel"
              icon={<LogOut className="w-4 h-4" />}
              loading={logoutMutation.isPending}
              onClick={() => {
                if (confirm(`Logout from ${channel.type}?`)) {
                  logoutMutation.mutate({ channel: channel.type });
                }
              }}
            >
              Logout
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function Channels() {
  const { isConnected } = useGatewayStatus();

  const {
    data: channelsData,
    isLoading,
    refetch,
  } = useGatewayQuery<ChannelsStatusResponse>(
    'channels.status',
    { probe: true, timeoutMs: 15_000 },
    { staleTime: 30_000 },
  );

  // Auto-refresh on tick
  useGatewayTick(() => {
    refetch();
  });

  const channels = channelsData?.channels || [];
  const connected = channels.filter((c) => c.status === 'connected').length;
  const total = channels.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-terminal-text flex items-center gap-3">
              <Radio className="w-7 h-7 text-cyan-400" />
              Channels
            </h1>
            <p className="text-sm text-terminal-text-secondary mt-1">
              Manage your messaging channels and integrations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-terminal-text-secondary">
              <span className="text-emerald-400 font-medium">{connected}</span>
              <span className="text-terminal-text-muted"> / {total} connected</span>
            </div>
            <Button
              icon={<RefreshCw className="w-4 h-4" />}
              variant="secondary"
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Gateway disconnected warning */}
      {!isConnected && (
        <Card className="p-4 mb-6 border-l-4 border-l-amber-500 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-medium text-terminal-text">Gateway disconnected</h3>
              <p className="text-sm text-terminal-text-secondary">
                Connect to the OpenClaw gateway to manage channels.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Channels list */}
      {channels.length > 0 ? (
        <div className="space-y-3">
          {channels.map((channel, idx) => (
            <ChannelCard
              key={`${channel.type}-${idx}`}
              channel={channel}
              onLogout={() => refetch()}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Radio className="w-16 h-16 mx-auto text-terminal-text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-terminal-text mb-2">
            No channels configured
          </h3>
          <p className="text-sm text-terminal-text-secondary max-w-md mx-auto">
            {isConnected
              ? 'No channels are configured in OpenClaw.'
              : 'Connect to the gateway to view channels.'}
          </p>
        </Card>
      )}
    </div>
  );
}
