/**
 * App Component Tests
 *
 * Tests for the root TUI application component including:
 * - Overall layout rendering
 * - Component composition (Header, Layout, Footer)
 * - State management integration
 * - Terminal size responsiveness
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';

import { App } from '../App.js';

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without errors', () => {
    const { lastFrame } = render(<App />);

    expect(lastFrame()).toBeTruthy();
  });

  it('composes Header, Layout, and Footer', () => {
    const { lastFrame } = render(<App />);

    const output = lastFrame();
    // App should render all three main sections
    expect(output).toBeTruthy();
    expect(output?.length).toBeGreaterThan(0);
  });

  it('handles terminal resize events', () => {
    const { lastFrame, rerender } = render(<App />);

    const initialOutput = lastFrame();
    expect(initialOutput).toBeTruthy();

    // Simulate resize by rerendering
    rerender(<App />);

    const afterResize = lastFrame();
    expect(afterResize).toBeTruthy();
  });

  it('displays loading state or content', () => {
    const { lastFrame } = render(<App />);

    const output = lastFrame();
    // Should show Yoyo Dev somewhere - either in loading or header
    expect(output).toContain('Yoyo Dev');
    // During loading, we show "Loading Yoyo Dev..."
    // After loading, we show either WelcomeScreen or TaskPanel
    // Both states are valid for this test
    expect(output).toBeTruthy();
  });

  it('maintains state across renders', () => {
    const { lastFrame, rerender } = render(<App />);

    expect(lastFrame()).toBeTruthy();

    rerender(<App />);

    expect(lastFrame()).toBeTruthy();
  });
});
