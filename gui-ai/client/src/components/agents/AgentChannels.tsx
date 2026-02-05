import {
  Radio,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { useGatewayQuery } from '../../hooks/useGatewayRPC';
import type { Agent, ChannelsStatusResponse } from '../../lib/gateway-types';

interface AgentChannelsProps {
  agent: Agent;
}

function statusIcon(status: string) {
  switch (status) {
    case 'connected':
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case 'disconnected':
      return <XCircle className="w-4 h-4 text-red-400" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-amber-400" />;
    default:
      return <Loader2 className="w-4 h-4 text-terminal-text-muted animate-spin" />;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'connected':
      return <Badge variant="success">Connected</Badge>;
    case 'disconnected':
      return <Badge variant="error">Disconnected</Badge>;
    case 'error':
      return <Badge variant="warning">Error</Badge>;
    default:
      return <Badge variant="muted">{status}</Badge>;
  }
}

export function AgentChannels({ agent }: AgentChannelsProps) {
  const channelNames = agent.channels || [];

  // Fetch full channel status for enriched data
  const { data: channelsData } = useGatewayQuery<ChannelsStatusResponse>(
    'channels.status',
    { probe: false },
    { staleTime: 30_000 },
  );

  const allChannels = channelsData?.channels || [];

  // Match agent channels with full channel data
  const enrichedChannels = channelNames.map((name) => {
    const full = allChannels.find(
      (c) => c.type === name || c.name === name,
    );
    return {
      name,
      type: full?.type || name,
      status: full?.status || 'unknown',
      account: full?.account,
      phone: full?.phone,
      username: full?.username,
    };
  });

  if (channelNames.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Radio className="w-12 h-12 mx-auto text-terminal-text-muted mb-3 opacity-50" />
        <h3 className="text-sm font-medium text-terminal-text mb-1">No channels</h3>
        <p className="text-xs text-terminal-text-muted">
          This agent has no channels configured.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <Badge variant="primary">{enrichedChannels.length} channels</Badge>
      </div>

      {enrichedChannels.map((channel) => (
        <Card key={channel.name} variant="hover" className="px-4 py-3">
          <div className="flex items-center gap-3">
            {statusIcon(channel.status)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-terminal-text capitalize">
                  {channel.type}
                </span>
                {statusBadge(channel.status)}
              </div>
              {(channel.account || channel.phone || channel.username) && (
                <p className="text-xs text-terminal-text-secondary mt-0.5">
                  {channel.account || channel.phone || channel.username}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
