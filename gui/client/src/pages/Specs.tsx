import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface Spec {
  id: string;
  name: string;
  createdAt: string;
  hasSpec: boolean;
  hasTasks: boolean;
  progress: number;
}

interface SpecDetail {
  id: string;
  name: string;
  createdAt: string;
  files: string[];
  spec: string | null;
  specLite: string | null;
}

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
            {new Date(spec.createdAt).toLocaleDateString()}
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
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{spec.progress}%</span>
        </div>
        <ProgressBar progress={spec.progress} />
      </div>
    </button>
  );
}

function SpecDetailView({ specId }: { specId: string }) {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {spec.name}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Created: {new Date(spec.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Files list */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Files
        </h3>
        <div className="space-y-1">
          {spec.files.map((file) => (
            <div
              key={file}
              className="text-sm font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded"
            >
              {file}
            </div>
          ))}
        </div>
      </div>

      {/* Spec content preview */}
      {spec.specLite && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Specification Summary
          </h3>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-96 overflow-auto">
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
              {spec.specLite}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Specs() {
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['specs'],
    queryFn: fetchSpecs,
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Specifications
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          {specs.length} specification{specs.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {specs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No specifications found. Create one using{' '}
            <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
              /create-new
            </code>
          </p>
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
                <SpecDetailView specId={selectedSpec} />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Select a specification to view details
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
