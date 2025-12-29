/**
 * ResizablePanel Component
 *
 * A panel with a draggable resize handle.
 * Supports left/right positioning, keyboard controls, and collapse states.
 *
 * Accessibility:
 * - Uses separator role for resize handle
 * - Supports arrow key resize
 * - Home key resets to default
 */

import { useCallback, useRef, useEffect, useState } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface ResizablePanelProps {
  /** Which side of the layout this panel is on */
  side: 'left' | 'right';
  /** Current width in pixels */
  width: number;
  /** Minimum allowed width */
  minWidth: number;
  /** Maximum allowed width */
  maxWidth: number;
  /** Whether the panel is collapsed */
  collapsed: boolean;
  /** Width when collapsed (icon-only mode) */
  collapsedWidth?: number;
  /** Callback when width changes during resize */
  onWidthChange: (width: number) => void;
  /** Callback for double-click (reset to default) */
  onDoubleClick?: () => void;
  /** Panel content */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

// =============================================================================
// Constants
// =============================================================================

const KEYBOARD_STEP = 10; // Pixels to move per arrow key press

// =============================================================================
// Component
// =============================================================================

export function ResizablePanel({
  side,
  width,
  minWidth,
  maxWidth,
  collapsed,
  collapsedWidth = 56,
  onWidthChange,
  onDoubleClick,
  children,
  className = '',
  'data-testid': testId,
}: ResizablePanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  // Calculate effective width based on collapsed state
  const effectiveWidth = collapsed ? collapsedWidth : width;

  // ---------------------------------------------------------------------------
  // Mouse Drag Handling
  // ---------------------------------------------------------------------------

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Prevent resize when collapsed
      if (collapsed) return;

      e.preventDefault();
      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartWidth.current = width;
    },
    [collapsed, width]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartX.current;
      // For left panel: drag right = increase width
      // For right panel: drag left = increase width
      const newWidth =
        side === 'left'
          ? dragStartWidth.current + deltaX
          : dragStartWidth.current - deltaX;

      // Clamp to bounds
      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      onWidthChange(clampedWidth);
    },
    [isDragging, side, minWidth, maxWidth, onWidthChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove global mouse listeners during drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // ---------------------------------------------------------------------------
  // Keyboard Handling
  // ---------------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (collapsed) return;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          // For left panel: right = increase; for right panel: right = decrease
          if (side === 'left') {
            onWidthChange(Math.min(width + KEYBOARD_STEP, maxWidth));
          } else {
            onWidthChange(Math.max(width - KEYBOARD_STEP, minWidth));
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          // For left panel: left = decrease; for right panel: left = increase
          if (side === 'left') {
            onWidthChange(Math.max(width - KEYBOARD_STEP, minWidth));
          } else {
            onWidthChange(Math.min(width + KEYBOARD_STEP, maxWidth));
          }
          break;
        case 'Home':
          e.preventDefault();
          onDoubleClick?.();
          break;
      }
    },
    [collapsed, side, width, minWidth, maxWidth, onWidthChange, onDoubleClick]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      ref={panelRef}
      className={`
        relative flex-shrink-0 overflow-hidden
        transition-[width] duration-200 ease-out
        ${className}
      `.trim()}
      style={{ width: effectiveWidth }}
      data-testid={testId}
    >
      {/* Panel content */}
      <div className="h-full overflow-hidden">{children}</div>

      {/* Resize handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={width}
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        aria-label={`Resize ${side} panel`}
        tabIndex={0}
        className={`
          absolute top-0 bottom-0 w-1 z-10
          ${side === 'left' ? 'right-0' : 'left-0'}
          ${collapsed ? 'cursor-default' : 'cursor-col-resize'}
          ${isDragging ? 'bg-indigo-500' : 'bg-transparent hover:bg-gray-300 dark:hover:bg-gray-600'}
          transition-colors duration-150
          focus:outline-none focus:bg-indigo-500
        `.trim()}
        onMouseDown={handleMouseDown}
        onDoubleClick={onDoubleClick}
        onKeyDown={handleKeyDown}
      >
        {/* Visual indicator */}
        <div
          className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-1 h-8 rounded-full
            ${isDragging ? 'bg-indigo-400' : 'bg-gray-400 dark:bg-gray-500'}
            opacity-0 group-hover:opacity-100 hover:opacity-100
            transition-opacity duration-150
          `.trim()}
        />
      </div>
    </div>
  );
}
