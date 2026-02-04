/**
 * PhaseExecutionModal Component
 *
 * Configuration modal for starting automated phase execution.
 * Allows selecting items and configuring execution options.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Settings,
  GitBranch,
  TestTube,
  FileText,
  ListChecks,
  AlertCircle,
  CheckCircle,
  Circle,
  Terminal,
} from 'lucide-react';
import type { RoadmapPhaseData } from './RoadmapPhase';
import type { ExecutePhaseRequest, ExecutionOptions, PhaseItem } from '../../hooks/usePhaseExecutor';

// =============================================================================
// Types
// =============================================================================

export interface PhaseExecutionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Phase data */
  phase: RoadmapPhaseData | null;
  /** Start execution handler */
  onStart: (request: ExecutePhaseRequest) => void;
  /** Whether execution is starting */
  isStarting?: boolean;
}

// =============================================================================
// Sub-Components
// =============================================================================

function OptionToggle({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex-shrink-0 pt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand focus:ring-brand"
        />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-gray-900 dark:text-white">{label}</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
    </label>
  );
}

function ItemCheckbox({
  item,
  checked,
  onChange,
}: {
  item: { id: string; title: string; completed: boolean; linkedSpec?: string };
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={item.completed}
        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand focus:ring-brand disabled:opacity-50"
      />
      <div className="flex-1 flex items-center gap-2">
        {item.completed ? (
          <CheckCircle className="h-4 w-4 text-terminal-green" />
        ) : (
          <Circle className="h-4 w-4 text-gray-300" />
        )}
        <span
          className={`text-sm ${
            item.completed
              ? 'text-gray-400 line-through'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {item.title}
        </span>
        {item.linkedSpec && (
          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">
            Has spec
          </span>
        )}
      </div>
    </label>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PhaseExecutionModal({
  isOpen,
  onClose,
  phase,
  onStart,
  isStarting = false,
}: PhaseExecutionModalProps) {
  // Options state
  const [options, setOptions] = useState<ExecutionOptions>({
    autoCreateSpecs: true,
    autoCreateTasks: true,
    runQA: true,
    maxQAIterations: 3,
    stopOnError: false,
    useWorktrees: false,
  });

  // Selected items state
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Get all items from sections (flattened)
  const allItems = useMemo(() => {
    if (!phase) return [];
    return phase.sections.flatMap((section) =>
      section.items.map((item) => ({
        id: item.id,
        number: item.number,
        title: item.title,
        completed: item.completed,
        effort: item.effort,
        description: item.description,
        linkedSpec: item.linkedSpec,
      }))
    );
  }, [phase]);

  // Filter to uncompleted items
  const uncompletedItems = useMemo(
    () => allItems.filter((item) => !item.completed),
    [allItems]
  );

  // Initialize selection with all uncompleted items
  useMemo(() => {
    if (phase) {
      setSelectedItemIds(new Set(uncompletedItems.map((item) => item.id)));
    }
  }, [phase?.id]);

  const toggleItem = (itemId: string, checked: boolean) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedItemIds(new Set(uncompletedItems.map((item) => item.id)));
    } else {
      setSelectedItemIds(new Set());
    }
  };

  const handleStart = () => {
    if (!phase || selectedItemIds.size === 0) return;

    const items: PhaseItem[] = allItems.filter((item) =>
      selectedItemIds.has(item.id)
    );

    onStart({
      phaseId: phase.id,
      phaseTitle: phase.title,
      items,
      options: {
        ...options,
        selectedItemIds: Array.from(selectedItemIds),
      },
    });
  };

  if (!phase) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[600px] max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand/10">
                  <Terminal className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Execute Phase via Agents
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Phase {phase.number}: {phase.title}
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

            {/* Content - scrollable with min-height to ensure footer visibility */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
              {/* Items Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    Select Items to Execute
                  </h3>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={selectedItemIds.size === uncompletedItems.length}
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand focus:ring-brand"
                    />
                    Select all ({uncompletedItems.length})
                  </label>
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  {allItems.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No items in this phase
                    </div>
                  ) : (
                    allItems.map((item) => (
                      <ItemCheckbox
                        key={item.id}
                        item={item}
                        checked={selectedItemIds.has(item.id)}
                        onChange={(checked) => toggleItem(item.id, checked)}
                      />
                    ))
                  )}
                </div>
                {selectedItemIds.size === 0 && (
                  <p className="mt-2 text-sm text-terminal-red flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Select at least one item to execute
                  </p>
                )}
              </div>

              {/* Execution Options */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                  <Settings className="h-4 w-4" />
                  Execution Options
                </h3>
                <div className="space-y-1 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <OptionToggle
                    label="Auto-create specs"
                    description="Create specifications for items that don't have linked specs"
                    checked={options.autoCreateSpecs}
                    onChange={(checked) =>
                      setOptions((o) => ({ ...o, autoCreateSpecs: checked }))
                    }
                    icon={FileText}
                  />
                  <OptionToggle
                    label="Auto-generate tasks"
                    description="Generate task breakdowns from specifications"
                    checked={options.autoCreateTasks}
                    onChange={(checked) =>
                      setOptions((o) => ({ ...o, autoCreateTasks: checked }))
                    }
                    icon={ListChecks}
                  />
                  <OptionToggle
                    label="Run QA review"
                    description="Run QA review and fix cycles after implementation"
                    checked={options.runQA}
                    onChange={(checked) =>
                      setOptions((o) => ({ ...o, runQA: checked }))
                    }
                    icon={TestTube}
                  />
                  <OptionToggle
                    label="Use git worktrees"
                    description="Isolate work in separate git worktrees per item"
                    checked={options.useWorktrees}
                    onChange={(checked) =>
                      setOptions((o) => ({ ...o, useWorktrees: checked }))
                    }
                    icon={GitBranch}
                  />
                  <OptionToggle
                    label="Stop on error"
                    description="Halt execution when any item fails"
                    checked={options.stopOnError}
                    onChange={(checked) =>
                      setOptions((o) => ({ ...o, stopOnError: checked }))
                    }
                    icon={AlertCircle}
                  />
                </div>
              </div>

              {/* QA Iterations */}
              {options.runQA && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max QA iterations per item
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={options.maxQAIterations}
                    onChange={(e) =>
                      setOptions((o) => ({
                        ...o,
                        maxQAIterations: parseInt(e.target.value) || 3,
                      }))
                    }
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Footer - always visible */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {selectedItemIds.size} item{selectedItemIds.size !== 1 ? 's' : ''} selected
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStart}
                  disabled={selectedItemIds.size === 0 || isStarting}
                  className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isStarting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Start Execution
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default PhaseExecutionModal;
