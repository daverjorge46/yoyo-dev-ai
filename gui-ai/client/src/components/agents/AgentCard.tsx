import {
  Bot,
  Star,
  Radio,
  Wrench,
  Cpu,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import type { Agent } from '../../lib/gateway-types';

interface AgentCardProps {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}

export function AgentCard({ agent, isSelected, onClick }: AgentCardProps) {
  const displayName = agent.identity?.name || agent.name || agent.key;
  const channelCount = agent.channels?.length ?? 0;
  const toolCount = agent.tools?.length ?? 0;
  const skillCount = agent.skills?.length ?? 0;

  return (
    <Card
      variant={isSelected ? 'accent' : 'hover'}
      className={`p-4 cursor-pointer transition-all duration-150 ${
        isSelected ? 'ring-1 ring-primary-500/50' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
          {agent.identity?.avatar ? (
            <span className="text-lg">{agent.identity.avatar}</span>
          ) : (
            <Bot className="w-5 h-5 text-primary-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + badges */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-terminal-text truncate">{displayName}</h3>
            {agent.isDefault && (
              <Badge variant="warning">
                <Star className="w-3 h-3" />
                Default
              </Badge>
            )}
          </div>

          {/* Key */}
          <p className="text-xs text-terminal-text-muted font-mono mb-2">{agent.key}</p>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-xs text-terminal-text-secondary">
            {agent.model && (
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                {agent.model}
              </span>
            )}
            {channelCount > 0 && (
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3" />
                {channelCount} ch
              </span>
            )}
            {toolCount > 0 && (
              <span className="flex items-center gap-1">
                <Wrench className="w-3 h-3" />
                {toolCount}
              </span>
            )}
            {skillCount > 0 && (
              <Badge variant="muted">{skillCount} skills</Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
