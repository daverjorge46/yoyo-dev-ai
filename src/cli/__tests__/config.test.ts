/**
 * Config Module Tests
 *
 * Tests for configuration loading with a focus on error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, getConfigLocations, configExists } from '../config.js';
import type { CLIArgs } from '../types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestArgs(overrides: Partial<CLIArgs> = {}): CLIArgs {
  return {
    cwd: '/test/project',
    new: false,
    continue: false,
    prompt: undefined,
    model: undefined,
    headless: false,
    output: 'text',
    verbose: false,
    version: false,
    help: false,
    args: [],
    ...overrides,
  };
}

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('Config Error Handling', () => {
  let tempDir: string;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create temp directory for test files
    tempDir = mkdtempSync(join(tmpdir(), 'yoyo-config-test-'));

    // Spy on console.warn
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up temp directory
    rmSync(tempDir, { recursive: true, force: true });

    // Restore console.warn
    consoleWarnSpy.mockRestore();
  });

  it('should log warning when config file has invalid JSON', async () => {
    // Create .yoyo-ai directory
    const yoyoAiDir = join(tempDir, '.yoyo-ai');
    const fs = await import('node:fs');
    fs.mkdirSync(yoyoAiDir, { recursive: true });

    // Create invalid JSON config
    const configPath = join(yoyoAiDir, 'settings.json');
    const invalidJson = '{ invalid json }';
    writeFileSync(configPath, invalidJson, 'utf-8');

    const args = createTestArgs({ cwd: tempDir });
    const config = loadConfig(args);

    // Should log warning
    expect(consoleWarnSpy).toHaveBeenCalled();
    const warnCalls = consoleWarnSpy.mock.calls;
    const hasWarning = warnCalls.some(call =>
      call[0].includes('Warning: Failed to load config')
    );
    expect(hasWarning).toBe(true);

    // Should still return valid config (with defaults)
    expect(config).toBeDefined();
    expect(config.defaultModel).toBeDefined();
  });

  it('should log warning with file path when JSON parsing fails', async () => {
    // Create .yoyo-ai directory properly
    const yoyoAiDir = join(tempDir, '.yoyo-ai');
    const fs = await import('node:fs');
    fs.mkdirSync(yoyoAiDir, { recursive: true });

    const configPath = join(yoyoAiDir, 'settings.json');
    writeFileSync(configPath, '{ "invalid": }', 'utf-8');

    const args = createTestArgs({ cwd: tempDir });
    loadConfig(args);

    // Check that warning includes the file path
    expect(consoleWarnSpy).toHaveBeenCalled();
    const warnMessage = consoleWarnSpy.mock.calls[0]?.[0] as string;
    expect(warnMessage).toContain('settings.json');
    expect(warnMessage).toContain('Failed to load config');
  });

  it('should log warning with error message', async () => {
    const yoyoAiDir = join(tempDir, '.yoyo-ai');
    const fs = await import('node:fs');
    fs.mkdirSync(yoyoAiDir, { recursive: true });

    const configPath = join(yoyoAiDir, 'settings.json');
    writeFileSync(configPath, 'not valid json at all', 'utf-8');

    const args = createTestArgs({ cwd: tempDir });
    loadConfig(args);

    // Check that warning includes error details
    expect(consoleWarnSpy).toHaveBeenCalled();
    const warnMessage = consoleWarnSpy.mock.calls[0]?.[0] as string;
    expect(warnMessage).toContain('Warning:');
    expect(warnMessage.length).toBeGreaterThan(20); // Should have meaningful error message
  });

  it('should not log warning when config file does not exist', () => {
    const args = createTestArgs({ cwd: tempDir });
    loadConfig(args);

    // Should not warn about non-existent files
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should not log warning when config file is valid JSON', async () => {
    const yoyoAiDir = join(tempDir, '.yoyo-ai');
    const fs = await import('node:fs');
    fs.mkdirSync(yoyoAiDir, { recursive: true });

    const configPath = join(yoyoAiDir, 'settings.json');
    const validConfig = JSON.stringify({ defaultModel: 'test-model' });
    writeFileSync(configPath, validConfig, 'utf-8');

    const args = createTestArgs({ cwd: tempDir });
    const config = loadConfig(args);

    // Should not warn
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    // Should load config successfully
    expect(config.defaultModel).toBe('test-model');
  });
});

// =============================================================================
// Config Location Tests
// =============================================================================

describe('Config Locations', () => {
  it('should detect project config existence', () => {
    const locations = getConfigLocations(process.cwd());

    expect(locations.project).toBeDefined();
    expect(locations.project.path).toBeDefined();
    expect(typeof locations.project.exists).toBe('boolean');
  });

  it('should detect global config existence', () => {
    const locations = getConfigLocations(process.cwd());

    expect(locations.global).toBeDefined();
    expect(locations.global.path).toBeDefined();
    expect(typeof locations.global.exists).toBe('boolean');
  });

  it('should check config file existence', () => {
    const exists = configExists('/nonexistent/path/settings.json');
    expect(exists).toBe(false);
  });
});
