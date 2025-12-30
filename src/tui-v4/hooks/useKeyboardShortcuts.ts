/**
 * useKeyboardShortcuts Hook
 *
 * Handles global keyboard shortcuts:
 * - ? (help overlay)
 * - q (quit)
 * - r (refresh)
 * - / (command palette)
 * - Ctrl+C (cancel)
 * - Esc (close modals)
 */

import { useState } from 'react';
import { useInput } from 'ink';

export interface KeyboardShortcuts {
  showHelp: boolean;
  showCommandPalette: boolean;
  shouldQuit: boolean;
  shouldRefresh: boolean;
  onHelp: () => void;
  onCommandPalette: () => void;
  onQuit: () => void;
  onRefresh: () => void;
  closeModals: () => void;
}

export function useKeyboardShortcuts(): KeyboardShortcuts {
  const [showHelp, setShowHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [shouldQuit, setShouldQuit] = useState(false);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  useInput((input, key) => {
    // Help overlay (?)
    if (input === '?') {
      setShowHelp(prev => !prev);
    }

    // Command palette (/)
    if (input === '/') {
      setShowCommandPalette(prev => !prev);
    }

    // Quit (q)
    if (input === 'q' && !showHelp && !showCommandPalette) {
      setShouldQuit(true);
    }

    // Refresh (r)
    if (input === 'r' && !showHelp && !showCommandPalette) {
      setShouldRefresh(true);
      // Reset refresh flag after triggering
      setTimeout(() => setShouldRefresh(false), 100);
    }

    // Close modals (Esc)
    if (key.escape) {
      setShowHelp(false);
      setShowCommandPalette(false);
    }

    // Cancel (Ctrl+C) - handled by Ink automatically
  });

  const onHelp = () => setShowHelp(prev => !prev);
  const onCommandPalette = () => setShowCommandPalette(prev => !prev);
  const onQuit = () => setShouldQuit(true);
  const onRefresh = () => {
    setShouldRefresh(true);
    setTimeout(() => setShouldRefresh(false), 100);
  };
  const closeModals = () => {
    setShowHelp(false);
    setShowCommandPalette(false);
  };

  return {
    showHelp,
    showCommandPalette,
    shouldQuit,
    shouldRefresh,
    onHelp,
    onCommandPalette,
    onQuit,
    onRefresh,
    closeModals,
  };
}
