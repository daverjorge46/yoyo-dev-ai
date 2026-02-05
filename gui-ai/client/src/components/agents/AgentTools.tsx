import { useState } from 'react';
import {
  Wrench,
  ChevronDown,
  ChevronRight,
  Package,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import type { Agent, AgentTool } from '../../lib/gateway-types';

interface AgentToolsProps {
  agent: Agent;
}

function ToolItem({ tool }: { tool: AgentTool }) {
  const [expanded, setExpanded] = useState(false);
  const hasParams = tool.parameters != null;

  return (
    <Card variant="hover" className="overflow-hidden">
      <button
        onClick={() => hasParams && setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${
          hasParams ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        <Wrench className="w-4 h-4 text-accent-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-terminal-text font-mono">{tool.name}</span>
          </div>
          {tool.description && (
            <p className="text-xs text-terminal-text-secondary mt-0.5 line-clamp-2">
              {tool.description}
            </p>
          )}
        </div>
        {hasParams && (
          expanded ? (
            <ChevronDown className="w-4 h-4 text-terminal-text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-terminal-text-muted" />
          )
        )}
      </button>

      {expanded && hasParams && (
        <div className="px-4 py-3 border-t border-terminal-border bg-terminal-surface">
          <div className="text-xs text-terminal-text-muted uppercase tracking-wider mb-2">
            Parameters
          </div>
          <pre className="text-xs font-mono text-terminal-text-secondary whitespace-pre-wrap max-h-60 overflow-auto">
            {typeof tool.parameters === 'string'
              ? tool.parameters
              : JSON.stringify(tool.parameters, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
}

export function AgentTools({ agent }: AgentToolsProps) {
  const tools = agent.tools || [];

  if (tools.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Package className="w-12 h-12 mx-auto text-terminal-text-muted mb-3 opacity-50" />
        <h3 className="text-sm font-medium text-terminal-text mb-1">No tools</h3>
        <p className="text-xs text-terminal-text-muted">
          This agent has no tools configured.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <Badge variant="accent">{tools.length} tools</Badge>
      </div>
      {tools.map((tool) => (
        <ToolItem key={tool.name} tool={tool} />
      ))}
    </div>
  );
}
