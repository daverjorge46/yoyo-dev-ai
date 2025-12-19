import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

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

const blockTypeInfo: Record<
  MemoryBlock['type'],
  { label: string; description: string; color: string }
> = {
  persona: {
    label: 'Persona',
    description: 'AI personality and behavior settings',
    color: 'indigo',
  },
  project: {
    label: 'Project',
    description: 'Project-specific context and settings',
    color: 'blue',
  },
  user: {
    label: 'User',
    description: 'User preferences and customizations',
    color: 'green',
  },
  corrections: {
    label: 'Corrections',
    description: 'Learned corrections and adjustments',
    color: 'yellow',
  },
};

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
  const colorClasses: Record<string, string> = {
    indigo: 'border-indigo-200 dark:border-indigo-800',
    blue: 'border-blue-200 dark:border-blue-800',
    green: 'border-green-200 dark:border-green-800',
    yellow: 'border-yellow-200 dark:border-yellow-800',
  };

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        selected
          ? `${colorClasses[info.color]} bg-${info.color}-50 dark:bg-${info.color}-900/20`
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900 dark:text-white">
          {info.label}
        </h3>
        <span className="badge badge-neutral">v{block.version}</span>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        {info.description}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Updated: {new Date(block.updatedAt).toLocaleString()}
      </p>
    </button>
  );
}

function MemoryEditor({
  block,
  onClose,
}: {
  block: MemoryBlock;
  onClose: () => void;
}) {
  const [content, setContent] = useState(
    JSON.stringify(block.content, null, 2)
  );
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
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {info.label} Memory
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Version {block.version} • {block.scope} scope
          </p>
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Content (JSON)
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-96 font-mono text-sm p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          spellCheck={false}
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
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
          disabled={mutation.isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-wait"
        >
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function ContentPreview({ content }: { content: Record<string, unknown> }) {
  const entries = Object.entries(content);

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {key}
          </h4>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded p-2 overflow-auto max-h-32">
            {typeof value === 'object' ? (
              <pre className="font-mono text-xs">
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

export default function Memory() {
  const [selectedBlock, setSelectedBlock] = useState<MemoryBlock | null>(null);
  const [editing, setEditing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['memory'],
    queryFn: fetchMemory,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Memory
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          {blocks.length} memory block{blocks.length !== 1 ? 's' : ''} stored
        </p>
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
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {blockTypeInfo[selectedBlock.type].label}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Version {selectedBlock.version} • {selectedBlock.scope}{' '}
                      scope
                    </p>
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                  >
                    Edit
                  </button>
                </div>
                <ContentPreview content={selectedBlock.content} />
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                Select a memory block to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
