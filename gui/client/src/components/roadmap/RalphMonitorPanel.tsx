/**
 * RalphMonitorPanel Component
 *
 * Side panel overlay for monitoring Ralph phase execution.
 * Shows progress, current task, logs, and provides control buttons.
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Pause,
  Square,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { usePhaseExecution } from '../../hooks/usePhaseExecution';
import type { SpecProgress, ExecutionLog } from '../../stores/phaseExecutionStore';

// =============================================================================
// Types
// =============================================================================

export interface RalphMonitorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  phaseId: string;
  phaseTitle: string;
}

// =============================================================================
// Sub-Components
// =============================================================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: typeof Clock; className: string; text: string }> = {
    idle: {
      icon: Clock,
      className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
      text: 'Ready',
    },
    running: {
      icon: Loader2,
      className: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      text: 'Running',
    },
    paused: {
      icon: Pause,
      className: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
      text: 'Paused',
    },
    stopped: {
      icon: Square,
      className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
      text: 'Stopped',
    },
    completed: {
      icon: CheckCircle,
      className: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
      text: 'Completed',
    },
    failed: {
      icon: XCircle,
      className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      text: 'Failed',
    },
  };

  const { icon: Icon, className, text } = config[status] || config.idle;
  const isRunning = status === 'running';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
      {text}
    </span>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Progress</span>
        <span className="font-medium text-gray-900 dark:text-white">{progress}%</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

function SpecItem({ spec }: { spec: SpecProgress }) {
  const statusIcons: Record<string, typeof Clock> = {
    pending: Clock,
    running: Loader2,
    completed: CheckCircle,
    failed: XCircle,
    skipped: ChevronRight,
  };

  const statusColors: Record<string, string> = {
    pending: 'text-gray-400',
    running: 'text-blue-500',
    completed: 'text-green-500',
    failed: 'text-red-500',
    skipped: 'text-gray-400',
  };

  const Icon = statusIcons[spec.status] || Clock;
  const colorClass = statusColors[spec.status] || 'text-gray-400';

  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <Icon
        className={`h-4 w-4 flex-shrink-0 ${colorClass} ${
          spec.status === 'running' ? 'animate-spin' : ''
        }`}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {spec.title}
        </div>
        {spec.currentTask && spec.status === 'running' && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {spec.currentTask}
          </div>
        )}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{spec.progress}%</div>
    </div>
  );
}

function LogEntry({ log }: { log: ExecutionLog }) {
  const levelColors: Record<string, string> = {
    info: 'text-blue-500',
    warn: 'text-yellow-500',
    error: 'text-red-500',
    debug: 'text-gray-500',
  };

  const time = new Date(log.timestamp).toLocaleTimeString();

  return (
    <div className="text-xs font-mono py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-gray-400">{time}</span>
      <span className={`mx-2 ${levelColors[log.level] || 'text-gray-500'}`}>
        [{log.level.toUpperCase()}]
      </span>
      <span className="text-gray-700 dark:text-gray-300">{log.message}</span>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function RalphMonitorPanel({
  isOpen,
  onClose,
  phaseId,
  phaseTitle,
}: RalphMonitorPanelProps) {
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const {
    status,
    error,
    overallProgress,
    currentSpec,
    specs,
    logs,
    metrics,
    isRunning,
    isPaused,
    canPause,
    canResume,
    canStop,
    startExecution,
    pauseExecution,
    resumeExecution,
    stopExecution,
    reset,
  } = usePhaseExecution();

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsContainerRef.current && isRunning) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, isRunning]);

  // Handle start
  const handleStart = async () => {
    try {
      await startExecution(phaseId);
    } catch (err) {
      console.error('Failed to start execution:', err);
    }
  };

  // Handle pause
  const handlePause = async () => {
    try {
      await pauseExecution();
    } catch (err) {
      console.error('Failed to pause execution:', err);
    }
  };

  // Handle resume
  const handleResume = async () => {
    try {
      await resumeExecution();
    } catch (err) {
      console.error('Failed to resume execution:', err);
    }
  };

  // Handle stop
  const handleStop = async () => {
    try {
      await stopExecution('User cancelled');
    } catch (err) {
      console.error('Failed to stop execution:', err);
    }
  };

  // Handle retry (reset and start again)
  const handleRetry = async () => {
    reset();
    await handleStart();
  };

  // Format elapsed time
  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            data-testid="ralph-monitor-panel"
            className="fixed right-0 top-0 h-full w-[480px] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {phaseTitle}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ralph Execution Monitor</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status & Progress */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
              <div className="flex items-center justify-between">
                <StatusBadge status={status} />
                {metrics?.elapsedSeconds && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatElapsed(metrics.elapsedSeconds)}
                  </span>
                )}
              </div>

              <ProgressBar progress={overallProgress} />

              {currentSpec && isRunning && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Current Spec
                  </div>
                  <div className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                    {currentSpec.title}
                  </div>
                  {currentSpec.currentTask && (
                    <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      {currentSpec.currentTask}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                {status === 'idle' && (
                  <button
                    onClick={handleStart}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    aria-label="Start"
                  >
                    <Play className="h-4 w-4" />
                    Start Execution
                  </button>
                )}

                {canPause && (
                  <button
                    onClick={handlePause}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50"
                    aria-label="Pause"
                  >
                    <Pause className="h-4 w-4" />
                    Pause
                  </button>
                )}

                {canResume && (
                  <button
                    onClick={handleResume}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                    aria-label="Resume"
                  >
                    <Play className="h-4 w-4" />
                    Resume
                  </button>
                )}

                {canStop && (
                  <button
                    onClick={handleStop}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                    aria-label="Stop"
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </button>
                )}

                {status === 'failed' && (
                  <button
                    onClick={handleRetry}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    aria-label="Retry"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Retry
                  </button>
                )}

                {(status === 'completed' || status === 'stopped') && (
                  <button
                    onClick={handleStart}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    aria-label="Start"
                  >
                    <Play className="h-4 w-4" />
                    Start Again
                  </button>
                )}
              </div>
            </div>

            {/* Specs List */}
            {specs.length > 0 && (
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Specs ({specs.filter((s) => s.status === 'completed').length}/{specs.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {specs.map((spec) => (
                    <SpecItem key={spec.id} spec={spec} />
                  ))}
                </div>
              </div>
            )}

            {/* Logs */}
            <div className="flex-1 flex flex-col min-h-0 px-6 py-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Logs ({logs.length})
              </h3>
              <div
                ref={logsContainerRef}
                className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3"
              >
                {logs.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    No logs yet
                  </div>
                ) : (
                  logs.map((log, i) => <LogEntry key={i} log={log} />)
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default RalphMonitorPanel;
