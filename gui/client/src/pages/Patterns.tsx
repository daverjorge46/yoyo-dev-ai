import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PatternSummary {
  id: string;
  title: string;
  category: string;
  description: string;
  usageCount: number;
  tags: string[];
}

interface PatternDetail extends PatternSummary {
  content: string;
  examples: string[];
  relatedPatterns: string[];
}

interface PatternsResponse {
  patterns: PatternSummary[];
  count: number;
  categories: string[];
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchPatterns(): Promise<PatternsResponse> {
  const res = await fetch('/api/patterns');
  if (!res.ok) throw new Error('Failed to fetch patterns');
  return res.json();
}

async function fetchPatternDetail(id: string): Promise<PatternDetail> {
  const res = await fetch(`/api/patterns/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to fetch pattern');
  return res.json();
}

// =============================================================================
// Category Colors
// =============================================================================

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  general: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-300 dark:border-gray-600',
  },
  architecture: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-800',
  },
  testing: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-300 dark:border-green-800',
  },
  performance: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-800',
  },
  security: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-800',
  },
  ui: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-800',
  },
  data: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-300 dark:border-indigo-800',
  },
};

function getCategoryColor(category: string) {
  return categoryColors[(category || 'general').toLowerCase()] || categoryColors.general;
}

// =============================================================================
// Pattern Card Component
// =============================================================================

function PatternCard({
  pattern,
  onSelect,
  selected,
}: {
  pattern: PatternSummary;
  onSelect: () => void;
  selected: boolean;
}) {
  const categoryColor = getCategoryColor(pattern.category);

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        selected
          ? `${categoryColor.border} ${categoryColor.bg}`
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900 dark:text-white">
          {pattern.title}
        </h3>
        <span className={`px-2 py-0.5 text-xs rounded ${categoryColor.bg} ${categoryColor.text}`}>
          {pattern.category}
        </span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
        {pattern.description}
      </p>

      {pattern.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {pattern.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
            >
              {tag}
            </span>
          ))}
          {pattern.tags.length > 3 && (
            <span className="text-xs text-gray-400">+{pattern.tags.length - 3}</span>
          )}
        </div>
      )}

      {pattern.usageCount > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Used {pattern.usageCount} time{pattern.usageCount !== 1 ? 's' : ''}
        </div>
      )}
    </button>
  );
}

// =============================================================================
// Pattern Detail View Component
// =============================================================================

function PatternDetailView({ patternId }: { patternId: string }) {
  const { data: pattern, isLoading } = useQuery({
    queryKey: ['pattern', patternId],
    queryFn: () => fetchPatternDetail(patternId),
    enabled: !!patternId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!pattern) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        Pattern not found
      </div>
    );
  }

  const categoryColor = getCategoryColor(pattern.category);

  // Remove frontmatter from content
  const contentWithoutFrontmatter = pattern.content.replace(/^---[\s\S]*?---\n*/, '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {pattern.title}
          </h2>
          <span className={`px-3 py-1 text-sm rounded ${categoryColor.bg} ${categoryColor.text}`}>
            {pattern.category}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {pattern.id}
        </p>
      </div>

      {/* Tags */}
      {pattern.tags.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {pattern.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Usage Stats */}
      {pattern.usageCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>
            Applied {pattern.usageCount} time{pattern.usageCount !== 1 ? 's' : ''} in this project
          </span>
        </div>
      )}

      {/* Examples */}
      {pattern.examples.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Examples
          </h3>
          <div className="space-y-2">
            {pattern.examples.map((example, idx) => (
              <div
                key={idx}
                className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-auto"
              >
                <pre className="text-sm text-gray-100">
                  <code>{example.replace(/```\w*\n?/g, '').replace(/```$/g, '')}</code>
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Patterns */}
      {pattern.relatedPatterns.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Related Patterns
          </h3>
          <div className="flex flex-wrap gap-2">
            {pattern.relatedPatterns.map((related, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
              >
                {related}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Full Content */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Full Documentation
        </h3>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 overflow-auto max-h-96">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {contentWithoutFrontmatter}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Patterns Page Component
// =============================================================================

export default function Patterns() {
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['patterns'],
    queryFn: fetchPatterns,
  });

  const patterns = data?.patterns ?? [];
  const categories = data?.categories ?? [];

  // Filter patterns
  const filteredPatterns = useMemo(() => {
    return patterns.filter((pattern) => {
      const matchesSearch =
        !searchQuery ||
        pattern.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pattern.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pattern.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = !categoryFilter || pattern.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [patterns, searchQuery, categoryFilter]);

  // Group by category
  const groupedPatterns = useMemo(() => {
    const groups: Record<string, PatternSummary[]> = {};
    filteredPatterns.forEach((pattern) => {
      if (!groups[pattern.category]) {
        groups[pattern.category] = [];
      }
      groups[pattern.category].push(pattern);
    });
    return groups;
  }, [filteredPatterns]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Patterns
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Reusable code patterns and best practices
        </p>
      </div>

      {patterns.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Patterns Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Patterns are discovered and saved as you work. They help ensure
            consistency across your codebase.
          </p>
        </div>
      ) : (
        <>
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
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
                placeholder="Search patterns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            {categories.length > 0 && (
              <select
                value={categoryFilter || ''}
                onChange={(e) => setCategoryFilter(e.target.value || null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patterns list */}
            <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-auto">
              {filteredPatterns.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No patterns match your search
                </div>
              ) : categoryFilter ? (
                // Flat list when filtered by category
                <div className="space-y-2">
                  {filteredPatterns.map((pattern) => (
                    <PatternCard
                      key={pattern.id}
                      pattern={pattern}
                      onSelect={() => setSelectedPattern(pattern.id)}
                      selected={selectedPattern === pattern.id}
                    />
                  ))}
                </div>
              ) : (
                // Grouped by category
                Object.entries(groupedPatterns).map(([category, categoryPatterns]) => (
                  <div key={category}>
                    <h3 className={`text-sm font-medium mb-2 px-1 ${getCategoryColor(category).text}`}>
                      {category} ({categoryPatterns.length})
                    </h3>
                    <div className="space-y-2">
                      {categoryPatterns.map((pattern) => (
                        <PatternCard
                          key={pattern.id}
                          pattern={pattern}
                          onSelect={() => setSelectedPattern(pattern.id)}
                          selected={selectedPattern === pattern.id}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Detail view */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-6">
                {selectedPattern ? (
                  <PatternDetailView patternId={selectedPattern} />
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <svg className="h-12 w-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                    Select a pattern to view details
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
