/**
 * Performance Benchmarks: Search and Learning
 *
 * Tests performance characteristics of the enhanced memory system,
 * including search latency, learning throughput, and memory efficiency.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { join } from 'path';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';

import {
  initializeDatabase,
  closeDatabase,
  saveBlock,
  type MemoryStore,
} from '../../store.js';

import {
  ensureEnhancedSchema,
  updateBlockEmbeddings,
  updateBlockRelevance,
  updateBlockTags,
  getBlocksByTags,
  getBlocksByRelevance,
} from '../../enhanced-store.js';

import {
  keywordSearch,
  hybridSearch,
} from '../../semantic-search.js';

import {
  LearningEngine,
  createLearningEngine,
} from '../../learning-engine.js';

import {
  cosineSimilarity,
  normalizeVector,
  generateEmbedding,
} from '../../embeddings.js';

// =============================================================================
// Test Configuration
// =============================================================================

const PERFORMANCE_THRESHOLDS = {
  searchLatencyMs: 500,      // Max search latency (generous for CI)
  learningLatencyMs: 200,    // Max learning processing time
  embeddingLatencyMs: 500,   // Max embedding generation time
  bulkInsertRatePerSec: 50,  // Min blocks per second for bulk insert
  searchThroughput: 10,      // Min searches per second
};

const TEST_DATA_SIZE = {
  small: 10,
  medium: 100,
  large: 500,
};

// =============================================================================
// Helpers
// =============================================================================

function createTestDb(): string {
  const testDir = join(tmpdir(), `perf-test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
  return join(testDir, 'memory.db');
}

function cleanupTestDb(dbPath: string): void {
  const dir = dbPath.replace(/\/[^/]+$/, '');
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

function measureTime<T>(fn: () => T): { result: T; durationMs: number } {
  const start = performance.now();
  const result = fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

async function measureTimeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

function generateRandomTags(): string[] {
  const allTags = [
    'typescript', 'javascript', 'react', 'vue', 'angular', 'node',
    'python', 'rust', 'go', 'testing', 'api', 'database', 'frontend',
    'backend', 'devops', 'security', 'performance', 'documentation',
  ];
  const count = Math.floor(Math.random() * 5) + 1;
  return allTags.sort(() => Math.random() - 0.5).slice(0, count);
}

function generateRandomEmbedding(size: number = 128): number[] {
  return Array(size).fill(0).map(() => Math.random() * 2 - 1);
}

// =============================================================================
// Performance Tests
// =============================================================================

describe('Search Performance Benchmarks', () => {
  let dbPath: string;
  let store: MemoryStore;

  beforeAll(() => {
    dbPath = createTestDb();
    store = initializeDatabase(dbPath);
    ensureEnhancedSchema(store);

    // Seed database with test data
    for (let i = 0; i < TEST_DATA_SIZE.medium; i++) {
      const types = ['project', 'user', 'corrections', 'persona'] as const;
      const id = saveBlock(store, {
        type: types[i % 4],
        scope: i % 2 === 0 ? 'global' : 'project',
        content: {
          name: `Block ${i}`,
          description: `Test block number ${i} with various content for searching`,
          keywords: ['test', 'benchmark', i % 10 === 0 ? 'special' : 'normal'],
        },
      });

      updateBlockTags(store, id, generateRandomTags());
      updateBlockRelevance(store, id, Math.random());
      updateBlockEmbeddings(store, id, generateRandomEmbedding());
    }
  });

  afterAll(() => {
    closeDatabase(store);
    cleanupTestDb(dbPath);
  });

  describe('Keyword Search Performance', () => {
    test('single keyword search should complete quickly', () => {
      const { durationMs } = measureTime(() => keywordSearch(store, 'test'));
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.searchLatencyMs);
    });

    test('multi-keyword search should complete quickly', () => {
      const { durationMs } = measureTime(() =>
        keywordSearch(store, 'test benchmark block')
      );
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.searchLatencyMs);
    });

    test('should handle high search throughput', () => {
      const searchCount = 50;
      const { durationMs } = measureTime(() => {
        for (let i = 0; i < searchCount; i++) {
          keywordSearch(store, 'test');
        }
      });

      const searchesPerSecond = (searchCount / durationMs) * 1000;
      expect(searchesPerSecond).toBeGreaterThan(PERFORMANCE_THRESHOLDS.searchThroughput);
    });
  });

  describe('Hybrid Search Performance', () => {
    test('hybrid search should complete within threshold', () => {
      const { durationMs } = measureTime(() =>
        hybridSearch(store, 'typescript testing')
      );
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.searchLatencyMs * 2);
    });
  });

  describe('Tag-Based Query Performance', () => {
    test('single tag query should be fast', () => {
      const { durationMs } = measureTime(() => getBlocksByTags(store, ['typescript']));
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.searchLatencyMs);
    });

    test('multi-tag query should complete quickly', () => {
      const { durationMs } = measureTime(() =>
        getBlocksByTags(store, ['typescript', 'react', 'testing'])
      );
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.searchLatencyMs);
    });
  });

  describe('Relevance Query Performance', () => {
    test('relevance threshold query should be fast', () => {
      const { durationMs } = measureTime(() => getBlocksByRelevance(store, 0.5));
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.searchLatencyMs);
    });

    test('high relevance threshold should be faster (fewer results)', () => {
      const { durationMs: lowMs } = measureTime(() => getBlocksByRelevance(store, 0.1));
      const { durationMs: highMs } = measureTime(() => getBlocksByRelevance(store, 0.9));

      // High threshold should generally be faster or similar
      expect(highMs).toBeLessThan(lowMs + 10);
    });
  });
});

describe('Learning Engine Performance', () => {
  let learningEngine: LearningEngine;
  let learnDbPath: string;
  let learnStore: MemoryStore;

  beforeEach(() => {
    learnDbPath = createTestDb();
    learnStore = initializeDatabase(learnDbPath);
    ensureEnhancedSchema(learnStore);

    // Create required blocks for learning
    saveBlock(learnStore, { type: 'user', scope: 'project', content: {} });
    saveBlock(learnStore, { type: 'corrections', scope: 'project', content: { entries: [] } });

    learningEngine = createLearningEngine({
      autoApplyThreshold: 0.7,
      store: learnStore,
    });
  });

  afterEach(() => {
    if (learnStore) {
      closeDatabase(learnStore);
    }
    cleanupTestDb(learnDbPath);
  });

  describe('Conversation Learning Performance', () => {
    test('should process small conversation quickly', () => {
      const messages = Array(10).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
        content: `Message ${i} with some content about TypeScript and React`,
      }));

      const { durationMs } = measureTime(() =>
        learningEngine.learnFromConversation(messages)
      );

      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.learningLatencyMs);
    });

    test('should handle medium conversation efficiently', () => {
      const messages = Array(50).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
        content: `Message ${i}: This is a longer message that includes various topics like programming, testing, debugging, and code review. It also mentions specific technologies like TypeScript, React, and Node.js.`,
      }));

      const { durationMs } = measureTime(() =>
        learningEngine.learnFromConversation(messages)
      );

      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.learningLatencyMs * 3);
    });
  });

  describe('Instruction Learning Performance', () => {
    test('should process instruction quickly', () => {
      const { durationMs } = measureTime(() =>
        learningEngine.learnFromInstruction(
          'Always use TypeScript strict mode',
          'corrections'
        )
      );

      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.learningLatencyMs);
    });

    test('should handle batch instructions', () => {
      const instructions = [
        'Prefer functional components over class components',
        'Use async/await instead of raw promises',
        'Always write tests before implementation',
        'Document all public APIs',
        'Use meaningful variable names',
      ];

      const { durationMs } = measureTime(() => {
        for (const instruction of instructions) {
          learningEngine.learnFromInstruction(instruction, 'user');
        }
      });

      const avgTimePerInstruction = durationMs / instructions.length;
      expect(avgTimePerInstruction).toBeLessThan(PERFORMANCE_THRESHOLDS.learningLatencyMs);
    });
  });
});

describe('Embedding Operations Performance', () => {
  describe('Vector Operations', () => {
    test('cosine similarity should be fast for small vectors', () => {
      const a = generateRandomEmbedding(64);
      const b = generateRandomEmbedding(64);

      const { durationMs } = measureTime(() => {
        for (let i = 0; i < 1000; i++) {
          cosineSimilarity(a, b);
        }
      });

      expect(durationMs).toBeLessThan(100); // 1000 ops in under 100ms (generous for CI)
    });

    test('cosine similarity should be fast for large vectors', () => {
      const a = generateRandomEmbedding(1536); // OpenAI embedding size
      const b = generateRandomEmbedding(1536);

      const { durationMs } = measureTime(() => {
        for (let i = 0; i < 100; i++) {
          cosineSimilarity(a, b);
        }
      });

      expect(durationMs).toBeLessThan(200); // 100 ops in under 200ms
    });

    test('vector normalization should be efficient', () => {
      const vectors = Array(100).fill(null).map(() => generateRandomEmbedding(256));

      const { durationMs } = measureTime(() => {
        for (const v of vectors) {
          normalizeVector(v);
        }
      });

      expect(durationMs).toBeLessThan(100);
    });
  });

  describe('Embedding Generation Performance', () => {
    test('local embedding generation should be fast', async () => {
      const { durationMs } = await measureTimeAsync(() =>
        generateEmbedding('Test text for embedding generation')
      );

      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.embeddingLatencyMs);
    });
  });
});

describe('Bulk Operations Performance', () => {
  let dbPath: string;
  let store: MemoryStore;

  beforeAll(() => {
    dbPath = createTestDb();
    store = initializeDatabase(dbPath);
    ensureEnhancedSchema(store);
  });

  afterAll(() => {
    closeDatabase(store);
    cleanupTestDb(dbPath);
  });

  test('bulk insert should meet throughput threshold', () => {
    const blockCount = TEST_DATA_SIZE.medium;

    const { durationMs } = measureTime(() => {
      for (let i = 0; i < blockCount; i++) {
        saveBlock(store, {
          type: 'project',
          scope: 'project',
          content: { index: i, data: `Block data ${i}` },
        });
      }
    });

    const blocksPerSecond = (blockCount / durationMs) * 1000;
    expect(blocksPerSecond).toBeGreaterThan(PERFORMANCE_THRESHOLDS.bulkInsertRatePerSec);
  });

  test('bulk update should be efficient', () => {
    // First create blocks
    const ids: string[] = [];
    for (let i = 0; i < 50; i++) {
      ids.push(saveBlock(store, {
        type: 'user',
        scope: 'project',
        content: { index: i },
      }));
    }

    // Measure bulk update
    const { durationMs } = measureTime(() => {
      for (const id of ids) {
        updateBlockRelevance(store, id, Math.random());
        updateBlockTags(store, id, ['updated', 'bulk']);
      }
    });

    const updatesPerSecond = (ids.length * 2 / durationMs) * 1000;
    expect(updatesPerSecond).toBeGreaterThan(100);
  });
});

describe('Memory Efficiency', () => {
  test('should handle large number of blocks without memory issues', () => {
    const dbPath = createTestDb();
    const store = initializeDatabase(dbPath);
    ensureEnhancedSchema(store);

    const initialMemory = process.memoryUsage().heapUsed;

    // Create many blocks
    for (let i = 0; i < TEST_DATA_SIZE.large; i++) {
      saveBlock(store, {
        type: 'project',
        scope: 'project',
        content: { index: i, data: 'Some content' },
      });
    }

    const afterInsertMemory = process.memoryUsage().heapUsed;
    const memoryIncreaseMB = (afterInsertMemory - initialMemory) / 1024 / 1024;

    // Should use less than 50MB for 500 blocks
    expect(memoryIncreaseMB).toBeLessThan(50);

    closeDatabase(store);
    cleanupTestDb(dbPath);
  });
});

describe('Latency Percentiles', () => {
  let dbPath: string;
  let store: MemoryStore;

  beforeAll(() => {
    dbPath = createTestDb();
    store = initializeDatabase(dbPath);
    ensureEnhancedSchema(store);

    // Seed data
    for (let i = 0; i < 50; i++) {
      const id = saveBlock(store, {
        type: 'project',
        scope: 'project',
        content: { name: `Block ${i}` },
      });
      updateBlockTags(store, id, generateRandomTags());
    }
  });

  afterAll(() => {
    closeDatabase(store);
    cleanupTestDb(dbPath);
  });

  test('P99 search latency should be acceptable', () => {
    const latencies: number[] = [];

    for (let i = 0; i < 100; i++) {
      const { durationMs } = measureTime(() => keywordSearch(store, 'block'));
      latencies.push(durationMs);
    }

    latencies.sort((a, b) => a - b);
    const p99 = latencies[98];

    expect(p99).toBeLessThan(PERFORMANCE_THRESHOLDS.searchLatencyMs * 2);
  });

  test('P50 search latency should be low', () => {
    const latencies: number[] = [];

    for (let i = 0; i < 100; i++) {
      const { durationMs } = measureTime(() => keywordSearch(store, 'block'));
      latencies.push(durationMs);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[49];

    expect(p50).toBeLessThan(PERFORMANCE_THRESHOLDS.searchLatencyMs / 2);
  });
});
