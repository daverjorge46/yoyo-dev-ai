/**
 * /remember Command Tests
 *
 * Tests for instruction parsing and memory updates:
 * - Auto-detect target block type
 * - Parse user instructions
 * - Update appropriate memory blocks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  parseInstruction,
  detectTargetBlock,
  updateMemoryFromInstruction,
  rememberCommand,
  type ParsedInstruction,
} from '../remember.js';
import { MemoryService } from '../../service.js';
import type { PersonaContent, ProjectContent, UserContent, CorrectionsContent } from '../../types.js';

// =============================================================================
// Test Setup
// =============================================================================

let testDir: string;
let service: MemoryService;

function createTestDir(): string {
  const dir = join(tmpdir(), `yoyo-remember-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanupTestDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

function initializeTestMemory(service: MemoryService): void {
  // Initialize with default memory blocks
  service.saveBlock('persona', {
    name: 'Yoyo',
    traits: ['helpful', 'thorough'],
    communication_style: 'technical',
    expertise_areas: ['TypeScript', 'React'],
  } as PersonaContent);

  service.saveBlock('project', {
    name: 'TestProject',
    description: 'A test project',
    tech_stack: { language: 'TypeScript', framework: 'React' },
    architecture: 'component-based',
    patterns: ['TDD'],
    key_directories: { src: 'Source code' },
  } as ProjectContent);

  service.saveBlock('user', {
    coding_style: ['functional'],
    preferences: { editor: 'vim' },
    tools: ['git', 'npm'],
    communication: { verbosity: 'normal', examples: true, explanations: true },
  } as UserContent);

  service.saveBlock('corrections', {
    corrections: [],
  } as CorrectionsContent);
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
// parseInstruction Tests
// =============================================================================

describe('parseInstruction', () => {
  it('should extract instruction from simple text', () => {
    const result = parseInstruction('I prefer using const over let');

    expect(result.rawInstruction).toBe('I prefer using const over let');
    expect(result.explicitBlock).toBeUndefined();
  });

  it('should detect explicit persona block targeting', () => {
    const result = parseInstruction('@persona Be more concise in responses');

    expect(result.rawInstruction).toBe('Be more concise in responses');
    expect(result.explicitBlock).toBe('persona');
  });

  it('should detect explicit project block targeting', () => {
    const result = parseInstruction('@project This project uses Convex for the database');

    expect(result.rawInstruction).toBe('This project uses Convex for the database');
    expect(result.explicitBlock).toBe('project');
  });

  it('should detect explicit user block targeting', () => {
    const result = parseInstruction('@user I prefer detailed explanations');

    expect(result.rawInstruction).toBe('I prefer detailed explanations');
    expect(result.explicitBlock).toBe('user');
  });

  it('should detect explicit corrections block targeting', () => {
    const result = parseInstruction('@corrections When I say "fix", I mean refactor');

    expect(result.rawInstruction).toBe('When I say "fix", I mean refactor');
    expect(result.explicitBlock).toBe('corrections');
  });

  it('should handle multiple @ symbols by using first valid one', () => {
    const result = parseInstruction('@persona communicate with @mentions naturally');

    expect(result.rawInstruction).toBe('communicate with @mentions naturally');
    expect(result.explicitBlock).toBe('persona');
  });
});

// =============================================================================
// detectTargetBlock Tests
// =============================================================================

describe('detectTargetBlock', () => {
  it('should detect persona-related instruction', () => {
    const result = detectTargetBlock({
      rawInstruction: 'Be more concise in responses',
      explicitBlock: undefined,
    });

    expect(result).toBe('persona');
  });

  it('should detect project-related instruction', () => {
    const result = detectTargetBlock({
      rawInstruction: 'This project uses PostgreSQL database',
      explicitBlock: undefined,
    });

    expect(result).toBe('project');
  });

  it('should detect user preference instruction', () => {
    const result = detectTargetBlock({
      rawInstruction: 'I prefer functional programming style',
      explicitBlock: undefined,
    });

    expect(result).toBe('user');
  });

  it('should detect correction instruction', () => {
    const result = detectTargetBlock({
      rawInstruction: 'When I say "fix", I actually mean refactor the code',
      explicitBlock: undefined,
    });

    expect(result).toBe('corrections');
  });

  it('should use explicit block when provided', () => {
    const result = detectTargetBlock({
      rawInstruction: 'Some instruction',
      explicitBlock: 'project',
    });

    expect(result).toBe('project');
  });

  it('should default to user block for ambiguous instructions', () => {
    const result = detectTargetBlock({
      rawInstruction: 'Something random',
      explicitBlock: undefined,
    });

    expect(result).toBe('user');
  });
});

// =============================================================================
// updateMemoryFromInstruction Tests
// =============================================================================

describe('updateMemoryFromInstruction', () => {
  beforeEach(() => {
    initializeTestMemory(service);
  });

  it('should update persona traits', () => {
    const result = updateMemoryFromInstruction(
      service,
      'Be more concise',
      'persona'
    );

    expect(result.success).toBe(true);
    expect(result.blockType).toBe('persona');

    const persona = service.getPersona();
    expect(persona?.traits).toContain('concise');
  });

  it('should update persona communication style', () => {
    const result = updateMemoryFromInstruction(
      service,
      'Use casual communication style',
      'persona'
    );

    expect(result.success).toBe(true);
    const persona = service.getPersona();
    expect(persona?.communication_style).toBe('casual');
  });

  it('should update project tech stack', () => {
    const result = updateMemoryFromInstruction(
      service,
      'This project uses PostgreSQL for database',
      'project'
    );

    expect(result.success).toBe(true);
    const project = service.getProject();
    expect(project?.tech_stack.database).toBe('PostgreSQL');
  });

  it('should update user preferences', () => {
    const result = updateMemoryFromInstruction(
      service,
      'I prefer detailed explanations',
      'user'
    );

    expect(result.success).toBe(true);
    const user = service.getUser();
    expect(user?.communication.verbosity).toBe('detailed');
  });

  it('should add correction entry', () => {
    const result = updateMemoryFromInstruction(
      service,
      'When I say fix, I mean refactor',
      'corrections'
    );

    expect(result.success).toBe(true);
    const corrections = service.getCorrections();
    expect(corrections?.corrections.length).toBeGreaterThan(0);
    expect(corrections?.corrections[0]?.issue).toContain('fix');
  });

  it('should create memory block if it does not exist', () => {
    // Clear existing memory
    const blocks = service.getAllBlocks();
    for (const block of blocks) {
      service.deleteBlock(block.id);
    }

    const result = updateMemoryFromInstruction(
      service,
      'I prefer TypeScript',
      'user'
    );

    expect(result.success).toBe(true);
    const user = service.getUser();
    expect(user).not.toBeNull();
  });
});

// =============================================================================
// rememberCommand Tests
// =============================================================================

describe('rememberCommand', () => {
  beforeEach(() => {
    initializeTestMemory(service);
  });

  it('should process instruction and return result', async () => {
    const result = await rememberCommand(service, 'Be more concise');

    expect(result.success).toBe(true);
    expect(result.blockType).toBe('persona');
    expect(result.message).toContain('remembered');
  });

  it('should use explicit block targeting', async () => {
    const result = await rememberCommand(service, '@project Uses Convex database');

    expect(result.success).toBe(true);
    expect(result.blockType).toBe('project');
  });

  it('should emit memory:updated event', async () => {
    const listener = vi.fn();
    service.on('memory:updated', listener);

    await rememberCommand(service, 'I prefer functional style');

    expect(listener).toHaveBeenCalled();
  });

  it('should return confirmation with what was stored', async () => {
    const result = await rememberCommand(service, 'I prefer TypeScript');

    expect(result.message).toContain('TypeScript');
    expect(result.confirmation).toBeDefined();
  });

  it('should handle empty instruction gracefully', async () => {
    const result = await rememberCommand(service, '');

    expect(result.success).toBe(false);
    expect(result.message).toContain('empty');
  });

  it('should work without existing memory blocks', async () => {
    // Clear all memory
    const blocks = service.getAllBlocks();
    for (const block of blocks) {
      service.deleteBlock(block.id);
    }

    const result = await rememberCommand(service, 'I prefer vim');

    expect(result.success).toBe(true);
  });
});
