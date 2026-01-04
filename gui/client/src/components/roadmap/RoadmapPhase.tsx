/**
 * RoadmapPhase Component
 *
 * Displays a roadmap phase card with progress bar, status badge,
 * collapsible sections, and drag handle for reordering.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CheckCircle,
  Circle,
  Clock,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Pencil,
  Play,
  Loader2,
} from 'lucide-react';
import { RoadmapFeature, type RoadmapFeatureItem } from './RoadmapFeature';
import { RoadmapEditor } from './RoadmapEditor';

// =============================================================================
// Types
// =============================================================================

export interface RoadmapSection {
  title: string;
  items: RoadmapFeatureItem[];
}

export interface RoadmapPhaseData {
  id: string;
  number: number;
  title: string;
  status: 'completed' | 'in_progress' | 'pending';
  statusText: string;
  goal: string;
  sections: RoadmapSection[];
  itemCount: number;
  completedCount: number;
  progress: number;
}

export interface RoadmapPhaseProps {
  /** Phase data */
  phase: RoadmapPhaseData;
  /** Zoom level (25-150) */
  zoom: number;
  /** Whether phase is expanded by default */
  defaultExpanded: boolean;
  /** Whether phase is currently being dragged */
  isDragging?: boolean;
  /** Whether this phase is being edited */
  isEditing?: boolean;
  /** Callback to start editing */
  onStartEdit: (phaseId: string) => void;
  /** Callback to save edit */
  onSaveEdit: (phaseId: string, newTitle: string) => void;
  /** Callback to cancel edit */
  onCancelEdit: () => void;
  /** Callback to open execution panel */
  onExecute?: (phaseId: string) => void;
  /** Whether another phase is currently executing */
  isExecutionRunning?: boolean;
  /** ID of the currently executing phase (if any) */
  executingPhaseId?: string | null;
}

// =============================================================================
// Sub-Components
// =============================================================================

function PhaseStatusBadge({ status }: { status: RoadmapPhaseData['status'] }) {
  const config = {
    completed: {
      icon: CheckCircle,
      text: 'Completed',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    in_progress: {
      icon: Clock,
      text: 'In Progress',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    pending: {
      icon: Circle,
      text: 'Pending',
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
    },
  };

  const { icon: Icon, text, className } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${className}`}
    >
      <Icon className="h-3 w-3" />
      {text}
    </span>
  );
}

function ProgressRing({
  progress,
  size = 40,
}: {
  progress: number;
  size?: number;
}) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-indigo-500 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
          {progress}%
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function RoadmapPhase({
  phase,
  zoom,
  defaultExpanded,
  isDragging = false,
  isEditing = false,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onExecute,
  isExecutionRunning = false,
  executingPhaseId = null,
}: RoadmapPhaseProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isHovered, setIsHovered] = useState(false);

  // Sortable hook for drag-drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: phase.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const borderColor =
    phase.status === 'completed'
      ? 'border-l-green-500'
      : phase.status === 'in_progress'
      ? 'border-l-blue-500'
      : 'border-l-gray-300 dark:border-l-gray-600';

  const handleSaveEdit = (newTitle: string) => {
    onSaveEdit(phase.id, newTitle);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartEdit(phase.id);
  };

  const handleExecuteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExecute?.(phase.id);
  };

  const isThisPhaseExecuting = executingPhaseId === phase.id;
  const canExecute = !isExecutionRunning || isThisPhaseExecuting;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: isDragging ? 0.5 : 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 ${borderColor} overflow-hidden ${
        isDragging ? 'opacity-50' : ''
      }`}
      data-testid={`roadmap-phase-${phase.id}`}
    >
      {/* Phase Header */}
      <div
        className="flex items-center gap-2"
        data-testid="phase-header"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 px-2 py-4 cursor-grab hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          data-testid="drag-handle"
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>

        {/* Expand/Collapse Area */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center justify-between py-4 pr-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-label={`Phase ${phase.number}: ${phase.title}`}
          data-testid="expand-toggle"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <ProgressRing progress={phase.progress} />
            <div className="text-left">
              {isEditing ? (
                <RoadmapEditor
                  value={phase.title}
                  onSave={handleSaveEdit}
                  onCancel={onCancelEdit}
                  placeholder="Enter phase name"
                />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Phase {phase.number}: {phase.title}
                    </h3>
                    <PhaseStatusBadge status={phase.status} />
                    {isHovered && !isEditing && (
                      <>
                        <span
                          onClick={handleEditClick}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                          data-testid="edit-button"
                          role="button"
                          tabIndex={0}
                          aria-label="Edit phase name"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onStartEdit(phase.id);
                            }
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                        </span>
                        {onExecute && (
                          <span
                            onClick={canExecute ? handleExecuteClick : undefined}
                            className={`p-1 rounded transition-colors ${
                              canExecute
                                ? 'hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer'
                                : 'opacity-50 cursor-not-allowed'
                            }`}
                            data-testid="execute-button"
                            role="button"
                            tabIndex={canExecute ? 0 : -1}
                            aria-label={isThisPhaseExecuting ? 'View execution' : 'Execute phase'}
                            aria-disabled={!canExecute}
                            onKeyDown={(e) => {
                              if (canExecute && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                e.stopPropagation();
                                onExecute(phase.id);
                              }
                            }}
                          >
                            {isThisPhaseExecuting ? (
                              <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                            ) : (
                              <Play className="h-3.5 w-3.5 text-blue-500" />
                            )}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {phase.goal ||
                      `${phase.completedCount}/${phase.itemCount} items completed`}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {phase.completedCount}/{phase.itemCount}
            </span>
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Phase Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 ml-8">
              {phase.sections.map((section) => (
                <div key={section.title}>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 px-2">
                    {section.title}
                  </h4>
                  <div className="space-y-1" role="list">
                    {section.items.map((item) => (
                      <RoadmapFeature key={item.id} feature={item} zoom={zoom} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
