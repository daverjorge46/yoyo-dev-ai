/**
 * TerminalOutput Component
 *
 * Renders terminal output with ANSI color support, auto-scroll,
 * and search functionality.
 */

import { useEffect, useRef, useState, memo } from 'react';
import {
  ArrowDown,
  Search,
  X,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { TerminalOutputLine } from '../../hooks/useTerminalStream';
import { parseAnsiToClasses } from '../../hooks/useTerminalStream';

// =============================================================================
// Types
// =============================================================================

export interface TerminalOutputProps {
  /** Output lines to display */
  lines: TerminalOutputLine[];
  /** Whether auto-scroll is enabled */
  autoScroll: boolean;
  /** Toggle auto-scroll */
  onAutoScrollChange: (value: boolean) => void;
  /** Clear output callback */
  onClear?: () => void;
  /** Whether actively streaming */
  isStreaming?: boolean;
  /** Max height of the output area */
  maxHeight?: string;
}

// =============================================================================
// OutputLine Component (memoized for performance)
// =============================================================================

const OutputLine = memo(function OutputLine({
  line,
  isHighlighted,
}: {
  line: TerminalOutputLine;
  isHighlighted: boolean;
}) {
  const segments = parseAnsiToClasses(line.content);

  return (
    <div
      className={`
        px-3 py-0.5 font-mono text-sm whitespace-pre-wrap break-all
        ${line.type === 'stderr' ? 'bg-terminal-red/10' : ''}
        ${line.type === 'system' ? 'text-terminal-text-muted italic' : ''}
        ${isHighlighted ? 'bg-terminal-yellow/20' : ''}
      `}
    >
      {segments.map((segment, idx) => (
        <span key={idx} className={segment.classes}>
          {segment.text}
        </span>
      ))}
    </div>
  );
});

// =============================================================================
// Component
// =============================================================================

export function TerminalOutput({
  lines,
  autoScroll,
  onAutoScrollChange,
  onClear,
  isStreaming = false,
  maxHeight = '400px',
}: TerminalOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    if (!isAtBottom && autoScroll) {
      onAutoScrollChange(false);
    }
  };

  // Search functionality
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const results: number[] = [];
    lines.forEach((line, index) => {
      if (line.content.toLowerCase().includes(lowerQuery)) {
        results.push(index);
      }
    });
    setSearchResults(results);
    setCurrentSearchIndex(0);
  }, [searchQuery, lines]);

  // Navigate to search result
  const navigateToResult = (index: number) => {
    if (searchResults.length === 0) return;

    const lineIndex = searchResults[index];
    const lineElements = containerRef.current?.querySelectorAll('[data-line-index]');
    const element = lineElements?.[lineIndex];

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setCurrentSearchIndex(index);
  };

  const goToNextResult = () => {
    if (searchResults.length === 0) return;
    const next = (currentSearchIndex + 1) % searchResults.length;
    navigateToResult(next);
  };

  const goToPrevResult = () => {
    if (searchResults.length === 0) return;
    const prev = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    navigateToResult(prev);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border bg-terminal-bg-secondary">
        <div className="flex items-center gap-2">
          {/* Search toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`
              p-1.5 rounded transition-colors
              ${showSearch ? 'bg-terminal-yellow/20 text-terminal-yellow' : 'hover:bg-terminal-elevated text-terminal-text-muted'}
            `}
            title="Search output"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Clear button */}
          {onClear && (
            <button
              onClick={onClear}
              className="p-1.5 rounded hover:bg-terminal-elevated text-terminal-text-muted transition-colors"
              title="Clear output"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Streaming indicator */}
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-terminal-green">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terminal-green opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-terminal-green" />
              </span>
              Streaming
            </span>
          )}

          {/* Auto-scroll toggle */}
          <button
            onClick={() => onAutoScrollChange(!autoScroll)}
            className={`
              flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors
              ${autoScroll ? 'bg-terminal-cyan/20 text-terminal-cyan' : 'bg-terminal-elevated text-terminal-text-muted'}
            `}
            title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
          >
            <ArrowDown className="h-3 w-3" />
            Auto-scroll
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-terminal-border bg-terminal-elevated">
          <Search className="h-4 w-4 text-terminal-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search output..."
            className="flex-1 bg-transparent text-sm text-terminal-text placeholder:text-terminal-text-muted focus:outline-none"
            autoFocus
          />
          {searchResults.length > 0 && (
            <>
              <span className="text-xs text-terminal-text-muted">
                {currentSearchIndex + 1} / {searchResults.length}
              </span>
              <button
                onClick={goToPrevResult}
                className="p-1 rounded hover:bg-terminal-bg-hover"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={goToNextResult}
                className="p-1 rounded hover:bg-terminal-bg-hover"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
            className="p-1 rounded hover:bg-terminal-bg-hover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Output area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-terminal-bg font-mono text-sm"
        style={{ maxHeight }}
      >
        {lines.length === 0 ? (
          <div className="flex items-center justify-center h-full text-terminal-text-muted">
            No output yet
          </div>
        ) : (
          <div className="py-2">
            {lines.map((line, index) => (
              <div key={line.id} data-line-index={index}>
                <OutputLine
                  line={line}
                  isHighlighted={searchResults.includes(index) && searchResults[currentSearchIndex] === index}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Line count footer */}
      <div className="px-3 py-1 border-t border-terminal-border bg-terminal-bg-secondary">
        <span className="text-xs text-terminal-text-muted">
          {lines.length.toLocaleString()} lines
        </span>
      </div>
    </div>
  );
}
