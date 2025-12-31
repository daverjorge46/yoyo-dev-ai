/**
 * useInputMode Hook
 *
 * Vim-style mode management for the TUI.
 *
 * NORMAL mode (default):
 * - h/l/arrows/Tab switch panels
 * - 1/2/3 direct panel access
 * - q quits, ? shows help
 * - 'i' or Enter enters INSERT mode
 *
 * INSERT mode:
 * - All keys go to text input
 * - Escape returns to NORMAL mode
 */

import { useState, useCallback, useMemo } from 'react';

/** Vim-style mode names */
export type ModeName = 'NORMAL' | 'INSERT';

export interface InputModeState {
  /** Whether user is currently typing in an input field (INSERT mode) */
  isInputMode: boolean;
  /** Vim-style mode name for display ('NORMAL' | 'INSERT') */
  modeName: ModeName;
  /** Enter INSERT mode (e.g., when pressing 'i' or Enter) */
  enterInputMode: () => void;
  /** Exit to NORMAL mode (e.g., when pressing Escape) */
  exitInputMode: () => void;
  /** Toggle between modes */
  toggleInputMode: () => void;
}

export function useInputMode(initialMode: boolean = false): InputModeState {
  const [isInputMode, setIsInputMode] = useState(initialMode);

  // Compute vim-style mode name
  const modeName: ModeName = useMemo(() => {
    return isInputMode ? 'INSERT' : 'NORMAL';
  }, [isInputMode]);

  const enterInputMode = useCallback(() => {
    setIsInputMode(true);
  }, []);

  const exitInputMode = useCallback(() => {
    setIsInputMode(false);
  }, []);

  const toggleInputMode = useCallback(() => {
    setIsInputMode(prev => !prev);
  }, []);

  return {
    isInputMode,
    modeName,
    enterInputMode,
    exitInputMode,
    toggleInputMode,
  };
}
