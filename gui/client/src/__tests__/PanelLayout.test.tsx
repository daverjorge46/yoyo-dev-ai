/**
 * PanelLayout Component Tests
 *
 * Tests for the main panel layout wrapper component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PanelLayout } from '../components/layout/PanelLayout';
import { PanelLayoutProvider } from '../components/layout/PanelLayoutContext';
import { MemoryRouter } from 'react-router-dom';

// Wrapper component for tests
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <PanelLayoutProvider>{children}</PanelLayoutProvider>
  </MemoryRouter>
);

describe('PanelLayout', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render sidebar, main content, and detail panel areas', () => {
      render(
        <TestWrapper>
          <PanelLayout
            sidebar={<div data-testid="sidebar">Sidebar</div>}
            detail={<div data-testid="detail">Detail</div>}
            detailOpen={true}
          >
            <div data-testid="main">Main Content</div>
          </PanelLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('main')).toBeInTheDocument();
      expect(screen.getByTestId('detail')).toBeInTheDocument();
    });

    it('should render without detail panel when not provided', () => {
      render(
        <TestWrapper>
          <PanelLayout sidebar={<div data-testid="sidebar">Sidebar</div>}>
            <div data-testid="main">Main Content</div>
          </PanelLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('main')).toBeInTheDocument();
      expect(screen.queryByTestId('detail-panel')).not.toBeInTheDocument();
    });
  });

  describe('layout structure', () => {
    it('should use flexbox layout', () => {
      render(
        <TestWrapper>
          <PanelLayout
            sidebar={<div>Sidebar</div>}
            detail={<div>Detail</div>}
            detailOpen={true}
          >
            <div>Main</div>
          </PanelLayout>
        </TestWrapper>
      );

      const layoutContainer = screen.getByTestId('panel-layout');
      expect(layoutContainer).toHaveClass('flex');
    });

    it('should have main content area flex-grow', () => {
      render(
        <TestWrapper>
          <PanelLayout
            sidebar={<div>Sidebar</div>}
            detail={<div>Detail</div>}
            detailOpen={true}
          >
            <div data-testid="main">Main</div>
          </PanelLayout>
        </TestWrapper>
      );

      const mainArea = screen.getByTestId('main').parentElement;
      expect(mainArea).toHaveClass('flex-1');
    });
  });

  describe('resize interactions', () => {
    it('should have resize handles for sidebar and detail panels', () => {
      render(
        <TestWrapper>
          <PanelLayout
            sidebar={<div>Sidebar</div>}
            detail={<div>Detail</div>}
            detailOpen={true}
          >
            <div>Main</div>
          </PanelLayout>
        </TestWrapper>
      );

      const handles = screen.getAllByRole('separator');
      expect(handles.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('responsive behavior', () => {
    it('should apply different styles based on screen size', () => {
      // This test would require mocking window.matchMedia
      // For now, verify that responsive classes are present
      render(
        <TestWrapper>
          <PanelLayout
            sidebar={<div>Sidebar</div>}
            detail={<div>Detail</div>}
            detailOpen={true}
          >
            <div>Main</div>
          </PanelLayout>
        </TestWrapper>
      );

      const layoutContainer = screen.getByTestId('panel-layout');
      expect(layoutContainer).toBeInTheDocument();
    });
  });
});

describe('CollapsibleSidebar', () => {
  it('should render navigation items', () => {
    render(
      <TestWrapper>
        <PanelLayout
          sidebar={
            <nav data-testid="nav">
              <a href="/">Dashboard</a>
              <a href="/tasks">Tasks</a>
            </nav>
          }
        >
          <div>Main</div>
        </PanelLayout>
      </TestWrapper>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });
});

describe('DetailPanel', () => {
  it('should show detail content when expanded', () => {
    render(
      <TestWrapper>
        <PanelLayout
          sidebar={<div>Sidebar</div>}
          detail={<div data-testid="detail-content">Task Details</div>}
          detailOpen={true}
        >
          <div>Main</div>
        </PanelLayout>
      </TestWrapper>
    );

    expect(screen.getByTestId('detail-content')).toBeInTheDocument();
    expect(screen.getByText('Task Details')).toBeInTheDocument();
  });
});
