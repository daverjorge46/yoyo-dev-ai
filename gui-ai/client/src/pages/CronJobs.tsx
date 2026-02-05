import { useState } from 'react';
import {
  Clock,
  Play,
  Pause,
  Trash2,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Activity,
  X,
  HelpCircle,
  ChevronRight,
  Loader2,
  Bot,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useGatewayQuery, useGatewayMutation } from '../hooks/useGatewayRPC';
import { useGatewayTick } from '../hooks/useGatewayEvent';
import { useGatewayStatus } from '../hooks/useGatewayStatus';
import type {
  CronListResponse,
  CronStatusResponse,
  CronRunsResponse,
  CronJob,
} from '../lib/gateway-types';

function formatSchedule(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [min, hour, , , dow] = parts;

  if (min === '*' && hour === '*') return 'Every minute';
  if (min === '0' && hour === '*') return 'Every hour';
  if (min === '0' && hour === '0' && dow === '*') return 'Every day at midnight';
  if (min === '0' && hour === '0' && dow === '1') return 'Every Monday at midnight';
  if (min === '0' && hour === '9' && dow === '*') return 'Every day at 9 AM';

  return cron;
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return 'never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatNextRun(dateStr?: string): string {
  if (!dateStr) return 'unknown';
  const secs = Math.floor((new Date(dateStr).getTime() - Date.now()) / 1000);
  if (secs < 0) return 'overdue';
  if (secs < 60) return 'in < 1m';
  if (secs < 3600) return `in ${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `in ${Math.floor(secs / 3600)}h`;
  return `in ${Math.floor(secs / 86400)}d`;
}

const SCHEDULE_PRESETS = [
  { value: '* * * * *', label: 'Every minute' },
  { value: '0 * * * *', label: 'Every hour' },
  { value: '0 0 * * *', label: 'Every day at midnight' },
  { value: '0 9 * * *', label: 'Every day at 9 AM' },
  { value: '0 9 * * 1', label: 'Every Monday at 9 AM' },
  { value: '0 9 * * 1-5', label: 'Every weekday at 9 AM' },
  { value: '0 0 1 * *', label: 'First day of every month' },
  { value: 'custom', label: 'Custom cron expression' },
] as const;

// ─── Add Cron Job Modal ───────────────────────────────────────────────────────

function AddCronJobModal({
  onClose,
  onAdd,
  isLoading,
}: {
  onClose: () => void;
  onAdd: (job: { name: string; expression: string; command: string }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [schedulePreset, setSchedulePreset] = useState('0 9 * * *');
  const [customSchedule, setCustomSchedule] = useState('');
  const [command, setCommand] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const expression = schedulePreset === 'custom' ? customSchedule : schedulePreset;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !expression.trim() || !command.trim()) return;
    onAdd({
      name: name.trim(),
      expression: expression.trim(),
      command: command.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg mx-4">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-terminal-border">
            <h3 className="font-semibold text-terminal-text">Add Cron Job</h3>
            <button onClick={onClose} className="p-1 hover:bg-terminal-elevated rounded">
              <X className="w-5 h-5 text-terminal-text-muted" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-terminal-text mb-1">
                Job Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Daily Email Digest"
                className="w-full px-3 py-2 bg-terminal-surface border border-terminal-border rounded-md text-terminal-text placeholder:text-terminal-text-muted focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-terminal-text">
                  Schedule <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-terminal-text-muted hover:text-terminal-text"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>

              {showHelp && (
                <div className="mb-3 p-3 bg-terminal-surface rounded-md border border-terminal-border text-xs text-terminal-text-secondary">
                  <p className="font-medium text-terminal-text mb-2">Cron Expression Format:</p>
                  <code className="block bg-terminal-elevated px-2 py-1 rounded mb-2">
                    minute hour day-of-month month day-of-week
                  </code>
                  <ul className="space-y-1">
                    <li><code>*</code> = any value</li>
                    <li><code>*/5</code> = every 5 units</li>
                    <li><code>1-5</code> = range (1 to 5)</li>
                    <li><code>1,3,5</code> = specific values</li>
                  </ul>
                </div>
              )}

              <select
                value={schedulePreset}
                onChange={(e) => setSchedulePreset(e.target.value)}
                className="w-full px-3 py-2 bg-terminal-surface border border-terminal-border rounded-md text-terminal-text focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              >
                {SCHEDULE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>

              {schedulePreset === 'custom' && (
                <input
                  type="text"
                  value={customSchedule}
                  onChange={(e) => setCustomSchedule(e.target.value)}
                  placeholder="e.g., 0 */2 * * *"
                  className="w-full mt-2 px-3 py-2 bg-terminal-surface border border-terminal-border rounded-md text-terminal-text font-mono text-sm placeholder:text-terminal-text-muted focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              )}

              {expression && schedulePreset !== 'custom' && (
                <p className="mt-1 text-xs text-terminal-text-muted font-mono">{expression}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-terminal-text mb-1">
                Command <span className="text-red-400">*</span>
              </label>
              <textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="e.g., Send daily email summary to user@example.com"
                rows={3}
                className="w-full px-3 py-2 bg-terminal-surface border border-terminal-border rounded-md text-terminal-text placeholder:text-terminal-text-muted focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none"
              />
              <p className="mt-1 text-xs text-terminal-text-muted">
                Describe the task for the AI to execute on schedule
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || !expression.trim() || !command.trim()}
                loading={isLoading}
                className="flex-1"
              >
                Add Job
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

// ─── Execution History Panel ──────────────────────────────────────────────────

function RunsPanel({
  jobId,
  onClose,
}: {
  jobId: string;
  onClose: () => void;
}) {
  const { data: runsData, isLoading } = useGatewayQuery<CronRunsResponse>(
    'cron.runs',
    { jobId },
    { staleTime: 10_000 },
  );

  const runs = runsData?.runs || [];

  return (
    <Card className="mt-2 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-terminal-elevated border-b border-terminal-border">
        <span className="text-xs font-medium text-terminal-text-secondary">
          Execution History
        </span>
        <button onClick={onClose} className="p-0.5 hover:bg-terminal-surface rounded">
          <X className="w-3.5 h-3.5 text-terminal-text-muted" />
        </button>
      </div>

      <div className="max-h-60 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
          </div>
        ) : runs.length > 0 ? (
          <div className="divide-y divide-terminal-border/50">
            {runs.map((run) => (
              <div key={run.id} className="flex items-center gap-3 px-4 py-2 text-xs">
                {run.status === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                ) : run.status === 'failure' ? (
                  <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin flex-shrink-0" />
                )}
                <span className="text-terminal-text-muted">{formatTimeAgo(run.startedAt)}</span>
                {run.duration != null && (
                  <span className="text-terminal-text-muted">{run.duration}ms</span>
                )}
                {run.output && (
                  <span className="text-terminal-text-secondary truncate flex-1">{run.output}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-terminal-text-muted">
            No execution history
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Cron Job Card ────────────────────────────────────────────────────────────

function CronJobCard({
  job,
  isExpanded,
  onToggleExpand,
}: {
  job: CronJob;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const toggleMutation = useGatewayMutation<{ id: string; enabled: boolean }, unknown>(
    'cron.update',
    { invalidateQueries: ['cron.list'] },
  );

  const runNowMutation = useGatewayMutation<{ id: string }, unknown>(
    'cron.run',
    { invalidateQueries: ['cron.list'] },
  );

  const deleteMutation = useGatewayMutation<{ id: string }, unknown>(
    'cron.remove',
    { invalidateQueries: ['cron.list'] },
  );

  return (
    <div>
      <Card className={`p-4 ${!job.enabled ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${job.enabled ? 'bg-cyan-500/10' : 'bg-terminal-elevated'}`}>
              <Clock className={`w-5 h-5 ${job.enabled ? 'text-cyan-400' : 'text-terminal-text-muted'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-terminal-text">{job.name}</h3>
              <p className="text-xs text-terminal-text-secondary">{formatSchedule(job.expression)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {job.lastResult === 'success' && (
              <Badge variant="success">
                <CheckCircle2 className="w-3 h-3" />
                Success
              </Badge>
            )}
            {job.lastResult === 'failure' && (
              <Badge variant="error">
                <XCircle className="w-3 h-3" />
                Failed
              </Badge>
            )}
            <Badge variant={job.enabled ? 'default' : 'warning'}>
              {job.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </div>

        {/* Command */}
        {job.command && (
          <div className="mb-3 p-2 bg-terminal-surface rounded text-xs font-mono text-terminal-text-secondary overflow-x-auto">
            {job.command}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-terminal-text-muted mb-4">
          {job.agentId && (
            <span className="flex items-center gap-1">
              <Bot className="w-3 h-3" />
              {job.agentId}
            </span>
          )}
          {job.lastRun && (
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Last: {formatTimeAgo(job.lastRun)}
            </span>
          )}
          {job.nextRun && job.enabled && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Next: {formatNextRun(job.nextRun)}
            </span>
          )}
          <span className="text-xs text-terminal-text-muted font-mono">{job.expression}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-terminal-border">
          <Button
            size="sm"
            variant="secondary"
            icon={job.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            loading={toggleMutation.isPending}
            onClick={() => toggleMutation.mutate({ id: job.id || job.name, enabled: !job.enabled })}
          >
            {job.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<Play className="w-4 h-4" />}
            loading={runNowMutation.isPending}
            onClick={() => runNowMutation.mutate({ id: job.id || job.name })}
          >
            Run Now
          </Button>
          <button
            onClick={onToggleExpand}
            className="p-1.5 hover:bg-terminal-elevated rounded transition-colors"
            title="Execution history"
          >
            <ChevronRight className={`w-4 h-4 text-terminal-text-muted transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`} />
          </button>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            icon={<Trash2 className="w-4 h-4 text-red-400" />}
            loading={deleteMutation.isPending}
            onClick={() => {
              if (confirm(`Delete cron job "${job.name}"?`)) {
                deleteMutation.mutate({ id: job.id || job.name });
              }
            }}
          />
        </div>
      </Card>

      {/* Execution history panel */}
      {isExpanded && job.id && (
        <RunsPanel jobId={job.id} onClose={onToggleExpand} />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CronJobs() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { isConnected } = useGatewayStatus();

  const {
    data: cronData,
    isLoading: loadingList,
    refetch,
  } = useGatewayQuery<CronListResponse>('cron.list', undefined, {
    staleTime: 15_000,
  });

  const { data: cronStatus } = useGatewayQuery<CronStatusResponse>('cron.status', undefined, {
    staleTime: 15_000,
  });

  useGatewayTick(() => {
    refetch();
  });

  const addMutation = useGatewayMutation<
    { name: string; expression: string; command: string },
    unknown
  >('cron.add', {
    onSuccess: () => {
      setShowAddModal(false);
    },
    invalidateQueries: ['cron.list'],
  });

  const cronJobs = cronData?.jobs || [];
  const enabledCount = cronJobs.filter((j) => j.enabled).length;
  const total = cronJobs.length;

  if (loadingList) {
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
              <Clock className="w-7 h-7 text-cyan-400" />
              Cron Jobs
            </h1>
            <p className="text-sm text-terminal-text-secondary mt-1">
              Schedule automated tasks and recurring jobs
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-terminal-text-secondary">
              <span className="text-emerald-400 font-medium">{enabledCount}</span>
              <span className="text-terminal-text-muted"> / {total} enabled</span>
              {cronStatus && (
                <>
                  <span className="mx-2 text-terminal-border">|</span>
                  <Badge variant={cronStatus.running ? 'success' : 'warning'}>
                    {cronStatus.running ? 'Running' : 'Stopped'}
                  </Badge>
                </>
              )}
            </div>
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowAddModal(true)}
            >
              Add Job
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
                Connect to the OpenClaw gateway to manage cron jobs.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Cron jobs list */}
      {cronJobs.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {cronJobs.map((job) => {
            const jobKey = job.id || job.name;
            return (
              <CronJobCard
                key={jobKey}
                job={job}
                isExpanded={expandedId === jobKey}
                onToggleExpand={() =>
                  setExpandedId(expandedId === jobKey ? null : jobKey)
                }
              />
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Clock className="w-16 h-16 mx-auto text-terminal-text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-terminal-text mb-2">
            No cron jobs
          </h3>
          <p className="text-sm text-terminal-text-secondary max-w-md mx-auto mb-4">
            {isConnected
              ? 'Schedule automated tasks to run at specific intervals.'
              : 'Connect to the gateway to manage cron jobs.'}
          </p>
          {isConnected && (
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
              Add Cron Job
            </Button>
          )}
        </Card>
      )}

      {/* Add cron job modal */}
      {showAddModal && (
        <AddCronJobModal
          onClose={() => setShowAddModal(false)}
          onAdd={(job) => addMutation.mutate(job)}
          isLoading={addMutation.isPending}
        />
      )}
    </div>
  );
}
