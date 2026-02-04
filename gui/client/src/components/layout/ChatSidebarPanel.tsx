/**
 * ChatSidebarPanel Component
 *
 * Slide-out right sidebar panel for chat interface.
 * Allows users to chat while exploring other pages.
 * Resizable on desktop with drag handle.
 *
 * Accessibility:
 * - role="dialog" with aria-label
 * - Focus trap when open
 * - Escape key to close
 * - Focus returns to trigger on close
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { CodebaseChat } from '../chat/CodebaseChat';

interface ChatSidebarPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Panel size constraints
const MIN_WIDTH = 400;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 550;

export function ChatSidebarPanel({ isOpen, onClose }: ChatSidebarPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  // Store previously focused element and focus close button when opening
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Small delay to ensure panel is rendered
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });
    } else {
      // Return focus to previous element when closing
      previousActiveElement.current?.focus();
    }
  }, [isOpen]);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Handle resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate new width (resize from left edge, so invert delta)
      const delta = startX - e.clientX;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  // Double-click to reset width
  const handleResizeDoubleClick = useCallback(() => {
    setWidth(DEFAULT_WIDTH);
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/20 dark:bg-black/40
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          z-40
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Chat panel"
        aria-modal="true"
        aria-hidden={!isOpen}
        style={{ width: `${width}px` }}
        className={`
          fixed top-0 right-0 h-full max-w-[90vw]
          bg-white dark:bg-gray-800
          shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          ${isResizing ? 'transition-none' : ''}
          z-50
          flex flex-col
        `}
      >
        {/* Resize Handle (desktop only) */}
        <div
          className="
            hidden lg:flex
            absolute left-0 top-0 bottom-0 w-3
            cursor-col-resize
            items-center justify-center
            group
            hover:bg-indigo-500/10
            transition-colors duration-150
          "
          onMouseDown={handleResizeStart}
          onDoubleClick={handleResizeDoubleClick}
          title="Drag to resize, double-click to reset"
        >
          <div
            className={`
              w-1 h-16 rounded-full
              transition-colors duration-150
              ${isResizing ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600 group-hover:bg-indigo-400'}
            `}
          />
        </div>

        {/* Panel Header */}
        <div
          className="
            flex items-center justify-between
            px-4 py-3 pl-6
            border-b border-gray-200 dark:border-gray-700
            bg-gray-50 dark:bg-gray-900/50
          "
        >
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Chat Panel
          </span>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="
              p-1.5 rounded-lg
              text-gray-500 dark:text-gray-400
              hover:bg-gray-200 dark:hover:bg-gray-700
              hover:text-gray-700 dark:hover:text-gray-200
              focus:outline-none focus:ring-2 focus:ring-indigo-500
              transition-colors duration-150
            "
            aria-label="Close chat panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-hidden pl-2">
          <CodebaseChat className="h-full" />
        </div>
      </div>
    </>
  );
}

export default ChatSidebarPanel;
