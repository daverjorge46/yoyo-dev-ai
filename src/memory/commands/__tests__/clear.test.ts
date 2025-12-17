/**
 * /clear Command Tests
 *
 * Tests for conversation clearing and memory preservation:
 * - Clear conversation history
 * - Preserve memory blocks
 * - Optional include-memory flag
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  clearSession,
  verifyMemoryIntact,
  clearCommand,
} from '../clear.js';
import { MemoryService } from '../../service.js';
import type { PersonaContent, ProjectContent } from '../../types.js';

// =============================================================================
// Test Setup
// =============================================================================

let testDir: string;
let service: MemoryService;

function createTestDir(): string {
  const dir = join(tmpdir(), `yoyo-clear-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanupTestDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

function initializeTestMemory(service: MemoryService): void {
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
// clearSession Tests
// =============================================================================

describe('clearSession', () => {
  const agentId = 'test-agent';

  it('should clear conversation history', () => {
    // Add some conversation messages
    service.addConversationMessage(agentId, 'user', 'Hello');
    service.addConversationMessage(agentId, 'assistant', 'Hi there!');
    service.addConversationMessage(agentId, 'user', 'How are you?');

    expect(service.getConversationHistory(agentId)).toHaveLength(3);

    clearSession(service, agentId);

    expect(service.getConversationHistory(agentId)).toHaveLength(0);
  });

  it('should preserve memory blocks by default', () => {
    initializeTestMemory(service);

    // Add conversation
    service.addConversationMessage(agentId, 'user', 'Hello');

    clearSession(service, agentId);

    // Memory should still exist
    const persona = service.getPersona();
    const project = service.getProject();

    expect(persona).not.toBeNull();
    expect(project).not.toBeNull();
    expect(persona?.name).toBe('Yoyo');
    expect(project?.name).toBe('TestProject');
  });

  it('should clear memory blocks when includeMemory is true', () => {
    initializeTestMemory(service);

    // Add conversation
    service.addConversationMessage(agentId, 'user', 'Hello');

    clearSession(service, agentId, { includeMemory: true });

    // Memory should be cleared
    const persona = service.getPersona();
    const project = service.getProject();

    expect(persona).toBeNull();
    expect(project).toBeNull();
  });

  it('should return cleared counts', () => {
    initializeTestMemory(service);
    service.addConversationMessage(agentId, 'user', 'Hello');
    service.addConversationMessage(agentId, 'assistant', 'Hi');

    const result = clearSession(service, agentId);

    expect(result.messagesCleared).toBe(2);
    expect(result.blocksCleared).toBe(0);
  });

  it('should return memory block count when includeMemory', () => {
    initializeTestMemory(service);

    const result = clearSession(service, agentId, { includeMemory: true });

    expect(result.blocksCleared).toBe(2);
  });
});

// =============================================================================
// verifyMemoryIntact Tests
// =============================================================================

describe('verifyMemoryIntact', () => {
  it('should return true when memory blocks exist', () => {
    initializeTestMemory(service);

    const result = verifyMemoryIntact(service);

    expect(result.intact).toBe(true);
    expect(result.blockCount).toBe(2);
  });

  it('should return false when no memory blocks exist', () => {
    const result = verifyMemoryIntact(service);

    expect(result.intact).toBe(false);
    expect(result.blockCount).toBe(0);
  });

  it('should list block types', () => {
    initializeTestMemory(service);

    const result = verifyMemoryIntact(service);

    expect(result.blockTypes).toContain('persona');
    expect(result.blockTypes).toContain('project');
  });
});

// =============================================================================
// clearCommand Tests
// =============================================================================

describe('clearCommand', () => {
  const agentId = 'test-agent';

  it('should clear conversation and return success', async () => {
    initializeTestMemory(service);
    service.addConversationMessage(agentId, 'user', 'Hello');

    const result = await clearCommand(service, agentId);

    expect(result.success).toBe(true);
    expect(result.message).toContain('cleared');
  });

  it('should preserve memory by default', async () => {
    initializeTestMemory(service);
    service.addConversationMessage(agentId, 'user', 'Hello');

    await clearCommand(service, agentId);

    const persona = service.getPersona();
    expect(persona).not.toBeNull();
  });

  it('should clear memory when includeMemory option is true', async () => {
    initializeTestMemory(service);
    service.addConversationMessage(agentId, 'user', 'Hello');

    await clearCommand(service, agentId, { includeMemory: true });

    const persona = service.getPersona();
    expect(persona).toBeNull();
  });

  it('should emit memory:cleared event', async () => {
    const listener = vi.fn();
    service.on('memory:cleared', listener);

    service.addConversationMessage(agentId, 'user', 'Hello');
    await clearCommand(service, agentId);

    expect(listener).toHaveBeenCalledWith({ agentId });
  });

  it('should return confirmation with memory status', async () => {
    initializeTestMemory(service);
    service.addConversationMessage(agentId, 'user', 'Hello');

    const result = await clearCommand(service, agentId);

    expect(result.memoryPreserved).toBe(true);
    expect(result.blockCount).toBe(2);
  });

  it('should handle empty conversation gracefully', async () => {
    const result = await clearCommand(service, agentId);

    expect(result.success).toBe(true);
    expect(result.messagesCleared).toBe(0);
  });
});
