/**
 * InputArea Component Tests
 *
 * Tests for the chat input component including:
 * - Focus behavior (vim-style - should NOT auto-focus)
 * - Controlled focus via prop
 * - Input handling
 * - Escape to blur
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';

import { InputArea } from '../components/chat/InputArea.js';

describe('InputArea Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Focus Behavior', () => {
    it('should NOT auto-focus on mount (vim-style)', () => {
      const onFocus = vi.fn();
      const onSubmit = vi.fn();

      render(<InputArea onSubmit={onSubmit} onFocus={onFocus} />);

      // onFocus should NOT be called on mount - user must press 'i' to enter insert mode
      expect(onFocus).not.toHaveBeenCalled();
    });

    it('should NOT focus when focus prop is undefined (default)', () => {
      const onFocus = vi.fn();
      const onSubmit = vi.fn();

      render(<InputArea onSubmit={onSubmit} onFocus={onFocus} />);

      // Without explicit focus={true}, should not trigger onFocus
      expect(onFocus).not.toHaveBeenCalled();
    });

    it('should not focus when focus prop is explicitly false', () => {
      const onFocus = vi.fn();
      const onSubmit = vi.fn();

      render(<InputArea onSubmit={onSubmit} onFocus={onFocus} focus={false} />);

      expect(onFocus).not.toHaveBeenCalled();
    });
  });

  describe('Input Handling', () => {
    it('renders without errors', () => {
      const { lastFrame } = render(<InputArea onSubmit={vi.fn()} />);

      expect(lastFrame()).toBeTruthy();
    });

    it('shows placeholder text', () => {
      const { lastFrame } = render(
        <InputArea onSubmit={vi.fn()} placeholder="Type here..." />
      );

      // The placeholder should be visible in the output
      expect(lastFrame()).toContain('Type here...');
    });

    it('shows loading state when isLoading is true', () => {
      const { lastFrame } = render(
        <InputArea onSubmit={vi.fn()} isLoading={true} />
      );

      expect(lastFrame()).toContain('thinking');
    });

    it('shows disconnected warning when isConnected is false', () => {
      const { lastFrame } = render(
        <InputArea onSubmit={vi.fn()} isConnected={false} />
      );

      expect(lastFrame()).toContain('not connected');
    });
  });

  describe('Keyboard Hints', () => {
    it('shows Enter to send hint', () => {
      const { lastFrame } = render(<InputArea onSubmit={vi.fn()} />);

      expect(lastFrame()).toContain('Enter');
      expect(lastFrame()).toContain('send');
    });

    it('shows Esc to exit hint', () => {
      const { lastFrame } = render(<InputArea onSubmit={vi.fn()} />);

      expect(lastFrame()).toContain('Esc');
      expect(lastFrame()).toContain('exit');
    });
  });

  describe('Character Limit', () => {
    it('shows character count', () => {
      const { lastFrame } = render(
        <InputArea onSubmit={vi.fn()} maxLength={1000} />
      );

      // Should show /1000 for max length
      expect(lastFrame()).toContain('/1000');
    });

    it('uses default maxLength of 10000', () => {
      const { lastFrame } = render(<InputArea onSubmit={vi.fn()} />);

      expect(lastFrame()).toContain('/10000');
    });
  });
});
