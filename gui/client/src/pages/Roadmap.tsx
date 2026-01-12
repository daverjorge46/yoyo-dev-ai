/**
 * Roadmap Page
 *
 * Interactive timeline visualization of the development roadmap
 * with zoom controls, phase filtering, drag-drop reordering,
 * inline editing, and links to specs/fixes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';
import {
  Map,
  ZoomIn,
  ZoomOut,
  Filter,
  Target,
  Link2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  RoadmapTimeline,
  type RoadmapPhaseData,
  PhaseExecutionModal,
  PhaseExecutionPanel,
} from '../components/roadmap';
import { RalphMonitorPanel } from '../components/roadmap/RalphMonitorPanel';
import { usePhaseExecution } from '../hooks/usePhaseExecution';
import { usePhaseExecutor } from '../hooks/usePhaseExecutor';

// =============================================================================
// Types
// =============================================================================

interface RoadmapData {
  title: string;
  overview: string;
  phases: RoadmapPhaseData[];
  totalItems: number;
  completedItems: number;
  overallProgress: number;
}

interface LinkedSpec {
  specId: string;
  phaseId: string;
  itemTitle: string;
}

type FilterType = 'all' | 'completed' | 'in_progress' | 'pending';

// =============================================================================
// API Functions
// =============================================================================

async function fetchRoadmap(): Promise<RoadmapData> {
  const res = await fetch('/api/roadmap');
  if (!res.ok) throw new Error('Failed to fetch roadmap');
  return res.json();
}

async function fetchLinkedSpecs(): Promise<{ linkedSpecs: LinkedSpec[]; totalSpecs: number }> {
  const res = await fetch('/api/roadmap/specs');
  if (!res.ok) throw new Error('Failed to fetch linked specs');
  return res.json();
}

async function reorderPhases(activeId: string, overId: string): Promise<RoadmapData> {
  const res = await fetch('/api/roadmap/phases/reorder', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activeId, overId }),
  });
  if (!res.ok) throw new Error('Failed to reorder phases');
  return res.json();
}

async function updatePhase(phaseId: string, name: string): Promise<{ phase: RoadmapPhaseData }> {
  const res = await fetch(`/api/roadmap/phases/${phaseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to update phase');
  return res.json();
}

// =============================================================================
// Sub-Components
// =============================================================================

function TimelineControls({
  zoom,
  onZoomChange,
  filter,
  onFilterChange,
}: {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onZoomChange(Math.max(25, zoom - 25))}
          disabled={zoom <= 25}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Zoom out"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-center">
          {zoom}%
        </span>
        <button
          onClick={() => onZoomChange(Math.min(150, zoom + 25))}
          disabled={zoom >= 150}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Zoom in"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" aria-hidden="true" />
        <select
          value={filter}
          onChange={(e) => onFilterChange(e.target.value as FilterType)}
          className="text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Filter phases by status"
        >
          <option value="all">All Phases</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="pending">Pending</option>
        </select>
      </div>
    </div>
  );
}

function OverallProgress({ data }: { data: RoadmapData }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-[#E85D04]" aria-hidden="true" />
          <h3 className="font-medium text-gray-900 dark:text-white">
            Overall Progress
          </h3>
        </div>
        <span className="text-2xl font-bold text-[#E85D04]">
          {data.overallProgress}%
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5" role="progressbar" aria-valuenow={data.overallProgress} aria-valuemin={0} aria-valuemax={100}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${data.overallProgress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="bg-[#E85D04] h-2.5 rounded-full"
        />
      </div>
      <div className="flex items-center justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
        <span>{data.completedItems} completed</span>
        <span>{data.totalItems - data.completedItems} remaining</span>
      </div>
    </div>
  );
}

function LinkedSpecsCard({ linkedSpecs, totalSpecs }: { linkedSpecs: LinkedSpec[]; totalSpecs: number }) {
  if (linkedSpecs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="h-5 w-5 text-indigo-500" aria-hidden="true" />
        <h3 className="font-medium text-gray-900 dark:text-white">
          Linked Specifications
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ({linkedSpecs.length} of {totalSpecs})
        </span>
      </div>
      <ul className="space-y-2">
        {linkedSpecs.slice(0, 5).map((spec) => (
          <li key={`${spec.phaseId}-${spec.specId}`} className="text-sm">
            <a
              href={`/specs?id=${spec.specId}`}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {spec.specId}
            </a>
            <span className="text-gray-500 dark:text-gray-400 ml-2">
              - {spec.itemTitle}
            </span>
          </li>
        ))}
        {linkedSpecs.length > 5 && (
          <li className="text-sm text-gray-400">
            +{linkedSpecs.length - 5} more linked specs
          </li>
        )}
      </ul>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function Roadmap() {
  const queryClient = useQueryClient();
  const [zoom, setZoom] = useState(100);
  const [filter, setFilter] = useState<FilterType>('all');
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [monitorPhaseId, setMonitorPhaseId] = useState<string | null>(null);
  const [monitorPhaseTitle, setMonitorPhaseTitle] = useState<string>('');

  // Phase execution state (Ralph-based - legacy)
  const { isActive, phaseId: executingPhaseId, pauseExecution, stopExecution, reset: resetExecution } = usePhaseExecution();

  // New terminal-based phase executor
  const phaseExecutor = usePhaseExecutor();
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const [selectedPhaseForExecution, setSelectedPhaseForExecution] = useState<RoadmapPhaseData | null>(null);

  // Fetch roadmap data
  const { data, isLoading, error } = useQuery({
    queryKey: ['roadmap'],
    queryFn: fetchRoadmap,
  });

  // Fetch linked specs
  const { data: specsData } = useQuery({
    queryKey: ['roadmap', 'specs'],
    queryFn: fetchLinkedSpecs,
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: ({ activeId, overId }: { activeId: string; overId: string }) =>
      reorderPhases(activeId, overId),
    onSuccess: (newData) => {
      queryClient.setQueryData(['roadmap'], newData);
    },
  });

  // Update phase mutation
  const updateMutation = useMutation({
    mutationFn: ({ phaseId, name }: { phaseId: string; name: string }) =>
      updatePhase(phaseId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      setEditingPhaseId(null);
    },
  });

  // Filter phases
  const filteredPhases = useMemo(() => {
    if (!data?.phases) return [];
    if (filter === 'all') return data.phases;
    return data.phases.filter((phase) => phase.status === filter);
  }, [data?.phases, filter]);

  // Handlers
  const handleReorder = useCallback(
    (activeId: string, overId: string) => {
      reorderMutation.mutate({ activeId, overId });
    },
    [reorderMutation]
  );

  const handleStartEdit = useCallback((phaseId: string) => {
    setEditingPhaseId(phaseId);
  }, []);

  const handleSaveEdit = useCallback(
    (phaseId: string, newTitle: string) => {
      updateMutation.mutate({ phaseId, name: newTitle });
    },
    [updateMutation]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingPhaseId(null);
  }, []);

  const handleExecute = useCallback(
    (phaseId: string) => {
      const phase = data?.phases.find((p) => p.id === phaseId);
      // Open the new terminal-based execution modal
      setSelectedPhaseForExecution(phase || null);
      setShowExecutionModal(true);
    },
    [data?.phases]
  );

  const handleStartExecution = useCallback(
    async (request: Parameters<typeof phaseExecutor.start>[0]) => {
      try {
        await phaseExecutor.start(request);
        setShowExecutionModal(false);
        setShowExecutionPanel(true);
      } catch (error) {
        console.error('Failed to start execution:', error);
      }
    },
    [phaseExecutor]
  );

  const handleLegacyExecute = useCallback(
    (phaseId: string) => {
      const phase = data?.phases.find((p) => p.id === phaseId);
      setMonitorPhaseId(phaseId);
      setMonitorPhaseTitle(phase?.title || phaseId);
    },
    [data?.phases]
  );

  const handleCloseMonitor = useCallback(() => {
    setMonitorPhaseId(null);
  }, []);

  const handlePause = useCallback(async () => {
    try {
      await pauseExecution();
    } catch (err) {
      console.error('Failed to pause execution:', err);
      // Reset frontend state if backend says execution isn't running
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('not running') || errorMessage.includes('No execution')) {
        resetExecution();
      }
    }
  }, [pauseExecution, resetExecution]);

  const handleStop = useCallback(async () => {
    try {
      await stopExecution('User cancelled from roadmap');
    } catch (err) {
      console.error('Failed to stop execution:', err);
      // Reset frontend state if backend says execution isn't running
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('not running') || errorMessage.includes('No execution')) {
        resetExecution();
      }
    }
  }, [stopExecution, resetExecution]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" role="status">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        <span className="sr-only">Loading roadmap...</span>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <Map className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" aria-hidden="true" />
        <p className="text-gray-500 dark:text-gray-400">
          Roadmap not found. Create one at{' '}
          <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
            .yoyo-dev/product/roadmap.md
          </code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.title || 'Development Roadmap'}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {data.phases.length} phases - {data.totalItems} total items
          </p>
        </div>
        <TimelineControls
          zoom={zoom}
          onZoomChange={setZoom}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>

      {/* Overall Progress */}
      <OverallProgress data={data} />

      {/* Linked Specs (if any) */}
      {specsData && (
        <LinkedSpecsCard
          linkedSpecs={specsData.linkedSpecs}
          totalSpecs={specsData.totalSpecs}
        />
      )}

      {/* Overview */}
      {data.overview && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Overview
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
            {data.overview}
          </p>
        </div>
      )}

      {/* Phase Timeline with Drag-Drop */}
      <RoadmapTimeline
        phases={filteredPhases}
        zoom={zoom}
        onReorder={handleReorder}
        editingPhaseId={editingPhaseId}
        onStartEdit={handleStartEdit}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
        onExecute={handleExecute}
        onPause={phaseExecutor.isExecuting ? phaseExecutor.pause : handlePause}
        onStop={phaseExecutor.isExecuting ? phaseExecutor.cancel : handleStop}
        isExecutionRunning={isActive || phaseExecutor.isExecuting}
        executingPhaseId={phaseExecutor.currentExecution?.phaseId ?? executingPhaseId}
      />

      {/* Ralph Monitor Panel (Legacy) */}
      <RalphMonitorPanel
        isOpen={monitorPhaseId !== null}
        onClose={handleCloseMonitor}
        phaseId={monitorPhaseId || ''}
        phaseTitle={monitorPhaseTitle}
      />

      {/* New Terminal-Based Phase Execution Modal */}
      <PhaseExecutionModal
        isOpen={showExecutionModal}
        onClose={() => setShowExecutionModal(false)}
        phase={selectedPhaseForExecution}
        onStart={handleStartExecution}
        isStarting={phaseExecutor.isStarting}
      />

      {/* Phase Execution Panel */}
      <PhaseExecutionPanel
        isOpen={showExecutionPanel}
        onClose={() => setShowExecutionPanel(false)}
        execution={phaseExecutor.currentExecution}
        onPause={phaseExecutor.pause}
        onResume={phaseExecutor.resume}
        onCancel={phaseExecutor.cancel}
        isPausing={phaseExecutor.isPausing}
        isResuming={phaseExecutor.isResuming}
        isCancelling={phaseExecutor.isCancelling}
      />

      {/* Mutation status indicators */}
      {reorderMutation.isPending && (
        <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Saving changes...
        </div>
      )}
      {reorderMutation.isError && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Failed to save changes
        </div>
      )}
    </div>
  );
}
