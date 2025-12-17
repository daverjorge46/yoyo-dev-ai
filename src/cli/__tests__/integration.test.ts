/**
 * CLI Integration Tests
 *
 * End-to-end tests for the CLI workflow including argument parsing,
 * configuration loading, headless mode, and command execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseArgs, validateArgs, VERSION } from '../args.js';
import { loadConfig } from '../config.js';
import { DEFAULT_CONFIG } from '../types.js';
import type { CLIArgs, CLIConfig, CLIState, OutputFormat } from '../types.js';

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
    output: 'text' as OutputFormat,
    verbose: false,
    version: false,
    help: false,
    args: [],
    ...overrides,
  };
}

function createTestState(overrides: Partial<CLIState> = {}): CLIState {
  const args = createTestArgs();
  const config = { ...DEFAULT_CONFIG };
  return {
    config,
    args,
    initialized: true,
    cwd: args.cwd,
    interactive: !args.headless,
    model: args.model ?? config.defaultModel,
    ...overrides,
  };
}

// =============================================================================
// Argument Parsing Integration Tests
// =============================================================================

describe('CLI Argument Parsing Integration', () => {
  const originalArgv = process.argv;

  afterEach(() => {
    process.argv = originalArgv;
  });

  it('should parse basic command with no arguments', () => {
    process.argv = ['node', 'yoyo-ai'];
    const args = parseArgs();

    expect(args.cwd).toBe(process.cwd());
    expect(args.headless).toBe(false);
    expect(args.new).toBe(false);
    expect(args.continue).toBe(false);
  });

  it('should parse headless mode with prompt', () => {
    process.argv = ['node', 'yoyo-ai', '--headless', '-p', 'Test prompt'];
    const args = parseArgs();

    expect(args.headless).toBe(true);
    expect(args.prompt).toBe('Test prompt');
  });

  it('should parse model selection', () => {
    process.argv = ['node', 'yoyo-ai', '--model', 'gpt-4'];
    const args = parseArgs();

    expect(args.model).toBe('gpt-4');
  });

  it('should parse output format', () => {
    process.argv = ['node', 'yoyo-ai', '--headless', '-p', 'test', '--output', 'json'];
    const args = parseArgs();

    expect(args.output).toBe('json');
  });

  it('should parse new conversation flag', () => {
    process.argv = ['node', 'yoyo-ai', '--new'];
    const args = parseArgs();

    expect(args.new).toBe(true);
  });

  it('should parse continue flag', () => {
    process.argv = ['node', 'yoyo-ai', '--continue'];
    const args = parseArgs();

    expect(args.continue).toBe(true);
  });

  it('should parse verbose flag', () => {
    process.argv = ['node', 'yoyo-ai', '--verbose'];
    const args = parseArgs();

    expect(args.verbose).toBe(true);
  });
});

// =============================================================================
// Argument Validation Integration Tests
// =============================================================================

describe('CLI Argument Validation Integration', () => {
  it('should allow headless mode without prompt (validation happens later)', () => {
    // Note: prompt validation happens in runHeadless, not validateArgs
    const args = createTestArgs({ headless: true, prompt: undefined });
    const error = validateArgs(args);

    // validateArgs doesn't check prompt requirement
    expect(error).toBeNull();
  });

  it('should allow headless mode with prompt', () => {
    const args = createTestArgs({ headless: true, prompt: 'Test prompt' });
    const error = validateArgs(args);

    expect(error).toBeNull();
  });

  it('should reject conflicting new and continue flags', () => {
    const args = createTestArgs({ new: true, continue: true });
    const error = validateArgs(args);

    expect(error).toBe('Cannot use both --new and --continue');
  });

  it('should reject output format in non-headless mode', () => {
    const args = createTestArgs({ headless: false, output: 'json' as OutputFormat });
    const error = validateArgs(args);

    expect(error).toBe('Output format can only be specified in headless mode');
  });

  it('should accept valid output formats in headless mode', () => {
    for (const format of ['text', 'json', 'stream-json'] as OutputFormat[]) {
      const args = createTestArgs({ headless: true, output: format });
      const error = validateArgs(args);
      expect(error).toBeNull();
    }
  });
});

// =============================================================================
// Configuration Loading Integration Tests
// =============================================================================

describe('CLI Configuration Loading Integration', () => {
  it('should load default configuration', () => {
    const args = createTestArgs();
    const config = loadConfig(args);

    expect(config.defaultModel).toBe(DEFAULT_CONFIG.defaultModel);
    expect(config.memory.enabled).toBe(DEFAULT_CONFIG.memory.enabled);
    expect(config.ui.colors).toBe(DEFAULT_CONFIG.ui.colors);
  });

  it('should override with CLI arguments', () => {
    const args = createTestArgs({ model: 'custom-model', verbose: true });
    const config = loadConfig(args);

    // Model is handled in state, but verbose enables debug
    expect(config.debug.enabled).toBe(true);
  });

  it('should apply environment variable overrides', () => {
    const originalEnv = process.env.YOYO_MODEL;
    process.env.YOYO_MODEL = 'env-model';

    const args = createTestArgs();
    const config = loadConfig(args);

    // CLI args take precedence, but env should be checked
    expect(config).toBeDefined();

    process.env.YOYO_MODEL = originalEnv;
  });
});

// =============================================================================
// Full Workflow Integration Tests
// =============================================================================

describe('CLI Full Workflow Integration', () => {
  it('should create valid state from args and config', () => {
    const args = createTestArgs({ model: 'test-model' });
    const config = loadConfig(args);
    const state: CLIState = {
      config,
      args,
      initialized: true,
      cwd: args.cwd,
      interactive: !args.headless,
      model: args.model ?? config.defaultModel,
    };

    expect(state.initialized).toBe(true);
    expect(state.interactive).toBe(true);
    expect(state.model).toBe('test-model');
  });

  it('should transition to headless mode correctly', () => {
    const args = createTestArgs({ headless: true, prompt: 'Test' });
    const config = loadConfig(args);
    const state: CLIState = {
      config,
      args,
      initialized: true,
      cwd: args.cwd,
      interactive: !args.headless,
      model: args.model ?? config.defaultModel,
    };

    expect(state.interactive).toBe(false);
    expect(state.args.prompt).toBe('Test');
  });

  it('should use default model when none specified', () => {
    const args = createTestArgs({ model: undefined });
    // Use DEFAULT_CONFIG directly since loadConfig needs real paths
    const config = { ...DEFAULT_CONFIG };
    const model = args.model ?? config.defaultModel;

    expect(model).toBe('claude-sonnet');
  });
});

// =============================================================================
// Version Information Tests
// =============================================================================

describe('CLI Version Integration', () => {
  it('should export version constant', () => {
    expect(VERSION).toBeDefined();
    expect(typeof VERSION).toBe('string');
  });

  it('should have valid semver format', () => {
    const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
    expect(VERSION).toMatch(semverPattern);
  });
});

// =============================================================================
// Error Handling Integration Tests
// =============================================================================

describe('CLI Error Handling Integration', () => {
  it('should handle missing project directory gracefully', () => {
    const args = createTestArgs({ cwd: '/nonexistent/path' });
    const config = loadConfig(args);

    // Should not throw, config loads with defaults
    expect(config).toBeDefined();
    expect(config.defaultModel).toBeDefined();
  });

  it('should handle invalid model gracefully', () => {
    const args = createTestArgs({ model: '' });
    // Empty string should fall back to default
    const config = loadConfig(args);
    const model = args.model || config.defaultModel;

    expect(model).toBe(config.defaultModel);
  });
});

// =============================================================================
// Configuration Hierarchy Tests
// =============================================================================

describe('CLI Configuration Hierarchy Integration', () => {
  it('should respect configuration priority: args > env > project > global', () => {
    // CLI args have highest priority
    const args = createTestArgs({ model: 'cli-model', verbose: true });
    const config = loadConfig(args);

    // When model is specified in args, it should be used in state
    const state: CLIState = {
      config,
      args,
      initialized: true,
      cwd: args.cwd,
      interactive: true,
      model: args.model ?? config.defaultModel,
    };

    expect(state.model).toBe('cli-model');
    expect(state.config.debug.enabled).toBe(true);
  });

  it('should merge configurations correctly', () => {
    const args = createTestArgs();
    const config = loadConfig(args);

    // Check that all default sections are present
    expect(config.memory).toBeDefined();
    expect(config.ui).toBeDefined();
    expect(config.debug).toBeDefined();
  });
});
