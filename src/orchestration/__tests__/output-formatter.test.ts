/**
 * Tests for Output Formatter
 * @version 6.1.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OutputFormatter } from '../output-formatter';
import { AgentName } from '../types';

describe('OutputFormatter', () => {
  let formatter: OutputFormatter;

  beforeEach(() => {
    formatter = new OutputFormatter();
  });

  describe('format', () => {
    it('should add prefix to single line message', () => {
      const result = formatter.format('yoyo-ai', 'Processing request');
      expect(result).toContain('[yoyo-ai]');
      expect(result).toContain('Processing request');
    });

    it('should add prefix to each line of multi-line message', () => {
      const message = 'Line 1\nLine 2\nLine 3';
      const result = formatter.format('yoyo-ai', message);
      const lines = result.split('\n');

      expect(lines).toHaveLength(3);
      for (const line of lines) {
        expect(line).toContain('[yoyo-ai]');
      }
    });

    it('should not add prefix when showPrefixes is false', () => {
      const noPrefix = new OutputFormatter({ showPrefixes: false });
      const result = noPrefix.format('yoyo-ai', 'Test message');

      expect(result).toBe('Test message');
      expect(result).not.toContain('[yoyo-ai]');
    });

    it('should use correct colors for each agent', () => {
      const agents: AgentName[] = [
        'yoyo-ai',
        'arthas-oracle',
        'alma-librarian',
        'alvaro-explore',
        'dave-engineer',
        'angeles-writer',
      ];

      for (const agent of agents) {
        const result = formatter.format(agent, 'Test');
        expect(result).toContain(`[${agent}]`);
        expect(result).toContain('\x1b['); // ANSI escape
      }
    });
  });

  describe('formatTransition', () => {
    it('should format transition from one agent to another', () => {
      const result = formatter.formatTransition(
        'yoyo-ai',
        'dave-engineer',
        'Frontend work detected'
      );

      expect(result).toContain('[dave-engineer]');
      expect(result).toContain('Delegating from');
      expect(result).toContain('Frontend work detected');
    });

    it('should format initial transition (no from agent)', () => {
      const result = formatter.formatTransition(
        null,
        'yoyo-ai',
        'Starting processing'
      );

      expect(result).toContain('[yoyo-ai]');
      expect(result).toContain('Starting processing');
      expect(result).not.toContain('Delegating from');
    });
  });

  describe('formatBackgroundComplete', () => {
    it('should format background completion message', () => {
      const result = formatter.formatBackgroundComplete(
        'alma-librarian',
        'Found 5 relevant documents'
      );

      expect(result).toContain('[alma-librarian]');
      expect(result).toContain('[Background Complete]');
      expect(result).toContain('Found 5 relevant documents');
    });
  });

  describe('formatIntentAnnouncement', () => {
    it('should format intent with agent delegation', () => {
      const result = formatter.formatIntentAnnouncement(
        'research',
        0.85,
        'alma-librarian'
      );

      expect(result).toContain('[yoyo-ai]');
      expect(result).toContain('Intent: research');
      expect(result).toContain('85%');
      expect(result).toContain('Delegating to alma-librarian');
    });

    it('should format intent without delegation', () => {
      const result = formatter.formatIntentAnnouncement('general', 0.4, null);

      expect(result).toContain('[yoyo-ai]');
      expect(result).toContain('Processing directly');
    });
  });

  describe('formatPhaseAnnouncement', () => {
    it('should format phase announcement', () => {
      const result = formatter.formatPhaseAnnouncement(
        'Phase 1',
        'Codebase Assessment'
      );

      expect(result).toContain('[yoyo-ai]');
      expect(result).toContain('Phase 1');
      expect(result).toContain('Codebase Assessment');
    });
  });

  describe('formatProgress', () => {
    it('should format progress update', () => {
      const result = formatter.formatProgress(3, 5, 'Implementing auth service');

      expect(result).toContain('[yoyo-ai]');
      expect(result).toContain('[3/5]');
      expect(result).toContain('Implementing auth service');
    });
  });

  describe('formatError', () => {
    it('should format error without attempts', () => {
      const result = formatter.formatError('yoyo-ai', 'Test failed');

      expect(result).toContain('[yoyo-ai]');
      expect(result).toContain('Error:');
      expect(result).toContain('Test failed');
    });

    it('should format error with attempt count', () => {
      const result = formatter.formatError('yoyo-ai', 'Test failed', 2, 3);

      expect(result).toContain('(attempt 2/3)');
    });
  });

  describe('formatEscalation', () => {
    it('should format escalation message', () => {
      const result = formatter.formatEscalation(
        'yoyo-ai',
        'arthas-oracle',
        '3 consecutive failures'
      );

      expect(result).toContain('[yoyo-ai]');
      expect(result).toContain('Escalating to arthas-oracle');
      expect(result).toContain('3 consecutive failures');
    });
  });

  describe('formatSuccess', () => {
    it('should format success message with checkmark', () => {
      const result = formatter.formatSuccess('yoyo-ai', 'All tests passing');

      expect(result).toContain('[yoyo-ai]');
      expect(result).toContain('✓');
      expect(result).toContain('All tests passing');
    });
  });

  describe('getPlainPrefix', () => {
    it('should return plain prefix without colors', () => {
      const result = formatter.getPlainPrefix('yoyo-ai');

      expect(result).toBe('[yoyo-ai]');
      expect(result).not.toContain('\x1b[');
    });
  });

  describe('hasPrefix', () => {
    it('should detect existing prefix', () => {
      expect(formatter.hasPrefix('[yoyo-ai] Test message')).toBe(true);
      expect(formatter.hasPrefix('[alma-librarian] Research result')).toBe(true);
    });

    it('should not detect false positives', () => {
      expect(formatter.hasPrefix('Test message without prefix')).toBe(false);
      expect(formatter.hasPrefix('Array [1, 2, 3]')).toBe(false);
    });
  });

  describe('stripPrefix', () => {
    it('should remove existing prefix', () => {
      const result = formatter.stripPrefix('[yoyo-ai] Test message');
      expect(result).toBe('Test message');
    });

    it('should handle message without prefix', () => {
      const result = formatter.stripPrefix('No prefix here');
      expect(result).toBe('No prefix here');
    });
  });

  describe('configuration', () => {
    it('should allow custom colors', () => {
      const customFormatter = new OutputFormatter({
        colors: {
          'yoyo-ai': '\x1b[31m', // Red
          'arthas-oracle': '\x1b[32m',
          'alma-librarian': '\x1b[33m',
          'alvaro-explore': '\x1b[34m',
          'dave-engineer': '\x1b[35m',
          'angeles-writer': '\x1b[36m',
        },
      });

      const result = customFormatter.format('yoyo-ai', 'Test');
      expect(result).toContain('\x1b[31m'); // Red
    });

    it('should expose config via getConfig', () => {
      const config = formatter.getConfig();
      expect(config.showPrefixes).toBe(true);
      expect(config.colors).toBeDefined();
    });

    it('should allow updating config via setConfig', () => {
      formatter.setConfig({ showPrefixes: false });
      const config = formatter.getConfig();
      expect(config.showPrefixes).toBe(false);
    });
  });

  describe('formatRoutingContext', () => {
    it('should format routing context with intent announcement and agent instructions', () => {
      const classification = {
        intent: 'codebase' as const,
        confidence: 0.85,
        primaryAgent: 'alvaro-explore' as const,
        backgroundAgent: null,
        matchedKeywords: ['find', 'where'],
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

      const result = formatter.formatRoutingContext(classification, routing);

      expect(result).toContain('[yoyo-ai]');
      expect(result).toContain('Intent: codebase');
      expect(result).toContain('0.85');
      expect(result).toContain('alvaro-explore');
      expect(result).toContain('ORCHESTRATION CONTEXT:');
    });

    it('should include agent-specific instructions', () => {
      const classification = {
        intent: 'frontend' as const,
        confidence: 0.9,
        primaryAgent: 'dave-engineer' as const,
        backgroundAgent: null,
        matchedKeywords: ['style', 'button'],
        shouldOrchestrate: true,
      };

      const routing = {
        shouldDelegate: true,
        delegationType: 'blocking' as const,
        primaryAgent: 'dave-engineer' as const,
        backgroundAgent: null,
        agentPrompt: null,
        backgroundPrompt: null,
      };

      const result = formatter.formatRoutingContext(classification, routing);

      expect(result).toContain('dave-engineer');
      expect(result).toContain('UI');
    });

    it('should request agent prefix in response when showPrefixes is true', () => {
      const classification = {
        intent: 'research' as const,
        confidence: 0.75,
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

      const result = formatter.formatRoutingContext(classification, routing);

      expect(result).toContain('[alma-librarian]');
      expect(result).toContain('Prefix');
    });

    it('should not include prefix instruction when showPrefixes is false', () => {
      const noPrefixFormatter = new OutputFormatter({ showPrefixes: false });

      const classification = {
        intent: 'debug' as const,
        confidence: 0.8,
        primaryAgent: 'alvaro-explore' as const,
        backgroundAgent: null,
        matchedKeywords: ['error'],
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

      const result = noPrefixFormatter.formatRoutingContext(classification, routing);

      expect(result).toContain('ORCHESTRATION CONTEXT:');
      expect(result).not.toContain('Prefix');
    });

    it('should end with delimiter for clean separation', () => {
      const classification = {
        intent: 'general' as const,
        confidence: 0.5,
        primaryAgent: 'yoyo-ai' as const,
        backgroundAgent: null,
        matchedKeywords: [],
        shouldOrchestrate: true,
      };

      const routing = {
        shouldDelegate: false,
        delegationType: 'none' as const,
        primaryAgent: 'yoyo-ai' as const,
        backgroundAgent: null,
        agentPrompt: null,
        backgroundPrompt: null,
      };

      const result = formatter.formatRoutingContext(classification, routing);

      expect(result).toMatch(/---\s*$/);
    });

    it('should handle all agent types with appropriate instructions', () => {
      const agents: Array<{ agent: AgentName; keywords: string[] }> = [
        { agent: 'yoyo-ai', keywords: ['orchestrat', 'coordinat'] },
        { agent: 'arthas-oracle', keywords: ['strateg', 'architect'] },
        { agent: 'alma-librarian', keywords: ['research', 'document'] },
        { agent: 'alvaro-explore', keywords: ['search', 'codebase'] },
        { agent: 'dave-engineer', keywords: ['UI', 'frontend'] },
        { agent: 'angeles-writer', keywords: ['document', 'writ'] },
      ];

      for (const { agent, keywords } of agents) {
        const classification = {
          intent: 'general' as const,
          confidence: 0.8,
          primaryAgent: agent,
          backgroundAgent: null,
          matchedKeywords: [],
          shouldOrchestrate: true,
        };

        const routing = {
          shouldDelegate: true,
          delegationType: 'blocking' as const,
          primaryAgent: agent,
          backgroundAgent: null,
          agentPrompt: null,
          backgroundPrompt: null,
        };

        const result = formatter.formatRoutingContext(classification, routing);

        expect(result).toContain(agent);
        // At least one keyword should appear in the instructions
        const hasKeyword = keywords.some((kw) =>
          result.toLowerCase().includes(kw.toLowerCase())
        );
        expect(hasKeyword).toBe(true);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty message', () => {
      const result = formatter.format('yoyo-ai', '');
      expect(result).toContain('[yoyo-ai]');
    });

    it('should handle message with only newlines', () => {
      const result = formatter.format('yoyo-ai', '\n\n');
      const lines = result.split('\n');
      expect(lines.length).toBe(3);
    });

    it('should preserve special characters in message', () => {
      const message = 'Test with special: $var, `code`, *bold*';
      const result = formatter.format('yoyo-ai', message);
      expect(result).toContain(message);
    });
  });
});
