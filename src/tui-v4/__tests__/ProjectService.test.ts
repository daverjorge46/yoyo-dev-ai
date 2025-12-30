/**
 * ProjectService Tests
 *
 * Tests for project info loading from .yoyo-dev/product/ directory
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

// Mock fs modules
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

describe('ProjectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('returns default project info when no product directory exists', async () => {
    vi.mocked(existsSync).mockReturnValue(false);

    // Re-import to get fresh instance
    const { projectService } = await import('../backend/services/ProjectService.js');

    const info = await projectService.getProjectInfo();

    expect(info.name).toBe('Yoyo Dev');
    expect(info.tagline).toBe('AI Development Framework');
    expect(info.techStack).toEqual([]);
  });

  it('extracts project name from mission-lite.md header', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFile).mockResolvedValue(`# My Project - Mission

## What is My Project?

A **test framework** for testing.

**Tagline:** "Test all the things"
`);

    const { projectService } = await import('../backend/services/ProjectService.js');

    const info = await projectService.getProjectInfo();

    expect(info.name).toBe('My Project');
  });

  it('extracts tagline from mission-lite.md', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFile).mockResolvedValue(`# Test Project - Mission

**Tagline:** "Your test framework"
`);

    const { projectService } = await import('../backend/services/ProjectService.js');

    const info = await projectService.getProjectInfo();

    expect(info.tagline).toBe('Your test framework');
  });

  it('extracts tech stack from tech-stack.md', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFile).mockImplementation(async (path) => {
      if (String(path).includes('mission-lite.md')) {
        return '# Test Project\n**Tagline:** "Test"';
      }
      if (String(path).includes('tech-stack.md')) {
        return `**Runtime**: Bun
**Framework**: React + Ink
Uses TypeScript and SQLite for storage.`;
      }
      return '';
    });

    const { projectService } = await import('../backend/services/ProjectService.js');

    const info = await projectService.getProjectInfo();

    expect(info.techStack).toContain('Bun');
    expect(info.techStack).toContain('TypeScript');
    expect(info.techStack).toContain('SQLite');
  });

  it('limits tech stack to 4 items', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFile).mockImplementation(async (path) => {
      if (String(path).includes('mission-lite.md')) {
        return '# Test Project\n**Tagline:** "Test"';
      }
      if (String(path).includes('tech-stack.md')) {
        return `**Runtime**: Node.js
**Framework**: React
Uses TypeScript, SQLite, Redis, PostgreSQL, and MongoDB.`;
      }
      return '';
    });

    const { projectService } = await import('../backend/services/ProjectService.js');

    const info = await projectService.getProjectInfo();

    expect(info.techStack.length).toBeLessThanOrEqual(4);
  });

  it('handles read errors gracefully', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFile).mockRejectedValue(new Error('File read error'));

    const { projectService } = await import('../backend/services/ProjectService.js');

    // Should return defaults on error, not throw
    const info = await projectService.getProjectInfo();

    expect(info.name).toBe('Yoyo Dev');
    expect(info.tagline).toBe('AI Development Framework');
  });
});
