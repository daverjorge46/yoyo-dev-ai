/**
 * Search Engine Module
 *
 * High-level search engine for memory queries.
 * Provides:
 * - Natural language query processing
 * - Query expansion and optimization
 * - Result caching
 * - Search analytics
 */

import type { MemoryStore } from './store.js';
import type { MemoryBlockType, MemoryScope } from './types.js';
import {
  search,
  hybridSearch,
  semanticSearch,
  keywordSearch,
  generateMissingEmbeddings,
  type SearchResponse,
  type SearchOptions,
} from './semantic-search.js';
import type { EmbeddingConfig } from './embeddings.js';
import { extractTags } from './auto-tagger.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Natural language query with parsed intent.
 */
export interface ParsedQuery {
  /** Original query text */
  original: string;
  /** Normalized query text */
  normalized: string;
  /** Extracted keywords */
  keywords: string[];
  /** Inferred intent */
  intent: QueryIntent;
  /** Suggested filters based on query */
  suggestedFilters: {
    type?: MemoryBlockType;
    scope?: MemoryScope;
    tags?: string[];
  };
}

/**
 * Query intent classification.
 */
export type QueryIntent =
  | 'find_code'      // Looking for code patterns or implementations
  | 'find_config'    // Looking for configuration or settings
  | 'find_pattern'   // Looking for design patterns or approaches
  | 'find_decision'  // Looking for past decisions or corrections
  | 'general';       // General query

/**
 * Search engine configuration.
 */
export interface SearchEngineConfig {
  /** Embedding configuration */
  embedding?: EmbeddingConfig;
  /** Enable query caching (default: true) */
  cacheEnabled?: boolean;
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTTL?: number;
  /** Enable query expansion (default: true) */
  expandQueries?: boolean;
  /** Track search analytics (default: true) */
  trackAnalytics?: boolean;
}

/**
 * Search analytics entry.
 */
export interface SearchAnalytics {
  query: string;
  timestamp: Date;
  resultCount: number;
  queryTime: number;
  method: 'semantic' | 'keyword' | 'hybrid';
  clickedResults?: string[]; // Block IDs that were accessed
}

/**
 * Search engine statistics.
 */
export interface SearchStats {
  totalSearches: number;
  averageResultCount: number;
  averageQueryTime: number;
  topQueries: Array<{ query: string; count: number }>;
  methodDistribution: {
    semantic: number;
    keyword: number;
    hybrid: number;
  };
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: Required<SearchEngineConfig> = {
  embedding: { provider: 'local', dimensions: 384 },
  cacheEnabled: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  expandQueries: true,
  trackAnalytics: true,
};

/**
 * Intent detection patterns.
 */
const INTENT_PATTERNS: Array<{ pattern: RegExp; intent: QueryIntent }> = [
  { pattern: /\b(code|function|class|method|implement)\b/i, intent: 'find_code' },
  { pattern: /\b(config|setting|option|env|environment)\b/i, intent: 'find_config' },
  { pattern: /\b(pattern|approach|design|architecture)\b/i, intent: 'find_pattern' },
  { pattern: /\b(decision|correction|learned|remember)\b/i, intent: 'find_decision' },
];

/**
 * Query expansion synonyms.
 */
const QUERY_EXPANSIONS: Record<string, string[]> = {
  auth: ['authentication', 'login', 'oauth', 'jwt'],
  db: ['database', 'sql', 'query', 'schema'],
  api: ['endpoint', 'rest', 'graphql', 'route'],
  ui: ['user interface', 'frontend', 'component', 'layout'],
  test: ['testing', 'unit test', 'jest', 'vitest'],
  style: ['css', 'styling', 'tailwind', 'theme'],
};

// =============================================================================
// SearchEngine Class
// =============================================================================

/**
 * High-level search engine for memory queries.
 */
export class SearchEngine {
  private store: MemoryStore;
  private config: Required<SearchEngineConfig>;
  private cache: Map<string, { response: SearchResponse; timestamp: number }>;
  private analytics: SearchAnalytics[];
  private initialized: boolean = false;

  constructor(store: MemoryStore, config: SearchEngineConfig = {}) {
    this.store = store;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    this.analytics = [];
  }

  /**
   * Initialize the search engine.
   * Generates embeddings for blocks that don't have them.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Generate missing embeddings
    await generateMissingEmbeddings(this.store, this.config.embedding);

    this.initialized = true;
  }

  /**
   * Parse a natural language query.
   */
  parseQuery(query: string): ParsedQuery {
    const normalized = query.toLowerCase().trim();
    const keywords = this.extractKeywords(normalized);
    const intent = this.detectIntent(normalized);
    const suggestedFilters = this.suggestFilters(normalized, intent);

    return {
      original: query,
      normalized,
      keywords,
      intent,
      suggestedFilters,
    };
  }

  /**
   * Search memory with a natural language query.
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    // Check cache first
    const cacheKey = this.getCacheKey(query, options);
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    // Parse query
    const parsed = this.parseQuery(query);

    // Expand query if enabled
    let searchQuery = query;
    if (this.config.expandQueries) {
      searchQuery = this.expandQuery(query, parsed.keywords);
    }

    // Apply suggested filters from query parsing
    const searchOptions: SearchOptions = {
      ...options,
      type: options.type ?? parsed.suggestedFilters.type,
      scope: options.scope ?? parsed.suggestedFilters.scope,
    };

    // Perform search
    const response = await search(
      this.store,
      searchQuery,
      this.config.embedding,
      searchOptions
    );

    // Cache result
    if (this.config.cacheEnabled) {
      this.addToCache(cacheKey, response);
    }

    // Track analytics
    if (this.config.trackAnalytics) {
      this.trackSearch(query, response);
    }

    return response;
  }

  /**
   * Perform semantic-only search.
   */
  async semanticSearch(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    return semanticSearch(this.store, query, this.config.embedding, {
      ...options,
      method: 'semantic',
    });
  }

  /**
   * Perform keyword-only search.
   */
  keywordSearch(query: string, options: SearchOptions = {}): SearchResponse {
    return keywordSearch(this.store, query, { ...options, method: 'keyword' });
  }

  /**
   * Perform hybrid search.
   */
  async hybridSearch(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    return hybridSearch(this.store, query, this.config.embedding, {
      ...options,
      method: 'hybrid',
    });
  }

  /**
   * Get search statistics.
   */
  getStats(): SearchStats {
    if (this.analytics.length === 0) {
      return {
        totalSearches: 0,
        averageResultCount: 0,
        averageQueryTime: 0,
        topQueries: [],
        methodDistribution: { semantic: 0, keyword: 0, hybrid: 0 },
      };
    }

    // Calculate averages
    const totalSearches = this.analytics.length;
    const averageResultCount =
      this.analytics.reduce((sum, a) => sum + a.resultCount, 0) / totalSearches;
    const averageQueryTime =
      this.analytics.reduce((sum, a) => sum + a.queryTime, 0) / totalSearches;

    // Count query frequency
    const queryFreq = new Map<string, number>();
    for (const entry of this.analytics) {
      queryFreq.set(entry.query, (queryFreq.get(entry.query) || 0) + 1);
    }

    const topQueries = Array.from(queryFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // Count method distribution
    const methodDistribution = { semantic: 0, keyword: 0, hybrid: 0 };
    for (const entry of this.analytics) {
      methodDistribution[entry.method]++;
    }

    return {
      totalSearches,
      averageResultCount,
      averageQueryTime,
      topQueries,
      methodDistribution,
    };
  }

  /**
   * Clear the search cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear analytics history.
   */
  clearAnalytics(): void {
    this.analytics = [];
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private extractKeywords(text: string): string[] {
    // Remove common words and extract meaningful terms
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'how', 'what', 'where', 'when', 'why',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'find', 'get', 'show', 'tell', 'me', 'i', 'you', 'we', 'they',
    ]);

    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }

  private detectIntent(text: string): QueryIntent {
    for (const { pattern, intent } of INTENT_PATTERNS) {
      if (pattern.test(text)) {
        return intent;
      }
    }
    return 'general';
  }

  private suggestFilters(
    text: string,
    intent: QueryIntent
  ): ParsedQuery['suggestedFilters'] {
    const filters: ParsedQuery['suggestedFilters'] = {};

    // Suggest type based on intent
    if (intent === 'find_code' || intent === 'find_pattern') {
      filters.type = 'project';
    } else if (intent === 'find_decision') {
      filters.type = 'corrections';
    }

    // Detect scope mentions
    if (/\bglobal\b/i.test(text)) {
      filters.scope = 'global';
    } else if (/\bproject\b/i.test(text)) {
      filters.scope = 'project';
    }

    // Extract relevant tags using auto-tagger
    const tagResult = extractTags('project', { name: '', description: text } as any);
    if (tagResult.tags.length > 0) {
      filters.tags = tagResult.tags.filter((t) => t !== 'project');
    }

    return filters;
  }

  private expandQuery(query: string, keywords: string[]): string {
    const expansions: string[] = [];

    for (const keyword of keywords) {
      const synonyms = QUERY_EXPANSIONS[keyword];
      if (synonyms) {
        expansions.push(...synonyms.slice(0, 2)); // Add first 2 synonyms
      }
    }

    if (expansions.length > 0) {
      return `${query} ${expansions.join(' ')}`;
    }

    return query;
  }

  private getCacheKey(query: string, options: SearchOptions): string {
    return JSON.stringify({ query: query.toLowerCase(), options });
  }

  private getFromCache(key: string): SearchResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.config.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.response;
  }

  private addToCache(key: string, response: SearchResponse): void {
    this.cache.set(key, { response, timestamp: Date.now() });

    // Cleanup old entries if cache is too large
    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.cache) {
        if (now - v.timestamp > this.config.cacheTTL) {
          this.cache.delete(k);
        }
      }
    }
  }

  private trackSearch(query: string, response: SearchResponse): void {
    this.analytics.push({
      query,
      timestamp: new Date(),
      resultCount: response.total,
      queryTime: response.queryTime,
      method: response.searchMethod,
    });

    // Keep only last 1000 entries
    if (this.analytics.length > 1000) {
      this.analytics = this.analytics.slice(-1000);
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a search engine instance.
 *
 * @param store - MemoryStore instance
 * @param config - Search engine configuration
 * @returns SearchEngine instance
 */
export function createSearchEngine(
  store: MemoryStore,
  config?: SearchEngineConfig
): SearchEngine {
  return new SearchEngine(store, config);
}
