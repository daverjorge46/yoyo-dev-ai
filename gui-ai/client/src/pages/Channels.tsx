import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  QrCode,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { PageLoader } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';

interface Channel {
  id: string;
  type: 'whatsapp' | 'telegram' | 'email' | 'web' | 'sms';
  name: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  account?: string;
  lastActivity?: number;
  messageCount?: number;
  errorMessage?: string;
}

const channelIcons = {
  whatsapp: MessageCircle,
  telegram: Phone,
  email: Mail,
  web: Globe,
  sms: Phone,
};

const statusConfig = {
  connected: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    label: 'Connected',
  },
  disconnected: {
    icon: XCircle,
    color: 'text-terminal-text-muted',
    bgColor: 'bg-terminal-elevated',
    label: 'Disconnected',
  },
  error: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    label: 'Error',
  },
  pending: {
    icon: RefreshCw,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    label: 'Pending',
  },
};

function ChannelCard({ channel }: { channel: Channel }) {
  const queryClient = useQueryClient();
  const Icon = channelIcons[channel.type] || Globe;
  const status = statusConfig[channel.status];
  const StatusIcon = status.icon;

  const reconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/openclaw/channels/${channel.id}/reconnect`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to reconnect');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });

  return (
    <Card className="p-4 hover:bg-terminal-elevated/50 transition-colors">
      <div className="flex items-start gap-4">
        {/* Channel icon */}
        <div className={`p-3 rounded-lg ${status.bgColor}`}>
          <Icon className={`w-6 h-6 ${status.color}`} />
        </div>

        {/* Channel info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-terminal-text">{channel.name}</h3>
            <Badge variant={channel.status === 'connected' ? 'success' : channel.status === 'error' ? 'error' : 'default'}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </Badge>
          </div>

          {channel.account && (
            <p className="text-sm text-terminal-text-secondary mb-2">
              {channel.account}
            </p>
          )}

          {channel.errorMessage && (
            <p className="text-xs text-red-400 mb-2">
              {channel.errorMessage}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-terminal-text-muted">
            {channel.messageCount !== undefined && (
              <span>{channel.messageCount.toLocaleString()} messages</span>
            )}
            {channel.lastActivity && (
              <span>
                Last activity: {new Date(channel.lastActivity).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {channel.status === 'disconnected' && channel.type === 'whatsapp' && (
            <Button size="sm" variant="secondary" icon={<QrCode className="w-4 h-4" />}>
              Scan QR
            </Button>
          )}
          {channel.status === 'error' && (
            <Button
              size="sm"
              variant="secondary"
              icon={<RefreshCw className="w-4 h-4" />}
              loading={reconnectMutation.isPending}
              onClick={() => reconnectMutation.mutate()}
            >
              Reconnect
            </Button>
          )}
          {channel.status === 'connected' && (
            <Button size="sm" variant="ghost" icon={<ExternalLink className="w-4 h-4" />}>
              Open
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function Channels() {
  const { data: channels, isLoading, error } = useQuery<Channel[]>({
    queryKey: ['channels'],
    queryFn: async () => {
      const res = await fetch('/api/openclaw/channels');
      if (!res.ok) {
        if (res.status === 503) {
          // OpenClaw not connected
          return [];
        }
        throw new Error('Failed to fetch channels');
      }
      return res.json();
    },
    refetchInterval: 15000,
  });

  const { data: openclawStatus } = useQuery({
    queryKey: ['openclaw-status'],
    queryFn: async () => {
      const res = await fetch('/api/status/openclaw');
      if (!res.ok) return { connected: false };
      return res.json();
    },
  });

  if (isLoading) {
    return <PageLoader />;
  }

  const connected = channels?.filter(c => c.status === 'connected').length ?? 0;
  const total = channels?.length ?? 0;

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
            <Button icon={<RefreshCw className="w-4 h-4" />} variant="secondary">
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* OpenClaw status warning */}
      {!openclawStatus?.connected && (
        <Card className="p-4 mb-6 border-l-4 border-l-amber-500 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-medium text-terminal-text">OpenClaw not connected</h3>
              <p className="text-sm text-terminal-text-secondary">
                Start OpenClaw daemon to manage channels: <code className="text-cyan-400">yoyo-ai start</code>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Channels grid */}
      {channels && channels.length > 0 ? (
        <div className="space-y-3">
          {channels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="text-terminal-text-muted mb-4">
            <Radio className="w-16 h-16 mx-auto opacity-50" />
          </div>
          <h3 className="text-lg font-semibold text-terminal-text mb-2">
            No channels configured
          </h3>
          <p className="text-sm text-terminal-text-secondary max-w-md mx-auto mb-4">
            {openclawStatus?.connected
              ? 'Connect your first messaging channel to start receiving messages.'
              : 'Start OpenClaw daemon to configure channels.'}
          </p>
          {openclawStatus?.connected && (
            <Button icon={<MessageCircle className="w-4 h-4" />}>
              Add Channel
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
