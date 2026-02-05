import {
  Server,
  Activity,
  Clock,
  Wifi,
  Bot,
  Radio,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useGatewayQuery } from '../hooks/useGatewayRPC';
import { useGatewayTick } from '../hooks/useGatewayEvent';
import { useGatewayStatus } from '../hooks/useGatewayStatus';
import type {
  HealthResponse,
  StatusResponse,
  AgentsListResponse,
  ChannelsStatusResponse,
} from '../lib/gateway-types';

function formatUptime(seconds?: number): string {
  if (seconds == null) return 'unknown';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function InfoRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-terminal-border/50 last:border-0">
      <span className="text-xs text-terminal-text-muted flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-sm text-terminal-text font-mono">{value}</span>
    </div>
  );
}

export default function Instances() {
  const { isConnected, gatewayVersion: version } = useGatewayStatus();

  const {
    data: healthData,
    isLoading: loadingHealth,
    refetch: refetchHealth,
  } = useGatewayQuery<HealthResponse>('health', undefined, {
    staleTime: 10_000,
  });

  const {
    data: statusData,
    isLoading: loadingStatus,
    refetch: refetchStatus,
  } = useGatewayQuery<StatusResponse>('status', undefined, {
    staleTime: 10_000,
  });

  const { data: agentsData, refetch: refetchAgents } = useGatewayQuery<AgentsListResponse>(
    'agents.list',
    undefined,
    { staleTime: 30_000 },
  );

  const { data: channelsData, refetch: refetchChannels } = useGatewayQuery<ChannelsStatusResponse>(
    'channels.status',
    undefined,
    { staleTime: 30_000 },
  );

  useGatewayTick(() => {
    refetchHealth();
    refetchStatus();
    refetchAgents();
    refetchChannels();
  });

  const isLoading = loadingHealth || loadingStatus;
  const agents = agentsData?.agents || [];
  const channels = channelsData?.channels || [];
  const connectedChannels = channels.filter((c) => c.status === 'connected').length;

  const refetchAll = () => {
    refetchHealth();
    refetchStatus();
    refetchAgents();
    refetchChannels();
  };

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
              <Server className="w-7 h-7 text-cyan-400" />
              Instances
            </h1>
            <p className="text-sm text-terminal-text-secondary mt-1">
              OpenClaw gateway instance overview
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={isConnected ? 'success' : 'error'}>
              <Wifi className="w-3 h-3" />
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Button
              icon={<RefreshCw className="w-4 h-4" />}
              variant="secondary"
              onClick={refetchAll}
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
                Connect to the OpenClaw gateway to view instance details.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-6">
        <Card className="p-4 text-center">
          <Activity className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-terminal-text">
            {healthData?.ok ? 'OK' : 'Down'}
          </p>
          <p className="text-xs text-terminal-text-muted">Health</p>
        </Card>
        <Card className="p-4 text-center">
          <Clock className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-terminal-text">
            {formatUptime(healthData?.uptime || statusData?.uptime)}
          </p>
          <p className="text-xs text-terminal-text-muted">Uptime</p>
        </Card>
        <Card className="p-4 text-center">
          <Bot className="w-5 h-5 text-primary-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-terminal-text">{agents.length}</p>
          <p className="text-xs text-terminal-text-muted">Agents</p>
        </Card>
        <Card className="p-4 text-center">
          <Radio className="w-5 h-5 text-amber-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-terminal-text">
            {connectedChannels}/{channels.length}
          </p>
          <p className="text-xs text-terminal-text-muted">Channels</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gateway Details */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-terminal-text mb-3 flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            Gateway Details
          </h3>
          <div>
            <InfoRow label="Version" value={version || healthData?.version || 'unknown'} />
            <InfoRow label="Uptime" value={formatUptime(healthData?.uptime || statusData?.uptime)} />
            {statusData?.gateway?.bindAddress && (
              <InfoRow label="Bind Address" value={statusData.gateway.bindAddress} />
            )}
            {statusData?.gateway?.port && (
              <InfoRow label="Port" value={statusData.gateway.port} />
            )}
            <InfoRow label="Health" value={
              <Badge variant={healthData?.ok ? 'success' : 'error'}>
                {healthData?.ok ? 'Healthy' : 'Unhealthy'}
              </Badge>
            } />
          </div>
        </Card>

        {/* Agents Summary */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-terminal-text mb-3 flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary-400" />
            Agents ({agents.length})
          </h3>
          {agents.length > 0 ? (
            <div className="space-y-0">
              {agents.map((agent) => (
                <div key={agent.key} className="flex items-center justify-between py-2.5 border-b border-terminal-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-terminal-text">{agent.name || agent.key}</span>
                    {agent.isDefault && <Badge variant="primary">Default</Badge>}
                  </div>
                  <span className="text-xs text-terminal-text-muted font-mono">{agent.model || 'no model'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-terminal-text-muted text-center py-4">No agents configured</p>
          )}
        </Card>
      </div>
    </div>
  );
}
