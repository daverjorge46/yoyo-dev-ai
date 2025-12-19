import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';

interface MemoryBlock {
  id: string;
  type: 'persona' | 'project' | 'user' | 'corrections';
  scope: 'global' | 'project';
  content: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface MemoryResponse {
  initialized: boolean;
  blocks: MemoryBlock[];
  count: number;
  message?: string;
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchMemory(): Promise<MemoryResponse> {
  const res = await fetch('/api/memory');
  if (!res.ok) throw new Error('Failed to fetch memory');
  return res.json();
}

async function updateMemoryBlock(
  type: string,
  content: Record<string, unknown>
): Promise<MemoryBlock> {
  const res = await fetch(`/api/memory/${type}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to update memory');
  return res.json();
}

async function createMemoryBlock(
  type: MemoryBlock['type'],
  content: Record<string, unknown>,
  scope: 'global' | 'project' = 'project'
): Promise<MemoryBlock> {
  const res = await fetch('/api/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, content, scope }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to create memory');
  }
  return res.json();
}

async function deleteMemoryBlock(type: string): Promise<void> {
  const res = await fetch(`/api/memory/${type}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete memory');
  }
}

// =============================================================================
// Block Type Configuration
// =============================================================================

const blockTypeInfo: Record<
  MemoryBlock['type'],
  { label: string; description: string; color: string; icon: JSX.Element; deletable: boolean }
> = {
  persona: {
    label: 'Persona',
    description: 'AI personality and behavior settings',
    color: 'indigo',
    deletable: false,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  project: {
    label: 'Project',
    description: 'Project-specific context and settings',
    color: 'blue',
    deletable: false,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  user: {
    label: 'User',
    description: 'User preferences and customizations',
    color: 'green',
    deletable: true,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  corrections: {
    label: 'Corrections',
    description: 'Learned corrections and adjustments',
    color: 'yellow',
    deletable: true,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
};

// =============================================================================
// JSON Editor Component (CodeMirror)
// =============================================================================

function JsonEditor({
  value,
  onChange,
  onValidChange,
}: {
  value: string;
  onChange: (value: string) => void;
  onValidChange: (isValid: boolean) => void;
}) {
  const [editorContainer, setEditorContainer] = useState<HTMLDivElement | null>(null);
  const [view, setView] = useState<EditorView | null>(null);

  // Detect dark mode
  const isDark = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!editorContainer) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newValue = update.state.doc.toString();
        onChange(newValue);

        // Validate JSON
        try {
          JSON.parse(newValue);
          onValidChange(true);
        } catch {
          onValidChange(false);
        }
      }
    });

    const extensions = [
      basicSetup,
      json(),
      updateListener,
      EditorView.lineWrapping,
    ];

    if (isDark) {
      extensions.push(oneDark);
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const editorView = new EditorView({
      state,
      parent: editorContainer,
    });

    setView(editorView);

    return () => {
      editorView.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorContainer, isDark]);

  // Update content when value prop changes (from external source)
  useEffect(() => {
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    }
  }, [value, view]);

  return (
    <div
      ref={setEditorContainer}
      className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden h-96"
    />
  );
}

// =============================================================================
// Memory Block Card Component
// =============================================================================

function MemoryBlockCard({
  block,
  onSelect,
  selected,
}: {
  block: MemoryBlock;
  onSelect: () => void;
  selected: boolean;
}) {
  const info = blockTypeInfo[block.type];

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        selected
          ? `border-${info.color}-500 bg-${info.color}-50 dark:bg-${info.color}-900/20`
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`text-${info.color}-600 dark:text-${info.color}-400`}>
          {info.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white">
            {info.label}
          </h3>
        </div>
        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
          v{block.version}
        </span>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        {info.description}
      </p>
      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span className="capitalize">{block.scope} scope</span>
        <span>Updated: {new Date(block.updatedAt).toLocaleDateString()}</span>
      </div>
    </button>
  );
}

// =============================================================================
// Memory Editor Component
// =============================================================================

function MemoryEditor({
  block,
  onClose,
}: {
  block: MemoryBlock;
  onClose: () => void;
}) {
  const [content, setContent] = useState(JSON.stringify(block.content, null, 2));
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newContent: Record<string, unknown>) =>
      updateMemoryBlock(block.type, newContent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory'] });
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to save');
    },
  });

  const handleSave = () => {
    try {
      const parsed = JSON.parse(content);
      setError(null);
      mutation.mutate(parsed);
    } catch {
      setError('Invalid JSON');
    }
  };

  const info = blockTypeInfo[block.type];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`text-${info.color}-600 dark:text-${info.color}-400`}>
            {info.icon}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {info.label} Memory
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Version {block.version} • {block.scope} scope
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Content (JSON)
          </label>
          {!isValid && (
            <span className="text-xs text-red-500">Invalid JSON</span>
          )}
        </div>
        <JsonEditor
          value={content}
          onChange={setContent}
          onValidChange={setIsValid}
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={mutation.isPending || !isValid}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Create Memory Block Modal
// =============================================================================

function CreateMemoryModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<MemoryBlock['type']>('user');
  const [content, setContent] = useState('{\n  \n}');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: { type: MemoryBlock['type']; content: Record<string, unknown> }) =>
      createMemoryBlock(data.type, data.content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory'] });
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to create');
    },
  });

  const handleCreate = () => {
    try {
      const parsed = JSON.parse(content);
      setError(null);
      mutation.mutate({ type, content: parsed });
    } catch {
      setError('Invalid JSON');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create Memory Block
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Block Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['user', 'corrections'] as const).map((t) => {
                const info = blockTypeInfo[t];
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      type === t
                        ? `border-${info.color}-500 bg-${info.color}-50 dark:bg-${info.color}-900/20`
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className={`text-${info.color}-600 dark:text-${info.color}-400`}>
                      {info.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {info.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {info.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Note: Persona and Project blocks are system-managed and cannot be created manually.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Content (JSON)
              </label>
              {!isValid && (
                <span className="text-xs text-red-500">Invalid JSON</span>
              )}
            </div>
            <JsonEditor
              value={content}
              onChange={setContent}
              onValidChange={setIsValid}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={mutation.isPending || !isValid}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? 'Creating...' : 'Create Block'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Content Preview Component
// =============================================================================

function ContentPreview({ content }: { content: Record<string, unknown> }) {
  const entries = Object.entries(content);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
        No content
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {key}
          </h4>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded p-2 overflow-auto max-h-32">
            {typeof value === 'object' ? (
              <pre className="font-mono text-xs whitespace-pre-wrap">
                {JSON.stringify(value, null, 2)}
              </pre>
            ) : (
              String(value)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Memory Page Component
// =============================================================================

export default function Memory() {
  const [selectedBlock, setSelectedBlock] = useState<MemoryBlock | null>(null);
  const [editing, setEditing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['memory'],
    queryFn: fetchMemory,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMemoryBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory'] });
      setSelectedBlock(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!data?.initialized) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Memory
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            AI memory system for persistent context
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Memory System Not Initialized
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Initialize the memory system using the{' '}
            <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
              /yoyo-ai-memory
            </code>{' '}
            command
          </p>
        </div>
      </div>
    );
  }

  const blocks = data.blocks;

  // Check which block types already exist
  const existingTypes = new Set(blocks.map((b) => b.type));
  const canCreate = !existingTypes.has('user') || !existingTypes.has('corrections');

  return (
    <div className="space-y-6">
      {showCreate && <CreateMemoryModal onClose={() => setShowCreate(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Memory
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {blocks.length} memory block{blocks.length !== 1 ? 's' : ''} stored
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Block
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Blocks list */}
        <div className="lg:col-span-1 space-y-3">
          {blocks.map((block) => (
            <MemoryBlockCard
              key={block.id}
              block={block}
              onSelect={() => {
                setSelectedBlock(block);
                setEditing(false);
              }}
              selected={selectedBlock?.id === block.id}
            />
          ))}
        </div>

        {/* Detail/Editor view */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-6">
            {editing && selectedBlock ? (
              <MemoryEditor
                block={selectedBlock}
                onClose={() => setEditing(false)}
              />
            ) : selectedBlock ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`text-${blockTypeInfo[selectedBlock.type].color}-600 dark:text-${blockTypeInfo[selectedBlock.type].color}-400`}>
                      {blockTypeInfo[selectedBlock.type].icon}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {blockTypeInfo[selectedBlock.type].label}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Version {selectedBlock.version} • {selectedBlock.scope} scope
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {blockTypeInfo[selectedBlock.type].deletable && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete the ${selectedBlock.type} block?`)) {
                            deleteMutation.mutate(selectedBlock.type);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                    <button
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* Version history indicator */}
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Created: {new Date(selectedBlock.createdAt).toLocaleString()}</span>
                  <span className="mx-2">•</span>
                  <span>Modified: {new Date(selectedBlock.updatedAt).toLocaleString()}</span>
                </div>

                <ContentPreview content={selectedBlock.content} />
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <svg className="h-12 w-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Select a memory block to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
