/**
 * Tests for Intent Classifier
 * @version 6.1.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntentClassifier } from '../intent-classifier';

describe('IntentClassifier', () => {
  let classifier: IntentClassifier;

  beforeEach(() => {
    classifier = new IntentClassifier();
  });

  describe('research intent', () => {
    it('should classify "how to implement auth" as research', () => {
      const result = classifier.classify(
        'how to implement authentication in Next.js'
      );
      expect(result.intent).toBe('research');
      expect(result.primaryAgent).toBe('alma-librarian');
      expect(result.shouldOrchestrate).toBe(true);
    });

    it('should classify "best practice for X" as research', () => {
      const result = classifier.classify(
        'what is the best practice for error handling'
      );
      expect(result.intent).toBe('research');
      expect(result.matchedKeywords).toContain('best practice');
    });

    it('should classify "documentation for X" as research', () => {
      const result = classifier.classify('show me the documentation for React hooks');
      expect(result.intent).toBe('research');
    });

    it('should classify comparison queries as research', () => {
      const result = classifier.classify('compare React vs Vue');
      expect(result.intent).toBe('research');
      expect(result.matchedKeywords).toContain('vs');
    });
  });

  describe('codebase intent', () => {
    it('should classify "where is X" as codebase', () => {
      const result = classifier.classify('where is the authentication middleware');
      expect(result.intent).toBe('codebase');
      expect(result.primaryAgent).toBe('alvaro-explore');
    });

    it('should classify "find all uses of" as codebase', () => {
      const result = classifier.classify('find all uses of useAuth hook');
      expect(result.intent).toBe('codebase');
    });

    it('should classify "which files" as codebase', () => {
      const result = classifier.classify('which files contain the login logic');
      expect(result.intent).toBe('codebase');
    });

    it('should classify "search for" as codebase', () => {
      const result = classifier.classify('search for error handling patterns');
      expect(result.intent).toBe('codebase');
    });
  });

  describe('frontend intent', () => {
    it('should classify styling requests as frontend', () => {
      const result = classifier.classify('update the button styling with tailwind');
      expect(result.intent).toBe('frontend');
      expect(result.primaryAgent).toBe('dave-engineer');
    });

    it('should classify component requests as frontend', () => {
      const result = classifier.classify('create a modal component');
      expect(result.intent).toBe('frontend');
    });

    it('should classify layout requests as frontend', () => {
      const result = classifier.classify('make the dashboard layout responsive');
      expect(result.intent).toBe('frontend');
      expect(result.matchedKeywords).toContain('layout');
      expect(result.matchedKeywords).toContain('responsive');
    });

    it('should classify accessibility requests as frontend', () => {
      const result = classifier.classify('improve accessibility of the form');
      expect(result.intent).toBe('frontend');
    });

    it('should classify UI/UX requests as frontend', () => {
      const result = classifier.classify('improve the ui for the settings page');
      expect(result.intent).toBe('frontend');
    });
  });

  describe('debug intent', () => {
    it('should classify "fix error" as debug', () => {
      const result = classifier.classify('fix the authentication error');
      expect(result.intent).toBe('debug');
      expect(result.primaryAgent).toBe('alvaro-explore');
      expect(result.backgroundAgent).toBe('arthas-oracle');
    });

    it('should classify "bug in" as debug', () => {
      const result = classifier.classify('there is a bug in the login flow');
      expect(result.intent).toBe('debug');
    });

    it('should classify "not working" as debug', () => {
      const result = classifier.classify('the form validation is not working');
      expect(result.intent).toBe('debug');
    });

    it('should classify "failing" as debug', () => {
      const result = classifier.classify('tests are failing after the update');
      expect(result.intent).toBe('debug');
    });
  });

  describe('documentation intent', () => {
    it('should classify "document" requests as documentation', () => {
      const result = classifier.classify('document the API endpoints');
      expect(result.intent).toBe('documentation');
      expect(result.primaryAgent).toBe('angeles-writer');
    });

    it('should classify "write readme" as documentation', () => {
      const result = classifier.classify('write a readme for this project');
      expect(result.intent).toBe('documentation');
    });

    it('should classify "explain" as documentation', () => {
      const result = classifier.classify('explain how the auth system works');
      expect(result.intent).toBe('documentation');
    });
  });

  describe('planning intent', () => {
    it('should classify "plan" requests as planning', () => {
      const result = classifier.classify('plan the user authentication feature');
      expect(result.intent).toBe('planning');
      expect(result.primaryAgent).toBe('yoyo-ai');
    });

    it('should classify "design" requests as planning', () => {
      const result = classifier.classify('design the database architecture');
      expect(result.intent).toBe('planning');
    });

    it('should classify "roadmap" requests as planning', () => {
      const result = classifier.classify('create a roadmap for the next release');
      expect(result.intent).toBe('planning');
    });
  });

  describe('implementation intent', () => {
    it('should classify "implement" requests as implementation', () => {
      const result = classifier.classify('implement the user profile page');
      expect(result.intent).toBe('implementation');
      expect(result.primaryAgent).toBe('yoyo-ai');
    });

    it('should classify "build" requests as implementation', () => {
      const result = classifier.classify('build the notification system');
      expect(result.intent).toBe('implementation');
    });

    it('should classify "create" requests as implementation', () => {
      const result = classifier.classify('create a new API endpoint');
      expect(result.intent).toBe('implementation');
    });
  });

  describe('bypass patterns', () => {
    it('should not orchestrate slash commands', () => {
      const result = classifier.classify('/execute-tasks');
      expect(result.shouldOrchestrate).toBe(false);
      expect(result.intent).toBe('general');
    });

    it('should not orchestrate "directly:" prefix', () => {
      const result = classifier.classify('directly: what is TypeScript');
      expect(result.shouldOrchestrate).toBe(false);
    });

    it('should handle case-insensitive "directly:" prefix', () => {
      const result = classifier.classify('DIRECTLY: explain this code');
      expect(result.shouldOrchestrate).toBe(false);
    });

    it('should bypass all slash commands', () => {
      const commands = ['/research', '/status', '/specs', '/create-new'];
      for (const cmd of commands) {
        const result = classifier.classify(cmd);
        expect(result.shouldOrchestrate).toBe(false);
      }
    });
  });

  describe('confidence threshold', () => {
    it('should not orchestrate low confidence matches', () => {
      const highThresholdClassifier = new IntentClassifier({
        confidenceThreshold: 0.9,
      });
      const result = highThresholdClassifier.classify('hello world');
      expect(result.shouldOrchestrate).toBe(false);
    });

    it('should orchestrate when confidence exceeds threshold', () => {
      const lowThresholdClassifier = new IntentClassifier({
        confidenceThreshold: 0.2,
      });
      const result = lowThresholdClassifier.classify('how to implement auth');
      expect(result.shouldOrchestrate).toBe(true);
    });

    it('should return general intent for ambiguous input', () => {
      const result = classifier.classify('hello there');
      expect(result.intent).toBe('general');
      expect(result.shouldOrchestrate).toBe(false);
    });
  });

  describe('performance', () => {
    it('should classify within 10ms', () => {
      const start = performance.now();
      classifier.classify(
        'how to implement authentication with best practices and documentation'
      );
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(10);
    });

    it('should handle long inputs efficiently', () => {
      const longInput =
        'how to implement authentication with best practices '.repeat(50);
      const start = performance.now();
      classifier.classify(longInput);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(10);
    });

    it('should classify 100 inputs within 100ms', () => {
      const inputs = [
        'how to implement auth',
        'fix the bug in login',
        'where is the auth file',
        'style the button with tailwind',
        'document the API',
      ];

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        classifier.classify(inputs[i % inputs.length]);
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => {
      const result = classifier.classify('');
      expect(result.intent).toBe('general');
      expect(result.shouldOrchestrate).toBe(false);
    });

    it('should handle whitespace-only input', () => {
      const result = classifier.classify('   \n\t   ');
      expect(result.intent).toBe('general');
      expect(result.shouldOrchestrate).toBe(false);
    });

    it('should handle special characters', () => {
      const result = classifier.classify('how to implement @auth! #feature');
      expect(result.intent).toBe('research');
    });

    it('should be case insensitive', () => {
      const result1 = classifier.classify('HOW TO IMPLEMENT AUTH');
      const result2 = classifier.classify('how to implement auth');
      expect(result1.intent).toBe(result2.intent);
    });

    it('should handle multiple intents by choosing highest confidence', () => {
      // This input has both research and implementation keywords
      const result = classifier.classify(
        'how to implement and build a feature with best practice'
      );
      // Should pick the one with more keyword matches
      expect(result.shouldOrchestrate).toBe(true);
    });
  });

  describe('keyword matching', () => {
    it('should match partial phrases', () => {
      const result = classifier.classify(
        'what is the best way to handle errors'
      );
      expect(result.matchedKeywords.length).toBeGreaterThan(0);
    });

    it('should return matched keywords', () => {
      const result = classifier.classify('find where is the auth component');
      expect(result.matchedKeywords).toContain('where is');
      expect(result.matchedKeywords).toContain('find');
    });
  });

  describe('shouldBypass method', () => {
    it('should be accessible for external use', () => {
      expect(classifier.shouldBypass('/test')).toBe(true);
      expect(classifier.shouldBypass('directly: test')).toBe(true);
      expect(classifier.shouldBypass('regular input')).toBe(false);
    });
  });
});
