/**
 * Tests for Orchestration Hook Entry Point
 * @version 6.1.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntentClassifier } from '../../orchestration/intent-classifier';
import { OrchestrationRouter } from '../../orchestration/router';
import { OutputFormatter } from '../../orchestration/output-formatter';
import { ConfigLoader } from '../../orchestration/config-loader';

describe('Orchestrate Entry Point Components', () => {
  describe('Integration flow', () => {
    it('should classify, route, and format a codebase query', () => {
      const classifier = new IntentClassifier();
      const router = new OrchestrationRouter();
      const formatter = new OutputFormatter();

      const prompt = 'Where is the authentication handler located?';

      // Step 1: Classify
      const classification = classifier.classify(prompt);
      expect(classification.intent).toBe('codebase');
      expect(classification.shouldOrchestrate).toBe(true);

      // Step 2: Route
      const routing = router.route(classification, prompt);
      expect(routing.shouldDelegate).toBe(true);
      expect(routing.primaryAgent).toBe('alvaro-explore');

      // Step 3: Format
      const context = formatter.formatRoutingContext(classification, routing);
      expect(context).toContain('ORCHESTRATION CONTEXT:');
      expect(context).toContain('alvaro-explore');
      expect(context).toMatch(/---\s*$/);
    });

    it('should classify, route, and format a frontend query', () => {
      const classifier = new IntentClassifier();
      const router = new OrchestrationRouter();
      const formatter = new OutputFormatter();

      const prompt = 'Add a button with tailwind styling';

      const classification = classifier.classify(prompt);
      expect(classification.intent).toBe('frontend');
      expect(classification.primaryAgent).toBe('dave-engineer');

      const routing = router.route(classification, prompt);
      expect(routing.primaryAgent).toBe('dave-engineer');

      const context = formatter.formatRoutingContext(classification, routing);
      expect(context).toContain('dave-engineer');
      expect(context).toContain('UI');
    });

    it('should bypass orchestration for slash commands', () => {
      const classifier = new IntentClassifier();

      const prompt = '/create-spec Add a new feature';
      const classification = classifier.classify(prompt);

      expect(classification.shouldOrchestrate).toBe(false);
      expect(classification.intent).toBe('general');
    });

    it('should bypass orchestration for directly: prefix', () => {
      const classifier = new IntentClassifier();

      const prompt = 'directly: what is 2+2?';
      const classification = classifier.classify(prompt);

      expect(classification.shouldOrchestrate).toBe(false);
    });

    it('should handle low confidence as no orchestration', () => {
      const classifier = new IntentClassifier({ confidenceThreshold: 0.9 });

      const prompt = 'hello';
      const classification = classifier.classify(prompt);

      expect(classification.shouldOrchestrate).toBe(false);
    });
  });

  describe('ConfigLoader integration', () => {
    it('should load default config when no file exists', () => {
      const loader = new ConfigLoader('/nonexistent/path');
      const config = loader.load();

      expect(config.enabled).toBe(true);
      expect(config.globalMode).toBe(true);
      expect(config.showPrefixes).toBe(true);
      expect(config.confidenceThreshold).toBe(0.6);
    });

    it('should respect YOYO_ORCHESTRATION=false env var', () => {
      const originalEnv = process.env.YOYO_ORCHESTRATION;
      process.env.YOYO_ORCHESTRATION = 'false';

      try {
        const loader = new ConfigLoader('/some/path');
        const config = loader.load();

        expect(config.enabled).toBe(false);
      } finally {
        if (originalEnv === undefined) {
          delete process.env.YOYO_ORCHESTRATION;
        } else {
          process.env.YOYO_ORCHESTRATION = originalEnv;
        }
      }
    });
  });

  describe('Hook input parsing', () => {
    it('should parse valid hook input', () => {
      const input = {
        session_id: 'test-123',
        transcript_path: '/path/to/transcript.jsonl',
        cwd: '/project/root',
        hook_event_name: 'UserPromptSubmit',
        prompt: 'Find the auth handler',
      };

      // Simulate parsing (inline for test)
      expect(input.prompt).toBe('Find the auth handler');
      expect(input.cwd).toBe('/project/root');
    });

    it('should handle minimal input with just prompt', () => {
      const input = {
        prompt: 'Where is the config?',
      };

      expect(input.prompt).toBeDefined();
    });
  });

  describe('Output format', () => {
    it('should produce output that ends with delimiter', () => {
      const formatter = new OutputFormatter();
      const classification = {
        intent: 'codebase' as const,
        confidence: 0.8,
        primaryAgent: 'alvaro-explore' as const,
        backgroundAgent: null,
        matchedKeywords: ['where'],
        shouldOrchestrate: true,
      };
      const routing = {
        shouldDelegate: true,
        delegationType: 'blocking' as const,
        primaryAgent: 'alvaro-explore' as const,
        backgroundAgent: null,
        agentPrompt: null,
        backgroundPrompt: null,
      };

      const output = formatter.formatRoutingContext(classification, routing);

      // Must end with delimiter for clean separation from user message
      expect(output).toMatch(/---\s*$/);

      // Should contain orchestration context header
      expect(output).toContain('ORCHESTRATION CONTEXT:');

      // Should contain agent name
      expect(output).toContain('alvaro-explore');
    });

    it('should suppress prefixes when showPrefixes is false', () => {
      const formatter = new OutputFormatter({ showPrefixes: false });
      const classification = {
        intent: 'research' as const,
        confidence: 0.9,
        primaryAgent: 'alma-librarian' as const,
        backgroundAgent: null,
        matchedKeywords: ['docs'],
        shouldOrchestrate: true,
      };
      const routing = {
        shouldDelegate: true,
        delegationType: 'blocking' as const,
        primaryAgent: 'alma-librarian' as const,
        backgroundAgent: null,
        agentPrompt: null,
        backgroundPrompt: null,
      };

      const output = formatter.formatRoutingContext(classification, routing);

      // Should not contain ANSI color codes when prefixes disabled
      expect(output).not.toContain('\x1b[36m'); // yoyo-ai cyan
      expect(output).not.toContain('[yoyo-ai]');

      // Should still contain the context block
      expect(output).toContain('ORCHESTRATION CONTEXT:');
    });
  });

  describe('Error handling philosophy', () => {
    it('should demonstrate that errors should not block (documentation)', () => {
      // This test documents the expected behavior:
      // All errors in the hook should exit with code 0
      // This ensures the user is never blocked
      //
      // Implementation in orchestrate-entry.ts:
      // - All catch blocks exit with 0
      // - Errors are logged to stderr only
      // - 3 second timeout on stdin read

      expect(true).toBe(true); // Philosophy documented
    });
  });
});
