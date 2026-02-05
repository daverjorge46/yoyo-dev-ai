import { useState } from 'react';
import {
  Terminal,
  Search,
  Bot,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useGatewayQuery } from '../hooks/useGatewayRPC';
import { useGatewayStatus } from '../hooks/useGatewayStatus';
import type { AgentsListResponse } from '../lib/gateway-types';

interface CommandEntry {
  name: string;
  description?: string;
  parameters?: unknown;
  agentKey: string;
  agentName?: string;
}

function CommandCard({ command }: { command: CommandEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card variant="hover" className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
      <div className="flex items-center gap-3 px-4 py-3">
        <Terminal className={`w-4 h-4 flex-shrink-0 ${expanded ? 'text-primary-400' : 'text-terminal-text-muted'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-terminal-text truncate">{command.name}</span>
            <Badge variant="muted">
              <Bot className="w-3 h-3" />
              {command.agentName || command.agentKey}
            </Badge>
          </div>
          {command.description && (
            <p className="text-xs text-terminal-text-secondary mt-0.5 line-clamp-1">
              {command.description}
            </p>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 text-terminal-text-muted transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </div>

      {expanded && command.parameters != null && (
        <div className="px-4 pb-3 border-t border-terminal-border/50">
          <pre className="mt-2 p-3 bg-terminal-surface rounded text-xs font-mono text-terminal-text-secondary overflow-x-auto max-h-48">
            {JSON.stringify(command.parameters, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
}

export default function Commands() {
  const [search, setSearch] = useState('');
  const { isConnected } = useGatewayStatus();

  const {
    data: agentsData,
    isLoading,
  } = useGatewayQuery<AgentsListResponse>('agents.list', undefined, {
    staleTime: 60_000,
  });

  const agents = agentsData?.agents || [];

  // Extract commands/tools from all agents
  const allCommands: CommandEntry[] = [];
  for (const agent of agents) {
    if (agent.tools) {
      for (const tool of agent.tools) {
        allCommands.push({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          agentKey: agent.key,
          agentName: agent.name || agent.identity?.name,
        });
      }
    }
  }

  // Filter
  const filtered = search
    ? allCommands.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.description && c.description.toLowerCase().includes(search.toLowerCase())) ||
          c.agentKey.toLowerCase().includes(search.toLowerCase()),
      )
    : allCommands;

  // Group by agent
  const grouped = filtered.reduce(
    (acc, cmd) => {
      const key = cmd.agentName || cmd.agentKey;
      if (!acc[key]) acc[key] = [];
      acc[key].push(cmd);
      return acc;
    },
    {} as Record<string, CommandEntry[]>,
  );

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
              <Terminal className="w-7 h-7 text-primary-400" />
              Commands
            </h1>
            <p className="text-sm text-terminal-text-secondary mt-1">
              Available agent commands and tools
            </p>
          </div>
          <Badge variant="primary">{allCommands.length} commands</Badge>
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
                Connect to the OpenClaw gateway to view commands.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Search */}
      {allCommands.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-terminal-text-muted" />
            <input
              type="text"
              placeholder="Search commands by name, description, or agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-terminal-elevated border border-terminal-border rounded-lg text-sm text-terminal-text placeholder-terminal-text-muted focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      )}

      {/* Commands grouped by agent */}
      {Object.keys(grouped).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([agentName, commands]) => (
              <div key={agentName}>
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="w-4 h-4 text-terminal-text-muted" />
                  <h2 className="text-sm font-semibold text-terminal-text-secondary uppercase tracking-wider">
                    {agentName}
                  </h2>
                  <Badge variant="muted">{commands.length}</Badge>
                </div>
                <div className="space-y-2">
                  {commands.map((cmd) => (
                    <CommandCard key={`${cmd.agentKey}-${cmd.name}`} command={cmd} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Terminal className="w-16 h-16 mx-auto text-terminal-text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-terminal-text mb-2">
            {search ? 'No commands match your search' : 'No commands available'}
          </h3>
          <p className="text-sm text-terminal-text-secondary max-w-md mx-auto">
            {search
              ? 'Try a different search term.'
              : isConnected
                ? 'No tools or commands configured for any agent.'
                : 'Connect to the gateway to view commands.'}
          </p>
        </Card>
      )}
    </div>
  );
}
