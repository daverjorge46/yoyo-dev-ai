/**
 * Memory Store Tests
 *
 * Tests for the SQLite database layer including:
 * - Database initialization
 * - Memory block CRUD operations
 * - Conversation operations
 * - Agent operations
 * - Migration support
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  initializeDatabase,
  closeDatabase,
  saveBlock,
  getBlock,
  getAllBlocks,
  deleteBlock,
  addMessage,
  getHistory,
  clearHistory,
  createAgent,
  getAgent,
  updateAgentLastUsed,
  getSchemaVersion,
  type MemoryStore,
} from '../store.js';
import type {
  MemoryBlock,
  PersonaContent,
  ProjectContent,
  UserContent,
  CorrectionsContent,
} from '../types.js';

// =============================================================================
// Test Setup
// =============================================================================

let testDir: string;
let dbPath: string;
let store: MemoryStore;

function createTestDir(): string {
  const dir = join(tmpdir(), `yoyo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanupTestDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

beforeEach(() => {
  testDir = createTestDir();
  dbPath = join(testDir, 'memory.db');
  store = initializeDatabase(dbPath);
});

afterEach(() => {
  closeDatabase(store);
  cleanupTestDir(testDir);
});

// =============================================================================
// Database Initialization Tests
// =============================================================================

describe('Database Initialization', () => {
  it('should create database file', () => {
    expect(existsSync(dbPath)).toBe(true);
  });

  it('should create all required tables', () => {
    const tables = store.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('memory_blocks');
    expect(tableNames).toContain('conversations');
    expect(tableNames).toContain('agents');
    expect(tableNames).toContain('schema_metadata');
  });

  it('should set schema version to 1', () => {
    const version = getSchemaVersion(store);
    expect(version).toBe(1);
  });

  it('should enable WAL mode', () => {
    const result = store.db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
    expect(result.journal_mode).toBe('wal');
  });

  it('should be idempotent (safe to call multiple times)', () => {
    // Close and reinitialize
    closeDatabase(store);
    store = initializeDatabase(dbPath);

    const version = getSchemaVersion(store);
    expect(version).toBe(1);
  });
});

// =============================================================================
// Memory Block CRUD Tests
// =============================================================================

describe('Memory Block Operations', () => {
  describe('saveBlock', () => {
    it('should save a persona block', () => {
      const content: PersonaContent = {
        name: 'TestAgent',
        traits: ['helpful', 'concise'],
        communication_style: 'technical',
        expertise_areas: ['TypeScript', 'React'],
      };

      const block = saveBlock(store, {
        type: 'persona',
        scope: 'project',
        content,
      });

      expect(block.id).toBeDefined();
      expect(block.type).toBe('persona');
      expect(block.scope).toBe('project');
      expect(block.content).toEqual(content);
      expect(block.version).toBe(1);
      expect(block.createdAt).toBeInstanceOf(Date);
      expect(block.updatedAt).toBeInstanceOf(Date);
    });

    it('should save a project block', () => {
      const content: ProjectContent = {
        name: 'TestProject',
        description: 'A test project',
        tech_stack: {
          language: 'TypeScript',
          framework: 'React',
        },
        architecture: 'monolith',
        patterns: ['TDD'],
        key_directories: { src: 'Source code' },
      };

      const block = saveBlock(store, {
        type: 'project',
        scope: 'project',
        content,
      });

      expect(block.type).toBe('project');
      expect(block.content).toEqual(content);
    });

    it('should save a user block', () => {
      const content: UserContent = {
        coding_style: ['functional'],
        preferences: { editor: 'vim' },
        tools: ['git', 'npm'],
        communication: {
          verbosity: 'normal',
          examples: true,
          explanations: true,
        },
      };

      const block = saveBlock(store, {
        type: 'user',
        scope: 'global',
        content,
      });

      expect(block.type).toBe('user');
      expect(block.scope).toBe('global');
    });

    it('should save a corrections block', () => {
      const content: CorrectionsContent = {
        corrections: [
          {
            issue: 'Used var instead of const',
            correction: 'Always use const for immutable values',
            context: 'JavaScript coding',
            date: new Date().toISOString(),
          },
        ],
      };

      const block = saveBlock(store, {
        type: 'corrections',
        scope: 'project',
        content,
      });

      expect(block.type).toBe('corrections');
      expect(block.content).toEqual(content);
    });

    it('should update existing block and increment version', () => {
      const content: PersonaContent = {
        name: 'TestAgent',
        traits: ['helpful'],
        communication_style: 'casual',
        expertise_areas: ['Python'],
      };

      const block1 = saveBlock(store, {
        type: 'persona',
        scope: 'project',
        content,
      });
      expect(block1.version).toBe(1);

      const updatedContent: PersonaContent = {
        ...content,
        traits: ['helpful', 'thorough'],
      };

      const block2 = saveBlock(store, {
        type: 'persona',
        scope: 'project',
        content: updatedContent,
      });

      expect(block2.id).toBe(block1.id);
      expect(block2.version).toBe(2);
      expect(block2.content).toEqual(updatedContent);
    });
  });

  describe('getBlock', () => {
    it('should retrieve saved block', () => {
      const content: PersonaContent = {
        name: 'TestAgent',
        traits: ['helpful'],
        communication_style: 'technical',
        expertise_areas: ['Go'],
      };

      saveBlock(store, { type: 'persona', scope: 'project', content });

      const retrieved = getBlock(store, 'persona', 'project');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.content).toEqual(content);
    });

    it('should return null for non-existent block', () => {
      const result = getBlock(store, 'persona', 'global');
      expect(result).toBeNull();
    });
  });

  describe('getAllBlocks', () => {
    it('should retrieve all blocks for a scope', () => {
      saveBlock(store, {
        type: 'persona',
        scope: 'project',
        content: {
          name: 'Agent',
          traits: [],
          communication_style: 'normal',
          expertise_areas: [],
        } as PersonaContent,
      });

      saveBlock(store, {
        type: 'project',
        scope: 'project',
        content: {
          name: 'Project',
          description: 'Test',
          tech_stack: { language: 'TS', framework: 'Node' },
          architecture: 'modular',
          patterns: [],
          key_directories: {},
        } as ProjectContent,
      });

      const blocks = getAllBlocks(store, 'project');
      expect(blocks).toHaveLength(2);
      expect(blocks.map((b) => b.type).sort()).toEqual(['persona', 'project']);
    });

    it('should return empty array when no blocks exist', () => {
      const blocks = getAllBlocks(store, 'global');
      expect(blocks).toEqual([]);
    });

    it('should not return blocks from different scope', () => {
      saveBlock(store, {
        type: 'persona',
        scope: 'project',
        content: {
          name: 'Agent',
          traits: [],
          communication_style: 'normal',
          expertise_areas: [],
        } as PersonaContent,
      });

      const globalBlocks = getAllBlocks(store, 'global');
      expect(globalBlocks).toHaveLength(0);
    });
  });

  describe('deleteBlock', () => {
    it('should delete existing block', () => {
      const block = saveBlock(store, {
        type: 'persona',
        scope: 'project',
        content: {
          name: 'Agent',
          traits: [],
          communication_style: 'normal',
          expertise_areas: [],
        } as PersonaContent,
      });

      deleteBlock(store, block.id);

      const retrieved = getBlock(store, 'persona', 'project');
      expect(retrieved).toBeNull();
    });

    it('should not throw when deleting non-existent block', () => {
      expect(() => deleteBlock(store, 'non-existent-id')).not.toThrow();
    });
  });
});

// =============================================================================
// Conversation Tests
// =============================================================================

describe('Conversation Operations', () => {
  const testAgentId = 'test-agent-123';

  describe('addMessage', () => {
    it('should add a user message', () => {
      addMessage(store, testAgentId, 'user', 'Hello, world!');

      const history = getHistory(store, testAgentId);
      expect(history).toHaveLength(1);
      expect(history[0]?.role).toBe('user');
      expect(history[0]?.content).toBe('Hello, world!');
    });

    it('should add an assistant message', () => {
      addMessage(store, testAgentId, 'assistant', 'Hello! How can I help?');

      const history = getHistory(store, testAgentId);
      expect(history[0]?.role).toBe('assistant');
    });

    it('should add a system message', () => {
      addMessage(store, testAgentId, 'system', 'You are a helpful assistant.');

      const history = getHistory(store, testAgentId);
      expect(history[0]?.role).toBe('system');
    });

    it('should store metadata as JSON', () => {
      const metadata = { tool_call: 'read_file', args: { path: '/test' } };
      addMessage(store, testAgentId, 'assistant', 'Reading file...', metadata);

      const history = getHistory(store, testAgentId);
      expect(history[0]?.metadata).toEqual(metadata);
    });
  });

  describe('getHistory', () => {
    it('should return messages in chronological order', () => {
      addMessage(store, testAgentId, 'user', 'First');
      addMessage(store, testAgentId, 'assistant', 'Second');
      addMessage(store, testAgentId, 'user', 'Third');

      const history = getHistory(store, testAgentId);
      expect(history.map((m) => m.content)).toEqual(['First', 'Second', 'Third']);
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        addMessage(store, testAgentId, 'user', `Message ${i}`);
      }

      const history = getHistory(store, testAgentId, 5);
      expect(history).toHaveLength(5);
      // Should return last 5 messages (most recent)
      expect(history[0]?.content).toBe('Message 5');
      expect(history[4]?.content).toBe('Message 9');
    });

    it('should return empty array for unknown agent', () => {
      const history = getHistory(store, 'unknown-agent');
      expect(history).toEqual([]);
    });

    it('should only return messages for specified agent', () => {
      addMessage(store, 'agent-1', 'user', 'Agent 1 message');
      addMessage(store, 'agent-2', 'user', 'Agent 2 message');

      const history = getHistory(store, 'agent-1');
      expect(history).toHaveLength(1);
      expect(history[0]?.content).toBe('Agent 1 message');
    });
  });

  describe('clearHistory', () => {
    it('should clear all messages for an agent', () => {
      addMessage(store, testAgentId, 'user', 'Message 1');
      addMessage(store, testAgentId, 'assistant', 'Message 2');

      clearHistory(store, testAgentId);

      const history = getHistory(store, testAgentId);
      expect(history).toHaveLength(0);
    });

    it('should not affect other agents', () => {
      addMessage(store, 'agent-1', 'user', 'Agent 1 message');
      addMessage(store, 'agent-2', 'user', 'Agent 2 message');

      clearHistory(store, 'agent-1');

      expect(getHistory(store, 'agent-1')).toHaveLength(0);
      expect(getHistory(store, 'agent-2')).toHaveLength(1);
    });
  });
});

// =============================================================================
// Agent Tests
// =============================================================================

describe('Agent Operations', () => {
  describe('createAgent', () => {
    it('should create an agent with minimal info', () => {
      const agent = createAgent(store, { model: 'claude-3-opus' });

      expect(agent.id).toBeDefined();
      expect(agent.model).toBe('claude-3-opus');
      expect(agent.name).toBeUndefined();
      expect(agent.memoryBlockIds).toEqual([]);
      expect(agent.createdAt).toBeInstanceOf(Date);
      expect(agent.lastUsed).toBeInstanceOf(Date);
    });

    it('should create an agent with full info', () => {
      const blockIds = ['block-1', 'block-2'];
      const settings = { temperature: 0.7 };

      const agent = createAgent(store, {
        name: 'MyAgent',
        model: 'gpt-4',
        memoryBlockIds: blockIds,
        settings,
      });

      expect(agent.name).toBe('MyAgent');
      expect(agent.model).toBe('gpt-4');
      expect(agent.memoryBlockIds).toEqual(blockIds);
      expect(agent.settings).toEqual(settings);
    });
  });

  describe('getAgent', () => {
    it('should retrieve created agent', () => {
      const created = createAgent(store, { model: 'test-model', name: 'TestAgent' });

      const retrieved = getAgent(store, created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('TestAgent');
    });

    it('should return null for non-existent agent', () => {
      const result = getAgent(store, 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('updateAgentLastUsed', () => {
    it('should update last_used timestamp', async () => {
      const agent = createAgent(store, { model: 'test-model' });
      const originalLastUsed = agent.lastUsed;

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      updateAgentLastUsed(store, agent.id);

      const updated = getAgent(store, agent.id);
      expect(updated?.lastUsed.getTime()).toBeGreaterThan(originalLastUsed.getTime());
    });
  });
});
