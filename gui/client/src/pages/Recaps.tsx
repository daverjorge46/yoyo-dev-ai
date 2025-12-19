import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface RecapSummary {
  id: string;
  title: string;
  date: string;
  summary: string;
  specName: string | null;
  taskCount: number;
  linesAdded: number | null;
  linesRemoved: number | null;
}

interface RecapDetail extends RecapSummary {
  content: string;
  keyDecisions: string[];
  lessonsLearned: string[];
}

interface RecapsResponse {
  recaps: RecapSummary[];
  count: number;
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchRecaps(): Promise<RecapsResponse> {
  const res = await fetch('/api/recaps');
  if (!res.ok) throw new Error('Failed to fetch recaps');
  return res.json();
}

async function fetchRecapDetail(id: string): Promise<RecapDetail> {
  const res = await fetch(`/api/recaps/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to fetch recap');
  return res.json();
}

// =============================================================================
// Recap Card Component
// =============================================================================

function RecapCard({
  recap,
  onSelect,
  selected,
}: {
  recap: RecapSummary;
  onSelect: () => void;
  selected: boolean;
}) {
  const formattedDate = new Date(recap.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        selected
          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">
            {recap.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formattedDate}
          </p>
        </div>
        {recap.specName && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
            {recap.specName}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
        {recap.summary}
      </p>

      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        {recap.taskCount > 0 && (
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {recap.taskCount} tasks
          </span>
        )}
        {recap.linesAdded !== null && (
          <span className="text-green-600 dark:text-green-400">
            +{recap.linesAdded}
          </span>
        )}
        {recap.linesRemoved !== null && (
          <span className="text-red-600 dark:text-red-400">
            -{recap.linesRemoved}
          </span>
        )}
      </div>
    </button>
  );
}

// =============================================================================
// Recap Detail View Component
// =============================================================================

function RecapDetailView({ recapId }: { recapId: string }) {
  const { data: recap, isLoading } = useQuery({
    queryKey: ['recap', recapId],
    queryFn: () => fetchRecapDetail(recapId),
    enabled: !!recapId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!recap) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        Recap not found
      </div>
    );
  }

  const formattedDate = new Date(recap.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {recap.title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {formattedDate}
          {recap.specName && (
            <span className="ml-2 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
              {recap.specName}
            </span>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {recap.taskCount}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Tasks</p>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded">
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {recap.linesAdded !== null ? `+${recap.linesAdded}` : '-'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Added</p>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/30 rounded">
          <p className="text-lg font-bold text-red-600 dark:text-red-400">
            {recap.linesRemoved !== null ? `-${recap.linesRemoved}` : '-'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Removed</p>
        </div>
      </div>

      {/* Key Decisions */}
      {recap.keyDecisions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Key Decisions
          </h3>
          <ul className="space-y-1">
            {recap.keyDecisions.map((decision, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
              >
                <svg className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
                {decision}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lessons Learned */}
      {recap.lessonsLearned.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Lessons Learned
          </h3>
          <ul className="space-y-1">
            {recap.lessonsLearned.map((lesson, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
              >
                <svg className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {lesson}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Full Content */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Full Recap
        </h3>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 overflow-auto max-h-96">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {recap.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Recaps Page Component
// =============================================================================

export default function Recaps() {
  const [selectedRecap, setSelectedRecap] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['recaps'],
    queryFn: fetchRecaps,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  const recaps = data?.recaps ?? [];

  // Filter recaps by search
  const filteredRecaps = recaps.filter((recap) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      recap.title.toLowerCase().includes(query) ||
      recap.summary.toLowerCase().includes(query) ||
      (recap.specName && recap.specName.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Recaps
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Session summaries and development history
        </p>
      </div>

      {recaps.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Recaps Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Recaps are created automatically after completing tasks using{' '}
            <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
              /execute-tasks
            </code>
          </p>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search recaps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recaps list */}
            <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-auto">
              {filteredRecaps.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No recaps match your search
                </div>
              ) : (
                filteredRecaps.map((recap) => (
                  <RecapCard
                    key={recap.id}
                    recap={recap}
                    onSelect={() => setSelectedRecap(recap.id)}
                    selected={selectedRecap === recap.id}
                  />
                ))
              )}
            </div>

            {/* Detail view */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-6">
                {selectedRecap ? (
                  <RecapDetailView recapId={selectedRecap} />
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <svg className="h-12 w-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Select a recap to view details
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
