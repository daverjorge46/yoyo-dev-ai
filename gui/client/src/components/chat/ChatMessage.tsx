/**
 * ChatMessage Component
 *
 * Displays a single chat message from user or assistant.
 * Supports markdown rendering, code blocks, and file references.
 *
 * Accessibility:
 * - Proper role attributes
 * - Time displayed in accessible format
 * - Collapsible content for long messages
 */

import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import type { Components } from 'react-markdown';

// =============================================================================
// Types
// =============================================================================

export interface ChatMessageProps {
  /** Message role - user or assistant */
  role: 'user' | 'assistant';
  /** Message content (supports markdown for assistant) */
  content: string;
  /** Optional timestamp */
  timestamp?: Date;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Character threshold for collapsible content */
const COLLAPSE_THRESHOLD = 800;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Format timestamp for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =============================================================================
// Markdown Components
// =============================================================================

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const isInline = !match;

    if (isInline) {
      return (
        <code
          className="
            px-1.5 py-0.5 rounded
            bg-gray-200 dark:bg-gray-700
            text-gray-800 dark:text-gray-200
            text-sm font-mono
          "
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <CodeBlock
        code={String(children).replace(/\n$/, '')}
        language={match[1]}
        className="my-3"
      />
    );
  },
  pre({ children }) {
    // Let code component handle pre content
    return <>{children}</>;
  },
  p({ children }) {
    return (
      <p className="mb-2 last:mb-0 leading-relaxed">
        {children}
      </p>
    );
  },
  ul({ children }) {
    return (
      <ul className="list-disc list-inside mb-2 space-y-1">
        {children}
      </ul>
    );
  },
  ol({ children }) {
    return (
      <ol className="list-decimal list-inside mb-2 space-y-1">
        {children}
      </ol>
    );
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>;
  },
  a({ href, children }) {
    return (
      <a
        href={href}
        className="text-indigo-600 dark:text-indigo-400 underline hover:no-underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  },
  strong({ children }) {
    return <strong className="font-semibold">{children}</strong>;
  },
  blockquote({ children }) {
    return (
      <blockquote
        className="
          border-l-4 border-gray-300 dark:border-gray-600
          pl-4 py-1 my-2
          text-gray-600 dark:text-gray-400
          italic
        "
      >
        {children}
      </blockquote>
    );
  },
  h1({ children }) {
    return <h1 className="text-xl font-bold mb-2 mt-4 first:mt-0">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h3>;
  },
};

// =============================================================================
// Component
// =============================================================================

export function ChatMessage({
  role,
  content,
  timestamp,
  className = '',
}: ChatMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isLongMessage = content.length > COLLAPSE_THRESHOLD;
  const shouldCollapse = isLongMessage && role === 'assistant' && !isExpanded;

  // Truncate content for collapsed state
  const displayContent = useMemo(() => {
    if (shouldCollapse) {
      // Find a good break point (end of sentence or paragraph)
      const truncated = content.slice(0, COLLAPSE_THRESHOLD);
      const lastPeriod = truncated.lastIndexOf('.');
      const lastNewline = truncated.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);

      return breakPoint > COLLAPSE_THRESHOLD / 2
        ? truncated.slice(0, breakPoint + 1)
        : truncated;
    }
    return content;
  }, [content, shouldCollapse]);

  const isUser = role === 'user';

  return (
    <div
      data-testid={`chat-message-${role}`}
      className={`
        flex gap-3
        ${isUser ? 'flex-row-reverse' : ''}
        ${className}
      `.trim()}
    >
      {/* Avatar */}
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-full
          flex items-center justify-center
          ${isUser
            ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }
        `}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Message content */}
      <div
        className={`
          flex-1 max-w-[85%]
          ${isUser ? 'text-right' : ''}
        `}
      >
        {/* Message bubble */}
        <div
          className={`
            inline-block px-4 py-3 rounded-lg
            ${isUser
              ? 'bg-indigo-600 text-white rounded-tr-none'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none'
            }
            ${isUser ? '' : 'text-left'}
          `}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {displayContent}
              </ReactMarkdown>

              {/* Collapse/expand indicator */}
              {isLongMessage && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="
                    flex items-center gap-1 mt-2
                    text-xs font-medium
                    text-indigo-600 dark:text-indigo-400
                    hover:text-indigo-700 dark:hover:text-indigo-300
                  "
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? 'Show less' : 'Show more'}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      <span>Show less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      <span>Show more</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <div
            className={`
              mt-1 text-xs text-gray-500 dark:text-gray-400
              ${isUser ? 'text-right' : 'text-left'}
            `}
          >
            <time dateTime={timestamp.toISOString()}>
              {formatTime(timestamp)}
            </time>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
