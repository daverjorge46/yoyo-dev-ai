/**
 * AgentLogStream Component
 *
 * Real-time log display for agent execution with auto-scroll.
 */

import { useRef, useEffect, useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

export interface AgentLog {
  timestamp: number;
  message: string;
  level: 'info' | 'warn' | 'error' | 'debug';
}

interface AgentLogStreamProps {
  logs: AgentLog[];
  maxLines?: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}

const levelColors: Record<AgentLog['level'], string> = {
  info: 'text-gray-300',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  debug: 'text-gray-500',
};

const levelBadgeColors: Record<AgentLog['level'], string> = {
  info: 'bg-gray-600',
  warn: 'bg-yellow-600',
  error: 'bg-red-600',
  debug: 'bg-gray-700',
};

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function AgentLogStream({
  logs,
  maxLines = 20,
  expanded = false,
  onToggleExpand,
  className = '',
}: AgentLogStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 30;
    setAutoScroll(isAtBottom);
  };

  const handleCopyLogs = async () => {
    const logText = logs
      .map((log) => `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(logText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy logs:', err);
    }
  };

  const displayLogs = expanded ? logs : logs.slice(-maxLines);
  const hasMoreLogs = logs.length > maxLines;

  if (logs.length === 0) {
    return (
      <div className={`bg-gray-900 rounded-lg p-3 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Terminal className="h-4 w-4" />
          <span>No logs yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2 text-gray-400 text-xs">
          <Terminal className="h-3.5 w-3.5" />
          <span>{logs.length} log entries</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLogs}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Copy logs"
            aria-label="Copy logs to clipboard"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
          {hasMoreLogs && onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-400 hover:text-white transition-colors"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse logs' : 'Expand logs'}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span>Collapse</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span>Show all ({logs.length})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`overflow-y-auto font-mono text-xs p-2 space-y-0.5 ${
          expanded ? 'max-h-96' : 'max-h-48'
        }`}
        role="log"
        aria-live="polite"
        aria-label="Agent execution logs"
      >
        {displayLogs.map((log, index) => (
          <div
            key={`${log.timestamp}-${index}`}
            className={`flex items-start gap-2 py-0.5 ${levelColors[log.level]}`}
          >
            <span className="text-gray-600 shrink-0">
              {formatTimestamp(log.timestamp)}
            </span>
            <span
              className={`px-1 py-0.5 rounded text-[10px] uppercase font-semibold shrink-0 ${levelBadgeColors[log.level]} text-white`}
            >
              {log.level.slice(0, 3)}
            </span>
            <span className="break-all">{log.message}</span>
          </div>
        ))}
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <div className="px-3 py-1 bg-gray-800 border-t border-gray-700">
          <button
            onClick={() => {
              setAutoScroll(true);
              if (containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
              }
            }}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Resume auto-scroll
          </button>
        </div>
      )}
    </div>
  );
}
