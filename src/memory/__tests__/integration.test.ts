/**
 * Memory System Integration Tests
 *
 * End-to-end tests validating the full memory lifecycle:
 * - init → remember → clear → verify persistence
 * - Scope switching and memory merging
 * - Cross-component integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  // Service
  MemoryService,
  type MemoryServiceOptions,

  // Commands
  initCommand,
  rememberCommand,
  clearCommand,

  // Scopes
  ScopeManager,
  getGlobalMemoryPath,

  // Store
  initializeDatabase,
  closeDatabase,

  // Types
  type PersonaContent,
  type ProjectContent,
  type UserContent,
  type CorrectionsContent,
} from '../index.js';

// =============================================================================
// Test Setup
// =============================================================================

let testProjectRoot: string;
let testGlobalPath: string;
let service: MemoryService;

function createTestEnvironment(): { projectRoot: string; globalPath: string } {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2);

  const projectRoot = join(tmpdir(), `yoyo-integration-project-${timestamp}-${random}`);
  const globalPath = join(tmpdir(), `yoyo-integration-global-${timestamp}-${random}`);

  mkdirSync(projectRoot, { recursive: true });
  mkdirSync(globalPath, { recursive: true });

  return { projectRoot, globalPath };
}

function createMockProject(projectRoot: string): void {
  // Create package.json
  writeFileSync(
    join(projectRoot, 'package.json'),
    JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        react: '^18.0.0',
        typescript: '^5.0.0',
      },
      devDependencies: {
        vitest: '^2.0.0',
      },
    })
  );

  // Create tsconfig.json
  writeFileSync(
    join(projectRoot, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        strict: true,
      },
    })
  );

  // Create source directory
  mkdirSync(join(projectRoot, 'src'), { recursive: true });
  writeFileSync(
    join(projectRoot, 'src', 'index.ts'),
    'export const hello = () => "world";'
  );
}

function cleanupTestEnvironment(projectRoot: string, globalPath: string): void {
  if (existsSync(projectRoot)) {
    rmSync(projectRoot, { recursive: true, force: true });
  }
  if (existsSync(globalPath)) {
    rmSync(globalPath, { recursive: true, force: true });
  }
}

beforeEach(() => {
  const env = createTestEnvironment();
  testProjectRoot = env.projectRoot;
  testGlobalPath = env.globalPath;

  service = new MemoryService({
    projectRoot: testProjectRoot,
    globalPath: testGlobalPath,
  });
  service.initialize();
});

afterEach(() => {
  service.close();
  cleanupTestEnvironment(testProjectRoot, testGlobalPath);
});

// =============================================================================
// Full Lifecycle Tests
// =============================================================================

describe('Full Memory Lifecycle', () => {
  it('should complete init → remember → clear workflow', async () => {
    // Create a mock project
    createMockProject(testProjectRoot);

    // 1. Initialize memory with /init command
    const initResult = await initCommand(service, testProjectRoot);

    expect(initResult.success).toBe(true);
    expect(initResult.projectBlock).not.toBeNull();
    expect(initResult.personaBlock).not.toBeNull();

    // Verify blocks were created
    const projectBlock = service.getProject();
    const personaBlock = service.getPersona();

    expect(projectBlock).not.toBeNull();
    expect(projectBlock?.name).toBeDefined();
    expect(personaBlock).not.toBeNull();

    // 2. Add user preferences with /remember command
    const rememberResult = await rememberCommand(
      service,
      'I prefer functional programming style with TypeScript'
    );

    expect(rememberResult.success).toBe(true);
    expect(rememberResult.blockType).toBe('user');

    // Verify user block was created
    const userBlock = service.getUser();
    expect(userBlock).not.toBeNull();

    // 3. Add conversation history
    const agentId = 'test-agent';
    service.addConversationMessage(agentId, 'user', 'Hello');
    service.addConversationMessage(agentId, 'assistant', 'Hi there!');

    const history = service.getConversationHistory(agentId);
    expect(history).toHaveLength(2);

    // 4. Clear session with /clear (preserve memory)
    const clearResult = await clearCommand(service, agentId);

    expect(clearResult.success).toBe(true);
    expect(clearResult.memoryPreserved).toBe(true);
    expect(clearResult.messagesCleared).toBe(2);

    // Verify conversation cleared but memory preserved
    const historyAfterClear = service.getConversationHistory(agentId);
    expect(historyAfterClear).toHaveLength(0);

    const projectAfterClear = service.getProject();
    expect(projectAfterClear).not.toBeNull();

    const userAfterClear = service.getUser();
    expect(userAfterClear).not.toBeNull();
  });

  it('should persist memory across service restarts', async () => {
    // Create initial memory
    service.saveBlock('persona', {
      name: 'Yoyo',
      traits: ['helpful', 'thorough'],
      communication_style: 'technical',
      expertise_areas: ['TypeScript'],
    } as PersonaContent);

    service.saveBlock('project', {
      name: 'PersistenceTest',
      description: 'Testing persistence',
      tech_stack: { language: 'TypeScript' },
      architecture: 'modular',
      patterns: ['TDD'],
      key_directories: { src: 'Source' },
    } as ProjectContent);

    // Close current service
    service.close();

    // Create new service instance pointing to same paths
    const newService = new MemoryService({
      projectRoot: testProjectRoot,
      globalPath: testGlobalPath,
    });
    newService.initialize();

    // Verify memory persisted
    const persona = newService.getPersona();
    const project = newService.getProject();

    expect(persona).not.toBeNull();
    expect(persona?.name).toBe('Yoyo');

    expect(project).not.toBeNull();
    expect(project?.name).toBe('PersistenceTest');

    newService.close();
  });

  it('should handle memory updates correctly', async () => {
    // Create initial persona
    const initialPersona: PersonaContent = {
      name: 'Yoyo',
      traits: ['helpful'],
      communication_style: 'technical',
      expertise_areas: ['TypeScript'],
    };
    service.saveBlock('persona', initialPersona);

    // getBlock second param is scope, not ID
    const block1 = service.getBlock('persona');
    expect(block1?.version).toBe(1);

    // Update persona by saving again (saveBlock auto-updates if exists)
    const updatedPersona: PersonaContent = {
      ...initialPersona,
      traits: ['helpful', 'thorough', 'patient'],
      expertise_areas: ['TypeScript', 'React', 'Node.js'],
    };
    service.saveBlock('persona', updatedPersona);

    const block2 = service.getBlock('persona');
    expect(block2?.version).toBe(2);
    expect((block2?.content as PersonaContent).traits).toHaveLength(3);
  });
});

// =============================================================================
// Scope Switching Tests
// =============================================================================

describe('Scope Switching and Memory Merging', () => {
  it('should maintain separate project and global scopes', async () => {
    // Create global user preferences
    const globalUserPrefs: UserContent = {
      name: 'GlobalUser',
      preferences: { theme: 'dark', editor: 'vscode' },
      interaction_patterns: [],
    };
    service.saveBlock('user', globalUserPrefs, 'global');

    // Create project-specific preferences
    const projectUserPrefs: UserContent = {
      name: 'ProjectUser',
      preferences: { indent: 2, quotes: 'single' },
      interaction_patterns: [],
    };
    service.saveBlock('user', projectUserPrefs, 'project');

    // Load all memory (should merge)
    const allMemory = service.loadAllMemory();

    // Project should override global for same block type
    expect(allMemory.user).not.toBeNull();
    expect((allMemory.user?.content as UserContent)?.name).toBe('ProjectUser');

    // But global blocks can still be accessed directly
    const globalBlocks = service.getAllBlocks('global');
    const projectBlocks = service.getAllBlocks('project');

    expect(globalBlocks.some((b) => b.type === 'user')).toBe(true);
    expect(projectBlocks.some((b) => b.type === 'user')).toBe(true);
  });

  it('should merge global and project blocks correctly', async () => {
    // Global: persona only
    service.saveBlock(
      'persona',
      {
        name: 'GlobalYoyo',
        traits: ['helpful'],
        communication_style: 'friendly',
        expertise_areas: ['general'],
      } as PersonaContent,
      'global'
    );

    // Project: project only
    service.saveBlock(
      'project',
      {
        name: 'TestProject',
        description: 'A test',
        tech_stack: { language: 'TypeScript' },
        architecture: 'modular',
        patterns: [],
        key_directories: {},
      } as ProjectContent,
      'project'
    );

    // Load all should get both
    const allMemory = service.loadAllMemory();

    expect(allMemory.persona).not.toBeNull();
    expect((allMemory.persona?.content as PersonaContent)?.name).toBe('GlobalYoyo');

    expect(allMemory.project).not.toBeNull();
    expect((allMemory.project?.content as ProjectContent)?.name).toBe('TestProject');
  });

  it('should allow scope-specific operations', async () => {
    // Add blocks to each scope
    service.saveBlock(
      'corrections',
      { entries: [{ date: '2024-01-01', wrong: 'A', right: 'B', context: 'test' }] } as CorrectionsContent,
      'project'
    );

    service.saveBlock(
      'corrections',
      { entries: [{ date: '2024-01-02', wrong: 'X', right: 'Y', context: 'global' }] } as CorrectionsContent,
      'global'
    );

    // Clear only project scope
    const projectBlocks = service.getAllBlocks('project');
    for (const block of projectBlocks) {
      if (block.type === 'corrections') {
        service.deleteBlock(block.id, 'project');
      }
    }

    // Global should still have corrections (access via getBlock with scope)
    const globalCorrectionsBlock = service.getBlock('corrections', 'global');
    expect(globalCorrectionsBlock).not.toBeNull();
    expect((globalCorrectionsBlock?.content as CorrectionsContent)?.entries).toHaveLength(1);

    // Project should not have corrections
    const projectCorrectionsBlock = service.getBlock('corrections', 'project');
    expect(projectCorrectionsBlock).toBeNull();
  });
});

// =============================================================================
// Event Integration Tests
// =============================================================================

describe('Event System Integration', () => {
  it('should emit events during full workflow', async () => {
    const events: Array<{ type: string; data: any }> = [];

    service.on('memory:updated', (data) => events.push({ type: 'updated', data }));
    service.on('memory:deleted', (data) => events.push({ type: 'deleted', data }));
    service.on('memory:loaded', (data) => events.push({ type: 'loaded', data }));

    // Create block
    service.saveBlock('persona', {
      name: 'EventTest',
      traits: [],
      communication_style: 'test',
      expertise_areas: [],
    } as PersonaContent);

    // Update block (saveBlock auto-updates if exists)
    service.saveBlock('persona', {
      name: 'EventTestUpdated',
      traits: ['updated'],
      communication_style: 'test',
      expertise_areas: [],
    } as PersonaContent);

    // Load all memory
    service.loadAllMemory();

    // Delete block - get the actual block first to get its ID
    const personaBlock = service.getBlock('persona');
    if (personaBlock) {
      service.deleteBlock(personaBlock.id);
    }

    // Verify events were emitted in order
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events[0].type).toBe('updated'); // save
    expect(events[1].type).toBe('updated'); // update
  });

  it('should handle errors gracefully with events', async () => {
    const errors: any[] = [];
    service.on('memory:error', (data) => errors.push(data));

    // Try to get non-existent block (should return null)
    // Note: getBlock with a valid scope but no block stored returns null
    const block = service.getBlock('persona', 'global');
    expect(block).toBeNull();

    // Try to delete non-existent block (should handle gracefully without throwing)
    // deleteBlock returns void, so we just verify it doesn't throw
    expect(() => service.deleteBlock('nonexistent')).not.toThrow();
  });
});

// =============================================================================
// Export/Import Integration Tests
// =============================================================================

describe('Export/Import Integration', () => {
  it('should export and import full memory state', async () => {
    // Create diverse memory state
    service.saveBlock('persona', {
      name: 'ExportTest',
      traits: ['thorough'],
      communication_style: 'detailed',
      expertise_areas: ['testing'],
    } as PersonaContent);

    service.saveBlock('project', {
      name: 'ExportProject',
      description: 'For export testing',
      tech_stack: { language: 'TypeScript', framework: 'React' },
      architecture: 'component-based',
      patterns: ['TDD', 'DDD'],
      key_directories: { src: 'Source code' },
    } as ProjectContent);

    service.saveBlock('user', {
      name: 'TestUser',
      preferences: { theme: 'dark' },
      interaction_patterns: ['detailed', 'examples'],
    } as UserContent);

    service.saveBlock('corrections', {
      entries: [
        { date: '2024-01-01', wrong: 'old', right: 'new', context: 'naming' },
      ],
    } as CorrectionsContent);

    // Export memory
    const exported = service.exportMemory();

    expect(exported.version).toBe(1);
    expect(exported.blocks).toHaveLength(4);
    expect(exported.exportedAt).toBeDefined();

    // Clear all memory
    for (const block of service.getAllBlocks()) {
      service.deleteBlock(block.id);
    }

    // Verify cleared
    expect(service.getAllBlocks()).toHaveLength(0);

    // Import memory (returns void)
    service.importMemory(exported);

    // Verify restoration
    const persona = service.getPersona();
    const project = service.getProject();
    const user = service.getUser();
    const corrections = service.getCorrections();

    expect(persona?.name).toBe('ExportTest');
    expect(project?.name).toBe('ExportProject');
    expect(user?.name).toBe('TestUser');
    expect(corrections?.entries).toHaveLength(1);
  });
});

// =============================================================================
// Conversation Persistence Tests
// =============================================================================

describe('Conversation Persistence', () => {
  it('should persist conversation history across service restarts', async () => {
    const agentId = 'persistent-agent';

    // Add conversation
    service.addConversationMessage(agentId, 'user', 'First message');
    service.addConversationMessage(agentId, 'assistant', 'First response');
    service.addConversationMessage(agentId, 'user', 'Second message');

    // Close and reopen
    service.close();

    const newService = new MemoryService({
      projectRoot: testProjectRoot,
      globalPath: testGlobalPath,
    });
    newService.initialize();

    // Verify history persisted
    const history = newService.getConversationHistory(agentId);
    expect(history).toHaveLength(3);
    expect(history[0].content).toBe('First message');
    expect(history[1].content).toBe('First response');
    expect(history[2].content).toBe('Second message');

    newService.close();
  });

  it('should isolate conversations per agent', async () => {
    const agent1 = 'agent-1';
    const agent2 = 'agent-2';

    // Agent 1 conversation
    service.addConversationMessage(agent1, 'user', 'Hello from user 1');
    service.addConversationMessage(agent1, 'assistant', 'Hi user 1!');

    // Agent 2 conversation
    service.addConversationMessage(agent2, 'user', 'Hello from user 2');

    // Verify isolation
    const history1 = service.getConversationHistory(agent1);
    const history2 = service.getConversationHistory(agent2);

    expect(history1).toHaveLength(2);
    expect(history2).toHaveLength(1);
    expect(history1[0].content).toBe('Hello from user 1');
    expect(history2[0].content).toBe('Hello from user 2');
  });
});
