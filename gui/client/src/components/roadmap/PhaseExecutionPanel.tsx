/**
 * PhaseExecutionPanel Component
 *
 * Real-time monitoring panel for automated phase execution.
 * Shows progress, current item, step status, and controls.
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Pause,
  Play,
  Square,
  CheckCircle,
  XCircle,
  Circle,
  Loader2,
  Clock,
  FileText,
  ListChecks,
  Code,
  TestTube,
  ClipboardCheck,
  Wrench,
  Terminal,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import type {
  PhaseExecutionState,
  ItemExecutionState,
  ItemExecutionStep,
} from '../../hooks/usePhaseExecutor';
import { usePanelLayoutContext } from '../layout/PanelLayoutContext';

// =============================================================================
// Types
// =============================================================================

export interface PhaseExecutionPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Current execution state */
  execution: PhaseExecutionState | null;
  /** Pause handler */
  onPause: () => void;
  /** Resume handler */
  onResume: () => void;
  /** Cancel handler */
  onCancel: () => void;
  /** Is pause in progress */
  isPausing?: boolean;
  /** Is resume in progress */
  isResuming?: boolean;
  /** Is cancel in progress */
  isCancelling?: boolean;
}

// =============================================================================
// Step Config
// =============================================================================

const STEP_CONFIG: Record<
  ItemExecutionStep,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  pending: { icon: Circle, label: 'Pending', color: 'text-gray-400' },
  spec_creating: { icon: FileText, label: 'Creating Spec', color: 'text-blue-500' },
  spec_created: { icon: FileText, label: 'Spec Created', color: 'text-green-500' },
  tasks_creating: { icon: ListChecks, label: 'Generating Tasks', color: 'text-blue-500' },
  tasks_created: { icon: ListChecks, label: 'Tasks Generated', color: 'text-green-500' },
  executing: { icon: Code, label: 'Executing', color: 'text-blue-500' },
  testing: { icon: TestTube, label: 'Testing', color: 'text-purple-500' },
  qa_reviewing: { icon: ClipboardCheck, label: 'QA Review', color: 'text-yellow-500' },
  qa_fixing: { icon: Wrench, label: 'Fixing Issues', color: 'text-orange-500' },
  completed: { icon: CheckCircle, label: 'Completed', color: 'text-terminal-green' },
  failed: { icon: XCircle, label: 'Failed', color: 'text-terminal-red' },
};

// =============================================================================
// Sub-Components
// =============================================================================

function StepIndicator({ step }: { step: ItemExecutionStep }) {
  const config = STEP_CONFIG[step];
  const Icon = config.icon;
  const isAnimating = ['spec_creating', 'tasks_creating', 'executing', 'testing', 'qa_reviewing', 'qa_fixing'].includes(step);

  return (
    <div className={`flex items-center gap-2 ${config.color}`}>
      {isAnimating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
}

function ItemProgressRow({
  item,
  isActive,
  isExpanded,
  onToggle,
}: {
  item: ItemExecutionState;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const getStatusIcon = () => {
    switch (item.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-terminal-green" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-terminal-red" />;
      case 'pending':
        return <Circle className="h-5 w-5 text-gray-300" />;
      default:
        return <Loader2 className="h-5 w-5 text-brand animate-spin" />;
    }
  };

  return (
    <div
      className={`border rounded-lg transition-colors ${
        isActive
          ? 'border-brand bg-brand/5'
          : item.status === 'failed'
          ? 'border-terminal-red/50 bg-terminal-red/5'
          : item.status === 'completed'
          ? 'border-terminal-green/50'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 dark:text-white truncate">
            {item.itemTitle}
          </div>
          <StepIndicator step={item.status} />
        </div>
        {item.qaIterations > 0 && (
          <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded">
            QA x{item.qaIterations}
          </span>
        )}
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 text-sm">
              {item.specId && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <FileText className="h-4 w-4" />
                  <span>Spec: {item.specId}</span>
                </div>
              )}
              {item.terminalId && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Terminal className="h-4 w-4" />
                  <span>Terminal: {item.terminalId.slice(0, 8)}...</span>
                </div>
              )}
              {item.startedAt && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>Started: {new Date(item.startedAt).toLocaleTimeString()}</span>
                </div>
              )}
              {item.completedAt && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-4 w-4" />
                  <span>Completed: {new Date(item.completedAt).toLocaleTimeString()}</span>
                </div>
              )}
              {item.error && (
                <div className="flex items-start gap-2 text-terminal-red">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{item.error}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PhaseExecutionPanel({
  isOpen,
  onClose,
  execution,
  onPause,
  onResume,
  onCancel,
  isPausing = false,
  isResuming = false,
  isCancelling = false,
}: PhaseExecutionPanelProps) {
  const [expandedItemId, setExpandedItemId] = React.useState<string | null>(null);

  // Get sidebar width to offset backdrop - allows sidebar navigation while panel is open
  const { sidebarEffectiveWidth } = usePanelLayoutContext();

  // Auto-expand active item
  React.useEffect(() => {
    if (execution?.currentItemId) {
      setExpandedItemId(execution.currentItemId);
    }
  }, [execution?.currentItemId]);

  if (!execution) return null;

  const isRunning = execution.status === 'running';
  const isPaused = execution.status === 'paused';
  const isCompleted = execution.status === 'completed';
  const isFailed = execution.status === 'failed';
  const isCancelled = execution.status === 'cancelled';

  const completedItems = execution.items.filter((i) => i.status === 'completed').length;
  const failedItems = execution.items.filter((i) => i.status === 'failed').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - offset from sidebar to allow navigation while panel is open */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 bg-black/20 dark:bg-black/40 z-30"
            style={{ left: sidebarEffectiveWidth }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-white dark:bg-gray-900 shadow-2xl z-40 flex flex-col border-l border-gray-200 dark:border-gray-700"
          >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                isRunning ? 'bg-blue-100 dark:bg-blue-900/30' :
                isPaused ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                isCompleted ? 'bg-green-100 dark:bg-green-900/30' :
                isFailed ? 'bg-red-100 dark:bg-red-900/30' :
                'bg-gray-100 dark:bg-gray-700'
              }`}>
                {isRunning && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
                {isPaused && <Pause className="h-5 w-5 text-yellow-500" />}
                {isCompleted && <CheckCircle className="h-5 w-5 text-terminal-green" />}
                {isFailed && <XCircle className="h-5 w-5 text-terminal-red" />}
                {isCancelled && <Square className="h-5 w-5 text-gray-500" />}
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Phase Execution
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {execution.phaseTitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progress
              </span>
              <span className="text-sm text-gray-500">
                {completedItems}/{execution.items.length} items
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${execution.progress}%` }}
                className={`h-2.5 rounded-full ${
                  isFailed ? 'bg-terminal-red' : 'bg-brand'
                }`}
              />
            </div>
            {failedItems > 0 && (
              <p className="mt-2 text-sm text-terminal-red flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {failedItems} item{failedItems > 1 ? 's' : ''} failed
              </p>
            )}
          </div>

          {/* Controls */}
          {(isRunning || isPaused) && (
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              {isRunning && (
                <button
                  onClick={onPause}
                  disabled={isPausing}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 disabled:opacity-50 transition-colors"
                >
                  {isPausing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                  Pause
                </button>
              )}
              {isPaused && (
                <button
                  onClick={onResume}
                  disabled={isResuming}
                  className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 transition-colors"
                >
                  {isResuming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Resume
                </button>
              )}
              <button
                onClick={onCancel}
                disabled={isCancelling}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Cancel
              </button>
            </div>
          )}

          {/* Error Message */}
          {execution.errorMessage && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2 text-terminal-red">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{execution.errorMessage}</p>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {execution.items.map((item) => (
              <ItemProgressRow
                key={item.itemId}
                item={item}
                isActive={item.itemId === execution.currentItemId}
                isExpanded={item.itemId === expandedItemId}
                onToggle={() =>
                  setExpandedItemId(
                    item.itemId === expandedItemId ? null : item.itemId
                  )
                }
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-500 dark:text-gray-400">
            Started: {new Date(execution.startedAt).toLocaleString()}
            {execution.completedAt && (
              <span className="ml-4">
                Completed: {new Date(execution.completedAt).toLocaleString()}
              </span>
            )}
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Need React import for useState/useEffect
import React from 'react';

export default PhaseExecutionPanel;
