/**
 * useMemorySearch Hook
 *
 * React hook for memory search functionality with
 * debouncing, caching, and loading states.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// Types
// =============================================================================

export interface SearchResult {
  id: string;
  type: string;
  scope: string;
  similarity: number;
  relevanceScore: number;
  method: 'semantic' | 'keyword' | 'hybrid';
  matchingTerms?: string[];
  preview: string;
  tags: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  queryTime: number;
  searchMethod: 'semantic' | 'keyword' | 'hybrid';
  query: string;
}

export interface SearchOptions {
  method?: 'semantic' | 'keyword' | 'hybrid';
  type?: 'persona' | 'project' | 'user' | 'corrections';
  scope?: 'global' | 'project';
  limit?: number;
  minSimilarity?: number;
  tags?: string[];
}

export interface ParsedQuery {
  original: string;
  normalized: string;
  keywords: string[];
  intent: string;
  suggestedFilters: {
    type?: string;
    scope?: string;
    tags?: string[];
  };
}

export interface UseMemorySearchOptions {
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Enable query parsing (default: true) */
  parseQuery?: boolean;
  /** Cache time in milliseconds (default: 5 minutes) */
  cacheTime?: number;
  /** Stale time in milliseconds (default: 1 minute) */
  staleTime?: number;
}

// =============================================================================
// API Functions
// =============================================================================

const API_BASE = '/api/memory';

async function searchMemory(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
  const response = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, ...options }),
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return response.json();
}

async function parseSearchQuery(query: string): Promise<ParsedQuery> {
  const response = await fetch(`${API_BASE}/search/parse?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw new Error(`Parse failed: ${response.statusText}`);
  }

  return response.json();
}

async function getSuggestions(query: string, limit: number = 5): Promise<string[]> {
  const response = await fetch(
    `${API_BASE}/search/suggest?q=${encodeURIComponent(query)}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`Suggestions failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.suggestions;
}

async function findSimilar(blockId: string, limit: number = 5): Promise<SearchResult[]> {
  const response = await fetch(`${API_BASE}/search/similar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blockId, limit }),
  });

  if (!response.ok) {
    throw new Error(`Similar search failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.similar;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useMemorySearch(options: UseMemorySearchOptions = {}) {
  const {
    debounceMs = 300,
    parseQuery: enableParsing = true,
    cacheTime = 5 * 60 * 1000,
    staleTime = 60 * 1000,
  } = options;

  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({});
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce query changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, debounceMs]);

  // Search query
  const searchQuery = useQuery({
    queryKey: ['memory-search', debouncedQuery, searchOptions],
    queryFn: () => searchMemory(debouncedQuery, searchOptions),
    enabled: debouncedQuery.length >= 2,
    gcTime: cacheTime,
    staleTime,
  });

  // Parse query
  const parseQueryResult = useQuery({
    queryKey: ['memory-search-parse', debouncedQuery],
    queryFn: () => parseSearchQuery(debouncedQuery),
    enabled: enableParsing && debouncedQuery.length >= 2,
    gcTime: cacheTime,
    staleTime,
  });

  // Suggestions query
  const suggestionsQuery = useQuery({
    queryKey: ['memory-search-suggestions', query],
    queryFn: () => getSuggestions(query),
    enabled: query.length >= 1,
    gcTime: cacheTime,
    staleTime,
  });

  // Similar blocks mutation
  const findSimilarMutation = useMutation({
    mutationFn: ({ blockId, limit }: { blockId: string; limit?: number }) =>
      findSimilar(blockId, limit),
  });

  // Update query
  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  // Update options
  const updateOptions = useCallback((newOptions: Partial<SearchOptions>) => {
    setSearchOptions(prev => ({ ...prev, ...newOptions }));
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setSearchOptions({});
  }, []);

  // Refresh results
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['memory-search'] });
  }, [queryClient]);

  // Find similar to a block
  const findSimilarTo = useCallback((blockId: string, limit?: number) => {
    return findSimilarMutation.mutateAsync({ blockId, limit });
  }, [findSimilarMutation]);

  return {
    // State
    query,
    debouncedQuery,
    options: searchOptions,

    // Results
    results: searchQuery.data?.results ?? [],
    total: searchQuery.data?.total ?? 0,
    queryTime: searchQuery.data?.queryTime,
    searchMethod: searchQuery.data?.searchMethod,

    // Parsed query
    parsedQuery: parseQueryResult.data,

    // Suggestions
    suggestions: suggestionsQuery.data ?? [],

    // Loading states
    isSearching: searchQuery.isLoading || searchQuery.isFetching,
    isParsing: parseQueryResult.isLoading,
    isSuggestionsLoading: suggestionsQuery.isLoading,

    // Error states
    searchError: searchQuery.error,
    parseError: parseQueryResult.error,

    // Actions
    setQuery: updateQuery,
    setOptions: updateOptions,
    clearSearch,
    refresh,
    findSimilarTo,

    // Similar blocks
    similarResults: findSimilarMutation.data ?? [],
    isFindingSimilar: findSimilarMutation.isPending,
  };
}

// =============================================================================
// Additional Hooks
// =============================================================================

/**
 * Hook for just getting search suggestions
 */
export function useSearchSuggestions(query: string, limit: number = 5) {
  return useQuery({
    queryKey: ['memory-search-suggestions', query, limit],
    queryFn: () => getSuggestions(query, limit),
    enabled: query.length >= 1,
  });
}

/**
 * Hook for finding similar blocks
 */
export function useSimilarBlocks(blockId: string | null, limit: number = 5) {
  return useQuery({
    queryKey: ['memory-similar', blockId, limit],
    queryFn: () => findSimilar(blockId!, limit),
    enabled: !!blockId,
  });
}

/**
 * Hook for search statistics
 */
export function useSearchStats() {
  return useQuery({
    queryKey: ['memory-search-stats'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/search/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch search stats');
      }
      return response.json();
    },
  });
}

export default useMemorySearch;
