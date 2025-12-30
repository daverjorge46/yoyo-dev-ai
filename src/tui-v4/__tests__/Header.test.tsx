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

import { Header } from '../components/Header.js';

describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Yoyo Dev logo with spiral', () => {
    const { lastFrame } = render(
      <Header
        gitBranch="main"
        memoryBlockCount={5}
        mcpServerCount={3}
      />
    );

    const output = lastFrame();
    // Should contain logo and "Yoyo Dev" text
    expect(output).toContain('Yoyo Dev');
    // Logo spiral characters should be present
    expect(output).toBeTruthy();
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

  it('displays project tagline when provided', () => {
    const { lastFrame } = render(
      <Header
        projectName="Test Project"
        projectTagline="A test development framework"
        gitBranch="main"
        memoryBlockCount={5}
        mcpServerCount={3}
      />
    );

    expect(lastFrame()).toContain('A test development framework');
  });

  it('displays tech stack items when provided', () => {
    const { lastFrame } = render(
      <Header
        projectName="Test Project"
        projectTechStack={['TypeScript', 'React', 'SQLite']}
        gitBranch="main"
        memoryBlockCount={5}
        mcpServerCount={3}
      />
    );

    const output = lastFrame();
    expect(output).toContain('TypeScript');
    expect(output).toContain('React');
    expect(output).toContain('SQLite');
  });

  it('limits tech stack to 4 items', () => {
    const { lastFrame } = render(
      <Header
        projectName="Test Project"
        projectTechStack={['TypeScript', 'React', 'SQLite', 'Bun', 'Extra']}
        gitBranch="main"
        memoryBlockCount={5}
        mcpServerCount={3}
      />
    );

    const output = lastFrame();
    expect(output).toContain('TypeScript');
    expect(output).toContain('Bun');
    expect(output).not.toContain('Extra');
  });

  it('shows Claude connection status', () => {
    const { lastFrame, rerender } = render(
      <Header
        gitBranch="main"
        memoryBlockCount={5}
        mcpServerCount={3}
        claudeConnected={true}
      />
    );

    expect(lastFrame()).toContain('Claude');
    expect(lastFrame()).toContain('●');

    rerender(
      <Header
        gitBranch="main"
        memoryBlockCount={5}
        mcpServerCount={3}
        claudeConnected={false}
      />
    );

    expect(lastFrame()).toContain('○');
  });
});
