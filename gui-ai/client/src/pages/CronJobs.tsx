import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Play,
  Pause,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Activity,
  X,
  HelpCircle,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { PageLoader } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  command: string;
  enabled: boolean;
  lastRun?: number;
  lastResult?: 'success' | 'error';
  lastError?: string;
  nextRun?: number;
  runCount: number;
}

function formatSchedule(cron: string): string {
  // Simple cron expression interpreter
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [min, hour, dom, mon, dow] = parts;

  if (min === '*' && hour === '*') return 'Every minute';
  if (min === '0' && hour === '*') return 'Every hour';
  if (min === '0' && hour === '0' && dom === '*') return 'Every day at midnight';
  if (min === '0' && hour === '0' && dow === '1') return 'Every Monday at midnight';
  if (min === '0' && hour === '9' && dom === '*') return 'Every day at 9 AM';

  return cron;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatNextRun(timestamp: number): string {
  const seconds = Math.floor((timestamp - Date.now()) / 1000);

  if (seconds < 0) return 'overdue';
  if (seconds < 60) return 'in < 1m';
  if (seconds < 3600) return `in ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `in ${Math.floor(seconds / 3600)}h`;
  return `in ${Math.floor(seconds / 86400)}d`;
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

// Add cron job modal component
function AddCronJobModal({
  onClose,
  onAdd,
  isLoading,
}: {
  onClose: () => void;
  onAdd: (job: { name: string; schedule: string; command: string }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [schedulePreset, setSchedulePreset] = useState('0 9 * * *');
  const [customSchedule, setCustomSchedule] = useState('');
  const [command, setCommand] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const schedule = schedulePreset === 'custom' ? customSchedule : schedulePreset;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !schedule.trim() || !command.trim()) return;
    onAdd({
      name: name.trim(),
      schedule: schedule.trim(),
      command: command.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg mx-4"
      >
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-terminal-border">
            <h3 className="font-semibold text-terminal-text">Add Cron Job</h3>
            <button onClick={onClose} className="p-1 hover:bg-terminal-elevated rounded">
              <X className="w-5 h-5 text-terminal-text-muted" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Job Name */}
            <div>
              <label className="block text-sm font-medium text-terminal-text mb-1">
                Job Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Daily Email Digest"
                className="w-full px-3 py-2 bg-terminal-bg border border-terminal-border rounded-md text-terminal-text placeholder:text-terminal-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Schedule */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-terminal-text">
                  Schedule <span className="text-error">*</span>
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
                <div className="mb-3 p-3 bg-terminal-bg rounded-md border border-terminal-border text-xs text-terminal-text-secondary">
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
                className="w-full px-3 py-2 bg-terminal-bg border border-terminal-border rounded-md text-terminal-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                  className="w-full mt-2 px-3 py-2 bg-terminal-bg border border-terminal-border rounded-md text-terminal-text font-mono text-sm placeholder:text-terminal-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              )}

              {schedule && schedulePreset !== 'custom' && (
                <p className="mt-1 text-xs text-terminal-text-muted font-mono">{schedule}</p>
              )}
            </div>

            {/* Command */}
            <div>
              <label className="block text-sm font-medium text-terminal-text mb-1">
                Command <span className="text-error">*</span>
              </label>
              <textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="e.g., Send daily email summary to user@example.com"
                rows={3}
                className="w-full px-3 py-2 bg-terminal-bg border border-terminal-border rounded-md text-terminal-text placeholder:text-terminal-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
              <p className="mt-1 text-xs text-terminal-text-muted">
                Describe the task for the AI to execute on schedule
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || !schedule.trim() || !command.trim()}
                loading={isLoading}
                className="flex-1"
              >
                Add Job
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

function CronJobCard({ job }: { job: CronJob }) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/openclaw/cron/${job.id}/${job.enabled ? 'disable' : 'enable'}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to toggle cron job');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
    },
  });

  const runNowMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/openclaw/cron/${job.id}/run`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to run cron job');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/openclaw/cron/${job.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete cron job');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
    },
  });

  return (
    <Card className={`p-4 ${!job.enabled ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${job.enabled ? 'bg-cyan-500/10' : 'bg-terminal-elevated'}`}>
            <Clock className={`w-5 h-5 ${job.enabled ? 'text-cyan-400' : 'text-terminal-text-muted'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-terminal-text">{job.name}</h3>
            <p className="text-xs text-terminal-text-secondary">{formatSchedule(job.schedule)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {job.lastResult === 'success' && (
            <Badge variant="success">
              <CheckCircle2 className="w-3 h-3" />
              Success
            </Badge>
          )}
          {job.lastResult === 'error' && (
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
      <div className="mb-3 p-2 bg-terminal-bg rounded text-xs font-mono text-terminal-text-secondary overflow-x-auto">
        {job.command}
      </div>

      {/* Error message */}
      {job.lastError && (
        <p className="text-xs text-red-400 mb-3">{job.lastError}</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-terminal-text-muted mb-4">
        {job.lastRun && (
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Last run: {formatTimeAgo(job.lastRun)}
          </span>
        )}
        {job.nextRun && job.enabled && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Next: {formatNextRun(job.nextRun)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          {job.runCount} runs
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-terminal-border">
        <Button
          size="sm"
          variant="secondary"
          icon={job.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          loading={toggleMutation.isPending}
          onClick={() => toggleMutation.mutate()}
        >
          {job.enabled ? 'Disable' : 'Enable'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={<Play className="w-4 h-4" />}
          loading={runNowMutation.isPending}
          onClick={() => runNowMutation.mutate()}
        >
          Run Now
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="ghost"
          icon={<Trash2 className="w-4 h-4 text-red-400" />}
          loading={deleteMutation.isPending}
          onClick={() => {
            if (confirm(`Delete cron job "${job.name}"?`)) {
              deleteMutation.mutate();
            }
          }}
        />
      </div>
    </Card>
  );
}

export default function CronJobs() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: cronJobs, isLoading } = useQuery<CronJob[]>({
    queryKey: ['cron-jobs'],
    queryFn: async () => {
      const res = await fetch('/api/openclaw/cron');
      if (!res.ok) {
        if (res.status === 503) return [];
        throw new Error('Failed to fetch cron jobs');
      }
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: openclawStatus } = useQuery({
    queryKey: ['openclaw-status'],
    queryFn: async () => {
      const res = await fetch('/api/status/openclaw');
      if (!res.ok) return { connected: false };
      return res.json();
    },
  });

  // Create cron job mutation
  const createCronJob = useMutation({
    mutationFn: async (job: { name: string; schedule: string; command: string }) => {
      const res = await fetch('/api/openclaw/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create cron job');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
      setShowAddModal(false);
    },
  });

  if (isLoading) {
    return <PageLoader />;
  }

  const enabledCount = cronJobs?.filter(j => j.enabled).length ?? 0;
  const total = cronJobs?.length ?? 0;

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
            </div>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
              Add Job
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
                Start OpenClaw daemon to manage cron jobs: <code className="text-cyan-400">yoyo-ai start</code>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Cron jobs grid */}
      {cronJobs && cronJobs.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {cronJobs.map((job) => (
            <CronJobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="text-terminal-text-muted mb-4">
            <Clock className="w-16 h-16 mx-auto opacity-50" />
          </div>
          <h3 className="text-lg font-semibold text-terminal-text mb-2">
            No cron jobs
          </h3>
          <p className="text-sm text-terminal-text-secondary max-w-md mx-auto mb-4">
            {openclawStatus?.connected
              ? 'Schedule automated tasks to run at specific intervals.'
              : 'Start OpenClaw daemon to manage cron jobs.'}
          </p>
          {openclawStatus?.connected && (
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
              Add Cron Job
            </Button>
          )}
        </Card>
      )}

      {/* Add cron job modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddCronJobModal
            onClose={() => setShowAddModal(false)}
            onAdd={(job) => createCronJob.mutate(job)}
            isLoading={createCronJob.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
