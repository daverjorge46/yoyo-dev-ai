/**
 * Tests for Orchestration Router
 * @version 6.2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OrchestrationRouter } from '../router';
import { IntentClassification } from '../types';

describe('OrchestrationRouter', () => {
  let router: OrchestrationRouter;

  beforeEach(() => {
    router = new OrchestrationRouter();
  });

  const createClassification = (
    intent: IntentClassification['intent'],
    shouldOrchestrate = true
  ): IntentClassification => ({
    intent,
    confidence: 0.8,
    primaryAgent: null,
    backgroundAgent: null,
    matchedKeywords: [],
    shouldOrchestrate,
  });

  describe('research routing', () => {
    it('should route research to alma-librarian as background task', () => {
      const classification = createClassification('research');
      const result = router.route(classification, 'how to implement auth');

      expect(result.shouldDelegate).toBe(true);
      expect(result.delegationType).toBe('background');
      expect(result.backgroundAgent).toBe('alma-librarian');
      expect(result.primaryAgent).toBeNull();
    });

    it('should include research prompt for background task', () => {
      const classification = createClassification('research');
      const result = router.route(classification, 'how to implement auth');

      expect(result.backgroundPrompt).toContain('Research the following topic');
      expect(result.backgroundPrompt).toContain('[alma-librarian]');
    });

    it('should respect disabled research delegation', () => {
      const disabledRouter = new OrchestrationRouter({
        researchDelegation: { enabled: false, agent: 'alma-librarian', background: true },
      });
      const classification = createClassification('research');
      const result = disabledRouter.route(classification, 'how to implement auth');

      expect(result.shouldDelegate).toBe(false);
    });
  });

  describe('codebase routing', () => {
    it('should route codebase to alvaro-explore as blocking task', () => {
      const classification = createClassification('codebase');
      const result = router.route(classification, 'where is the auth file');

      expect(result.shouldDelegate).toBe(true);
      expect(result.delegationType).toBe('blocking');
      expect(result.primaryAgent).toBe('alvaro-explore');
    });

    it('should include codebase prompt', () => {
      const classification = createClassification('codebase');
      const result = router.route(classification, 'find the auth handler');

      expect(result.agentPrompt).toContain('Search the codebase for');
      expect(result.agentPrompt).toContain('[alvaro-explore]');
    });
  });

  describe('frontend routing', () => {
    it('should route frontend to dave-engineer', () => {
      const classification = createClassification('frontend');
      const result = router.route(classification, 'style the button');

      expect(result.shouldDelegate).toBe(true);
      expect(result.delegationType).toBe('blocking');
      expect(result.primaryAgent).toBe('dave-engineer');
    });

    it('should include frontend prompt with tailwind requirements', () => {
      const classification = createClassification('frontend');
      const result = router.route(classification, 'update the form styling');

      expect(result.agentPrompt).toContain('Tailwind CSS');
      expect(result.agentPrompt).toContain('accessibility');
      expect(result.agentPrompt).toContain('[dave-engineer]');
    });
  });

  describe('debug routing', () => {
    it('should route debug to alvaro-explore', () => {
      const classification = createClassification('debug');
      const result = router.route(classification, 'fix the login error');

      expect(result.shouldDelegate).toBe(true);
      expect(result.primaryAgent).toBe('alvaro-explore');
    });

    it('should include debug prompt with root cause steps', () => {
      const classification = createClassification('debug');
      const result = router.route(classification, 'bug in auth');

      expect(result.agentPrompt).toContain('Debug and fix');
      expect(result.agentPrompt).toContain('root cause');
    });
  });

  describe('documentation routing', () => {
    it('should route documentation to angeles-writer', () => {
      const classification = createClassification('documentation');
      const result = router.route(classification, 'document the API');

      expect(result.shouldDelegate).toBe(true);
      expect(result.primaryAgent).toBe('angeles-writer');
    });

    it('should include background codebase search', () => {
      const classification = createClassification('documentation');
      const result = router.route(classification, 'explain the auth system');

      expect(result.backgroundAgent).toBe('alvaro-explore');
      expect(result.backgroundPrompt).toContain('Find relevant code');
    });
  });

  describe('planning routing', () => {
    it('should route planning to yoyo-ai', () => {
      const classification = createClassification('planning');
      const result = router.route(classification, 'plan the auth feature');

      expect(result.shouldDelegate).toBe(true);
      expect(result.primaryAgent).toBe('yoyo-ai');
    });

    it('should include background research', () => {
      const classification = createClassification('planning');
      const result = router.route(classification, 'design the API');

      expect(result.backgroundAgent).toBe('alma-librarian');
      expect(result.backgroundPrompt).toContain('Research best practices');
    });
  });

  describe('implementation routing', () => {
    it('should route implementation to yoyo-ai', () => {
      const classification = createClassification('implementation');
      const result = router.route(classification, 'implement the auth system');

      expect(result.shouldDelegate).toBe(true);
      expect(result.primaryAgent).toBe('yoyo-ai');
    });

    it('should include TDD approach in prompt', () => {
      const classification = createClassification('implementation');
      const result = router.route(classification, 'build the login page');

      expect(result.agentPrompt).toContain('TDD approach');
      expect(result.agentPrompt).toContain('failing tests');
    });

    it('should include background codebase search', () => {
      const classification = createClassification('implementation');
      const result = router.route(classification, 'add new endpoint');

      expect(result.backgroundAgent).toBe('alvaro-explore');
    });
  });

  describe('bypass handling', () => {
    it('should not delegate when shouldOrchestrate is false', () => {
      const classification = createClassification('research', false);
      const result = router.route(classification, '/research topic');

      expect(result.shouldDelegate).toBe(false);
      expect(result.delegationType).toBe('none');
      expect(result.primaryAgent).toBeNull();
    });

    it('should return no-op for general intent', () => {
      const classification = createClassification('general', false);
      const result = router.route(classification, 'hello');

      expect(result.shouldDelegate).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should allow custom agent configuration', () => {
      const customRouter = new OrchestrationRouter({
        frontendDelegation: {
          enabled: true,
          agent: 'dave-engineer',
        },
      });

      const classification = createClassification('frontend');
      const result = customRouter.route(classification, 'update UI');

      expect(result.primaryAgent).toBe('dave-engineer');
    });

    it('should allow disabling specific delegations', () => {
      const customRouter = new OrchestrationRouter({
        codebaseDelegation: { enabled: false, agent: 'alvaro-explore' },
      });

      const classification = createClassification('codebase');
      const result = customRouter.route(classification, 'find file');

      expect(result.shouldDelegate).toBe(false);
    });

    it('should expose configuration via getConfig', () => {
      const config = router.getConfig();

      expect(config.frontendDelegation.enabled).toBe(true);
      expect(config.researchDelegation.background).toBe(true);
      expect(config.failureEscalation.afterFailures).toBe(3);
    });
  });

  describe('prompt building', () => {
    it('should include user input in prompts', () => {
      const classification = createClassification('codebase');
      const userInput = 'find the authentication middleware';
      const result = router.route(classification, userInput);

      expect(result.agentPrompt).toContain(userInput);
    });

    it('should include agent prefix instruction in all prompts', () => {
      const intents: IntentClassification['intent'][] = [
        'research',
        'codebase',
        'frontend',
        'debug',
        'documentation',
        'planning',
        'implementation',
      ];

      for (const intent of intents) {
        const classification = createClassification(intent);
        const result = router.route(classification, 'test input');

        const prompt = result.agentPrompt || result.backgroundPrompt;
        expect(prompt).toContain('Prefix all output with [');
      }
    });
  });
});
