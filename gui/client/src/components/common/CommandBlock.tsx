/**
 * CommandBlock Component
 *
 * Displays CLI commands with copy-to-clipboard functionality.
 */

import { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface CommandBlockProps {
  /** Command string to display */
  command: string;
  /** Optional description */
  description?: string;
  /** Optional language for syntax highlighting */
  language?: string;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Additional className */
  className?: string;
}

export function CommandBlock({
  command,
  description,
  language = 'bash',
  showLineNumbers = false,
  className = '',
}: CommandBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Split command into lines for multi-line display
  const lines = command.split('\n');

  return (
    <div className={`rounded-lg border border-terminal-border bg-terminal-bg-secondary overflow-hidden ${className}`}>
      {/* Header with description */}
      {description && (
        <div className="px-4 py-2 border-b border-terminal-border bg-terminal-bg-tertiary">
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      )}

      {/* Command content */}
      <div className="relative group">
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-2 rounded-md bg-terminal-bg-tertiary hover:bg-terminal-bg-quaternary text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          title={copied ? 'Copied!' : 'Copy to clipboard'}
          aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>

        {/* Code content */}
        <div className="overflow-x-auto">
          <pre className="p-4 text-sm font-mono">
            {lines.map((line, index) => (
              <div key={index} className="flex">
                {showLineNumbers && (
                  <span className="select-none text-gray-600 pr-4 text-right" style={{ minWidth: '2em' }}>
                    {index + 1}
                  </span>
                )}
                <code className="text-terminal-green flex-1">
                  {/* Highlight command prefix */}
                  {line.startsWith('/') ? (
                    <>
                      <span className="text-terminal-orange">{line.split(' ')[0]}</span>
                      <span className="text-gray-300">{' ' + line.split(' ').slice(1).join(' ')}</span>
                    </>
                  ) : line.startsWith('#') ? (
                    <span className="text-gray-500">{line}</span>
                  ) : line.startsWith('$') || line.startsWith('yoyo') ? (
                    <>
                      <span className="text-terminal-cyan">{line.split(' ')[0]}</span>
                      <span className="text-gray-300">{' ' + line.split(' ').slice(1).join(' ')}</span>
                    </>
                  ) : (
                    <span className="text-gray-300">{line}</span>
                  )}
                </code>
              </div>
            ))}
          </pre>
        </div>
      </div>

      {/* Language indicator */}
      <div className="flex items-center justify-between px-4 py-1 border-t border-terminal-border bg-terminal-bg-tertiary">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Terminal className="h-3 w-3" />
          <span>{language}</span>
        </div>
        {copied && (
          <span className="text-xs text-green-400">Copied!</span>
        )}
      </div>
    </div>
  );
}

/**
 * InlineCommand Component
 *
 * Displays a single command inline with copy button.
 */
interface InlineCommandProps {
  command: string;
  className?: string;
}

export function InlineCommand({ command, className = '' }: InlineCommandProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <code className="px-2 py-1 rounded bg-terminal-bg-secondary border border-terminal-border text-sm font-mono text-terminal-orange">
        {command}
      </code>
      <button
        onClick={handleCopy}
        className="p-1 rounded hover:bg-terminal-bg-tertiary text-gray-400 hover:text-white transition-colors"
        title={copied ? 'Copied!' : 'Copy'}
        aria-label={copied ? 'Copied!' : 'Copy command'}
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-400" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </span>
  );
}
