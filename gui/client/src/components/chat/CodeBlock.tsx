/**
 * CodeBlock Component
 *
 * Renders code with syntax highlighting and a copy button.
 * Uses react-syntax-highlighter with Prism theme.
 *
 * Accessibility:
 * - Copy button with clear aria-label
 * - Visual feedback on copy action
 */

import { useState, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface CodeBlockProps {
  /** Code content to display */
  code: string;
  /** Programming language for syntax highlighting */
  language?: string;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function CodeBlock({
  code,
  language = 'text',
  showLineNumbers = false,
  className = '',
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }, [code]);

  return (
    <div
      className={`
        relative group rounded-lg overflow-hidden
        bg-gray-900 dark:bg-gray-950
        ${className}
      `.trim()}
    >
      {/* Header with language label and copy button */}
      <div
        className="
          flex items-center justify-between
          px-4 py-2
          bg-gray-800 dark:bg-gray-900
          border-b border-gray-700 dark:border-gray-800
        "
      >
        {/* Language label */}
        <span className="text-xs font-medium text-gray-400">
          {language}
        </span>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="
            flex items-center gap-1.5
            px-2 py-1 rounded
            text-xs font-medium
            text-gray-400 hover:text-gray-200
            bg-gray-700/50 hover:bg-gray-700
            transition-colors duration-150
          "
          aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        showLineNumbers={showLineNumbers}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'transparent',
          fontSize: '0.875rem',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export default CodeBlock;
