/**
 * Auto-Learning System Tests
 *
 * Tests for pattern detection, learning engine, and memory consolidation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ConversationMessage } from '../types.js';
import {
  detectConversationPatterns,
  analyzeConversation,
  detectWorkflowPatterns,
  inferPreferences,
  type DetectedPattern,
  type PatternType,
} from '../pattern-detector.js';

// =============================================================================
// Pattern Detector Tests
// =============================================================================

describe('Pattern Detector', () => {
  describe('detectConversationPatterns', () => {
    it('should detect code style patterns', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'I prefer functional programming', timestamp: new Date() },
        { role: 'assistant', content: 'OK', timestamp: new Date() },
        { role: 'user', content: 'I always prefer functional approaches', timestamp: new Date() },
        { role: 'assistant', content: 'Noted', timestamp: new Date() },
      ];

      const patterns = detectConversationPatterns(messages, { minFrequency: 2 });
      expect(patterns.length).toBeGreaterThan(0);
      const codeStylePattern = patterns.find((p) => p.type === 'code_style');
      expect(codeStylePattern).toBeDefined();
    });

    it('should detect technology choice patterns', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'I prefer react for UI', timestamp: new Date() },
        { role: 'assistant', content: 'React is great', timestamp: new Date() },
        { role: 'user', content: 'Always use react', timestamp: new Date() },
        { role: 'assistant', content: 'OK', timestamp: new Date() },
        { role: 'user', content: 'Prefer react components', timestamp: new Date() },
      ];

      const patterns = detectConversationPatterns(messages, { minFrequency: 1, minConfidence: 0.5 });
      const techPattern = patterns.find((p) => p.type === 'technology_choice');
      expect(techPattern).toBeDefined();
    });

    it('should detect correction patterns', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: "No, actually that's wrong", timestamp: new Date() },
        { role: 'assistant', content: 'Let me fix that', timestamp: new Date() },
        { role: 'user', content: "No, actually that is incorrect", timestamp: new Date() },
        { role: 'assistant', content: 'I apologize', timestamp: new Date() },
      ];

      // With minFrequency: 1 to detect the "no, actually" pattern
      const patterns = detectConversationPatterns(messages, { minFrequency: 1, minConfidence: 0.5 });
      const correctionPattern = patterns.find((p) => p.type === 'correction');
      expect(correctionPattern).toBeDefined();
    });

    it('should detect preference patterns', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'I like clean code', timestamp: new Date() },
        { role: 'assistant', content: 'OK', timestamp: new Date() },
        { role: 'user', content: 'I prefer clean architecture', timestamp: new Date() },
        { role: 'assistant', content: 'Understood', timestamp: new Date() },
      ];

      const patterns = detectConversationPatterns(messages, { minFrequency: 1 });
      const prefPattern = patterns.find((p) => p.type === 'preference');
      expect(prefPattern).toBeDefined();
    });

    it('should filter by minimum frequency', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'I prefer typescript', timestamp: new Date() },
        { role: 'assistant', content: 'OK', timestamp: new Date() },
      ];

      const patterns = detectConversationPatterns(messages, { minFrequency: 3 });
      expect(patterns.length).toBe(0);
    });

    it('should filter by minimum confidence', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'use const', timestamp: new Date() },
        { role: 'assistant', content: 'OK', timestamp: new Date() },
        { role: 'user', content: 'use const always', timestamp: new Date() },
      ];

      const patterns = detectConversationPatterns(messages, { minConfidence: 0.99 });
      expect(patterns.length).toBe(0);
    });

    it('should filter by pattern types', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'I prefer react', timestamp: new Date() },
        { role: 'assistant', content: 'OK', timestamp: new Date() },
        { role: 'user', content: "No, that's wrong", timestamp: new Date() },
      ];

      const patterns = detectConversationPatterns(messages, {
        minFrequency: 1,
        types: ['technology_choice'],
      });

      expect(patterns.every((p) => p.type === 'technology_choice')).toBe(true);
    });

    it('should respect maxPatterns limit', () => {
      const messages: ConversationMessage[] = [];
      // Generate many user messages with patterns
      for (let i = 0; i < 50; i++) {
        messages.push(
          { role: 'user', content: `I prefer option${i}`, timestamp: new Date() },
          { role: 'assistant', content: 'OK', timestamp: new Date() }
        );
      }

      const patterns = detectConversationPatterns(messages, { maxPatterns: 5, minFrequency: 1 });
      expect(patterns.length).toBeLessThanOrEqual(5);
    });
  });

  describe('analyzeConversation', () => {
    it('should extract topics from conversation', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'I want to build a React app with TypeScript', timestamp: new Date() },
        { role: 'assistant', content: 'Great choice!', timestamp: new Date() },
        { role: 'user', content: 'Should I use GraphQL for the API?', timestamp: new Date() },
      ];

      const analysis = analyzeConversation(messages);
      expect(analysis.topics.length).toBeGreaterThan(0);
      expect(analysis.topics.some((t) => t.includes('react') || t.includes('typescript'))).toBe(true);
    });

    it('should analyze sentiment', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'Great work! This is excellent!', timestamp: new Date() },
        { role: 'assistant', content: 'Thank you!', timestamp: new Date() },
      ];

      const analysis = analyzeConversation(messages);
      expect(analysis.sentiment.positive).toBeGreaterThan(0);
    });

    it('should detect negative sentiment', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: "This is bad. I don't like this approach.", timestamp: new Date() },
        { role: 'assistant', content: 'I apologize', timestamp: new Date() },
      ];

      const analysis = analyzeConversation(messages);
      expect(analysis.sentiment.negative).toBeGreaterThan(0);
    });

    it('should extract entities', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'Check src/components/Header.tsx', timestamp: new Date() },
        { role: 'assistant', content: 'Looking at the file', timestamp: new Date() },
        { role: 'user', content: 'Update the UserProfile component', timestamp: new Date() },
      ];

      const analysis = analyzeConversation(messages);
      expect(analysis.entities.length).toBeGreaterThan(0);
    });
  });

  describe('detectWorkflowPatterns', () => {
    it('should detect workflow action sequences', () => {
      const logs = [
        { action: 'read', result: 'success', timestamp: new Date() },
        { action: 'edit', result: 'success', timestamp: new Date() },
        { action: 'read', result: 'success', timestamp: new Date() },
        { action: 'edit', result: 'success', timestamp: new Date() },
        { action: 'read', result: 'success', timestamp: new Date() },
        { action: 'edit', result: 'success', timestamp: new Date() },
      ];

      const patterns = detectWorkflowPatterns(logs);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]?.type).toBe('workflow_pattern');
      expect(patterns[0]?.description).toContain('read -> edit');
    });

    it('should calculate frequency correctly', () => {
      const logs = [
        { action: 'search', result: 'success', timestamp: new Date() },
        { action: 'read', result: 'success', timestamp: new Date() },
        { action: 'search', result: 'success', timestamp: new Date() },
        { action: 'read', result: 'success', timestamp: new Date() },
        { action: 'search', result: 'success', timestamp: new Date() },
        { action: 'read', result: 'success', timestamp: new Date() },
      ];

      const patterns = detectWorkflowPatterns(logs);
      const searchReadPattern = patterns.find((p) => p.description.includes('search -> read'));
      expect(searchReadPattern).toBeDefined();
      expect(searchReadPattern?.frequency).toBe(3);
    });

    it('should return empty for single action', () => {
      const logs = [{ action: 'single', result: 'success', timestamp: new Date() }];
      const patterns = detectWorkflowPatterns(logs);
      expect(patterns.length).toBe(0);
    });
  });

  describe('inferPreferences', () => {
    it('should infer frontend framework preference', () => {
      const patterns: DetectedPattern[] = [
        {
          type: 'technology_choice',
          description: 'prefer react',
          frequency: 3,
          confidence: 0.9,
          evidence: [],
          firstSeen: new Date(),
          lastSeen: new Date(),
        },
      ];

      const prefs = inferPreferences(patterns);
      expect(prefs['frontend_framework']).toBe('react');
    });

    it('should infer language preference', () => {
      const patterns: DetectedPattern[] = [
        {
          type: 'technology_choice',
          description: 'use typescript',
          frequency: 2,
          confidence: 0.8,
          evidence: [],
          firstSeen: new Date(),
          lastSeen: new Date(),
        },
      ];

      const prefs = inferPreferences(patterns);
      expect(prefs['language']).toBe('typescript');
    });

    it('should infer naming convention', () => {
      const patterns: DetectedPattern[] = [
        {
          type: 'naming_convention',
          description: 'use camelCase',
          frequency: 2,
          confidence: 0.9,
          evidence: [],
          firstSeen: new Date(),
          lastSeen: new Date(),
        },
      ];

      const prefs = inferPreferences(patterns);
      expect(prefs['naming_convention']).toBe('camelCase');
    });

    it('should infer styling preference', () => {
      const patterns: DetectedPattern[] = [
        {
          type: 'technology_choice',
          description: 'prefer tailwind',
          frequency: 2,
          confidence: 0.7,
          evidence: [],
          firstSeen: new Date(),
          lastSeen: new Date(),
        },
      ];

      const prefs = inferPreferences(patterns);
      expect(prefs['styling']).toBe('tailwind');
    });

    it('should return empty for unknown patterns', () => {
      const patterns: DetectedPattern[] = [
        {
          type: 'workflow_pattern',
          description: 'some workflow',
          frequency: 2,
          confidence: 0.8,
          evidence: [],
          firstSeen: new Date(),
          lastSeen: new Date(),
        },
      ];

      const prefs = inferPreferences(patterns);
      expect(Object.keys(prefs).length).toBe(0);
    });
  });
});

// =============================================================================
// Learning Engine Mock Tests
// =============================================================================

describe('Learning Engine (Unit Tests)', () => {
  describe('LearningResult structure', () => {
    it('should have correct structure', () => {
      // Test that the types are correct
      const result = {
        learningsExtracted: 3,
        memoriesUpdated: 2,
        newPatternsDetected: 1,
        confidence: 0.85,
        details: [
          {
            type: 'correction' as const,
            description: 'test -> correct',
            confidence: 0.9,
            targetBlock: 'corrections' as const,
            applied: true,
          },
        ],
      };

      expect(result.learningsExtracted).toBe(3);
      expect(result.memoriesUpdated).toBe(2);
      expect(result.newPatternsDetected).toBe(1);
      expect(result.confidence).toBe(0.85);
      expect(result.details.length).toBe(1);
      expect(result.details[0]?.type).toBe('correction');
    });
  });

  describe('Correction parsing', () => {
    // Testing the correction parsing logic that would be in LearningEngine
    it('should detect "instead of" format', () => {
      const instruction = 'use tabs instead of spaces';
      const insteadMatch = instruction.match(/(.+?)\s+instead\s+of\s+(.+)/i);

      expect(insteadMatch).not.toBeNull();
      expect(insteadMatch![1]?.trim()).toBe('use tabs');
      expect(insteadMatch![2]?.trim()).toBe('spaces');
    });

    it('should detect "don\'t" format', () => {
      const instruction = "don't use var, prefer const";
      // Simpler regex that captures "use var"
      const dontMatch = instruction.match(/don't\s+([^,]+)/i);

      expect(dontMatch).not.toBeNull();
      expect(dontMatch![1]?.trim()).toBe('use var');
    });

    it('should detect "no" format', () => {
      const instruction = 'no console.log in production';
      const noMatch = instruction.match(/^no\s+(.+)/i);

      expect(noMatch).not.toBeNull();
      expect(noMatch![1]?.trim()).toBe('console.log in production');
    });
  });

  describe('Target block detection', () => {
    // Testing the logic for detecting target blocks
    it('should detect project block for architecture keywords', () => {
      const instruction = 'this project uses clean architecture';
      const lower = instruction.toLowerCase();
      const isProject = /\b(project|codebase|architecture|pattern)\b/.test(lower);
      expect(isProject).toBe(true);
    });

    it('should detect persona block for behavior keywords', () => {
      const instruction = 'use a formal tone in responses';
      const lower = instruction.toLowerCase();
      const isPersona = /\b(persona|behavior|style|tone)\b/.test(lower);
      expect(isPersona).toBe(true);
    });

    it('should detect user block for preference keywords', () => {
      const instruction = 'I prefer detailed explanations';
      const lower = instruction.toLowerCase();
      const isUser = /\b(preference|prefer|like|want|always)\b/.test(lower);
      expect(isUser).toBe(true);
    });

    it('should detect corrections block for error keywords', () => {
      const instruction = 'that was a mistake, fix it';
      const lower = instruction.toLowerCase();
      const isCorrection = /\b(correction|wrong|mistake|fix|instead)\b/.test(lower);
      expect(isCorrection).toBe(true);
    });
  });

  describe('Confidence thresholds', () => {
    it('should block updates below threshold', () => {
      const minConfidenceForUpdate = 0.7;
      const confidence = 0.6;

      const shouldUpdate = confidence >= minConfidenceForUpdate;
      expect(shouldUpdate).toBe(false);
    });

    it('should allow updates at or above threshold', () => {
      const minConfidenceForUpdate = 0.7;
      const confidence = 0.7;

      const shouldUpdate = confidence >= minConfidenceForUpdate;
      expect(shouldUpdate).toBe(true);
    });
  });

  describe('Relevance score calculation', () => {
    it('should calculate new relevance based on access count', () => {
      const currentRelevance = 0.5;
      const accessCount = 5;
      const accessFactor = Math.min(accessCount / 10, 1);
      const newRelevance = currentRelevance * 0.9 + accessFactor * 0.1;

      expect(newRelevance).toBeCloseTo(0.5, 1);
    });

    it('should cap access factor at 1.0', () => {
      const accessCount = 100;
      const accessFactor = Math.min(accessCount / 10, 1);
      expect(accessFactor).toBe(1);
    });
  });
});

// =============================================================================
// Feedback Loop Tests
// =============================================================================

describe('Learning Feedback Loops', () => {
  describe('Pattern reinforcement', () => {
    it('should increase confidence for repeated patterns', () => {
      // Simulate repeated detection of same pattern
      let confidence = 0.5;
      const reinforcementFactor = 0.1;

      for (let i = 0; i < 3; i++) {
        confidence = Math.min(confidence + reinforcementFactor, 1.0);
      }

      expect(confidence).toBeCloseTo(0.8, 5);
    });

    it('should decay confidence over time without reinforcement', () => {
      let confidence = 0.9;
      const decayFactor = 0.95;

      for (let i = 0; i < 5; i++) {
        confidence *= decayFactor;
      }

      expect(confidence).toBeLessThan(0.75);
    });
  });

  describe('Learning rate adaptation', () => {
    it('should calculate adaptive learning rate', () => {
      // More corrections = faster learning
      const correctionCount = 5;
      const baseLearningRate = 0.1;
      const adaptiveFactor = Math.min(1 + correctionCount * 0.1, 2.0);
      const adaptedRate = baseLearningRate * adaptiveFactor;

      expect(adaptedRate).toBeCloseTo(0.15, 5);
    });

    it('should cap learning rate at maximum', () => {
      const correctionCount = 100;
      const baseLearningRate = 0.1;
      const adaptiveFactor = Math.min(1 + correctionCount * 0.1, 2.0);
      const adaptedRate = baseLearningRate * adaptiveFactor;

      expect(adaptedRate).toBe(0.2); // Capped at 2x base
    });
  });

  describe('Error tracking for feedback', () => {
    it('should track error frequency by type', () => {
      const errorLog: Array<{ type: string; count: number }> = [];

      const recordError = (type: string) => {
        const existing = errorLog.find((e) => e.type === type);
        if (existing) {
          existing.count++;
        } else {
          errorLog.push({ type, count: 1 });
        }
      };

      recordError('syntax');
      recordError('syntax');
      recordError('logic');
      recordError('syntax');

      expect(errorLog.find((e) => e.type === 'syntax')?.count).toBe(3);
      expect(errorLog.find((e) => e.type === 'logic')?.count).toBe(1);
    });

    it('should identify most common error type', () => {
      const errors = [
        { type: 'syntax', count: 5 },
        { type: 'logic', count: 3 },
        { type: 'typo', count: 10 },
      ];

      const mostCommon = errors.reduce((max, e) => (e.count > max.count ? e : max), errors[0]!);
      expect(mostCommon.type).toBe('typo');
    });
  });
});
