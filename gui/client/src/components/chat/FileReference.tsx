/**
 * FileReference Component
 *
 * Displays a clickable file path reference with optional line number.
 * Used in chat responses to link to specific files in the codebase.
 *
 * Accessibility:
 * - Keyboard accessible button
 * - Clear file path display
 */

import { FileCode, ExternalLink } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface FileReferenceProps {
  /** Full file path */
  path: string;
  /** Optional line number */
  lineNumber?: number;
  /** Optional end line for range */
  endLineNumber?: number;
  /** Click handler */
  onClick?: (path: string, lineNumber?: number) => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract filename from path
 */
function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

/**
 * Get parent directory path (shortened)
 */
function getParentPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 1) return '';

  // Remove filename
  parts.pop();

  // Show at most 3 parent dirs
  const displayParts = parts.slice(-3);
  const prefix = parts.length > 3 ? '.../' : '';

  return prefix + displayParts.join('/') + '/';
}

// =============================================================================
// Component
// =============================================================================

export function FileReference({
  path,
  lineNumber,
  endLineNumber,
  onClick,
  className = '',
}: FileReferenceProps) {
  const fileName = getFileName(path);
  const parentPath = getParentPath(path);

  const handleClick = () => {
    onClick?.(path, lineNumber);
  };

  // Format line reference
  const lineRef = lineNumber
    ? endLineNumber
      ? `L${lineNumber}-L${endLineNumber}`
      : `L${lineNumber}`
    : null;

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center gap-1.5
        px-2 py-1 rounded
        text-sm font-mono
        bg-gray-100 dark:bg-gray-800
        text-indigo-600 dark:text-indigo-400
        hover:bg-indigo-50 dark:hover:bg-indigo-900/30
        hover:text-indigo-700 dark:hover:text-indigo-300
        transition-colors duration-150
        max-w-full
        ${className}
      `.trim()}
      aria-label={`Open file ${fileName}${lineNumber ? ` at line ${lineNumber}` : ''}`}
    >
      {/* File icon */}
      <FileCode className="h-4 w-4 flex-shrink-0" />

      {/* Path display */}
      <span className="truncate">
        {parentPath && (
          <span className="text-gray-500 dark:text-gray-500">
            {parentPath}
          </span>
        )}
        <span className="font-medium">{fileName}</span>
      </span>

      {/* Line number */}
      {lineRef && (
        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
          {lineRef}
        </span>
      )}

      {/* External link indicator */}
      <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
    </button>
  );
}

export default FileReference;
