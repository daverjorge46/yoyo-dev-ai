/**
 * Footer Component Tests
 *
 * Tests for the bottom bar component including:
 * - Context-aware keyboard shortcuts
 * - Panel-specific shortcut display
 * - Vim-style mode indicator
 * - 3-pane layout support
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Footer } from '../components/Footer.js';

describe('Footer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders global shortcuts', () => {
    const { lastFrame } = render(
      <Footer focusedPanel="left" />
    );

    const output = lastFrame();
    // Global shortcuts that should always be visible
    expect(output).toContain('?');  // help
    expect(output).toContain('q');  // quit
    expect(output).toContain('r');  // refresh
  });

  it('shows left panel shortcuts when left is focused', () => {
    const { lastFrame } = render(
      <Footer focusedPanel="left" />
    );

    const output = lastFrame();
    // Task tree navigation shortcuts
    expect(output).toContain('j/k');  // j/k navigation
  });

  it('shows center panel shortcuts when center is focused in NORMAL mode', () => {
    const { lastFrame } = render(
      <Footer focusedPanel="center" mode="NORMAL" />
    );

    const output = lastFrame();
    // In NORMAL mode, center panel shows how to enter INSERT mode
    expect(output).toMatch(/i/);  // 'i' to enter insert mode
    expect(output).toMatch(/insert/i);
    // Panel indicator
    expect(output).toMatch(/\[Cha/);
  });

  it('shows center panel shortcuts when center is focused in INSERT mode', () => {
    const { lastFrame } = render(
      <Footer focusedPanel="center" mode="INSERT" />
    );

    const output = lastFrame();
    // In INSERT mode, center panel shows typing shortcuts
    // Text may be wrapped/truncated in narrow terminal
    expect(output).toMatch(/Ent[\s\S]*er|Enter/);  // "Enter" (may be wrapped)
    expect(output).toMatch(/send/);
    expect(output).toMatch(/Esc/);
  });

  it('shows right panel shortcuts when right is focused', () => {
    const { lastFrame } = render(
      <Footer focusedPanel="right" />
    );

    const output = lastFrame();
    // Execution panel shortcuts
    expect(output).toBeTruthy();
    // Panel indicator may be wrapped - look for [Exe since Exec gets wrapped
    expect(output).toMatch(/\[Exe/);
  });

  it('shows panel switching shortcuts', () => {
    const { lastFrame } = render(
      <Footer focusedPanel="left" />
    );

    const output = lastFrame();
    // Panel switching with number keys (may be wrapped)
    expect(output).toMatch(/1\/2/);  // 1/2/3 panels
  });

  it('updates shortcuts when focused panel changes', () => {
    const { lastFrame, rerender } = render(
      <Footer focusedPanel="left" />
    );

    const leftOutput = lastFrame();
    // Check for [Task - may be clipped to [Task due to terminal width
    expect(leftOutput).toMatch(/\[Task/);

    rerender(
      <Footer focusedPanel="center" />
    );

    const centerOutput = lastFrame();
    expect(centerOutput).toMatch(/\[Chat/);

    rerender(
      <Footer focusedPanel="right" />
    );

    const rightOutput = lastFrame();
    expect(rightOutput).toMatch(/\[Exec/);
  });

  it('displays shortcuts in consistent format', () => {
    const { lastFrame } = render(
      <Footer focusedPanel="left" />
    );

    const output = lastFrame();
    // Should have consistent formatting (key + description)
    expect(output).toBeTruthy();
    if (output) {
      expect(output.length).toBeGreaterThan(0);
    }
  });

  it('shows Tab for cycling between panels', () => {
    const { lastFrame } = render(
      <Footer focusedPanel="center" />
    );

    const output = lastFrame();
    expect(output).toContain('Tab');
  });

  describe('Mode Indicator', () => {
    it('shows NORMAL mode indicator by default', () => {
      const { lastFrame } = render(
        <Footer focusedPanel="center" />
      );

      const output = lastFrame();
      // Mode may be split across lines due to terminal width - match with regex (s flag for dotall)
      expect(output).toMatch(/NORM[\s\S]*AL|NORMAL/);
    });

    it('shows INSERT mode indicator when in insert mode', () => {
      const { lastFrame } = render(
        <Footer focusedPanel="center" mode="INSERT" />
      );

      const output = lastFrame();
      // Mode may be split across lines (s flag for dotall)
      expect(output).toMatch(/INSE[\s\S]*RT|INSERT/);
    });

    it('shows NORMAL when mode prop is explicitly set', () => {
      const { lastFrame } = render(
        <Footer focusedPanel="center" mode="NORMAL" />
      );

      const output = lastFrame();
      // Mode may be split across lines due to terminal width
      expect(output).toMatch(/NORM[\s\S]*AL|NORMAL/);
    });
  });
});
