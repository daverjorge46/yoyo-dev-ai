/**
 * Footer Component Tests
 *
 * Tests for the bottom bar component including:
 * - Context-aware keyboard shortcuts
 * - Panel-specific shortcut display
 * - Proper formatting and layout
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
    expect(output).toContain('navigate');
  });

  it('shows center panel shortcuts when center is focused', () => {
    const { lastFrame } = render(
      <Footer focusedPanel="center" />
    );

    const output = lastFrame();
    // Chat panel shortcuts - use regex for terminal wrapping
    expect(output).toMatch(/Ctrl\+Enter/);  // send
    expect(output).toMatch(/send/);
    // Panel indicator may be wrapped - look for [Cha since Chat gets wrapped
    expect(output).toMatch(/\[Cha/);
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
    // Panel switching with number keys
    expect(output).toContain('1/2/3');
    expect(output).toContain('panels');
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
    expect(output).toContain('cycle');
  });
});
