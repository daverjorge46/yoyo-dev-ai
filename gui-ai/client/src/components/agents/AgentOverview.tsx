import {
  Bot,
  Cpu,
  Heart,
  Database,
  Star,
  Hash,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import { useGatewayQuery } from '../../hooks/useGatewayRPC';
import type { Agent, StatusResponse } from '../../lib/gateway-types';

interface AgentOverviewProps {
  agent: Agent;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-terminal-border/50 last:border-0">
      <div className="text-terminal-text-muted mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-terminal-text-muted uppercase tracking-wider mb-0.5">{label}</div>
        <div className="text-sm text-terminal-text">{value}</div>
      </div>
    </div>
  );
}

export function AgentOverview({ agent }: AgentOverviewProps) {
  const displayName = agent.identity?.name || agent.name || agent.key;

  // Fetch status to get default model if agent doesn't have one
  const { data: statusData } = useGatewayQuery<StatusResponse>('status', undefined, {
    staleTime: 60_000,
     enabled: !agent.model, // Only fetch if agent has no model
  });

  // Use agent's model or fall back to default from status
  const effectiveModel = agent.model || statusData?.agents?.defaults?.model?.primary;

  return (
    <div className="space-y-4">
      {/* Identity Card */}
      <Card className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
            {agent.identity?.avatar ? (
              <span className="text-2xl">{agent.identity.avatar}</span>
            ) : (
              <Bot className="w-7 h-7 text-primary-400" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-terminal-text">{displayName}</h3>
            <p className="text-sm text-terminal-text-muted font-mono">{agent.key}</p>
          </div>
          {agent.isDefault && (
            <Badge variant="warning" className="ml-auto">
              <Star className="w-3 h-3" />
              Default Agent
            </Badge>
          )}
        </div>
      </Card>

      {/* Configuration Details */}
      <Card className="p-5">
        <h4 className="text-sm font-medium text-terminal-text-secondary uppercase tracking-wider mb-3">
          Configuration
        </h4>

        <InfoRow
          icon={<Hash className="w-4 h-4" />}
          label="Agent ID"
          value={<span className="font-mono text-xs">{agent.id}</span>}
        />

        <InfoRow
          icon={<Cpu className="w-4 h-4" />}
          label="Model"
          value={
            effectiveModel ? (
              <span>
                {effectiveModel}
                {!agent.model && statusData?.agents?.defaults?.model?.primary && (
                  <span className="text-terminal-text-muted italic ml-1">(default)</span>
                )}
              </span>
            ) : (
              <span className="text-terminal-text-muted italic">Not configured</span>
            )
          }
        />

        <InfoRow
          icon={<Heart className="w-4 h-4" />}
          label="Heartbeat Interval"
          value={agent.heartbeatInterval || <span className="text-terminal-text-muted italic">Default</span>}
        />

        <InfoRow
          icon={<Database className="w-4 h-4" />}
          label="Session Store"
          value={
            agent.sessionStore ? (
              <span className="font-mono text-xs break-all">{agent.sessionStore}</span>
            ) : (
              <span className="text-terminal-text-muted italic">Default</span>
            )
          }
        />
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-primary-400">{agent.channels?.length ?? 0}</div>
          <div className="text-xs text-terminal-text-muted">Channels</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-accent-400">{agent.tools?.length ?? 0}</div>
          <div className="text-xs text-terminal-text-muted">Tools</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-cyan-400">{agent.skills?.length ?? 0}</div>
          <div className="text-xs text-terminal-text-muted">Skills</div>
        </Card>
      </div>
    </div>
  );
}
