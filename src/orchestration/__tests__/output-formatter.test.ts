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
