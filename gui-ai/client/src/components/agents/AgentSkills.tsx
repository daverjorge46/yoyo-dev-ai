import {
  Zap,
  CheckCircle2,
  XCircle,
  Package,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { useGatewayQuery } from '../../hooks/useGatewayRPC';
import type { Agent, SkillsStatusResponse } from '../../lib/gateway-types';

interface AgentSkillsProps {
  agent: Agent;
}

export function AgentSkills({ agent }: AgentSkillsProps) {
  // Fetch full skills status from gateway for enriched data
  const { data: skillsData } = useGatewayQuery<SkillsStatusResponse>(
    'skills.status',
    undefined,
    { staleTime: 60_000 },
  );

  const agentSkillNames = agent.skills || [];
  const allSkills = skillsData?.skills || [];

  // Match agent skills with full skill data
  const enrichedSkills = agentSkillNames.map((name) => {
    const full = allSkills.find((s) => s.name === name);
    return {
      name,
      description: full?.description,
      enabled: full?.enabled ?? true,
      version: full?.version,
      commands: full?.commands,
    };
  });

  if (agentSkillNames.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Package className="w-12 h-12 mx-auto text-terminal-text-muted mb-3 opacity-50" />
        <h3 className="text-sm font-medium text-terminal-text mb-1">No skills</h3>
        <p className="text-xs text-terminal-text-muted">
          This agent has no skills configured.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <Badge variant="info">{enrichedSkills.length} skills</Badge>
      </div>

      {enrichedSkills.map((skill) => (
        <Card key={skill.name} variant="hover" className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-terminal-text">{skill.name}</span>
                {skill.version && (
                  <Badge variant="muted">v{skill.version}</Badge>
                )}
              </div>
              {skill.description && (
                <p className="text-xs text-terminal-text-secondary mt-0.5">
                  {skill.description}
                </p>
              )}
              {skill.commands && skill.commands.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {skill.commands.map((cmd) => (
                    <span
                      key={cmd}
                      className="text-xs font-mono px-1.5 py-0.5 bg-terminal-elevated rounded text-terminal-text-muted"
                    >
                      {cmd}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {skill.enabled ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
