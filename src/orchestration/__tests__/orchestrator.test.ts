/**
 * Tests for Main Orchestrator
 * @version 6.2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import {
  Orchestrator,
  getOrchestrator,
  resetOrchestrator,
  isOrchestratorInitialized,
} from '../orchestrator';

// Mock fs module
vi.mock('fs');

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    vi.resetAllMocks();
    resetOrchestrator();
    delete process.env.YOYO_ORCHESTRATION;

    // Default: no config file exists
    vi.mocked(fs.existsSync).mockReturnValue(false);

    orchestrator = new Orchestrator('/mock/project');
  });

  afterEach(() => {
    delete process.env.YOYO_ORCHESTRATION;
    resetOrchestrator();
  });

  describe('process', () => {
    it('should process research intent correctly', () => {
      const result = orchestrator.process('how to implement authentication');

      expect(result.shouldOrchestrate).toBe(true);
      expect(result.classification.intent).toBe('research');
      expect(result.routing.backgroundAgent).toBe('alma-librarian');
    });

    it('should process codebase intent correctly', () => {
      const result = orchestrator.process('where is the auth middleware');

      expect(result.shouldOrchestrate).toBe(true);
      expect(result.classification.intent).toBe('codebase');
      expect(result.routing.primaryAgent).toBe('alvaro-explore');
    });

    it('should process frontend intent correctly', () => {
      const result = orchestrator.process('update the button styling with tailwind');

      expect(result.shouldOrchestrate).toBe(true);
      expect(result.classification.intent).toBe('frontend');
      expect(result.routing.primaryAgent).toBe('dave-engineer');
    });

    it('should not orchestrate when disabled', () => {
      process.env.YOYO_ORCHESTRATION = 'false';
      orchestrator = new Orchestrator('/mock/project');

      const result = orchestrator.process('how to implement auth');

      expect(result.shouldOrchestrate).toBe(false);
      expect(result.classification.intent).toBe('general');
    });

    it('should not orchestrate slash commands', () => {
      const result = orchestrator.process('/execute-tasks');

      expect(result.shouldOrchestrate).toBe(false);
    });

    it('should not orchestrate "directly:" prefix', () => {
      const result = orchestrator.process('directly: explain TypeScript');

      expect(result.shouldOrchestrate).toBe(false);
    });

    it('should include formatted output when orchestrating', () => {
      const result = orchestrator.process('how to implement auth best practice');

      expect(result.formattedOutput).not.toBeNull();
      expect(result.formattedOutput).toContain('[yoyo-ai]');
      expect(result.formattedOutput).toContain('Intent:');
    });
  });

  describe('formatAgentOutput', () => {
    it('should format output with agent prefix', () => {
      const result = orchestrator.formatAgentOutput('yoyo-ai', 'Processing request');

      expect(result).toContain('[yoyo-ai]');
      expect(result).toContain('Processing request');
    });

    it('should handle multi-line output', () => {
      const result = orchestrator.formatAgentOutput('yoyo-ai', 'Line 1\nLine 2');
      const lines = result.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('[yoyo-ai]');
      expect(lines[1]).toContain('[yoyo-ai]');
    });
  });

  describe('formatPhase', () => {
    it('should format phase announcement', () => {
      const result = orchestrator.formatPhase('Phase 1', 'Codebase Assessment');

      expect(result).toContain('[yoyo-ai]');
      expect(result).toContain('Phase 1');
      expect(result).toContain('Codebase Assessment');
    });
  });

  describe('formatProgress', () => {
    it('should format progress correctly', () => {
      const result = orchestrator.formatProgress(2, 5, 'Implementing auth');

      expect(result).toContain('[2/5]');
      expect(result).toContain('Implementing auth');
    });
  });

  describe('formatTransition', () => {
    it('should format agent transition', () => {
      const result = orchestrator.formatTransition(
        'yoyo-ai',
        'dave-engineer',
        'Frontend work detected'
      );

      expect(result).toContain('Delegating');
      expect(result).toContain('Frontend work detected');
    });
  });

  describe('formatBackgroundComplete', () => {
    it('should format background completion', () => {
      const result = orchestrator.formatBackgroundComplete(
        'alma-librarian',
        'Found 5 results'
      );

      expect(result).toContain('[alma-librarian]');
      expect(result).toContain('[Background Complete]');
    });
  });

  describe('formatError', () => {
    it('should format error without attempts', () => {
      const result = orchestrator.formatError('yoyo-ai', 'Test failed');

      expect(result).toContain('[yoyo-ai]');
      expect(result).toContain('Error:');
    });

    it('should format error with attempts', () => {
      const result = orchestrator.formatError('yoyo-ai', 'Test failed', 2, 3);

      expect(result).toContain('(attempt 2/3)');
    });
  });

  describe('formatEscalation', () => {
    it('should format escalation message', () => {
      const result = orchestrator.formatEscalation(
        'yoyo-ai',
        'arthas-oracle',
        '3 failures'
      );

      expect(result).toContain('Escalating to arthas-oracle');
    });
  });

  describe('formatSuccess', () => {
    it('should format success with checkmark', () => {
      const result = orchestrator.formatSuccess('yoyo-ai', 'All tests passed');

      expect(result).toContain('✓');
      expect(result).toContain('All tests passed');
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled', () => {
      expect(orchestrator.isEnabled()).toBe(true);
    });

    it('should return false when disabled via env', () => {
      process.env.YOYO_ORCHESTRATION = 'false';
      orchestrator = new Orchestrator('/mock/project');

      expect(orchestrator.isEnabled()).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('should return config copy', () => {
      const config = orchestrator.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.globalMode).toBe(true);
      expect(config.confidenceThreshold).toBe(0.6);
    });
  });

  describe('reloadConfig', () => {
    it('should reload config from file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
orchestration:
  confidenceThreshold: 0.9
`);

      orchestrator.reloadConfig();
      const config = orchestrator.getConfig();

      expect(config.confidenceThreshold).toBe(0.9);
    });
  });

  describe('shouldBypass', () => {
    it('should bypass slash commands', () => {
      expect(orchestrator.shouldBypass('/test')).toBe(true);
    });

    it('should bypass "directly:" prefix', () => {
      expect(orchestrator.shouldBypass('directly: test')).toBe(true);
    });

    it('should not bypass regular input', () => {
      expect(orchestrator.shouldBypass('regular input')).toBe(false);
    });
  });

  describe('component accessors', () => {
    it('should provide access to classifier', () => {
      const classifier = orchestrator.getClassifier();
      expect(classifier).toBeDefined();
    });

    it('should provide access to router', () => {
      const router = orchestrator.getRouter();
      expect(router).toBeDefined();
    });

    it('should provide access to formatter', () => {
      const formatter = orchestrator.getFormatter();
      expect(formatter).toBeDefined();
    });
  });
});

describe('Singleton Pattern', () => {
  beforeEach(() => {
    resetOrchestrator();
    delete process.env.YOYO_ORCHESTRATION;
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  afterEach(() => {
    resetOrchestrator();
  });

  describe('getOrchestrator', () => {
    it('should return same instance on multiple calls', () => {
      const first = getOrchestrator('/mock/project');
      const second = getOrchestrator('/mock/project');

      expect(first).toBe(second);
    });

    it('should create instance on first call', () => {
      expect(isOrchestratorInitialized()).toBe(false);

      getOrchestrator('/mock/project');

      expect(isOrchestratorInitialized()).toBe(true);
    });
  });

  describe('resetOrchestrator', () => {
    it('should reset the singleton', () => {
      getOrchestrator('/mock/project');
      expect(isOrchestratorInitialized()).toBe(true);

      resetOrchestrator();
      expect(isOrchestratorInitialized()).toBe(false);
    });

    it('should allow new instance after reset', () => {
      const first = getOrchestrator('/mock/project');
      resetOrchestrator();
      const second = getOrchestrator('/mock/project');

      expect(first).not.toBe(second);
    });
  });

  describe('isOrchestratorInitialized', () => {
    it('should return false initially', () => {
      expect(isOrchestratorInitialized()).toBe(false);
    });

    it('should return true after initialization', () => {
      getOrchestrator('/mock/project');
      expect(isOrchestratorInitialized()).toBe(true);
    });
  });
});

describe('Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetOrchestrator();
    delete process.env.YOYO_ORCHESTRATION;
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  it('should handle full orchestration flow', () => {
    const orchestrator = new Orchestrator('/mock/project');

    // Process input
    const result = orchestrator.process('how to implement auth with best practice');

    // Should orchestrate
    expect(result.shouldOrchestrate).toBe(true);

    // Format various outputs
    const phase = orchestrator.formatPhase('Phase 0', 'Intent Classification');
    expect(phase).toContain('[yoyo-ai]');

    const progress = orchestrator.formatProgress(1, 3, 'Research');
    expect(progress).toContain('[1/3]');

    const success = orchestrator.formatSuccess('yoyo-ai', 'Complete');
    expect(success).toContain('✓');
  });

  it('should handle disabled orchestration flow', () => {
    process.env.YOYO_ORCHESTRATION = 'false';
    const orchestrator = new Orchestrator('/mock/project');

    const result = orchestrator.process('how to implement auth');

    expect(result.shouldOrchestrate).toBe(false);
    expect(result.formattedOutput).toBeNull();
  });
});
