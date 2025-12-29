/**
 * ChangelogPreview Component
 *
 * Renders changelog content with markdown formatting.
 * Includes optional copy-to-clipboard functionality.
 */

import { useState } from 'react';
import { Copy, Check, FileText, Loader2 } from 'lucide-react';
import { MarkdownPreview } from '../MarkdownPreview';

// =============================================================================
// Types
// =============================================================================

interface ChangelogPreviewProps {
  content: string;
  isLoading?: boolean;
  showCopyButton?: boolean;
  onCopy?: () => void;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ChangelogPreview({
  content,
  isLoading = false,
  showCopyButton = false,
  onCopy,
  className = '',
}: ChangelogPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy?.();

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`
          flex flex-col items-center justify-center
          h-64 p-8
          bg-gray-50 dark:bg-gray-900
          border border-gray-200 dark:border-gray-700
          rounded-lg
          ${className}
        `}
      >
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Generating changelog...
        </p>
      </div>
    );
  }

  // Empty state
  if (!content) {
    return (
      <div
        className={`
          flex flex-col items-center justify-center
          h-64 p-8
          bg-gray-50 dark:bg-gray-900
          border border-gray-200 dark:border-gray-700
          rounded-lg
          ${className}
        `}
      >
        <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          No changelog generated yet.
          <br />
          Click "Generate" to create a changelog.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`
        relative
        border border-gray-200 dark:border-gray-700
        rounded-lg
        overflow-hidden
        ${className}
      `}
    >
      {/* Copy button */}
      {showCopyButton && (
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={handleCopy}
            className="
              flex items-center gap-1.5
              px-2.5 py-1.5
              text-xs font-medium
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-600
              rounded-md
              text-gray-600 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-700
              hover:text-gray-900 dark:hover:text-white
              transition-colors
              shadow-sm
            "
            aria-label={copied ? 'Copied' : 'Copy to clipboard'}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      )}

      {/* Markdown content */}
      <div className="max-h-96 overflow-auto">
        <MarkdownPreview content={content} />
      </div>
    </div>
  );
}
