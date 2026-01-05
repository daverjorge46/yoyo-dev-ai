/**
 * Memory Search API Routes
 *
 * Provides semantic search, keyword search, and hybrid search
 * for memory blocks.
 */

import { Hono } from 'hono';
import type { Variables } from '../types.js';

export const memorySearchRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Types
// =============================================================================

interface SearchRequest {
  query: string;
  method?: 'semantic' | 'keyword' | 'hybrid';
  type?: 'persona' | 'project' | 'user' | 'corrections';
  scope?: 'global' | 'project';
  limit?: number;
  minSimilarity?: number;
  tags?: string[];
}

interface SearchResult {
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

interface SearchResponse {
  results: SearchResult[];
  total: number;
  queryTime: number;
  searchMethod: 'semantic' | 'keyword' | 'hybrid';
  query: string;
}

interface ParsedQuery {
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

// =============================================================================
// Routes
// =============================================================================

// POST /api/memory/search - Perform a search
memorySearchRoutes.post('/', async (c) => {
  const startTime = Date.now();

  try {
    const body = await c.req.json<SearchRequest>();

    if (!body.query || typeof body.query !== 'string') {
      return c.json({ error: 'Query is required' }, 400);
    }

    const query = body.query.trim();
    if (query.length < 2) {
      return c.json({ error: 'Query must be at least 2 characters' }, 400);
    }

    const method = body.method || 'hybrid';
    const limit = Math.min(body.limit || 20, 100);

    // Perform search based on method
    // Note: This is a simplified implementation that simulates search results
    // In production, this would use the actual search engine from src/memory
    const results = performSearch(query, method, {
      type: body.type,
      scope: body.scope,
      limit,
      minSimilarity: body.minSimilarity || 0.3,
      tags: body.tags,
    });

    const response: SearchResponse = {
      results,
      total: results.length,
      queryTime: Date.now() - startTime,
      searchMethod: method,
      query,
    };

    return c.json(response);
  } catch (error) {
    return c.json({ error: 'Search failed' }, 500);
  }
});

// GET /api/memory/search/parse - Parse a natural language query
memorySearchRoutes.get('/parse', async (c) => {
  const query = c.req.query('q');

  if (!query) {
    return c.json({ error: 'Query parameter q is required' }, 400);
  }

  const parsed = parseQuery(query);
  return c.json(parsed);
});

// GET /api/memory/search/suggest - Get search suggestions
memorySearchRoutes.get('/suggest', async (c) => {
  const query = c.req.query('q') || '';
  const limit = parseInt(c.req.query('limit') || '5', 10);

  const suggestions = getSearchSuggestions(query, limit);
  return c.json({ suggestions });
});

// GET /api/memory/search/stats - Get search statistics
memorySearchRoutes.get('/stats', async (c) => {
  const stats = getSearchStats();
  return c.json(stats);
});

// POST /api/memory/search/similar - Find similar blocks
memorySearchRoutes.post('/similar', async (c) => {
  try {
    const body = await c.req.json<{ blockId: string; limit?: number }>();

    if (!body.blockId) {
      return c.json({ error: 'blockId is required' }, 400);
    }

    const limit = Math.min(body.limit || 5, 20);
    const similar = findSimilarBlocks(body.blockId, limit);

    return c.json({ similar });
  } catch (error) {
    return c.json({ error: 'Failed to find similar blocks' }, 500);
  }
});

// =============================================================================
// Search Implementation (Simplified)
// =============================================================================

function performSearch(
  query: string,
  method: 'semantic' | 'keyword' | 'hybrid',
  options: {
    type?: string;
    scope?: string;
    limit: number;
    minSimilarity: number;
    tags?: string[];
  }
): SearchResult[] {
  // This is a simplified search implementation
  // In production, this would use the SearchEngine from src/memory/search-engine.ts

  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/).filter(k => k.length > 2);

  // Simulate some search results based on query keywords
  const mockBlocks = [
    { id: 'project-1', type: 'project', scope: 'project', content: 'React TypeScript application architecture', tags: ['react', 'typescript'] },
    { id: 'user-1', type: 'user', scope: 'project', content: 'User prefers functional components and hooks', tags: ['preferences'] },
    { id: 'corrections-1', type: 'corrections', scope: 'project', content: 'Always use async/await instead of promises', tags: ['coding-style'] },
    { id: 'persona-1', type: 'persona', scope: 'project', content: 'Senior developer assistant with expertise in TypeScript', tags: ['persona'] },
  ];

  for (const block of mockBlocks) {
    // Apply type filter
    if (options.type && block.type !== options.type) continue;
    // Apply scope filter
    if (options.scope && block.scope !== options.scope) continue;
    // Apply tag filter
    if (options.tags?.length && !options.tags.some(t => block.tags.includes(t))) continue;

    // Calculate similarity based on keyword matches
    const contentLower = block.content.toLowerCase();
    const matchingTerms = keywords.filter(k => contentLower.includes(k));
    const similarity = matchingTerms.length / Math.max(keywords.length, 1);

    if (similarity >= options.minSimilarity || matchingTerms.length > 0) {
      results.push({
        id: block.id,
        type: block.type,
        scope: block.scope,
        similarity: Math.round(similarity * 100) / 100,
        relevanceScore: similarity * 0.8 + 0.2,
        method,
        matchingTerms,
        preview: block.content.substring(0, 100),
        tags: block.tags,
      });
    }
  }

  // Sort by similarity and limit
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, options.limit);
}

function parseQuery(query: string): ParsedQuery {
  const normalized = query.toLowerCase().trim();
  const stopWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
  const keywords = normalized
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  // Detect intent
  let intent = 'general';
  if (/code|function|class|method/.test(normalized)) intent = 'find_code';
  else if (/config|setting|option/.test(normalized)) intent = 'find_config';
  else if (/pattern|approach|design/.test(normalized)) intent = 'find_pattern';
  else if (/decision|correction|learned/.test(normalized)) intent = 'find_decision';

  // Suggest filters
  const suggestedFilters: ParsedQuery['suggestedFilters'] = {};
  if (intent === 'find_code' || intent === 'find_pattern') suggestedFilters.type = 'project';
  if (intent === 'find_decision') suggestedFilters.type = 'corrections';
  if (/global/.test(normalized)) suggestedFilters.scope = 'global';
  if (/project/.test(normalized)) suggestedFilters.scope = 'project';

  return {
    original: query,
    normalized,
    keywords,
    intent,
    suggestedFilters,
  };
}

function getSearchSuggestions(query: string, limit: number): string[] {
  const suggestions = [
    'react components',
    'typescript types',
    'api endpoints',
    'error handling',
    'authentication',
    'database queries',
    'testing patterns',
    'coding standards',
  ];

  if (!query) return suggestions.slice(0, limit);

  const queryLower = query.toLowerCase();
  return suggestions
    .filter(s => s.includes(queryLower))
    .slice(0, limit);
}

function getSearchStats() {
  // Simplified stats - would be populated by actual SearchEngine
  return {
    totalSearches: 0,
    averageResultCount: 0,
    averageQueryTime: 0,
    topQueries: [],
    methodDistribution: {
      semantic: 0,
      keyword: 0,
      hybrid: 0,
    },
  };
}

function findSimilarBlocks(blockId: string, limit: number): SearchResult[] {
  // Simplified - would use actual vector similarity
  return [];
}
