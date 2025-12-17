/**
 * useInputHistory Hook
 *
 * Manages command history with navigation (up/down arrows).
 */

import { useState, useCallback } from 'react';

interface UseInputHistoryOptions {
  maxHistory?: number;
}

interface UseInputHistoryReturn {
  /** History entries (most recent last) */
  history: string[];
  /** Current history index (-1 = not navigating) */
  historyIndex: number;
  /** Add entry to history */
  addToHistory: (entry: string) => void;
  /** Navigate up in history (older) */
  navigateUp: () => string | undefined;
  /** Navigate down in history (newer) */
  navigateDown: () => string | undefined;
  /** Reset navigation (exit history browsing) */
  resetNavigation: () => void;
  /** Clear all history */
  clearHistory: () => void;
}

/**
 * Hook for managing input command history.
 *
 * @param options - Configuration options
 * @returns History state and navigation functions
 */
export function useInputHistory(options: UseInputHistoryOptions = {}): UseInputHistoryReturn {
  const { maxHistory = 100 } = options;

  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const addToHistory = useCallback((entry: string) => {
    if (!entry.trim()) return;

    setHistory((prev) => {
      // Don't add duplicates of the last entry
      if (prev.length > 0 && prev[prev.length - 1] === entry) {
        return prev;
      }

      // Add new entry, trim if exceeds max
      const newHistory = [...prev, entry];
      if (newHistory.length > maxHistory) {
        return newHistory.slice(-maxHistory);
      }
      return newHistory;
    });

    // Reset navigation after adding
    setHistoryIndex(-1);
  }, [maxHistory]);

  const navigateUp = useCallback(() => {
    if (history.length === 0) return undefined;

    let newIndex: number;
    if (historyIndex === -1) {
      // Start from the most recent
      newIndex = history.length - 1;
    } else if (historyIndex > 0) {
      // Move to older entry
      newIndex = historyIndex - 1;
    } else {
      // Already at oldest, stay there
      newIndex = 0;
    }

    setHistoryIndex(newIndex);
    return history[newIndex];
  }, [history, historyIndex]);

  const navigateDown = useCallback(() => {
    if (historyIndex === -1) return undefined;

    if (historyIndex < history.length - 1) {
      // Move to newer entry
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      return history[newIndex];
    } else {
      // At newest, exit history navigation
      setHistoryIndex(-1);
      return '';
    }
  }, [history, historyIndex]);

  const resetNavigation = useCallback(() => {
    setHistoryIndex(-1);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  return {
    history,
    historyIndex,
    addToHistory,
    navigateUp,
    navigateDown,
    resetNavigation,
    clearHistory,
  };
}

export default useInputHistory;
