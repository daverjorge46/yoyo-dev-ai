/**
 * MemorySearch Component
 *
 * Search interface for the memory system with filters,
 * suggestions, and result display.
 */

import { useState, useCallback } from 'react';
import { useMemorySearch, type SearchOptions, type SearchResult } from '../hooks/useMemorySearch';
import { Search, Filter, X, Clock, Tag, FileText, Loader2 } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface MemorySearchProps {
  /** Callback when a result is selected */
  onResultSelect?: (result: SearchResult) => void;
  /** Show filters panel (default: true) */
  showFilters?: boolean;
  /** Show suggestions (default: true) */
  showSuggestions?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function MemorySearch({
  onResultSelect,
  showFilters = true,
  showSuggestions = true,
  placeholder = 'Search memory blocks...',
  className = '',
}: MemorySearchProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const {
    query,
    setQuery,
    options,
    setOptions,
    results,
    total,
    queryTime,
    searchMethod,
    suggestions,
    isSearching,
    clearSearch,
    parsedQuery,
  } = useMemorySearch();

  const handleResultClick = useCallback((result: SearchResult) => {
    onResultSelect?.(result);
  }, [onResultSelect]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
  }, [setQuery]);

  const handleFilterChange = useCallback((key: keyof SearchOptions, value: string | undefined) => {
    setOptions({ [key]: value || undefined });
  }, [setOptions]);

  return (
    <div className={`memory-search ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
          {isSearching ? (
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          ) : (
            <Search className="h-5 w-5 text-zinc-400" />
          )}

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none"
          />

          {query && (
            <button
              onClick={clearSearch}
              className="text-zinc-400 hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {showFilters && (
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`text-zinc-400 hover:text-white ${isFiltersOpen ? 'text-orange-500' : ''}`}
              aria-label="Toggle filters"
            >
              <Filter className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && isFocused && query.length >= 1 && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 shadow-lg">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="block w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700"
              >
                <Search className="mr-2 inline h-3 w-3 text-zinc-500" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && isFiltersOpen && (
        <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Search Method */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Search Method
              </label>
              <select
                value={options.method || 'hybrid'}
                onChange={(e) => handleFilterChange('method', e.target.value as SearchOptions['method'])}
                className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-1.5 text-sm text-white"
              >
                <option value="hybrid">Hybrid</option>
                <option value="semantic">Semantic</option>
                <option value="keyword">Keyword</option>
              </select>
            </div>

            {/* Block Type */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Block Type
              </label>
              <select
                value={options.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value as SearchOptions['type'])}
                className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-1.5 text-sm text-white"
              >
                <option value="">All Types</option>
                <option value="persona">Persona</option>
                <option value="project">Project</option>
                <option value="user">User</option>
                <option value="corrections">Corrections</option>
              </select>
            </div>

            {/* Scope */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Scope
              </label>
              <select
                value={options.scope || ''}
                onChange={(e) => handleFilterChange('scope', e.target.value as SearchOptions['scope'])}
                className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-1.5 text-sm text-white"
              >
                <option value="">All Scopes</option>
                <option value="global">Global</option>
                <option value="project">Project</option>
              </select>
            </div>
          </div>

          {/* Parsed Query Info */}
          {parsedQuery && (
            <div className="mt-3 border-t border-zinc-700 pt-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-zinc-500">Intent:</span>
                <span className="rounded bg-zinc-700 px-2 py-0.5 text-zinc-300">
                  {parsedQuery.intent}
                </span>
                {parsedQuery.keywords.length > 0 && (
                  <>
                    <span className="ml-2 text-zinc-500">Keywords:</span>
                    {parsedQuery.keywords.map((keyword, i) => (
                      <span key={i} className="rounded bg-orange-500/20 px-2 py-0.5 text-orange-400">
                        {keyword}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {query.length >= 2 && (
        <div className="mt-4">
          {/* Results Header */}
          {!isSearching && results.length > 0 && (
            <div className="mb-2 flex items-center justify-between text-sm text-zinc-400">
              <span>
                Found {total} result{total !== 1 ? 's' : ''} using {searchMethod} search
              </span>
              {queryTime !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {queryTime}ms
                </span>
              )}
            </div>
          )}

          {/* Results List */}
          <div className="space-y-2">
            {results.map((result) => (
              <SearchResultItem
                key={result.id}
                result={result}
                onClick={() => handleResultClick(result)}
              />
            ))}
          </div>

          {/* No Results */}
          {!isSearching && query.length >= 2 && results.length === 0 && (
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-8 text-center">
              <Search className="mx-auto h-12 w-12 text-zinc-600" />
              <p className="mt-4 text-zinc-400">No results found for "{query}"</p>
              <p className="mt-1 text-sm text-zinc-500">
                Try different keywords or adjust your filters
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface SearchResultItemProps {
  result: SearchResult;
  onClick: () => void;
}

function SearchResultItem({ result, onClick }: SearchResultItemProps) {
  const typeColors: Record<string, string> = {
    persona: 'bg-purple-500/20 text-purple-400',
    project: 'bg-blue-500/20 text-blue-400',
    user: 'bg-green-500/20 text-green-400',
    corrections: 'bg-orange-500/20 text-orange-400',
  };

  const scopeColors: Record<string, string> = {
    global: 'bg-zinc-500/20 text-zinc-400',
    project: 'bg-cyan-500/20 text-cyan-400',
  };

  return (
    <button
      onClick={onClick}
      className="block w-full rounded-lg border border-zinc-700 bg-zinc-800 p-4 text-left transition hover:border-zinc-600 hover:bg-zinc-800/80"
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <div className="flex flex-wrap gap-2">
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeColors[result.type] || 'bg-zinc-500/20 text-zinc-400'}`}>
            {result.type}
          </span>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${scopeColors[result.scope] || 'bg-zinc-500/20 text-zinc-400'}`}>
            {result.scope}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>{Math.round(result.similarity * 100)}% match</span>
        </div>
      </div>

      {/* Preview */}
      <p className="mb-2 line-clamp-2 text-sm text-zinc-300">
        <FileText className="mr-1 inline h-3 w-3 text-zinc-500" />
        {result.preview}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Tags */}
        {result.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {result.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="flex items-center gap-1 rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
            {result.tags.length > 3 && (
              <span className="text-xs text-zinc-500">+{result.tags.length - 3} more</span>
            )}
          </div>
        )}

        {/* Matching Terms */}
        {result.matchingTerms && result.matchingTerms.length > 0 && (
          <div className="text-xs text-zinc-500">
            Matched: {result.matchingTerms.join(', ')}
          </div>
        )}
      </div>
    </button>
  );
}

// =============================================================================
// Compact Search Component
// =============================================================================

interface CompactMemorySearchProps {
  onResultSelect?: (result: SearchResult) => void;
  className?: string;
}

export function CompactMemorySearch({ onResultSelect, className = '' }: CompactMemorySearchProps) {
  return (
    <MemorySearch
      onResultSelect={onResultSelect}
      showFilters={false}
      showSuggestions={true}
      placeholder="Quick search..."
      className={className}
    />
  );
}

export default MemorySearch;
