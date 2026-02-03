import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Server,
  Play,
  Square,
  RefreshCw,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { PageLoader } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';

interface Instance {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error' | 'starting';
  model?: string;
  uptime?: number;
  cpu?: number;
  memory?: number;
  requestsHandled?: number;
  lastError?: string;
}

const statusConfig = {
  running: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    label: 'Running',
    badgeVariant: 'success' as const,
  },
  stopped: {
    icon: Square,
    color: 'text-terminal-text-muted',
    bgColor: 'bg-terminal-elevated',
    label: 'Stopped',
    badgeVariant: 'default' as const,
  },
  error: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    label: 'Error',
    badgeVariant: 'error' as const,
  },
  starting: {
    icon: RefreshCw,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    label: 'Starting',
    badgeVariant: 'warning' as const,
  },
};

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function InstanceCard({ instance }: { instance: Instance }) {
  const queryClient = useQueryClient();
  const status = statusConfig[instance.status];
  const StatusIcon = status.icon;

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/openclaw/instances/${instance.id}/start`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to start instance');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/openclaw/instances/${instance.id}/stop`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to stop instance');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
  });

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${status.bgColor}`}>
            <Server className={`w-5 h-5 ${status.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-terminal-text">{instance.name}</h3>
            {instance.model && (
              <p className="text-xs text-terminal-text-secondary">{instance.model}</p>
            )}
          </div>
        </div>
        <Badge variant={status.badgeVariant}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </Badge>
      </div>

      {instance.status === 'running' && (
        <div className="space-y-3 mb-4">
          {/* CPU usage */}
          {instance.cpu !== undefined && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-terminal-text-secondary flex items-center gap-1">
                  <Cpu className="w-3 h-3" /> CPU
                </span>
                <span className="text-terminal-text">{instance.cpu}%</span>
              </div>
              <ProgressBar value={instance.cpu} max={100} />
            </div>
          )}

          {/* Memory usage */}
          {instance.memory !== undefined && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-terminal-text-secondary flex items-center gap-1">
                  <HardDrive className="w-3 h-3" /> Memory
                </span>
                <span className="text-terminal-text">{instance.memory}%</span>
              </div>
              <ProgressBar value={instance.memory} max={100} />
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-terminal-text-muted pt-2">
            {instance.uptime !== undefined && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Uptime: {formatUptime(instance.uptime)}
              </span>
            )}
            {instance.requestsHandled !== undefined && (
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {instance.requestsHandled.toLocaleString()} requests
              </span>
            )}
          </div>
        </div>
      )}

      {instance.lastError && (
        <p className="text-xs text-red-400 mb-4">{instance.lastError}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-terminal-border">
        {instance.status === 'running' ? (
          <Button
            size="sm"
            variant="secondary"
            icon={<Square className="w-4 h-4" />}
            loading={stopMutation.isPending}
            onClick={() => stopMutation.mutate()}
          >
            Stop
          </Button>
        ) : (
          <Button
            size="sm"
            icon={<Play className="w-4 h-4" />}
            loading={startMutation.isPending}
            onClick={() => startMutation.mutate()}
          >
            Start
          </Button>
        )}
        <Button size="sm" variant="ghost" icon={<RefreshCw className="w-4 h-4" />}>
          Restart
        </Button>
      </div>
    </Card>
  );
}

export default function Instances() {
  const { data: instances, isLoading } = useQuery<Instance[]>({
    queryKey: ['instances'],
    queryFn: async () => {
      const res = await fetch('/api/openclaw/instances');
      if (!res.ok) {
        if (res.status === 503) return [];
        throw new Error('Failed to fetch instances');
      }
      return res.json();
    },
    refetchInterval: 5000,
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

  const running = instances?.filter(i => i.status === 'running').length ?? 0;
  const total = instances?.length ?? 0;

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
              Manage OpenClaw agent instances
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-terminal-text-secondary">
              <span className="text-emerald-400 font-medium">{running}</span>
              <span className="text-terminal-text-muted"> / {total} running</span>
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
                Start OpenClaw daemon to manage instances: <code className="text-cyan-400">yoyo-ai start</code>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Instances grid */}
      {instances && instances.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instances.map((instance) => (
            <InstanceCard key={instance.id} instance={instance} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="text-terminal-text-muted mb-4">
            <Server className="w-16 h-16 mx-auto opacity-50" />
          </div>
          <h3 className="text-lg font-semibold text-terminal-text mb-2">
            No instances
          </h3>
          <p className="text-sm text-terminal-text-secondary max-w-md mx-auto">
            {openclawStatus?.connected
              ? 'No agent instances are currently configured.'
              : 'Start OpenClaw daemon to view instances.'}
          </p>
        </Card>
      )}
    </div>
  );
}
