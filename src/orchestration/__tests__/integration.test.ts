/**
 * Integration Tests for Global Orchestration Mode
 * @version 6.2.0
 * @description End-to-end tests for the orchestration system components
 */

import { describe, it, expect, vi } from 'vitest';
import { IntentClassifier } from '../intent-classifier';
import { OrchestrationRouter } from '../router';
import { OutputFormatter } from '../output-formatter';

describe('Orchestration Integration Tests', () => {
  describe('Full Pipeline (Classifier -> Router -> Formatter)', () => {
    it('should process research request end-to-end', () => {
      const classifier = new IntentClassifier();
      const router = new OrchestrationRouter();
      const formatter = new OutputFormatter({ showPrefixes: true });

      const input = 'how to implement authentication in Next.js';

      // Step 1: Classify
      const classification = classifier.classify(input);
      expect(classification.intent).toBe('research');
      expect(classification.primaryAgent).toBe('alma-librarian');
      expect(classification.shouldOrchestrate).toBe(true);

      // Step 2: Route
      const routing = router.route(classification, input);
      expect(routing.shouldDelegate).toBe(true);
      // Research is routed to background by default
      expect(routing.backgroundAgent).toBe('alma-librarian');

      // Step 3: Format
      const output = formatter.format('alma-librarian', 'Found authentication docs');
      expect(output).toContain('[alma-librarian]');
    });

    it('should process codebase search end-to-end', () => {
      const classifier = new IntentClassifier();
      const router = new OrchestrationRouter();
      const formatter = new OutputFormatter({ showPrefixes: true });

      const input = 'where is the authentication middleware';

      const classification = classifier.classify(input);
      expect(classification.intent).toBe('codebase');
      expect(classification.primaryAgent).toBe('alvaro-explore');

      const routing = router.route(classification, input);
      expect(routing.primaryAgent).toBe('alvaro-explore');
      expect(routing.delegationType).toBe('blocking');

      const output = formatter.format('alvaro-explore', 'Found in src/middleware/auth.ts');
      expect(output).toContain('[alvaro-explore]');
    });

    it('should process frontend request end-to-end', () => {
      const classifier = new IntentClassifier();
      const router = new OrchestrationRouter();
      const formatter = new OutputFormatter({ showPrefixes: true });

      const input = 'update the button styling with tailwind';

      const classification = classifier.classify(input);
      expect(classification.intent).toBe('frontend');
      expect(classification.primaryAgent).toBe('dave-engineer');

      const routing = router.route(classification, input);
      expect(routing.primaryAgent).toBe('dave-engineer');

      const output = formatter.format('dave-engineer', 'Updated button styles');
      expect(output).toContain('[dave-engineer]');
    });

    it('should process debug request with background agent', () => {
      const classifier = new IntentClassifier();
      const router = new OrchestrationRouter();

      const input = 'fix the authentication error';

      const classification = classifier.classify(input);
      expect(classification.intent).toBe('debug');
      expect(classification.primaryAgent).toBe('alvaro-explore');
      expect(classification.backgroundAgent).toBe('arthas-oracle');

      const routing = router.route(classification, input);
      expect(routing.primaryAgent).toBe('alvaro-explore');
    });

    it('should process documentation request end-to-end', () => {
      const classifier = new IntentClassifier();
      const router = new OrchestrationRouter();

      const input = 'document the API endpoints';

      const classification = classifier.classify(input);
      expect(classification.intent).toBe('documentation');
      expect(classification.primaryAgent).toBe('angeles-writer');

      const routing = router.route(classification, input);
      expect(routing.primaryAgent).toBe('angeles-writer');
      expect(routing.backgroundAgent).toBe('alvaro-explore');
    });

    it('should process planning request end-to-end', () => {
      const classifier = new IntentClassifier();
      const router = new OrchestrationRouter();

      const input = 'plan the user authentication feature';

      const classification = classifier.classify(input);
      expect(classification.intent).toBe('planning');
      expect(classification.primaryAgent).toBe('yoyo-ai');

      const routing = router.route(classification, input);
      expect(routing.primaryAgent).toBe('yoyo-ai');
      expect(routing.backgroundAgent).toBe('alma-librarian');
    });

    it('should process implementation request end-to-end', () => {
      const classifier = new IntentClassifier();
      const router = new OrchestrationRouter();

      const input = 'implement the user profile page';

      const classification = classifier.classify(input);
      expect(classification.intent).toBe('implementation');
      expect(classification.primaryAgent).toBe('yoyo-ai');

      const routing = router.route(classification, input);
      expect(routing.primaryAgent).toBe('yoyo-ai');
      expect(routing.backgroundAgent).toBe('alvaro-explore');
    });
  });

  describe('Bypass Mechanisms', () => {
    it('should bypass orchestration for slash commands', () => {
      const classifier = new IntentClassifier();
      const router = new OrchestrationRouter();

      const result = classifier.classify('/execute-tasks');

      expect(result.shouldOrchestrate).toBe(false);
      expect(result.intent).toBe('general');

      const routing = router.route(result, '/execute-tasks');
      expect(routing.shouldDelegate).toBe(false);
    });

    it('should bypass orchestration for "directly:" prefix', () => {
      const classifier = new IntentClassifier();
      const router = new OrchestrationRouter();

      const result = classifier.classify('directly: explain this code');

      expect(result.shouldOrchestrate).toBe(false);
      expect(result.intent).toBe('general');

      const routing = router.route(result, 'directly: explain this code');
      expect(routing.shouldDelegate).toBe(false);
    });

    it('should handle case-insensitive "DIRECTLY:" prefix', () => {
      const classifier = new IntentClassifier();

      const result = classifier.classify('DIRECTLY: how to build auth');
      expect(result.shouldOrchestrate).toBe(false);
    });

    it('should bypass all common slash commands', () => {
      const classifier = new IntentClassifier();
      const commands = ['/status', '/specs', '/tasks', '/create-new', '/execute-tasks', '/research'];

      for (const cmd of commands) {
        const result = classifier.classify(cmd);
        expect(result.shouldOrchestrate).toBe(false);
      }
    });
  });

  describe('Confidence Threshold', () => {
    it('should orchestrate when confidence exceeds default threshold', () => {
      const classifier = new IntentClassifier();

      const result = classifier.classify('how to implement authentication');

      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      expect(result.shouldOrchestrate).toBe(true);
    });

    it('should not orchestrate when no keywords match', () => {
      const classifier = new IntentClassifier();

      const result = classifier.classify('hello world');

      expect(result.confidence).toBeLessThan(0.6);
      expect(result.shouldOrchestrate).toBe(false);
    });

    it('should respect custom low threshold', () => {
      const classifier = new IntentClassifier({ confidenceThreshold: 0.2 });

      const result = classifier.classify('implement feature');

      expect(result.shouldOrchestrate).toBe(true);
    });

    it('should respect custom high threshold', () => {
      const classifier = new IntentClassifier({ confidenceThreshold: 0.99 });

      const result = classifier.classify('how to implement auth');

      expect(result.shouldOrchestrate).toBe(false);
    });
  });

  describe('Agent Routing Correctness', () => {
    const classifier = new IntentClassifier();
    const router = new OrchestrationRouter();

    it('should route research queries to alma-librarian', () => {
      const classification = classifier.classify('what is the best practice for error handling');
      const routing = router.route(classification, 'what is the best practice for error handling');

      // Research is routed to background by default
      expect(routing.backgroundAgent).toBe('alma-librarian');
    });

    it('should route codebase queries to alvaro-explore', () => {
      const classification = classifier.classify('find all uses of useAuth hook');
      const routing = router.route(classification, 'find all uses of useAuth hook');

      expect(routing.primaryAgent).toBe('alvaro-explore');
    });

    it('should route frontend work to dave-engineer', () => {
      const classification = classifier.classify('make the layout responsive');
      const routing = router.route(classification, 'make the layout responsive');

      expect(routing.primaryAgent).toBe('dave-engineer');
    });

    it('should route documentation to angeles-writer', () => {
      const classification = classifier.classify('document the API endpoints');
      const routing = router.route(classification, 'document the API endpoints');

      expect(routing.primaryAgent).toBe('angeles-writer');
    });

    it('should route planning to yoyo-ai', () => {
      const classification = classifier.classify('plan the authentication architecture');
      const routing = router.route(classification, 'plan the authentication architecture');

      expect(routing.primaryAgent).toBe('yoyo-ai');
    });

    it('should route implementation to yoyo-ai', () => {
      const classification = classifier.classify('build the notification system');
      const routing = router.route(classification, 'build the notification system');

      expect(routing.primaryAgent).toBe('yoyo-ai');
    });
  });

  describe('Output Formatting', () => {
    it('should include agent prefix when showPrefixes is true', () => {
      const formatter = new OutputFormatter({ showPrefixes: true });
      const output = formatter.format('alma-librarian', 'Research complete');

      expect(output).toContain('[alma-librarian]');
      expect(output).toContain('Research complete');
    });

    it('should not include agent prefix when showPrefixes is false', () => {
      const formatter = new OutputFormatter({ showPrefixes: false });
      const output = formatter.format('alma-librarian', 'Research complete');

      expect(output).not.toContain('[alma-librarian]');
      expect(output).toBe('Research complete');
    });

    it('should format transition messages', () => {
      const formatter = new OutputFormatter({ showPrefixes: true });
      const output = formatter.formatTransition('yoyo-ai', 'dave-engineer', 'Frontend work detected');

      expect(output).toContain('yoyo-ai');
      expect(output).toContain('dave-engineer');
      expect(output).toContain('Frontend work detected');
    });

    it('should format error messages', () => {
      const formatter = new OutputFormatter({ showPrefixes: true });
      const output = formatter.formatError('yoyo-ai', 'Build failed', 1, 3);

      expect(output).toContain('[yoyo-ai]');
      expect(output).toContain('Build failed');
      expect(output).toContain('1');
      expect(output).toContain('3');
    });

    it('should format escalation messages', () => {
      const formatter = new OutputFormatter({ showPrefixes: true });
      const output = formatter.formatEscalation('yoyo-ai', 'arthas-oracle', 'Multiple failures');

      expect(output).toContain('yoyo-ai');
      expect(output).toContain('arthas-oracle');
    });

    it('should format background completion messages', () => {
      const formatter = new OutputFormatter({ showPrefixes: true });
      const output = formatter.formatBackgroundComplete('alma-librarian', 'Found 5 relevant docs');

      expect(output).toContain('[alma-librarian]');
      expect(output).toContain('Found 5 relevant docs');
    });
  });

  describe('Edge Cases', () => {
    const classifier = new IntentClassifier();
    const router = new OrchestrationRouter();

    it('should handle empty input', () => {
      const result = classifier.classify('');
      expect(result.intent).toBe('general');
      expect(result.shouldOrchestrate).toBe(false);
    });

    it('should handle whitespace-only input', () => {
      const result = classifier.classify('   \n\t   ');
      expect(result.shouldOrchestrate).toBe(false);
    });

    it('should handle special characters', () => {
      const result = classifier.classify('how to implement @auth! #feature?');
      expect(result.intent).toBe('research');
    });

    it('should handle very long input', () => {
      const longInput = 'how to implement authentication '.repeat(100);
      const result = classifier.classify(longInput);
      expect(result.intent).toBe('research');
    });

    it('should be case insensitive', () => {
      const result1 = classifier.classify('HOW TO IMPLEMENT AUTH');
      const result2 = classifier.classify('how to implement auth');
      expect(result1.intent).toBe(result2.intent);
    });

    it('should handle unicode input', () => {
      const result = classifier.classify('how to implement 认证 authentication');
      expect(result.intent).toBe('research');
    });
  });

  describe('Multiple Keyword Matches', () => {
    const classifier = new IntentClassifier();

    it('should increase confidence with multiple keyword matches', () => {
      // Single keyword
      const single = classifier.classify('how to');
      // Multiple keywords
      const multiple = classifier.classify('how to best practice documentation tutorial');

      expect(multiple.classification?.confidence ?? multiple.confidence).toBeGreaterThan(
        single.classification?.confidence ?? single.confidence
      );
    });

    it('should track all matched keywords', () => {
      const result = classifier.classify('find where is the authentication code');
      expect(result.matchedKeywords).toContain('find');
      expect(result.matchedKeywords).toContain('where is');
    });
  });

  describe('Router Prompt Building', () => {
    const router = new OrchestrationRouter();
    const classifier = new IntentClassifier();

    it('should build research prompts with proper structure', () => {
      const classification = classifier.classify('how to implement auth');
      const routing = router.route(classification, 'how to implement auth');

      expect(routing.backgroundPrompt).toContain('how to implement auth');
      expect(routing.backgroundPrompt).toContain('[alma-librarian]');
    });

    it('should build codebase prompts with proper structure', () => {
      const classification = classifier.classify('where is the login code');
      const routing = router.route(classification, 'where is the login code');

      expect(routing.agentPrompt).toContain('where is the login code');
      expect(routing.agentPrompt).toContain('[alvaro-explore]');
    });

    it('should build frontend prompts with Tailwind requirements', () => {
      const classification = classifier.classify('style the button');
      const routing = router.route(classification, 'style the button');

      expect(routing.agentPrompt).toContain('Tailwind');
      expect(routing.agentPrompt).toContain('[dave-engineer]');
    });
  });

  describe('Router Configuration', () => {
    it('should respect disabled frontend delegation', () => {
      const router = new OrchestrationRouter({
        frontendDelegation: { enabled: false, agent: 'dave-engineer' },
      });
      const classifier = new IntentClassifier();

      const classification = classifier.classify('style the button');
      const routing = router.route(classification, 'style the button');

      expect(routing.shouldDelegate).toBe(false);
    });

    it('should respect custom agent assignments', () => {
      const router = new OrchestrationRouter({
        codebaseDelegation: { enabled: true, agent: 'arthas-oracle' },
      });
      const classifier = new IntentClassifier();

      const classification = classifier.classify('find the login code');
      const routing = router.route(classification, 'find the login code');

      expect(routing.primaryAgent).toBe('arthas-oracle');
    });
  });
});
