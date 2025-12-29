/**
 * useTerminalSize Hook
 *
 * Provides terminal dimensions with debounced updates to prevent
 * render thrashing during rapid terminal resize events.
 */

import { useState, useEffect } from 'react';
import { useStdout } from 'ink';
import terminalSize from 'terminal-size';
import { animations } from '../theme/styles.js';

export interface TerminalSize {
  width: number;
  height: number;
}

/**
 * Hook to get current terminal size with debounced resize updates
 *
 * @returns Terminal dimensions (width and height in columns/rows)
 */
export const useTerminalSize = (): TerminalSize => {
  const { stdout } = useStdout();

  // Get initial terminal size
  const getSize = (): TerminalSize => {
    try {
      const size = terminalSize();
      return {
        width: size.columns,
        height: size.rows,
      };
    } catch (error) {
      // Fallback to default size if terminal-size fails
      return {
        width: 120,
        height: 30,
      };
    }
  };

  const [size, setSize] = useState<TerminalSize>(getSize());

  useEffect(() => {
    let debounceTimeout: NodeJS.Timeout | null = null;

    const handleResize = () => {
      // Debounce resize events to prevent render thrashing
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      debounceTimeout = setTimeout(() => {
        const newSize = getSize();
        setSize(newSize);
      }, animations.debounceResize);
    };

    // Listen for terminal resize events
    stdout.on('resize', handleResize);

    // Cleanup
    return () => {
      stdout.off('resize', handleResize);
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [stdout]);

  return size;
};
