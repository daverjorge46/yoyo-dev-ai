/**
 * useTerminalStream Hook
 *
 * Streams terminal output via WebSocket for a specific terminal ID.
 * Provides buffered output, auto-scroll control, and search functionality.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket, type WSMessage } from './useWebSocket';

// =============================================================================
// Types
// =============================================================================

export interface TerminalOutputLine {
  id: string;
  timestamp: number;
  content: string;
  type: 'stdout' | 'stderr' | 'system';
}

export interface TerminalStreamState {
  lines: TerminalOutputLine[];
  isConnected: boolean;
  isStreaming: boolean;
  lastUpdate: number | null;
}

export interface UseTerminalStreamOptions {
  /** Maximum number of lines to buffer */
  maxLines?: number;
  /** Whether to auto-scroll to bottom on new output */
  autoScroll?: boolean;
}

export interface UseTerminalStreamReturn {
  /** Output lines */
  lines: TerminalOutputLine[];
  /** Whether connected to WebSocket */
  isConnected: boolean;
  /** Whether actively receiving output */
  isStreaming: boolean;
  /** Last update timestamp */
  lastUpdate: number | null;
  /** Auto-scroll state */
  autoScroll: boolean;
  /** Toggle auto-scroll */
  setAutoScroll: (value: boolean) => void;
  /** Clear output buffer */
  clearOutput: () => void;
  /** Search in output */
  searchOutput: (query: string) => TerminalOutputLine[];
  /** Subscribe to a terminal */
  subscribe: (terminalId: string) => void;
  /** Unsubscribe from current terminal */
  unsubscribe: () => void;
  /** Currently subscribed terminal ID */
  terminalId: string | null;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useTerminalStream(
  options: UseTerminalStreamOptions = {}
): UseTerminalStreamReturn {
  const { maxLines = 10000, autoScroll: initialAutoScroll = true } = options;

  // State
  const [lines, setLines] = useState<TerminalOutputLine[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [autoScroll, setAutoScroll] = useState(initialAutoScroll);
  const [terminalId, setTerminalId] = useState<string | null>(null);

  // Refs for stable callbacks
  const terminalIdRef = useRef<string | null>(null);
  const lineCounterRef = useRef(0);

  // Handle WebSocket messages
  const handleMessage = useCallback(
    (message: WSMessage) => {
      // Only process terminal output messages
      if (message.type !== 'terminal:output') return;

      const payload = message.payload as {
        terminalId: string;
        content: string;
        type: 'stdout' | 'stderr' | 'system';
        timestamp: number;
      } | undefined;

      if (!payload) return;

      // Only process if it's for our subscribed terminal
      if (terminalIdRef.current && payload.terminalId !== terminalIdRef.current) {
        return;
      }

      // Create new line
      const newLine: TerminalOutputLine = {
        id: `line-${lineCounterRef.current++}`,
        timestamp: payload.timestamp || Date.now(),
        content: payload.content,
        type: payload.type || 'stdout',
      };

      setLines((prev) => {
        const updated = [...prev, newLine];
        // Trim to max lines
        if (updated.length > maxLines) {
          return updated.slice(-maxLines);
        }
        return updated;
      });

      setLastUpdate(Date.now());
      setIsStreaming(true);

      // Clear streaming flag after idle
      setTimeout(() => {
        setIsStreaming(false);
      }, 2000);
    },
    [maxLines]
  );

  // WebSocket connection
  const { status, send } = useWebSocket({
    onMessage: handleMessage,
  });

  const isConnected = status === 'connected';

  // Subscribe to a terminal
  const subscribe = useCallback(
    (id: string) => {
      terminalIdRef.current = id;
      setTerminalId(id);
      setLines([]);
      lineCounterRef.current = 0;

      // Send subscription message
      if (isConnected) {
        send({
          type: 'terminal:subscribe',
          payload: { data: { terminalId: id }, timestamp: Date.now() },
        });
      }
    },
    [isConnected, send]
  );

  // Unsubscribe from current terminal
  const unsubscribe = useCallback(() => {
    if (terminalIdRef.current && isConnected) {
      send({
        type: 'terminal:unsubscribe',
        payload: { data: { terminalId: terminalIdRef.current }, timestamp: Date.now() },
      });
    }
    terminalIdRef.current = null;
    setTerminalId(null);
  }, [isConnected, send]);

  // Clear output
  const clearOutput = useCallback(() => {
    setLines([]);
    lineCounterRef.current = 0;
    setLastUpdate(null);
  }, []);

  // Search output
  const searchOutput = useCallback(
    (query: string): TerminalOutputLine[] => {
      if (!query) return [];
      const lowerQuery = query.toLowerCase();
      return lines.filter((line) =>
        line.content.toLowerCase().includes(lowerQuery)
      );
    },
    [lines]
  );

  // Re-subscribe when connection is established
  useEffect(() => {
    if (isConnected && terminalIdRef.current) {
      send({
        type: 'terminal:subscribe',
        payload: { terminalId: terminalIdRef.current, timestamp: Date.now() },
      });
    }
  }, [isConnected, send]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (terminalIdRef.current) {
        unsubscribe();
      }
    };
  }, [unsubscribe]);

  return {
    lines,
    isConnected,
    isStreaming,
    lastUpdate,
    autoScroll,
    setAutoScroll,
    clearOutput,
    searchOutput,
    subscribe,
    unsubscribe,
    terminalId,
  };
}

// =============================================================================
// Helper: Parse ANSI escape codes to HTML (basic implementation)
// =============================================================================

const ANSI_COLORS: Record<number, string> = {
  30: 'text-terminal-black',
  31: 'text-terminal-red',
  32: 'text-terminal-green',
  33: 'text-terminal-yellow',
  34: 'text-terminal-blue',
  35: 'text-terminal-magenta',
  36: 'text-terminal-cyan',
  37: 'text-terminal-white',
  90: 'text-terminal-text-muted',
  91: 'text-terminal-red',
  92: 'text-terminal-green',
  93: 'text-terminal-yellow',
  94: 'text-terminal-blue',
  95: 'text-terminal-magenta',
  96: 'text-terminal-cyan',
  97: 'text-terminal-white',
};

export function parseAnsiToClasses(text: string): Array<{ text: string; classes: string }> {
  const segments: Array<{ text: string; classes: string }> = [];
  const ansiRegex = /\x1b\[([0-9;]+)m/g;

  let lastIndex = 0;
  let currentClasses = '';
  let match;

  while ((match = ansiRegex.exec(text)) !== null) {
    // Add text before this escape sequence
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        classes: currentClasses,
      });
    }

    // Parse escape codes
    const codes = match[1].split(';').map(Number);
    for (const code of codes) {
      if (code === 0) {
        currentClasses = '';
      } else if (code === 1) {
        currentClasses += ' font-bold';
      } else if (code === 3) {
        currentClasses += ' italic';
      } else if (code === 4) {
        currentClasses += ' underline';
      } else if (ANSI_COLORS[code]) {
        currentClasses = ANSI_COLORS[code];
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      classes: currentClasses,
    });
  }

  return segments.length > 0 ? segments : [{ text, classes: '' }];
}
