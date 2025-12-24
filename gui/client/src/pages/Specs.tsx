/**
 * Specs Page
 *
 * Enhanced specifications page with CRUD operations,
 * sub-specs display, decisions log, and state info.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Edit2,
  Plus,
  Trash2,
  FileText,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  GitBranch,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { FileEditorModal } from '../components/FileEditorModal';
import { CreateSpecModal } from '../components/CreateSpecModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

// =============================================================================
// Types
// =============================================================================

interface Spec {
  id: string;
  name: string;
  date: string;
  hasSpec: boolean;
  hasTasks: boolean;
  hasState: boolean;
}

interface SubSpec {
  name: string;
  content: string;
}

interface SpecDetail {
  id: string;
  name: string;
  date: string;
  spec: string | null;
  specLite: string | null;
  tasks: string | null;
  state: {
    specId: string;
    status: string;
    currentTask?: string;
    completedTasks?: string[];
    startedAt?: string;
    updatedAt?: string;
  } | null;
  files: string[];
  subSpecs: SubSpec[];
  decisions: string | null;
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchSpecs(): Promise<{ specs: Spec[]; count: number }> {
  const res = await fetch('/api/specs');
  if (!res.ok) throw new Error('Failed to fetch specs');
  return res.json();
}

async function fetchSpecDetail(id: string): Promise<SpecDetail> {
  const res = await fetch(`/api/specs/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to fetch spec detail');
  return res.json();
}

async function deleteSpec(id: string, confirmName: string): Promise<void> {
  const res = await fetch(`/api/specs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'X-Confirm-Name': confirmName,
    },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete spec');
  }
}

// =============================================================================
// Sub-Components
// =============================================================================

function ProgressBar({ progress }: { progress: number }) {
  const color =
    progress === 100
      ? 'bg-green-500'
      : progress > 50
      ? 'bg-blue-500'
      : progress > 0
      ? 'bg-yellow-500'
      : 'bg-gray-300';

  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
      <div
        className={`${color} h-1.5 rounded-full transition-all duration-300`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; label: string }> = {
    draft: {
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      label: 'Draft',
    },
    planning: {
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      label: 'Planning',
    },
    implementation: {
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      label: 'In Progress',
    },
    completed: {
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      label: 'Completed',
    },
  };

  const { className, label } = config[(status || 'draft').toLowerCase()] || config.draft;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function SpecCard({
  spec,
  onClick,
  selected,
}: {
  spec: Spec;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        selected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">
            {spec.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {spec.date}
          </p>
        </div>
        <div className="flex gap-1 ml-2">
          {spec.hasSpec && (
            <span className="badge badge-info text-xs">Spec</span>
          )}
          {spec.hasTasks && (
            <span className="badge badge-success text-xs">Tasks</span>
          )}
        </div>
      </div>
    </button>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: typeof FileText;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {title}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="p-3 bg-white dark:bg-gray-800">{children}</div>
      )}
    </div>
  );
}

function SpecDetailView({
  specId,
  onDelete,
}: {
  specId: string;
  onDelete: () => void;
}) {
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: spec, isLoading } = useQuery({
    queryKey: ['spec', specId],
    queryFn: () => fetchSpecDetail(specId),
    enabled: !!specId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        Spec not found
      </div>
    );
  }

  const specFolder = `.yoyo-dev/specs/${spec.id}`;
  const progress = spec.state?.completedTasks?.length
    ? Math.round((spec.state.completedTasks.length / 10) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {spec.name}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {spec.date}
            </p>
            {spec.state && <StatusBadge status={spec.state.status} />}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Delete specification"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* State Info */}
      {spec.state && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Started</p>
                <p className="text-gray-700 dark:text-gray-300">
                  {spec.state.startedAt
                    ? new Date(spec.state.startedAt).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>
            {spec.state.completedTasks && spec.state.completedTasks.length > 0 && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Completed</p>
                  <p className="text-gray-700 dark:text-gray-300">
                    {spec.state.completedTasks.length} tasks
                  </p>
                </div>
              </div>
            )}
          </div>
          {progress > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <ProgressBar progress={progress} />
            </div>
          )}
        </div>
      )}

      {/* Files */}
      <CollapsibleSection title="Files" icon={FolderOpen} defaultOpen={true}>
        <div className="space-y-1">
          {spec.files.map((file) => {
            const fullPath = `${specFolder}/${file}`;
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
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-indigo-500 transition-all"
                    title="Edit file"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Sub-Specs */}
      {spec.subSpecs.length > 0 && (
        <CollapsibleSection title={`Sub-Specs (${spec.subSpecs.length})`} icon={GitBranch}>
          <div className="space-y-2">
            {spec.subSpecs.map((subSpec) => (
              <div
                key={subSpec.name}
                className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded"
              >
                <span className="text-gray-700 dark:text-gray-300">
                  {subSpec.name}
                </span>
                <button
                  onClick={() =>
                    setEditingFile(`${specFolder}/sub-specs/${subSpec.name}.md`)
                  }
                  className="p-1 text-gray-400 hover:text-indigo-500"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Decisions */}
      {spec.decisions && (
        <CollapsibleSection title="Decisions Log" icon={FileText}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Technical decisions and rationale</span>
            <button
              onClick={() => setEditingFile(`${specFolder}/decisions.md`)}
              className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
            >
              <Edit2 className="h-3 w-3" />
              Edit
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-3 max-h-48 overflow-auto">
            <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono">
              {spec.decisions.slice(0, 500)}
              {spec.decisions.length > 500 && '...'}
            </pre>
          </div>
        </CollapsibleSection>
      )}

      {/* Spec Summary */}
      {spec.specLite && (
        <CollapsibleSection title="Specification Summary" icon={FileText}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Condensed overview</span>
            <button
              onClick={() => setEditingFile(`${specFolder}/spec-lite.md`)}
              className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
            >
              <Edit2 className="h-3 w-3" />
              Edit
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-3 max-h-64 overflow-auto">
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
              {spec.specLite}
            </pre>
          </div>
        </CollapsibleSection>
      )}

      {/* Editor Modal */}
      {editingFile && (
        <FileEditorModal
          filePath={editingFile}
          onClose={() => {
            setEditingFile(null);
            queryClient.invalidateQueries({ queryKey: ['spec', specId] });
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

export default function Specs() {
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Spec | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['specs'],
    queryFn: fetchSpecs,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      deleteSpec(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specs'] });
      if (deleteTarget && selectedSpec === deleteTarget.id) {
        setSelectedSpec(null);
      }
      setDeleteTarget(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const specs = data?.specs ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Specifications
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {specs.length} specification{specs.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Spec
        </button>
      </div>

      {specs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No specifications found. Create one to get started.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Specification
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Specs list */}
          <div className="lg:col-span-1 space-y-3">
            {specs.map((spec) => (
              <SpecCard
                key={spec.id}
                spec={spec}
                onClick={() => setSelectedSpec(spec.id)}
                selected={selectedSpec === spec.id}
              />
            ))}
          </div>

          {/* Detail view */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-6">
              {selectedSpec ? (
                <SpecDetailView
                  specId={selectedSpec}
                  onDelete={() => {
                    const spec = specs.find((s) => s.id === selectedSpec);
                    if (spec) setDeleteTarget(spec);
                  }}
                />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Select a specification to view details
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <CreateSpecModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(specId) => {
          setSelectedSpec(specId);
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
          itemType="spec"
          itemName={deleteTarget.name}
          itemId={deleteTarget.id}
        />
      )}
    </div>
  );
}
