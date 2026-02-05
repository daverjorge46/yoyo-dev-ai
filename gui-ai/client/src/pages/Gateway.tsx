import { useState, useRef, useEffect } from 'react';
import {
  Server,
  Activity,
  Clock,
  Users,
  Wifi,
  Monitor,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Pause,
  Play,
  Search,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useGatewayQuery } from '../hooks/useGatewayRPC';
import { useGatewayEvent, useGatewayTick } from '../hooks/useGatewayEvent';
import { useGatewayStatus } from '../hooks/useGatewayStatus';
import type {
  HealthResponse,
  StatusResponse,
  SystemPresenceResponse,
  PresenceClient,
  LogEntry,
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

function formatConnectedTime(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-terminal-border/50 last:border-0">
      <span className="text-xs text-terminal-text-muted">{label}</span>
      <span className="text-sm text-terminal-text font-mono">{value}</span>
    </div>
  );
}

// ─── Client Card ──────────────────────────────────────────────────────────────

function ClientCard({ client }: { client: PresenceClient }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-terminal-border/50 last:border-0">
      <div className="p-1.5 rounded-lg bg-primary-500/10">
        <Monitor className="w-4 h-4 text-primary-400" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-terminal-text truncate block">
          {client.displayName || client.id}
        </span>
        {client.mode && (
          <span className="text-xs text-terminal-text-muted">{client.mode}</span>
        )}
      </div>
      {client.connectedAt && (
        <span className="text-xs text-terminal-text-muted">
          {formatConnectedTime(client.connectedAt)}
        </span>
      )}
    </div>
  );
}

// ─── Live Log Panel ───────────────────────────────────────────────────────────

function LogPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  // Listen for log events
  useGatewayEvent('log', (payload: unknown) => {
    const entry = payload as LogEntry;
    if (pausedRef.current) return;
    setLogs((prev) => {
      const next = [...prev, entry];
      // Keep last 200 entries
      return next.length > 200 ? next.slice(-200) : next;
    });
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, paused]);

  const filtered = filter
    ? logs.filter(
        (l) =>
          l.message.toLowerCase().includes(filter.toLowerCase()) ||
          (l.source && l.source.toLowerCase().includes(filter.toLowerCase())),
      )
    : logs;

  const levelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'text-red-400';
      case 'warn':
      case 'warning': return 'text-amber-400';
      case 'info': return 'text-cyan-400';
      case 'debug': return 'text-terminal-text-muted';
      default: return 'text-terminal-text-secondary';
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border">
        <h3 className="text-sm font-semibold text-terminal-text flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          Live Logs
        </h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-terminal-text-muted" />
            <input
              type="text"
              placeholder="Filter..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-7 pr-2 py-1 w-40 bg-terminal-surface border border-terminal-border rounded text-xs text-terminal-text placeholder-terminal-text-muted focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={() => setPaused(!paused)}
            className={`p-1.5 rounded transition-colors ${
              paused ? 'bg-amber-500/10 text-amber-400' : 'text-terminal-text-muted hover:text-terminal-text'
            }`}
            title={paused ? 'Resume' : 'Pause'}
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setLogs([])}
            className="p-1.5 rounded text-terminal-text-muted hover:text-terminal-text transition-colors"
            title="Clear logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="h-72 overflow-auto bg-terminal-surface p-3 font-mono text-xs leading-relaxed"
      >
        {filtered.length > 0 ? (
          filtered.map((log, i) => (
            <div key={i} className="flex gap-2 hover:bg-terminal-elevated/50 rounded px-1">
              {log.timestamp && (
                <span className="text-terminal-text-muted flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              )}
              <span className={`flex-shrink-0 uppercase w-12 ${levelColor(log.level)}`}>
                {log.level.slice(0, 5)}
              </span>
              {log.source && (
                <span className="text-primary-400 flex-shrink-0">[{log.source}]</span>
              )}
              <span className="text-terminal-text-secondary">{log.message}</span>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-terminal-text-muted">
            {paused ? 'Paused - click play to resume' : 'Waiting for log events...'}
          </div>
        )}
      </div>

      {paused && (
        <div className="px-4 py-1.5 bg-amber-500/10 text-xs text-amber-400 text-center">
          Log tailing paused
        </div>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Gateway() {
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

  const {
    data: presenceData,
    isLoading: loadingPresence,
    refetch: refetchPresence,
  } = useGatewayQuery<SystemPresenceResponse>('system.presence', undefined, {
    staleTime: 10_000,
  });

  useGatewayTick(() => {
    refetchHealth();
    refetchStatus();
    refetchPresence();
  });

  const isLoading = loadingHealth || loadingStatus;
  const clients = presenceData?.clients || [];

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
              Gateway
            </h1>
            <p className="text-sm text-terminal-text-secondary mt-1">
              OpenClaw gateway status and monitoring
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
              onClick={() => {
                refetchHealth();
                refetchStatus();
                refetchPresence();
              }}
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
                Connect to the OpenClaw gateway to view system information.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Health & Status */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-terminal-text mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Health & Status
          </h3>
          <div className="space-y-0">
            <InfoRow
              label="Status"
              value={
                <Badge variant={healthData?.ok ? 'success' : 'error'}>
                  {healthData?.ok ? 'Healthy' : 'Unhealthy'}
                </Badge>
              }
            />
            <InfoRow label="Version" value={version || healthData?.version || 'unknown'} />
            <InfoRow label="Uptime" value={formatUptime(healthData?.uptime || statusData?.uptime)} />
            {statusData?.gateway?.bindAddress && (
              <InfoRow label="Bind Address" value={statusData.gateway.bindAddress} />
            )}
            {statusData?.gateway?.port && (
              <InfoRow label="Port" value={statusData.gateway.port} />
            )}
          </div>
        </Card>

        {/* Connected Clients */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border">
            <h3 className="text-sm font-semibold text-terminal-text flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-400" />
              Connected Clients
            </h3>
            <Badge variant="muted">{clients.length}</Badge>
          </div>

          {loadingPresence ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
            </div>
          ) : clients.length > 0 ? (
            <div className="max-h-64 overflow-auto">
              {clients.map((client) => (
                <ClientCard key={client.id} client={client} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-terminal-text-muted">
              No other clients connected
            </div>
          )}
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mt-6">
        <Card className="p-4 text-center">
          <Users className="w-5 h-5 text-primary-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-terminal-text">{clients.length}</p>
          <p className="text-xs text-terminal-text-muted">Clients</p>
        </Card>
        <Card className="p-4 text-center">
          <Clock className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-terminal-text">
            {formatUptime(healthData?.uptime || statusData?.uptime)}
          </p>
          <p className="text-xs text-terminal-text-muted">Uptime</p>
        </Card>
        <Card className="p-4 text-center">
          <Server className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-terminal-text">{version || '-'}</p>
          <p className="text-xs text-terminal-text-muted">Version</p>
        </Card>
        <Card className="p-4 text-center">
          <Wifi className="w-5 h-5 text-amber-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-terminal-text">
            {statusData?.gateway?.port || '-'}
          </p>
          <p className="text-xs text-terminal-text-muted">Port</p>
        </Card>
      </div>

      {/* Live Logs */}
      <div className="mt-6">
        <LogPanel />
      </div>
    </div>
  );
}
