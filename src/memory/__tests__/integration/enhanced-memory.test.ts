/**
 * Integration Tests: Enhanced Memory System
 *
 * Tests the complete enhanced memory system with real database
 * interactions and cross-module functionality.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';

// Memory modules
import {
  initializeDatabase,
  closeDatabase,
  saveBlock,
  getBlock,
  getAllBlocks,
  type MemoryStore,
  type SaveBlockInput,
} from '../../store.js';

import {
  saveEnhancedBlock,
  getEnhancedBlock,
  getAllEnhancedBlocks,
  updateBlockEmbeddings,
  updateBlockRelevance,
  updateBlockTags,
  getBlocksByRelevance,
  getBlocksByTags,
  ensureEnhancedSchema,
} from '../../enhanced-store.js';

import {
  search,
  semanticSearch,
  keywordSearch,
  hybridSearch,
  generateBlockEmbeddings,
} from '../../semantic-search.js';

import {
  LearningEngine,
  createLearningEngine,
} from '../../learning-engine.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestDb(): string {
  const testDir = join(tmpdir(), `memory-integration-test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
  return join(testDir, 'memory.db');
}

function cleanupTestDb(dbPath: string): void {
  const dir = dbPath.replace(/\/[^/]+$/, '');
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

// =============================================================================
// Integration Tests
// =============================================================================

describe('Enhanced Memory System Integration', () => {
  let dbPath: string;
  let store: MemoryStore;

  beforeEach(async () => {
    dbPath = createTestDb();
    store = initializeDatabase(dbPath);
    ensureEnhancedSchema(store);
  });

  afterEach(() => {
    if (store) {
      closeDatabase(store);
    }
    cleanupTestDb(dbPath);
  });

  describe('End-to-End Block Operations', () => {
    test('should save and retrieve enhanced block with all features', () => {
      const input: SaveBlockInput = {
        type: 'project',
        scope: 'project',
        content: { name: 'Test Project', tech: 'TypeScript' },
      };

      // Save basic block
      const id = saveBlock(store, input);
      expect(id).toBeDefined();

      // Update with enhanced features
      updateBlockEmbeddings(store, id, [0.1, 0.2, 0.3, 0.4, 0.5]);
      updateBlockRelevance(store, id, 0.85);
      updateBlockTags(store, id, ['typescript', 'testing', 'integration']);

      // Retrieve enhanced block
      const block = getEnhancedBlock(store, id);
      expect(block).not.toBeNull();
      expect(block!.embeddings).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
      expect(block!.relevanceScore).toBe(0.85);
      expect(block!.contextTags).toEqual(['typescript', 'testing', 'integration']);
    });

    test('should handle multiple blocks with different types', () => {
      const types: Array<'persona' | 'project' | 'user' | 'corrections'> = [
        'persona', 'project', 'user', 'corrections'
      ];

      const ids: string[] = [];

      // Create blocks of each type
      for (const type of types) {
        const id = saveBlock(store, {
          type,
          scope: 'project',
          content: { type, data: `Data for ${type}` },
        });
        ids.push(id);

        // Add enhanced features
        updateBlockEmbeddings(store, id, Array(5).fill(0).map((_, i) => i / 10));
        updateBlockRelevance(store, id, 0.5 + Math.random() * 0.5);
        updateBlockTags(store, id, [type, 'test']);
      }

      // Retrieve all blocks
      const blocks = getAllEnhancedBlocks(store);
      expect(blocks.length).toBe(4);

      // Verify each type exists
      for (const type of types) {
        const block = blocks.find(b => b.type === type);
        expect(block).toBeDefined();
        expect(block!.contextTags).toContain(type);
      }
    });

    test('should preserve basic block data when adding enhanced features', () => {
      const originalContent = {
        name: 'Original',
        nested: { deep: { value: 123 } },
      };

      const id = saveBlock(store, {
        type: 'project',
        scope: 'project',
        content: originalContent,
      });

      // Add enhanced features
      updateBlockEmbeddings(store, id, [1, 2, 3]);
      updateBlockRelevance(store, id, 0.9);

      // Verify original content preserved
      const block = getBlock(store, id);
      expect(block).not.toBeNull();
      expect(block!.content).toEqual(originalContent);
    });
  });

  describe('Search Integration', () => {
    beforeEach(() => {
      // Create test blocks with various content
      const blocks = [
        { type: 'project', content: { name: 'React App', tech: 'React TypeScript' } },
        { type: 'user', content: { preferences: { framework: 'React', testing: 'Vitest' } } },
        { type: 'corrections', content: { entry: 'Use async/await instead of promises' } },
        { type: 'persona', content: { name: 'Assistant', expertise: ['React', 'Node'] } },
      ] as const;

      for (const block of blocks) {
        const id = saveBlock(store, {
          type: block.type,
          scope: 'project',
          content: block.content,
        });

        // Add tags based on content
        const tags = block.type === 'project' ? ['react', 'typescript'] :
                     block.type === 'user' ? ['preferences', 'react'] :
                     block.type === 'corrections' ? ['async', 'promises'] :
                     ['assistant', 'expertise'];

        updateBlockTags(store, id, tags);
        updateBlockRelevance(store, id, 0.8);
      }
    });

    test('should find blocks by tags', () => {
      const reactBlocks = getBlocksByTags(store, ['react']);
      expect(reactBlocks.length).toBeGreaterThanOrEqual(2);
    });

    test('should find blocks by relevance threshold', () => {
      const relevantBlocks = getBlocksByRelevance(store, 0.7);
      expect(relevantBlocks.length).toBe(4);
    });

    test('should perform keyword search', () => {
      const results = keywordSearch(store, 'react');
      expect(results.length).toBeGreaterThan(0);
    });

    test('should perform hybrid search', () => {
      const results = hybridSearch(store, 'typescript testing');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Learning Engine Integration', () => {
    let learningEngine: LearningEngine;

    beforeEach(() => {
      // Create initial blocks
      saveBlock(store, {
        type: 'user',
        scope: 'project',
        content: { preferences: {} },
      });

      saveBlock(store, {
        type: 'corrections',
        scope: 'project',
        content: { entries: [] },
      });

      learningEngine = createLearningEngine({ autoApplyThreshold: 0.7, store });
    });

    test('should learn from conversation patterns', () => {
      const messages = [
        { role: 'user' as const, content: 'I prefer functional components' },
        { role: 'assistant' as const, content: 'Got it, using functional components' },
        { role: 'user' as const, content: 'Always use TypeScript' },
        { role: 'assistant' as const, content: 'Using TypeScript throughout' },
      ];

      const result = learningEngine.learnFromConversation(messages);

      expect(result.learningsExtracted).toBeGreaterThan(0);
      expect(result.details.length).toBeGreaterThan(0);
    });

    test('should learn from instruction', () => {
      const result = learningEngine.learnFromInstruction(
        'Never use var, always use const or let',
        'corrections'
      );

      expect(result.learningsExtracted).toBe(1);
      expect(result.details[0].type).toBe('correction');
      expect(result.details[0].confidence).toBeGreaterThan(0.7);
    });

    test('should consolidate learnings', async () => {
      // Add multiple learnings
      learningEngine.learnFromInstruction('Prefer arrow functions', 'user');
      learningEngine.learnFromInstruction('Use descriptive variable names', 'user');

      const consolidation = await learningEngine.consolidateMemory();

      expect(consolidation).toBeDefined();
      expect(typeof consolidation.blocksConsolidated).toBe('number');
    });
  });

  describe('Cross-Module Operations', () => {
    test('should maintain consistency across store and enhanced-store', () => {
      // Create via basic store
      const id = saveBlock(store, {
        type: 'project',
        scope: 'project',
        content: { name: 'Test' },
      });

      // Retrieve via both
      const basicBlock = getBlock(store, id);
      const enhancedBlock = getEnhancedBlock(store, id);

      expect(basicBlock).not.toBeNull();
      expect(enhancedBlock).not.toBeNull();
      expect(basicBlock!.id).toBe(enhancedBlock!.id);
      expect(basicBlock!.content).toEqual(enhancedBlock!.content);
    });

    test('should correctly count blocks from both APIs', () => {
      // Create blocks
      for (let i = 0; i < 5; i++) {
        saveBlock(store, {
          type: 'project',
          scope: 'global',
          content: { index: i },
        });
      }

      const basicBlocks = getAllBlocks(store);
      const enhancedBlocks = getAllEnhancedBlocks(store);

      expect(basicBlocks.length).toBe(enhancedBlocks.length);
    });
  });

  describe('Data Integrity', () => {
    test('should handle concurrent updates gracefully', () => {
      const id = saveBlock(store, {
        type: 'project',
        scope: 'project',
        content: { name: 'Original' },
      });

      // Multiple rapid updates
      for (let i = 0; i < 10; i++) {
        updateBlockRelevance(store, id, i / 10);
      }

      const block = getEnhancedBlock(store, id);
      expect(block!.relevanceScore).toBe(0.9);
    });

    test('should handle special characters in content', () => {
      const specialContent = {
        name: "Test's Project",
        desc: 'Contains "quotes" and \\backslashes\\',
        unicode: '日本語テスト',
        emoji: '🚀🔥✨',
      };

      const id = saveBlock(store, {
        type: 'project',
        scope: 'project',
        content: specialContent,
      });

      const block = getBlock(store, id);
      expect(block!.content).toEqual(specialContent);
    });

    test('should handle large content', () => {
      const largeContent = {
        data: 'x'.repeat(100000),
        nested: Array(100).fill({ key: 'value' }),
      };

      const id = saveBlock(store, {
        type: 'project',
        scope: 'project',
        content: largeContent,
      });

      const block = getBlock(store, id);
      expect(block!.content.data.length).toBe(100000);
      expect(block!.content.nested.length).toBe(100);
    });
  });
});

describe('Database Lifecycle', () => {
  test('should create database in specified directory', () => {
    const dbPath = createTestDb();
    const store = initializeDatabase(dbPath);

    expect(existsSync(dbPath)).toBe(true);

    closeDatabase(store);
    cleanupTestDb(dbPath);
  });

  test('should handle reopening database', () => {
    const dbPath = createTestDb();

    // First open
    let store = initializeDatabase(dbPath);
    const id = saveBlock(store, {
      type: 'project',
      scope: 'project',
      content: { name: 'Persist Test' },
    });
    closeDatabase(store);

    // Second open
    store = initializeDatabase(dbPath);
    const block = getBlock(store, id);
    expect(block).not.toBeNull();
    expect(block!.content.name).toBe('Persist Test');

    closeDatabase(store);
    cleanupTestDb(dbPath);
  });
});
