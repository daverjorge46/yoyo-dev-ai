/**
 * RoadmapTimeline Component
 *
 * Container for roadmap phases with drag-and-drop reordering support.
 * Uses @dnd-kit for accessible drag-drop functionality.
 */

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { RoadmapPhase, type RoadmapPhaseData } from './RoadmapPhase';

// =============================================================================
// Types
// =============================================================================

export interface RoadmapTimelineProps {
  /** Array of phases to display */
  phases: RoadmapPhaseData[];
  /** Zoom level (25-150) */
  zoom: number;
  /** Callback when phases are reordered */
  onReorder: (activeId: string, overId: string) => void;
  /** Currently editing phase ID */
  editingPhaseId: string | null;
  /** Callback to start editing */
  onStartEdit: (phaseId: string) => void;
  /** Callback to save edit */
  onSaveEdit: (phaseId: string, newTitle: string) => void;
  /** Callback to cancel edit */
  onCancelEdit: () => void;
  /** Callback to execute a phase */
  onExecute?: (phaseId: string) => void;
  /** Callback to pause execution */
  onPause?: () => void;
  /** Callback to stop execution */
  onStop?: () => void;
  /** Whether an execution is currently running */
  isExecutionRunning?: boolean;
  /** ID of the currently executing phase */
  executingPhaseId?: string | null;
}

// =============================================================================
// Component
// =============================================================================

export function RoadmapTimeline({
  phases,
  zoom,
  onReorder,
  editingPhaseId,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onExecute,
  onPause,
  onStop,
  isExecutionRunning = false,
  executingPhaseId = null,
}: RoadmapTimelineProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure sensors for drag-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Get active phase for drag overlay
  const activePhase = activeId
    ? phases.find((p) => p.id === activeId)
    : null;

  if (phases.length === 0) {
    return (
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center"
        data-testid="roadmap-timeline"
        role="list"
      >
        <p className="text-gray-500 dark:text-gray-400">
          No phases match the selected filter.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        className="relative space-y-4"
        data-testid="roadmap-timeline"
        role="list"
        aria-label="Roadmap phases"
      >
        {/* Timeline connector line */}
        <div
          className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 z-0"
          data-testid="timeline-connector"
          aria-hidden="true"
        />

        <SortableContext
          items={phases.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {phases.map((phase) => (
            <RoadmapPhase
              key={phase.id}
              phase={phase}
              zoom={zoom}
              defaultExpanded={phase.status === 'in_progress'}
              isDragging={activeId === phase.id}
              isEditing={editingPhaseId === phase.id}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onExecute={onExecute}
              onPause={onPause}
              onStop={onStop}
              isExecutionRunning={isExecutionRunning}
              executingPhaseId={executingPhaseId}
            />
          ))}
        </SortableContext>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activePhase ? (
          <div className="opacity-80 shadow-2xl">
            <RoadmapPhase
              phase={activePhase}
              zoom={zoom}
              defaultExpanded={false}
              isDragging={false}
              isEditing={false}
              onStartEdit={() => {}}
              onSaveEdit={() => {}}
              onCancelEdit={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
