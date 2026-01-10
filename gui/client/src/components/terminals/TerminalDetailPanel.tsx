/**
 * TerminalDetailPanel Component
 *
 * Detailed view of a terminal session with:
 * - Full output view with ANSI color support
 * - Input field for human-in-the-loop
 * - Context panel showing injected context
 * - Action buttons
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Play,
  Pause,
  Square,
  Terminal,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import type { AgentTerminal, OutputLine } from '../../types/terminal';
import { AGENT_TYPE_LABELS, AGENT_TYPE_COLORS } from '../../types/terminal';

// =============================================================================
// API
// =============================================================================

async function fetchTerminalOutput(terminalId: string): Promise<{
  terminalId: string;
  lineCount: number;
  bufferSize: number;
  lines: OutputLine[];
}> {
  const res = await fetch(`/api/terminals/${terminalId}/output`);
  if (!res.ok) throw new Error('Failed to fetch terminal output');
  return res.json();
}

// =============================================================================
// Output Line Component
// =============================================================================

function OutputLineComponent({ line }: { line: OutputLine }) {
  const streamClass =
    line.stream === 'stderr'
      ? 'text-red-400 dark:text-terminal-red'
      : line.stream === 'system'
      ? 'text-yellow-400 dark:text-terminal-yellow'
      : 'text-gray-300 dark:text-terminal-text';

  return (
    <div className={`font-mono text-xs whitespace-pre-wrap ${streamClass}`}>
      {line.content}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export interface TerminalDetailPanelProps {
  terminal: AgentTerminal;
  onClose: () => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onKill: (id: string) => void;
}

export function TerminalDetailPanel({
  terminal,
  onClose,
  onPause,
  onResume,
  onKill,
}: TerminalDetailPanelProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [showContext, setShowContext] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Fetch output
  const { data: outputData, isLoading: outputLoading } = useQuery({
    queryKey: ['terminal-output', terminal.id],
    queryFn: () => fetchTerminalOutput(terminal.id),
    refetchInterval: terminal.status === 'running' ? 1000 : false,
  });

  const isActive = terminal.status === 'running' || terminal.status === 'paused';
  const canPause = terminal.status === 'running';
  const canResume = terminal.status === 'paused';

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputData?.lines, autoScroll]);

  // Handle scroll
  const handleScroll = () => {
    if (outputRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = outputRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  const agentColor = AGENT_TYPE_COLORS[terminal.agentType];

  // Format duration
  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end ? new Date(end).getTime() : Date.now();
    const diff = endTime - new Date(start).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 dark:bg-terminal-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 dark:border-terminal-border">
        <div className="flex items-center gap-3">
          <Terminal className="h-5 w-5 text-gray-400" />
          <div>
            <h2 className="text-lg font-semibold text-white dark:text-terminal-text">
              {terminal.name}
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: `var(--terminal-${agentColor}, var(--brand))`,
                color: 'white',
              }}
            >
              {AGENT_TYPE_LABELS[terminal.agentType]}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {canPause && (
            <button
              onClick={() => onPause(terminal.id)}
              className="p-2 rounded hover:bg-gray-800 transition-colors"
              title="Pause"
            >
              <Pause className="h-4 w-4 text-yellow-400" />
            </button>
          )}
          {canResume && (
            <button
              onClick={() => onResume(terminal.id)}
              className="p-2 rounded hover:bg-gray-800 transition-colors"
              title="Resume"
            >
              <Play className="h-4 w-4 text-green-400" />
            </button>
          )}
          {isActive && (
            <button
              onClick={() => onKill(terminal.id)}
              className="p-2 rounded hover:bg-gray-800 transition-colors"
              title="Kill"
            >
              <Square className="h-4 w-4 text-red-400" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-800 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-terminal-bg-secondary border-b border-gray-700 dark:border-terminal-border">
        <div className="flex items-center gap-4 text-xs">
          {/* Status */}
          <div className="flex items-center gap-1.5">
            {terminal.status === 'running' && (
              <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
            )}
            {terminal.status === 'paused' && (
              <Pause className="h-3.5 w-3.5 text-yellow-400" />
            )}
            {terminal.status === 'completed' && (
              <CheckCircle className="h-3.5 w-3.5 text-green-400" />
            )}
            {terminal.status === 'error' && (
              <AlertCircle className="h-3.5 w-3.5 text-red-400" />
            )}
            <span className="text-gray-300 capitalize">{terminal.status}</span>
          </div>

          {/* Duration */}
          {terminal.startedAt && (
            <div className="flex items-center gap-1.5 text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDuration(terminal.startedAt, terminal.completedAt)}</span>
            </div>
          )}

          {/* Lines */}
          <div className="flex items-center gap-1.5 text-gray-400">
            <FileText className="h-3.5 w-3.5" />
            <span>{terminal.outputLineCount} lines</span>
          </div>
        </div>

        {/* Progress */}
        {isActive && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${terminal.progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{terminal.progress}%</span>
          </div>
        )}
      </div>

      {/* Context Toggle */}
      {terminal.injectedContext && (
        <button
          onClick={() => setShowContext(!showContext)}
          className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-terminal-bg-secondary border-b border-gray-700 dark:border-terminal-border hover:bg-gray-750 transition-colors"
        >
          <span className="text-xs text-gray-400">Injected Context</span>
          {showContext ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>
      )}

      {/* Context Panel */}
      {showContext && terminal.injectedContext && (
        <div className="px-4 py-3 bg-gray-850 dark:bg-terminal-bg-secondary border-b border-gray-700 dark:border-terminal-border max-h-48 overflow-y-auto">
          <div className="text-xs font-mono text-gray-300 whitespace-pre-wrap">
            {terminal.injectedContext.taskDescription && (
              <div className="mb-2">
                <span className="text-yellow-400">Task:</span>{' '}
                {terminal.injectedContext.taskDescription}
              </div>
            )}
            {terminal.injectedContext.specSummary && (
              <div className="mb-2">
                <span className="text-blue-400">Spec:</span>{' '}
                {terminal.injectedContext.specSummary.slice(0, 200)}...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Output Area */}
      <div
        ref={outputRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 bg-gray-900 dark:bg-terminal-bg"
      >
        {outputLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
          </div>
        ) : outputData?.lines.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No output yet
          </div>
        ) : (
          <div className="space-y-0.5">
            {outputData?.lines.map((line) => (
              <OutputLineComponent key={line.id} line={line} />
            ))}
          </div>
        )}
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (outputRef.current) {
              outputRef.current.scrollTop = outputRef.current.scrollHeight;
            }
          }}
          className="absolute bottom-4 right-4 p-2 bg-gray-800 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
          title="Scroll to bottom"
        >
          <ArrowDown className="h-4 w-4 text-gray-300" />
        </button>
      )}

      {/* Error Message */}
      {terminal.errorMessage && (
        <div className="px-4 py-3 bg-red-900/30 border-t border-red-700">
          <p className="text-sm text-red-400">{terminal.errorMessage}</p>
        </div>
      )}
    </div>
  );
}
