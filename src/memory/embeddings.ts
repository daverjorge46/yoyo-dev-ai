/**
 * Embeddings Module
 *
 * Provides vector embedding generation for semantic search.
 * Supports multiple embedding providers:
 * - Local: Simple TF-IDF based embeddings (no external dependencies)
 * - OpenAI: OpenAI text-embedding-3-small (requires API key)
 * - Ollama: Local model embeddings via Ollama
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Embedding provider type.
 */
export type EmbeddingProvider = 'local' | 'openai' | 'ollama';

/**
 * Configuration for embedding generation.
 */
export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  dimensions?: number;
}

/**
 * Result of embedding generation.
 */
export interface EmbeddingResult {
  embeddings: number[];
  model: string;
  dimensions: number;
  provider: EmbeddingProvider;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: EmbeddingConfig = {
  provider: 'local',
  dimensions: 384,
};

/**
 * Common words to filter out for TF-IDF.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after',
  'beneath', 'under', 'above', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
  'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all',
  'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
]);

// =============================================================================
// Local Embedding Implementation (TF-IDF based)
// =============================================================================

/**
 * Tokenize text into words.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Calculate term frequency for a document.
 */
function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  // Normalize by document length
  const total = tokens.length;
  const entries = Array.from(tf.entries());
  for (const [term, count] of entries) {
    tf.set(term, count / total);
  }
  return tf;
}

/**
 * Simple hash function for consistent vector positioning.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Generate local embeddings using TF-IDF inspired approach.
 * Creates a sparse vector representation based on term hashing.
 */
function generateLocalEmbedding(text: string, dimensions: number): number[] {
  const tokens = tokenize(text);
  const tf = termFrequency(tokens);

  // Initialize embedding vector
  const embedding = new Array(dimensions).fill(0);

  // Distribute term weights across dimensions using hashing
  const tfEntries = Array.from(tf.entries());
  for (const [term, weight] of tfEntries) {
    const hash = hashString(term);
    const primaryIndex = hash % dimensions;
    const secondaryIndex = (hash * 31) % dimensions;

    // Add weighted contribution
    embedding[primaryIndex] += weight;
    embedding[secondaryIndex] += weight * 0.5;
  }

  // Normalize the vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dimensions; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
}

// =============================================================================
// Vector Operations
// =============================================================================

/**
 * Calculate cosine similarity between two vectors.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Similarity score (0.0 to 1.0)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions must match: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i]!;
    const bVal = b[i]!;
    dotProduct += aVal * bVal;
    magnitudeA += aVal * aVal;
    magnitudeB += bVal * bVal;
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate Euclidean distance between two vectors.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Distance (lower is more similar)
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions must match: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i]! - b[i]!;
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length.
 *
 * @param vector - Vector to normalize
 * @returns Normalized vector
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map((val) => val / magnitude);
}

// =============================================================================
// Embedding Generation
// =============================================================================

/**
 * Generate embeddings for text content.
 *
 * @param text - Text to generate embeddings for
 * @param config - Embedding configuration
 * @returns Embedding result
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig = DEFAULT_CONFIG
): Promise<EmbeddingResult> {
  const dimensions = config.dimensions || 384;

  switch (config.provider) {
    case 'local':
      return {
        embeddings: generateLocalEmbedding(text, dimensions),
        model: 'local-tfidf',
        dimensions,
        provider: 'local',
      };

    case 'openai':
      return generateOpenAIEmbedding(text, config);

    case 'ollama':
      return generateOllamaEmbedding(text, config);

    default:
      throw new Error(`Unknown embedding provider: ${config.provider}`);
  }
}

/**
 * Generate embeddings using OpenAI API.
 */
async function generateOpenAIEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<EmbeddingResult> {
  if (!config.apiKey) {
    throw new Error('OpenAI API key required for OpenAI embeddings');
  }

  const model = config.model || 'text-embedding-3-small';
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';

  const response = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: text,
      dimensions: config.dimensions,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embedding failed: ${error}`);
  }

  const data = await response.json() as {
    data: Array<{ embedding: number[] }>;
  };

  const firstData = data.data[0];
  if (!firstData) {
    throw new Error('OpenAI returned empty embedding data');
  }
  const embeddings = firstData.embedding;

  return {
    embeddings,
    model,
    dimensions: embeddings.length,
    provider: 'openai',
  };
}

/**
 * Generate embeddings using Ollama.
 */
async function generateOllamaEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<EmbeddingResult> {
  const model = config.model || 'nomic-embed-text';
  const baseUrl = config.baseUrl || 'http://localhost:11434';

  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama embedding failed: ${error}`);
  }

  const data = await response.json() as { embedding: number[] };

  return {
    embeddings: data.embedding,
    model,
    dimensions: data.embedding.length,
    provider: 'ollama',
  };
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Generate embeddings for multiple texts.
 *
 * @param texts - Array of texts to embed
 * @param config - Embedding configuration
 * @returns Array of embedding results
 */
export async function generateEmbeddings(
  texts: string[],
  config: EmbeddingConfig = DEFAULT_CONFIG
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  for (const text of texts) {
    const result = await generateEmbedding(text, config);
    results.push(result);
  }

  return results;
}

// =============================================================================
// Content Preparation
// =============================================================================

/**
 * Prepare memory block content for embedding.
 * Converts structured content to a flat text representation.
 *
 * @param content - Memory block content (any type)
 * @returns Text suitable for embedding
 */
export function prepareContentForEmbedding(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (typeof content !== 'object' || content === null) {
    return String(content);
  }

  const parts: string[] = [];

  function extractText(obj: unknown, depth = 0): void {
    if (depth > 5) return; // Prevent deep recursion

    if (typeof obj === 'string') {
      parts.push(obj);
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        extractText(item, depth + 1);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        // Include key as context
        if (typeof value === 'string' || typeof value === 'number') {
          parts.push(`${key}: ${value}`);
        } else {
          extractText(value, depth + 1);
        }
      }
    }
  }

  extractText(content);
  return parts.join(' ');
}

// =============================================================================
// Configuration Helpers
// =============================================================================

/**
 * Create embedding config from environment variables.
 */
export function configFromEnv(): EmbeddingConfig {
  const provider = (process.env.EMBEDDING_PROVIDER || 'local') as EmbeddingProvider;

  return {
    provider,
    model: process.env.EMBEDDING_MODEL,
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.EMBEDDING_BASE_URL,
    dimensions: process.env.EMBEDDING_DIMENSIONS
      ? parseInt(process.env.EMBEDDING_DIMENSIONS, 10)
      : undefined,
  };
}

/**
 * Get default embedding configuration.
 */
export function getDefaultConfig(): EmbeddingConfig {
  return { ...DEFAULT_CONFIG };
}
