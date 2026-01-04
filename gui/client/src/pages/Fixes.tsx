/**
 * Fixes Page
 *
 * Displays bug fixes with list + detail split view.
 * Supports create, view, edit, and soft delete operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Eye,
  Plus,
  Trash2,
  Wrench,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { FileEditorModal } from '../components/FileEditorModal';
import { CreateFixModal } from '../components/CreateFixModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

// =============================================================================
// Types
// =============================================================================

interface Fix {
  id: string;
  name: string;
  date: string;
  hasAnalysis: boolean;
  hasSolution: boolean;
  hasTasks: boolean;
  hasState: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'unknown';
}

interface FixDetail {
  id: string;
  name: string;
  date: string;
  analysis: string | null;
  solutionLite: string | null;
  tasks: string | null;
  state: {
    fixName: string;
    status: string;
    currentTask?: string;
    completedTasks?: string[];
  } | null;
  files: string[];
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchFixes(): Promise<{ fixes: Fix[]; count: number }> {
  const res = await fetch('/api/fixes');
  if (!res.ok) throw new Error('Failed to fetch fixes');
  return res.json();
}

async function fetchFixDetail(id: string): Promise<FixDetail> {
  const res = await fetch(`/api/fixes/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to fetch fix detail');
  return res.json();
}

async function deleteFix(id: string, confirmName: string): Promise<void> {
  const res = await fetch(`/api/fixes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'X-Confirm-Name': confirmName,
    },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete fix');
  }
}

// =============================================================================
// Sub-Components
// =============================================================================

function StatusBadge({ status }: { status: Fix['status'] }) {
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
      icon: AlertCircle,
      text: 'Pending',
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    unknown: {
      icon: AlertCircle,
      text: 'Unknown',
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
    },
  };

  const { icon: Icon, text, className } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      <Icon className="h-3 w-3" />
      {text}
    </span>
  );
}

function FixCard({
  fix,
  onClick,
  selected,
}: {
  fix: Fix;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        selected
          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="h-4 w-4 text-orange-500 flex-shrink-0" />
            <h3 className="font-medium text-gray-900 dark:text-white truncate">
              {fix.name}
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {fix.date}
          </p>
        </div>
        <StatusBadge status={fix.status} />
      </div>

      {/* File indicators */}
      <div className="flex gap-1 mt-3">
        {fix.hasAnalysis && (
          <span className="badge badge-warning text-xs">Analysis</span>
        )}
        {fix.hasSolution && (
          <span className="badge badge-info text-xs">Solution</span>
        )}
        {fix.hasTasks && (
          <span className="badge badge-success text-xs">Tasks</span>
        )}
      </div>
    </button>
  );
}

function FixDetailView({
  fixId,
  onDelete,
}: {
  fixId: string;
  onDelete: () => void;
}) {
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: fix, isLoading } = useQuery({
    queryKey: ['fix', fixId],
    queryFn: () => fetchFixDetail(fixId),
    enabled: !!fixId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600" />
      </div>
    );
  }

  if (!fix) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        Fix not found
      </div>
    );
  }

  const fixFolder = `.yoyo-dev/fixes/${fix.id}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {fix.name}
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Created: {fix.date}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Delete fix"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* State info */}
      {fix.state && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p>
              <span className="font-medium">Status:</span> {fix.state.status}
            </p>
            {fix.state.currentTask && (
              <p>
                <span className="font-medium">Current:</span> {fix.state.currentTask}
              </p>
            )}
            {fix.state.completedTasks && fix.state.completedTasks.length > 0 && (
              <p>
                <span className="font-medium">Completed:</span>{' '}
                {fix.state.completedTasks.length} task(s)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Files list */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Files
        </h3>
        <div className="space-y-1">
          {fix.files.map((file) => {
            const fullPath = `${fixFolder}/${file}`;
            const isEditable = file.endsWith('.md') || file.endsWith('.json');

            return (
              <div
                key={file}
                className="flex items-center justify-between text-sm font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded group"
              >
                <span>{file}</span>
                {isEditable && (
                  <button
                    onClick={() => setEditingFile(fullPath)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-orange-500 transition-all"
                    title="View file"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Analysis preview */}
      {fix.analysis && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Problem Analysis
            </h3>
            <button
              onClick={() => setEditingFile(`${fixFolder}/analysis.md`)}
              className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />
              View
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-64 overflow-auto">
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
              {fix.analysis}
            </pre>
          </div>
        </div>
      )}

      {/* Solution preview */}
      {fix.solutionLite && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Solution Summary
            </h3>
            <button
              onClick={() => setEditingFile(`${fixFolder}/solution-lite.md`)}
              className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />
              View
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-48 overflow-auto">
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
              {fix.solutionLite}
            </pre>
          </div>
        </div>
      )}

      {/* Tasks preview */}
      {fix.tasks && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tasks
            </h3>
            <button
              onClick={() => setEditingFile(`${fixFolder}/tasks.md`)}
              className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />
              View
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-48 overflow-auto">
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
              {fix.tasks}
            </pre>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {editingFile && (
        <FileEditorModal
          filePath={editingFile}
          onClose={() => {
            setEditingFile(null);
            // Refresh fix data after editing
            queryClient.invalidateQueries({ queryKey: ['fix', fixId] });
          }}
          title={editingFile.split('/').pop()}
        />
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function Fixes() {
  const [selectedFix, setSelectedFix] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Fix | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['fixes'],
    queryFn: fetchFixes,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      deleteFix(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixes'] });
      if (deleteTarget && selectedFix === deleteTarget.id) {
        setSelectedFix(null);
      }
      setDeleteTarget(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
      </div>
    );
  }

  const fixes = data?.fixes ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bug Fixes
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {fixes.length} fix{fixes.length !== 1 ? 'es' : ''} found
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Fix
        </button>
      </div>

      {fixes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <Wrench className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No fixes found. Create one to track bug fixes.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Fix
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fixes list */}
          <div className="lg:col-span-1 space-y-3">
            {fixes.map((fix) => (
              <FixCard
                key={fix.id}
                fix={fix}
                onClick={() => setSelectedFix(fix.id)}
                selected={selectedFix === fix.id}
              />
            ))}
          </div>

          {/* Detail view */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-6">
              {selectedFix ? (
                <FixDetailView
                  fixId={selectedFix}
                  onDelete={() => {
                    const fix = fixes.find((f) => f.id === selectedFix);
                    if (fix) setDeleteTarget(fix);
                  }}
                />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Select a fix to view details
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <CreateFixModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(fixId) => {
          setSelectedFix(fixId);
          setShowCreateModal(false);
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await deleteMutation.mutateAsync({
              id: deleteTarget.id,
              name: deleteTarget.name,
            });
          }}
          itemType="fix"
          itemName={deleteTarget.name}
          itemId={deleteTarget.id}
        />
      )}
    </div>
  );
}
