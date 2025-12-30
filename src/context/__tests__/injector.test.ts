/**
 * Context Injector Tests
 *
 * Tests for automatic AGENTS.md context injection including:
 * - Directory walking from file to project root
 * - Per-session caching to prevent token bloat
 * - XML-formatted output
 * - Project root detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import {
  getContextInjections,
  resetInjectionCache,
  formatInjectedContext,
  findProjectRoot,
  resetAllCaches,
} from '../injector.js';

// =============================================================================
// Test Setup
// =============================================================================

let testDir: string;

function createTestDir(): string {
  const dir = join(
    tmpdir(),
    `yoyo-context-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanupTestDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

function createFile(path: string, content: string): void {
  const dir = path.substring(0, path.lastIndexOf(sep));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, content, 'utf-8');
}

function createProjectStructure(baseDir: string): void {
  // Create a simulated project structure
  // project/
  //   .git/ (marker for project root)
  //   AGENTS.md (project-level context)
  //   src/
  //     AGENTS.md (src-level context)
  //     components/
  //       AGENTS.md (components-level context)
  //       Button/
  //         Button.tsx
  //         index.ts
  //     utils/
  //       helpers.ts

  mkdirSync(join(baseDir, '.git'), { recursive: true });

  createFile(
    join(baseDir, 'AGENTS.md'),
    '# Project Guidelines\n\nUse TypeScript and follow TDD.'
  );

  createFile(
    join(baseDir, 'src', 'AGENTS.md'),
    '# Source Guidelines\n\nAll source files should be well-documented.'
  );

  createFile(
    join(baseDir, 'src', 'components', 'AGENTS.md'),
    '# Component Guidelines\n\nUse atomic design patterns. Prefer functional components.'
  );

  createFile(
    join(baseDir, 'src', 'components', 'Button', 'Button.tsx'),
    'export const Button = () => <button>Click me</button>;'
  );

  createFile(
    join(baseDir, 'src', 'components', 'Button', 'index.ts'),
    "export * from './Button';"
  );

  createFile(
    join(baseDir, 'src', 'utils', 'helpers.ts'),
    'export const helper = () => {};'
  );
}

beforeEach(() => {
  testDir = createTestDir();
  createProjectStructure(testDir);
  resetAllCaches();
});

afterEach(() => {
  cleanupTestDir(testDir);
  resetAllCaches();
});

// =============================================================================
// Directory Walking Tests
// =============================================================================

describe('Context Injection - Directory Walking', () => {
  it('should find AGENTS.md files walking up from a file', async () => {
    const filePath = join(testDir, 'src', 'components', 'Button', 'Button.tsx');
    const sessionId = 'test-session-1';

    const result = await getContextInjections(filePath, {
      sessionId,
      projectRoot: testDir,
    });

    expect(result.injections).toHaveLength(3);
    expect(result.fromCache).toBe(false);

    // Should find directories in order: project root first, deepest last
    expect(result.foundInDirectories).toContain(testDir);
    expect(result.foundInDirectories).toContain(join(testDir, 'src'));
    expect(result.foundInDirectories).toContain(
      join(testDir, 'src', 'components')
    );
  });

  it('should order injections with project root first', async () => {
    const filePath = join(testDir, 'src', 'components', 'Button', 'Button.tsx');
    const sessionId = 'test-session-2';

    const result = await getContextInjections(filePath, {
      sessionId,
      projectRoot: testDir,
    });

    // First injection should be project-level
    expect(result.injections[0]).toContain('Project Guidelines');

    // Last injection should be component-level
    expect(result.injections[2]).toContain('Component Guidelines');
  });

  it('should handle files with no AGENTS.md in hierarchy', async () => {
    const noContextDir = join(testDir, 'no-context');
    mkdirSync(noContextDir, { recursive: true });
    const filePath = join(noContextDir, 'file.ts');
    createFile(filePath, 'export const x = 1;');

    const sessionId = 'test-session-3';

    const result = await getContextInjections(filePath, {
      sessionId,
      projectRoot: noContextDir, // Use noContextDir as root so we don't find project AGENTS.md
    });

    expect(result.injections).toHaveLength(0);
    expect(result.fromCache).toBe(false);
  });

  it('should stop walking at project root', async () => {
    // Create a structure where AGENTS.md exists above project root
    const parentDir = join(testDir, 'parent');
    mkdirSync(parentDir, { recursive: true });
    createFile(
      join(parentDir, 'AGENTS.md'),
      '# Parent AGENTS.md - Should not be included'
    );

    const projectDir = join(parentDir, 'project');
    mkdirSync(join(projectDir, '.git'), { recursive: true });
    createFile(
      join(projectDir, 'AGENTS.md'),
      '# Project AGENTS.md'
    );

    const srcFile = join(projectDir, 'src', 'index.ts');
    createFile(srcFile, 'export const x = 1;');

    const result = await getContextInjections(srcFile, {
      sessionId: 'test-session-4',
      projectRoot: projectDir,
    });

    // Should only find project-level AGENTS.md, not parent
    expect(result.injections).toHaveLength(1);
    expect(result.injections[0]).toContain('Project AGENTS.md');
    expect(result.injections[0]).not.toContain('Parent');
  });

  it('should handle deeply nested files', async () => {
    // Create deep nesting with AGENTS.md at multiple levels
    const deepPath = join(testDir, 'src', 'features', 'auth', 'components', 'forms');
    mkdirSync(deepPath, { recursive: true });

    createFile(
      join(testDir, 'src', 'features', 'AGENTS.md'),
      '# Features Guidelines'
    );
    createFile(
      join(testDir, 'src', 'features', 'auth', 'AGENTS.md'),
      '# Auth Guidelines'
    );

    const filePath = join(deepPath, 'LoginForm.tsx');
    createFile(filePath, 'export const LoginForm = () => null;');

    const result = await getContextInjections(filePath, {
      sessionId: 'test-session-5',
      projectRoot: testDir,
    });

    // Should find: project, src, features, auth (4 levels with AGENTS.md)
    expect(result.injections.length).toBeGreaterThanOrEqual(4);
    expect(result.foundInDirectories).toContain(
      join(testDir, 'src', 'features')
    );
    expect(result.foundInDirectories).toContain(
      join(testDir, 'src', 'features', 'auth')
    );
  });
});

// =============================================================================
// Caching Tests
// =============================================================================

describe('Context Injection - Caching', () => {
  it('should cache injections per session', async () => {
    const filePath = join(testDir, 'src', 'components', 'Button', 'Button.tsx');
    const sessionId = 'cache-test-session';

    // First call - should not be from cache
    const result1 = await getContextInjections(filePath, {
      sessionId,
      projectRoot: testDir,
    });
    expect(result1.fromCache).toBe(false);
    expect(result1.injections).toHaveLength(3);

    // Second call with same session - should be from cache (empty injections)
    const result2 = await getContextInjections(filePath, {
      sessionId,
      projectRoot: testDir,
    });
    expect(result2.fromCache).toBe(true);
    expect(result2.injections).toHaveLength(0); // No new injections
  });

  it('should not use cache for different sessions', async () => {
    const filePath = join(testDir, 'src', 'components', 'Button', 'Button.tsx');

    const result1 = await getContextInjections(filePath, {
      sessionId: 'session-a',
      projectRoot: testDir,
    });
    expect(result1.fromCache).toBe(false);
    expect(result1.injections).toHaveLength(3);

    // Different session should get fresh injections
    const result2 = await getContextInjections(filePath, {
      sessionId: 'session-b',
      projectRoot: testDir,
    });
    expect(result2.fromCache).toBe(false);
    expect(result2.injections).toHaveLength(3);
  });

  it('should reset cache for specific session', async () => {
    const filePath = join(testDir, 'src', 'components', 'Button', 'Button.tsx');
    const sessionId = 'reset-test-session';

    // First call
    await getContextInjections(filePath, {
      sessionId,
      projectRoot: testDir,
    });

    // Second call - cached
    const result2 = await getContextInjections(filePath, {
      sessionId,
      projectRoot: testDir,
    });
    expect(result2.fromCache).toBe(true);

    // Reset cache
    resetInjectionCache(sessionId);

    // Third call after reset - should not be cached
    const result3 = await getContextInjections(filePath, {
      sessionId,
      projectRoot: testDir,
    });
    expect(result3.fromCache).toBe(false);
    expect(result3.injections).toHaveLength(3);
  });

  it('should skip cache when option is set', async () => {
    const filePath = join(testDir, 'src', 'components', 'Button', 'Button.tsx');
    const sessionId = 'skip-cache-session';

    // First call
    await getContextInjections(filePath, {
      sessionId,
      projectRoot: testDir,
    });

    // Second call with skipCache - should still return injections
    const result2 = await getContextInjections(filePath, {
      sessionId,
      projectRoot: testDir,
      skipCache: true,
    });
    expect(result2.fromCache).toBe(false);
    expect(result2.injections).toHaveLength(3);
  });

  it('should cache at directory level, not file level', async () => {
    const sessionId = 'directory-cache-session';

    // Read first file in Button directory
    const file1 = join(testDir, 'src', 'components', 'Button', 'Button.tsx');
    const result1 = await getContextInjections(file1, {
      sessionId,
      projectRoot: testDir,
    });
    expect(result1.fromCache).toBe(false);
    expect(result1.injections).toHaveLength(3);

    // Read second file in same directory - should be cached
    const file2 = join(testDir, 'src', 'components', 'Button', 'index.ts');
    const result2 = await getContextInjections(file2, {
      sessionId,
      projectRoot: testDir,
    });
    expect(result2.fromCache).toBe(true);
    expect(result2.injections).toHaveLength(0);

    // Read file in different directory (utils) - all ancestor AGENTS.md already injected
    // Since utils has no AGENTS.md and project/src are cached, result is from cache
    const file3 = join(testDir, 'src', 'utils', 'helpers.ts');
    const result3 = await getContextInjections(file3, {
      sessionId,
      projectRoot: testDir,
    });
    // All directories with AGENTS.md (project, src) are already cached
    // utils itself has no AGENTS.md, so no new injections = fromCache true
    expect(result3.fromCache).toBe(true);
    expect(result3.injections).toHaveLength(0);
  });

  it('should inject new AGENTS.md when accessing sibling directory with context', async () => {
    const sessionId = 'sibling-directory-session';

    // Add AGENTS.md to utils directory
    createFile(
      join(testDir, 'src', 'utils', 'AGENTS.md'),
      '# Utils Guidelines\n\nUtility functions should be pure.'
    );

    // Read file in components first
    const file1 = join(testDir, 'src', 'components', 'Button', 'Button.tsx');
    const result1 = await getContextInjections(file1, {
      sessionId,
      projectRoot: testDir,
    });
    expect(result1.fromCache).toBe(false);
    expect(result1.injections).toHaveLength(3); // project, src, components

    // Read file in utils - should get the new utils AGENTS.md only
    const file2 = join(testDir, 'src', 'utils', 'helpers.ts');
    const result2 = await getContextInjections(file2, {
      sessionId,
      projectRoot: testDir,
    });
    expect(result2.fromCache).toBe(false);
    expect(result2.injections).toHaveLength(1); // Only utils (project, src already cached)
    expect(result2.injections[0]).toContain('Utils Guidelines');
  });
});

// =============================================================================
// Formatting Tests
// =============================================================================

describe('Context Injection - Formatting', () => {
  it('should format injections with XML tags', () => {
    const injections = [
      '# Project Guidelines\n\nUse TypeScript.',
      '# Component Guidelines\n\nUse atomic design.',
    ];

    const formatted = formatInjectedContext(injections);

    expect(formatted.hasContext).toBe(true);
    expect(formatted.fileCount).toBe(2);
    expect(formatted.content).toContain('<injected-context>');
    expect(formatted.content).toContain('</injected-context>');
    expect(formatted.content).toContain('Project Guidelines');
    expect(formatted.content).toContain('Component Guidelines');
  });

  it('should include directory comments in formatted output', () => {
    const injections = [
      '# Project Guidelines',
      '# Src Guidelines',
    ];

    const formatted = formatInjectedContext(injections);

    expect(formatted.content).toContain('<!-- Directory context');
  });

  it('should handle empty injections', () => {
    const formatted = formatInjectedContext([]);

    expect(formatted.hasContext).toBe(false);
    expect(formatted.fileCount).toBe(0);
    expect(formatted.content).toBe('');
  });

  it('should handle single injection', () => {
    const injections = ['# Single Guidelines'];

    const formatted = formatInjectedContext(injections);

    expect(formatted.hasContext).toBe(true);
    expect(formatted.fileCount).toBe(1);
    expect(formatted.content).toContain('Single Guidelines');
  });

  it('should preserve markdown formatting', () => {
    const injections = [
      '# Header\n\n- List item 1\n- List item 2\n\n```typescript\nconst x = 1;\n```',
    ];

    const formatted = formatInjectedContext(injections);

    expect(formatted.content).toContain('# Header');
    expect(formatted.content).toContain('- List item 1');
    expect(formatted.content).toContain('```typescript');
  });
});

// =============================================================================
// Project Root Detection Tests
// =============================================================================

describe('Context Injection - Project Root Detection', () => {
  it('should detect project root by .git directory', async () => {
    const filePath = join(testDir, 'src', 'index.ts');
    createFile(filePath, 'export const x = 1;');

    const result = await findProjectRoot(filePath);

    expect(result.path).toBe(testDir);
    expect(result.detectedBy).toBe('.git');
  });

  it('should detect project root by package.json', async () => {
    const noGitDir = join(testDir, 'no-git-project');
    mkdirSync(noGitDir, { recursive: true });
    createFile(join(noGitDir, 'package.json'), '{"name": "test"}');

    const filePath = join(noGitDir, 'src', 'index.ts');
    createFile(filePath, 'export const x = 1;');

    const result = await findProjectRoot(filePath);

    expect(result.path).toBe(noGitDir);
    expect(result.detectedBy).toBe('package.json');
  });

  it('should detect project root by .yoyo-dev directory', async () => {
    const yoyoDir = join(testDir, 'yoyo-project');
    mkdirSync(join(yoyoDir, '.yoyo-dev'), { recursive: true });

    const filePath = join(yoyoDir, 'src', 'index.ts');
    createFile(filePath, 'export const x = 1;');

    const result = await findProjectRoot(filePath);

    expect(result.path).toBe(yoyoDir);
    expect(result.detectedBy).toBe('.yoyo-dev');
  });

  it('should prefer .git over other markers', async () => {
    // testDir already has .git, add package.json too
    createFile(join(testDir, 'package.json'), '{"name": "test"}');

    const filePath = join(testDir, 'src', 'index.ts');
    createFile(filePath, 'export const x = 1;');

    const result = await findProjectRoot(filePath);

    expect(result.path).toBe(testDir);
    expect(result.detectedBy).toBe('.git');
  });

  it('should return fallback when no markers found', async () => {
    const isolatedDir = join(testDir, 'isolated', 'deep', 'path');
    mkdirSync(isolatedDir, { recursive: true });

    // Remove .git from testDir for this test
    rmSync(join(testDir, '.git'), { recursive: true, force: true });

    const filePath = join(isolatedDir, 'file.ts');
    createFile(filePath, 'export const x = 1;');

    const result = await findProjectRoot(filePath);

    // Should return the file's directory as fallback
    expect(result.detectedBy).toBe('fallback');
  });
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe('Context Injection - Edge Cases', () => {
  it('should handle non-existent file gracefully', async () => {
    const filePath = join(testDir, 'non-existent', 'file.ts');

    const result = await getContextInjections(filePath, {
      sessionId: 'edge-case-1',
      projectRoot: testDir,
    });

    // Should still work, just scan from the directory
    expect(result).toBeDefined();
  });

  it('should handle empty AGENTS.md file', async () => {
    createFile(join(testDir, 'src', 'empty', 'AGENTS.md'), '');
    const filePath = join(testDir, 'src', 'empty', 'file.ts');
    createFile(filePath, 'export const x = 1;');

    const result = await getContextInjections(filePath, {
      sessionId: 'edge-case-2',
      projectRoot: testDir,
    });

    // Should include empty file in count but content should be empty
    expect(result.foundInDirectories.length).toBeGreaterThan(0);
  });

  it('should handle special characters in paths', async () => {
    const specialDir = join(testDir, 'src', 'special-chars_test');
    mkdirSync(specialDir, { recursive: true });
    createFile(join(specialDir, 'AGENTS.md'), '# Special chars test');
    const filePath = join(specialDir, 'file.ts');
    createFile(filePath, 'export const x = 1;');

    const result = await getContextInjections(filePath, {
      sessionId: 'edge-case-3',
      projectRoot: testDir,
    });

    expect(result.foundInDirectories).toContain(specialDir);
  });

  it('should use custom context file name when specified', async () => {
    createFile(join(testDir, 'src', 'CLAUDE.md'), '# Custom context file');
    const filePath = join(testDir, 'src', 'file.ts');
    createFile(filePath, 'export const x = 1;');

    const result = await getContextInjections(filePath, {
      sessionId: 'edge-case-4',
      projectRoot: testDir,
      contextFileName: 'CLAUDE.md',
    });

    expect(result.injections.some(i => i.includes('Custom context file'))).toBe(true);
  });

  it('should handle concurrent calls to same file', async () => {
    const filePath = join(testDir, 'src', 'components', 'Button', 'Button.tsx');
    const sessionId = 'concurrent-session';

    // Make multiple concurrent calls
    const results = await Promise.all([
      getContextInjections(filePath, { sessionId, projectRoot: testDir }),
      getContextInjections(filePath, { sessionId, projectRoot: testDir }),
      getContextInjections(filePath, { sessionId, projectRoot: testDir }),
    ]);

    // First call should not be cached, subsequent ones should be
    const nonCached = results.filter(r => !r.fromCache);
    const cached = results.filter(r => r.fromCache);

    // At least one should be non-cached (the first to complete)
    expect(nonCached.length).toBeGreaterThanOrEqual(1);
  });
});
