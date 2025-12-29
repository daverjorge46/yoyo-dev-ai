/**
 * DetailPanel Component
 *
 * Right-side panel for displaying detailed content.
 * Used for task details, file previews, agent logs, etc.
 *
 * Features:
 * - Header with title and close button
 * - Scrollable content area
 * - Optional footer actions
 */

import { X } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface DetailPanelProps {
  /** Panel title */
  title?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Close button handler */
  onClose: () => void;
  /** Panel content */
  children: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

// =============================================================================
// Component
// =============================================================================

export function DetailPanel({
  title,
  subtitle,
  onClose,
  children,
  footer,
  className = '',
  'data-testid': testId = 'detail-panel',
}: DetailPanelProps) {
  return (
    <div
      className={`
        h-full flex flex-col
        bg-white dark:bg-gray-800
        border-l border-gray-200 dark:border-gray-700
        ${className}
      `.trim()}
      data-testid={testId}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex-1 min-w-0">
          {title && (
            <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {subtitle}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="
            ml-2 p-1.5 rounded-lg
            text-gray-500 hover:text-gray-700
            dark:text-gray-400 dark:hover:text-gray-200
            hover:bg-gray-100 dark:hover:bg-gray-700
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          "
          aria-label="Close panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">{children}</div>

      {/* Footer (optional) */}
      {footer && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          {footer}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Empty State Component
// =============================================================================

export interface DetailPanelEmptyProps {
  /** Message to display */
  message?: string;
  /** Icon to display */
  icon?: React.ReactNode;
}

export function DetailPanelEmpty({
  message = 'Select an item to view details',
  icon,
}: DetailPanelEmptyProps) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center">
        {icon && (
          <div className="mb-3 text-gray-300 dark:text-gray-600">{icon}</div>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}
