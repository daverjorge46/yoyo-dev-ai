import { useState } from 'react';
import {
  Bot,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { AgentCard } from '../components/agents/AgentCard';
import { AgentDetail } from '../components/agents/AgentDetail';
import { useGatewayQuery } from '../hooks/useGatewayRPC';
import { useGatewayTick } from '../hooks/useGatewayEvent';
import { useGatewayStatus } from '../hooks/useGatewayStatus';
import type { AgentsListResponse } from '../lib/gateway-types';

export default function Agents() {
  const [selectedAgentKey, setSelectedAgentKey] = useState<string | null>(null);
  const { isConnected } = useGatewayStatus();

  const {
    data: agentsData,
    isLoading,
    refetch,
  } = useGatewayQuery<AgentsListResponse>('agents.list', undefined, {
    staleTime: 30_000,
  });

  // Auto-refresh on gateway tick
  useGatewayTick(() => {
    refetch();
  });

  const agents = agentsData?.agents || [];
  const selectedAgent = agents.find((a) => a.key === selectedAgentKey) || null;

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
              <Bot className="w-7 h-7 text-primary-400" />
              Agents
            </h1>
            <p className="text-sm text-terminal-text-secondary mt-1">
              Manage OpenClaw agents, tools, skills, and channels
            </p>
          </div>
          <div className="flex items-center gap-3">
            {agents.length > 0 && (
              <Badge variant="primary">{agents.length} agents</Badge>
            )}
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
                Connect to the OpenClaw gateway to view agents.
              </p>
            </div>
          </div>
        </Card>
      )}

      {agents.length === 0 ? (
        <Card className="p-12 text-center">
          <Bot className="w-16 h-16 mx-auto text-terminal-text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-terminal-text mb-2">
            No agents found
          </h3>
          <p className="text-sm text-terminal-text-secondary max-w-md mx-auto">
            {isConnected
              ? 'No agents are configured in OpenClaw.'
              : 'Start the OpenClaw gateway to view agents.'}
          </p>
        </Card>
      ) : (
        <div className="flex gap-6">
          {/* Agent List (left column) */}
          <div className={`space-y-3 flex-shrink-0 ${selectedAgent ? 'w-80' : 'w-full max-w-3xl'}`}>
            {agents.map((agent) => (
              <AgentCard
                key={agent.key}
                agent={agent}
                isSelected={selectedAgentKey === agent.key}
                onClick={() =>
                  setSelectedAgentKey(
                    selectedAgentKey === agent.key ? null : agent.key,
                  )
                }
              />
            ))}
          </div>

          {/* Agent Detail (right column) */}
          {selectedAgent && (
            <div className="flex-1 min-w-0">
              <AgentDetail agent={selectedAgent} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
