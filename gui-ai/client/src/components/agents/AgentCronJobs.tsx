import {
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  Calendar,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { useGatewayQuery } from '../../hooks/useGatewayRPC';
import type { Agent, CronListResponse } from '../../lib/gateway-types';

interface AgentCronJobsProps {
  agent: Agent;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

export function AgentCronJobs({ agent }: AgentCronJobsProps) {
  // Fetch all cron jobs and filter by agent
  const { data: cronData } = useGatewayQuery<CronListResponse>(
    'cron.list',
    undefined,
    { staleTime: 30_000 },
  );

  const allJobs = cronData?.jobs || [];

  // Filter jobs belonging to this agent (or from agent.cronJobs array)
  const agentJobs = agent.cronJobs?.length
    ? agent.cronJobs
    : allJobs.filter((j) => j.agentId === agent.id || j.agentId === agent.key);

  if (agentJobs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="w-12 h-12 mx-auto text-terminal-text-muted mb-3 opacity-50" />
        <h3 className="text-sm font-medium text-terminal-text mb-1">No cron jobs</h3>
        <p className="text-xs text-terminal-text-muted">
          This agent has no scheduled jobs.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <Badge variant="warning">{agentJobs.length} jobs</Badge>
      </div>

      {agentJobs.map((job, idx) => (
        <Card key={job.id || job.name || idx} variant="hover" className="px-4 py-3">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-terminal-text">{job.name}</span>
                {job.enabled !== false ? (
                  <Badge variant="success">
                    <CheckCircle2 className="w-3 h-3" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="error">
                    <XCircle className="w-3 h-3" />
                    Disabled
                  </Badge>
                )}
              </div>

              <p className="text-xs font-mono text-terminal-text-muted mb-2">
                {job.expression}
              </p>

              {job.command && (
                <p className="text-xs text-terminal-text-secondary mb-1">
                  Command: <span className="font-mono">{job.command}</span>
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-terminal-text-muted">
                {job.nextRun && (
                  <span className="flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    Next: {formatDate(job.nextRun)}
                  </span>
                )}
                {job.lastRun && (
                  <span>Last: {formatDate(job.lastRun)}</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
