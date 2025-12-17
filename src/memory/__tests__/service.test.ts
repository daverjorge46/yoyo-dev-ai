/**
 * MemoryService Tests
 *
 * Tests for the main public API including:
 * - Block operations with scope awareness
 * - Convenience methods for typed access
 * - Scope merging (project overrides global)
 * - Event emission
 * - Import/export functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MemoryService } from '../service.js';
import type {
  PersonaContent,
  ProjectContent,
  UserContent,
  CorrectionsContent,
  MemoryBlock,
} from '../types.js';

// =============================================================================
// Test Setup
// =============================================================================

let testDir: string;
let service: MemoryService;

function createTestDir(): string {
  const dir = join(tmpdir(), `yoyo-service-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
  service = new MemoryService({
    projectRoot: testDir,
    globalPath: join(testDir, 'global-memory'),
  });
  service.initialize();
});

afterEach(() => {
  service.close();
  cleanupTestDir(testDir);
});

// =============================================================================
// Initialization Tests
// =============================================================================

describe('MemoryService Initialization', () => {
  it('should initialize without errors', () => {
    expect(service.isInitialized()).toBe(true);
  });

  it('should create memory directories', () => {
    expect(existsSync(join(testDir, '.yoyo-ai', 'memory'))).toBe(true);
    expect(existsSync(join(testDir, 'global-memory'))).toBe(true);
  });

  it('should start with project scope', () => {
    expect(service.getCurrentScope()).toBe('project');
  });
});

// =============================================================================
// Block Operations Tests
// =============================================================================

describe('Block Operations', () => {
  describe('saveBlock', () => {
    it('should save a persona block to project scope', () => {
      const content: PersonaContent = {
        name: 'TestAgent',
        traits: ['helpful', 'concise'],
        communication_style: 'technical',
        expertise_areas: ['TypeScript'],
      };

      const block = service.saveBlock('persona', content);

      expect(block.type).toBe('persona');
      expect(block.scope).toBe('project');
      expect(block.content).toEqual(content);
    });

    it('should save to global scope when specified', () => {
      const content: UserContent = {
        coding_style: ['functional'],
        preferences: {},
        tools: ['git'],
        communication: {
          verbosity: 'normal',
          examples: true,
          explanations: true,
        },
      };

      const block = service.saveBlock('user', content, 'global');

      expect(block.scope).toBe('global');
    });

    it('should update existing block and increment version', () => {
      const content1: PersonaContent = {
        name: 'Agent1',
        traits: [],
        communication_style: 'casual',
        expertise_areas: [],
      };

      const block1 = service.saveBlock('persona', content1);
      expect(block1.version).toBe(1);

      const content2: PersonaContent = {
        name: 'Agent2',
        traits: ['helpful'],
        communication_style: 'formal',
        expertise_areas: ['testing'],
      };

      const block2 = service.saveBlock('persona', content2);
      expect(block2.version).toBe(2);
      expect((block2.content as PersonaContent).name).toBe('Agent2');
    });
  });

  describe('getBlock', () => {
    it('should retrieve saved block', () => {
      const content: PersonaContent = {
        name: 'TestAgent',
        traits: [],
        communication_style: 'normal',
        expertise_areas: [],
      };

      service.saveBlock('persona', content);

      const block = service.getBlock('persona');
      expect(block).not.toBeNull();
      expect((block?.content as PersonaContent).name).toBe('TestAgent');
    });

    it('should return null for non-existent block', () => {
      const block = service.getBlock('persona');
      expect(block).toBeNull();
    });

    it('should retrieve from specified scope', () => {
      const projectContent: PersonaContent = {
        name: 'ProjectAgent',
        traits: [],
        communication_style: 'formal',
        expertise_areas: [],
      };

      const globalContent: PersonaContent = {
        name: 'GlobalAgent',
        traits: [],
        communication_style: 'casual',
        expertise_areas: [],
      };

      service.saveBlock('persona', projectContent, 'project');
      service.saveBlock('persona', globalContent, 'global');

      const projectBlock = service.getBlock('persona', 'project');
      const globalBlock = service.getBlock('persona', 'global');

      expect((projectBlock?.content as PersonaContent).name).toBe('ProjectAgent');
      expect((globalBlock?.content as PersonaContent).name).toBe('GlobalAgent');
    });
  });

  describe('getAllBlocks', () => {
    it('should return all blocks for current scope', () => {
      service.saveBlock('persona', {
        name: 'Agent',
        traits: [],
        communication_style: 'normal',
        expertise_areas: [],
      } as PersonaContent);

      service.saveBlock('project', {
        name: 'Project',
        description: 'Test',
        tech_stack: { language: 'TS', framework: 'Node' },
        architecture: 'modular',
        patterns: [],
        key_directories: {},
      } as ProjectContent);

      const blocks = service.getAllBlocks();
      expect(blocks).toHaveLength(2);
    });

    it('should return blocks from specified scope', () => {
      service.saveBlock('user', {
        coding_style: [],
        preferences: {},
        tools: [],
        communication: { verbosity: 'normal', examples: true, explanations: true },
      } as UserContent, 'global');

      const projectBlocks = service.getAllBlocks('project');
      const globalBlocks = service.getAllBlocks('global');

      expect(projectBlocks).toHaveLength(0);
      expect(globalBlocks).toHaveLength(1);
    });
  });

  describe('deleteBlock', () => {
    it('should delete existing block', () => {
      const block = service.saveBlock('persona', {
        name: 'Agent',
        traits: [],
        communication_style: 'normal',
        expertise_areas: [],
      } as PersonaContent);

      service.deleteBlock(block.id);

      const retrieved = service.getBlock('persona');
      expect(retrieved).toBeNull();
    });
  });
});

// =============================================================================
// Convenience Methods Tests
// =============================================================================

describe('Convenience Methods', () => {
  describe('getPersona', () => {
    it('should return persona block', () => {
      service.saveBlock('persona', {
        name: 'TestAgent',
        traits: ['helpful'],
        communication_style: 'technical',
        expertise_areas: ['TypeScript'],
      } as PersonaContent);

      const persona = service.getPersona();
      expect(persona?.name).toBe('TestAgent');
    });

    it('should return null when no persona exists', () => {
      const persona = service.getPersona();
      expect(persona).toBeNull();
    });
  });

  describe('getProject', () => {
    it('should return project block', () => {
      service.saveBlock('project', {
        name: 'TestProject',
        description: 'A test project',
        tech_stack: { language: 'TypeScript', framework: 'Node' },
        architecture: 'modular',
        patterns: ['TDD'],
        key_directories: { src: 'Source' },
      } as ProjectContent);

      const project = service.getProject();
      expect(project?.name).toBe('TestProject');
    });
  });

  describe('getUser', () => {
    it('should return user block', () => {
      service.saveBlock('user', {
        coding_style: ['functional'],
        preferences: { editor: 'vim' },
        tools: ['git'],
        communication: { verbosity: 'detailed', examples: true, explanations: true },
      } as UserContent);

      const user = service.getUser();
      expect(user?.coding_style).toContain('functional');
    });
  });

  describe('getCorrections', () => {
    it('should return corrections block', () => {
      service.saveBlock('corrections', {
        corrections: [
          {
            issue: 'Used var',
            correction: 'Use const',
            date: new Date().toISOString(),
          },
        ],
      } as CorrectionsContent);

      const corrections = service.getCorrections();
      expect(corrections?.corrections).toHaveLength(1);
    });
  });
});

// =============================================================================
// Scope Merging Tests
// =============================================================================

describe('Scope Merging', () => {
  describe('loadAllMemory', () => {
    it('should load blocks from both scopes', () => {
      // Save to global scope
      service.saveBlock('user', {
        coding_style: ['functional'],
        preferences: {},
        tools: [],
        communication: { verbosity: 'normal', examples: true, explanations: true },
      } as UserContent, 'global');

      // Save to project scope
      service.saveBlock('persona', {
        name: 'ProjectAgent',
        traits: [],
        communication_style: 'formal',
        expertise_areas: [],
      } as PersonaContent, 'project');

      const memory = service.loadAllMemory();

      expect(memory.persona).toBeDefined();
      expect(memory.user).toBeDefined();
    });

    it('should prefer project scope over global', () => {
      // Save persona to global
      service.saveBlock('persona', {
        name: 'GlobalAgent',
        traits: ['global-trait'],
        communication_style: 'casual',
        expertise_areas: [],
      } as PersonaContent, 'global');

      // Save persona to project (should override)
      service.saveBlock('persona', {
        name: 'ProjectAgent',
        traits: ['project-trait'],
        communication_style: 'formal',
        expertise_areas: [],
      } as PersonaContent, 'project');

      const memory = service.loadAllMemory();

      expect((memory.persona?.content as PersonaContent).name).toBe('ProjectAgent');
    });

    it('should fall back to global when project block missing', () => {
      // Only save to global
      service.saveBlock('user', {
        coding_style: ['functional'],
        preferences: { source: 'global' },
        tools: [],
        communication: { verbosity: 'normal', examples: true, explanations: true },
      } as UserContent, 'global');

      const memory = service.loadAllMemory();

      expect(memory.user).toBeDefined();
      expect((memory.user?.content as UserContent).preferences.source).toBe('global');
    });
  });
});

// =============================================================================
// Event Emission Tests
// =============================================================================

describe('Event Emission', () => {
  it('should emit memory:updated on saveBlock', () => {
    const listener = vi.fn();
    service.on('memory:updated', listener);

    service.saveBlock('persona', {
      name: 'Agent',
      traits: [],
      communication_style: 'normal',
      expertise_areas: [],
    } as PersonaContent);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      isNew: true,
      previousVersion: 0,
    });
  });

  it('should emit memory:deleted on deleteBlock', () => {
    const listener = vi.fn();
    service.on('memory:deleted', listener);

    const block = service.saveBlock('persona', {
      name: 'Agent',
      traits: [],
      communication_style: 'normal',
      expertise_areas: [],
    } as PersonaContent);

    service.deleteBlock(block.id);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      id: block.id,
      type: 'persona',
    });
  });

  it('should emit memory:loaded on loadAllMemory', () => {
    const listener = vi.fn();
    service.on('memory:loaded', listener);

    service.saveBlock('persona', {
      name: 'Agent',
      traits: [],
      communication_style: 'normal',
      expertise_areas: [],
    } as PersonaContent);

    service.loadAllMemory();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should emit memory:scope:changed on setScope', () => {
    const listener = vi.fn();
    service.on('memory:scope:changed', listener);

    service.setScope('global');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      previousScope: 'project',
      newScope: 'global',
    });
  });
});

// =============================================================================
// Export/Import Tests
// =============================================================================

describe('Export/Import', () => {
  describe('exportMemory', () => {
    it('should export all blocks as JSON', () => {
      service.saveBlock('persona', {
        name: 'Agent',
        traits: ['helpful'],
        communication_style: 'technical',
        expertise_areas: ['TypeScript'],
      } as PersonaContent);

      service.saveBlock('project', {
        name: 'Project',
        description: 'Test',
        tech_stack: { language: 'TS', framework: 'Node' },
        architecture: 'modular',
        patterns: [],
        key_directories: {},
      } as ProjectContent);

      const exported = service.exportMemory();

      expect(exported.version).toBe(1);
      expect(exported.blocks).toHaveLength(2);
      expect(exported.exportedAt).toBeDefined();
    });

    it('should export to file when path provided', () => {
      service.saveBlock('persona', {
        name: 'Agent',
        traits: [],
        communication_style: 'normal',
        expertise_areas: [],
      } as PersonaContent);

      const exportPath = join(testDir, 'export.json');
      service.exportMemory(exportPath);

      expect(existsSync(exportPath)).toBe(true);

      const content = JSON.parse(readFileSync(exportPath, 'utf-8'));
      expect(content.blocks).toHaveLength(1);
    });
  });

  describe('importMemory', () => {
    it('should import blocks from export data', () => {
      // Create export data
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        blocks: [
          {
            id: 'test-id',
            type: 'persona',
            scope: 'project',
            content: {
              name: 'ImportedAgent',
              traits: ['imported'],
              communication_style: 'formal',
              expertise_areas: ['testing'],
            },
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      service.importMemory(exportData);

      const persona = service.getPersona();
      expect(persona?.name).toBe('ImportedAgent');
    });

    it('should import from file path', () => {
      // Create export file
      const exportPath = join(testDir, 'import.json');
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        blocks: [
          {
            id: 'file-import-id',
            type: 'project',
            scope: 'project',
            content: {
              name: 'FileImportedProject',
              description: 'Imported from file',
              tech_stack: { language: 'JS', framework: 'Express' },
              architecture: 'api',
              patterns: [],
              key_directories: {},
            },
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };
      writeFileSync(exportPath, JSON.stringify(exportData));

      service.importMemory(exportPath);

      const project = service.getProject();
      expect(project?.name).toBe('FileImportedProject');
    });
  });
});

// =============================================================================
// Conversation Operations Tests
// =============================================================================

describe('Conversation Operations', () => {
  const agentId = 'test-agent';

  describe('addConversationMessage', () => {
    it('should add message to conversation history', () => {
      service.addConversationMessage(agentId, 'user', 'Hello');
      service.addConversationMessage(agentId, 'assistant', 'Hi there!');

      const history = service.getConversationHistory(agentId);
      expect(history).toHaveLength(2);
    });
  });

  describe('getConversationHistory', () => {
    it('should return messages in chronological order', () => {
      service.addConversationMessage(agentId, 'user', 'First');
      service.addConversationMessage(agentId, 'assistant', 'Second');
      service.addConversationMessage(agentId, 'user', 'Third');

      const history = service.getConversationHistory(agentId);
      expect(history.map(m => m.content)).toEqual(['First', 'Second', 'Third']);
    });
  });

  describe('clearConversation', () => {
    it('should clear conversation history', () => {
      service.addConversationMessage(agentId, 'user', 'Hello');
      service.clearConversation(agentId);

      const history = service.getConversationHistory(agentId);
      expect(history).toHaveLength(0);
    });

    it('should emit memory:cleared event', () => {
      const listener = vi.fn();
      service.on('memory:cleared', listener);

      service.addConversationMessage(agentId, 'user', 'Hello');
      service.clearConversation(agentId);

      expect(listener).toHaveBeenCalledWith({ agentId });
    });
  });
});
