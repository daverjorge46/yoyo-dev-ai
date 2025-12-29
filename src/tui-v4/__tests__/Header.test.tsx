/**
 * Header Component Tests
 *
 * Tests for the top bar component including:
 * - Project name display
 * - Git branch display
 * - Memory status (block count)
 * - MCP server count
 * - Proper formatting and layout
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Header } from '../components/Header.js';

describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders project name from config', () => {
    const { lastFrame } = render(
      <Header
        projectName="yoyo-dev"
        gitBranch="main"
        memoryBlockCount={5}
        mcpServerCount={3}
      />
    );

    expect(lastFrame()).toContain('yoyo-dev');
  });

  it('displays git branch name', () => {
    const { lastFrame } = render(
      <Header
        projectName="yoyo-dev"
        gitBranch="feature/tui-rewrite"
        memoryBlockCount={5}
        mcpServerCount={3}
      />
    );

    expect(lastFrame()).toContain('feature/tui-rewrite');
  });

  it('shows memory block count', () => {
    const { lastFrame } = render(
      <Header
        projectName="yoyo-dev"
        gitBranch="main"
        memoryBlockCount={12}
        mcpServerCount={3}
      />
    );

    expect(lastFrame()).toContain('12');
  });

  it('displays MCP server count', () => {
    const { lastFrame } = render(
      <Header
        projectName="yoyo-dev"
        gitBranch="main"
        memoryBlockCount={5}
        mcpServerCount={4}
      />
    );

    expect(lastFrame()).toContain('4');
  });

  it('handles missing git branch gracefully', () => {
    const { lastFrame } = render(
      <Header
        projectName="yoyo-dev"
        gitBranch={null}
        memoryBlockCount={5}
        mcpServerCount={3}
      />
    );

    const output = lastFrame();
    expect(output).toContain('yoyo-dev');
    // Should still render without errors
    expect(output).toBeTruthy();
  });

  it('handles zero memory blocks', () => {
    const { lastFrame } = render(
      <Header
        projectName="yoyo-dev"
        gitBranch="main"
        memoryBlockCount={0}
        mcpServerCount={3}
      />
    );

    expect(lastFrame()).toContain('0');
  });

  it('handles zero MCP servers', () => {
    const { lastFrame } = render(
      <Header
        projectName="yoyo-dev"
        gitBranch="main"
        memoryBlockCount={5}
        mcpServerCount={0}
      />
    );

    expect(lastFrame()).toContain('0');
  });

  it('updates when props change', () => {
    const { lastFrame, rerender } = render(
      <Header
        projectName="yoyo-dev"
        gitBranch="main"
        memoryBlockCount={5}
        mcpServerCount={3}
      />
    );

    expect(lastFrame()).toContain('main');

    rerender(
      <Header
        projectName="yoyo-dev"
        gitBranch="develop"
        memoryBlockCount={10}
        mcpServerCount={5}
      />
    );

    const output = lastFrame();
    expect(output).toContain('develop');
    expect(output).toContain('10');
    expect(output).toContain('5');
  });
});
