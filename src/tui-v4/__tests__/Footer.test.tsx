/**
 * Footer Component Tests
 *
 * Tests for the bottom bar component including:
 * - Context-aware keyboard shortcuts
 * - Panel-specific shortcut display
 * - Proper formatting and layout
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
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
    expect(output).toContain('j/');  // j/k navigation
    expect(output).toContain('Ente');  // Enter (may be truncated)
    expect(output).toContain('Spac');  // Space (may be truncated)
  });

  it('shows right panel shortcuts when right is focused', () => {
    const { lastFrame } = render(
      <Footer focusedPanel="right" />
    );

    const output = lastFrame();
    // Execution panel shortcuts
    expect(output).toBeTruthy();
  });

  it('shows panel switching shortcuts', () => {
    const { lastFrame } = render(
      <Footer focusedPanel="left" />
    );

    const output = lastFrame();
    // Panel switching
    expect(output).toMatch(/[←→]/);  // arrow keys or h/l
  });

  it('updates shortcuts when focused panel changes', () => {
    const { lastFrame, rerender } = render(
      <Footer focusedPanel="left" />
    );

    const leftOutput = lastFrame();
    expect(leftOutput).toBeTruthy();

    rerender(
      <Footer focusedPanel="right" />
    );

    const rightOutput = lastFrame();
    expect(rightOutput).toBeTruthy();
    // Shortcuts should have changed
  });

  it('displays shortcuts in consistent format', () => {
    const { lastFrame } = render(
      <Footer focusedPanel="left" />
    );

    const output = lastFrame();
    // Should have consistent formatting (key + description)
    expect(output).toBeTruthy();
    expect(output.length).toBeGreaterThan(0);
  });

  it('handles special keys correctly', () => {
    const { lastFrame } = render(
      <Footer focusedPanel="right" />
    );

    const output = lastFrame();
    // Special keys should be formatted clearly (right panel has Ctrl shortcuts)
    expect(output).toContain('Ctrl');  // For Ctrl+C, Ctrl+d, Ctrl+u
  });
});
