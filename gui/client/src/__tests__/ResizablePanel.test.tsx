/**
 * ResizablePanel Component Tests
 *
 * Tests for the resizable panel with drag handle functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResizablePanel } from '../components/layout/ResizablePanel';

describe('ResizablePanel', () => {
  const defaultProps = {
    side: 'left' as const,
    width: 240,
    minWidth: 180,
    maxWidth: 400,
    collapsed: false,
    onWidthChange: vi.fn(),
    onDoubleClick: vi.fn(),
    children: <div data-testid="panel-content">Panel Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render children content', () => {
      render(<ResizablePanel {...defaultProps} />);

      expect(screen.getByTestId('panel-content')).toBeInTheDocument();
      expect(screen.getByText('Panel Content')).toBeInTheDocument();
    });

    it('should apply correct width when not collapsed', () => {
      const { container } = render(<ResizablePanel {...defaultProps} width={280} />);

      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveStyle({ width: '280px' });
    });

    it('should apply collapsed width when collapsed', () => {
      const { container } = render(
        <ResizablePanel {...defaultProps} collapsed={true} collapsedWidth={56} />
      );

      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveStyle({ width: '56px' });
    });

    it('should render resize handle', () => {
      render(<ResizablePanel {...defaultProps} />);

      expect(screen.getByRole('separator')).toBeInTheDocument();
    });

    it('should position resize handle on right for left-side panel', () => {
      render(<ResizablePanel {...defaultProps} side="left" />);

      const handle = screen.getByRole('separator');
      expect(handle).toHaveClass('right-0');
    });

    it('should position resize handle on left for right-side panel', () => {
      render(<ResizablePanel {...defaultProps} side="right" />);

      const handle = screen.getByRole('separator');
      expect(handle).toHaveClass('left-0');
    });
  });

  describe('resize handle interactions', () => {
    it('should call onWidthChange during drag', () => {
      const onWidthChange = vi.fn();
      render(<ResizablePanel {...defaultProps} onWidthChange={onWidthChange} />);

      const handle = screen.getByRole('separator');

      // Start drag
      fireEvent.mouseDown(handle, { clientX: 240 });

      // Move mouse
      fireEvent.mouseMove(document, { clientX: 300 });

      // End drag
      fireEvent.mouseUp(document);

      expect(onWidthChange).toHaveBeenCalled();
    });

    it('should call onDoubleClick when handle is double-clicked', () => {
      const onDoubleClick = vi.fn();
      render(<ResizablePanel {...defaultProps} onDoubleClick={onDoubleClick} />);

      const handle = screen.getByRole('separator');
      fireEvent.doubleClick(handle);

      expect(onDoubleClick).toHaveBeenCalledTimes(1);
    });

    it('should not allow resizing when collapsed', () => {
      const onWidthChange = vi.fn();
      render(
        <ResizablePanel
          {...defaultProps}
          collapsed={true}
          onWidthChange={onWidthChange}
        />
      );

      const handle = screen.getByRole('separator');

      fireEvent.mouseDown(handle, { clientX: 56 });
      fireEvent.mouseMove(document, { clientX: 200 });
      fireEvent.mouseUp(document);

      expect(onWidthChange).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have correct aria attributes on resize handle', () => {
      render(<ResizablePanel {...defaultProps} />);

      const handle = screen.getByRole('separator');
      expect(handle).toHaveAttribute('aria-orientation', 'vertical');
      expect(handle).toHaveAttribute('aria-valuenow', '240');
      expect(handle).toHaveAttribute('aria-valuemin', '180');
      expect(handle).toHaveAttribute('aria-valuemax', '400');
    });

    it('should support keyboard resize with arrow keys', () => {
      const onWidthChange = vi.fn();
      render(<ResizablePanel {...defaultProps} onWidthChange={onWidthChange} />);

      const handle = screen.getByRole('separator');
      handle.focus();

      // Press right arrow (increase width for left panel)
      fireEvent.keyDown(handle, { key: 'ArrowRight' });
      expect(onWidthChange).toHaveBeenCalledWith(250); // +10

      onWidthChange.mockClear();

      // Press left arrow (decrease width for left panel)
      fireEvent.keyDown(handle, { key: 'ArrowLeft' });
      expect(onWidthChange).toHaveBeenCalledWith(230); // -10
    });

    it('should reset on Home key press', () => {
      const onDoubleClick = vi.fn();
      render(<ResizablePanel {...defaultProps} onDoubleClick={onDoubleClick} />);

      const handle = screen.getByRole('separator');
      handle.focus();

      fireEvent.keyDown(handle, { key: 'Home' });
      expect(onDoubleClick).toHaveBeenCalled();
    });
  });

  describe('cursor styling', () => {
    it('should show resize cursor on hover', () => {
      render(<ResizablePanel {...defaultProps} />);

      const handle = screen.getByRole('separator');
      expect(handle).toHaveClass('cursor-col-resize');
    });

    it('should show default cursor when collapsed', () => {
      render(<ResizablePanel {...defaultProps} collapsed={true} />);

      const handle = screen.getByRole('separator');
      expect(handle).toHaveClass('cursor-default');
    });
  });
});
