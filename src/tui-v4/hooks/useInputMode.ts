/**
 * useInputMode Hook
 *
 * Tracks whether the user is currently in "input mode" (typing in a text field)
 * vs "navigation mode" (navigating between panels).
 *
 * When in input mode:
 * - Arrow keys, Tab, etc. should control text input
 * - Only Escape exits input mode
 *
 * When in navigation mode:
 * - h/l/arrows/Tab/1-2-3 switch panels
 * - Entering a text field activates input mode
 */

import { useState, useCallback } from 'react';

export interface InputModeState {
  /** Whether user is currently typing in an input field */
  isInputMode: boolean;
  /** Enter input mode (e.g., when focusing a text field) */
  enterInputMode: () => void;
  /** Exit input mode (e.g., when pressing Escape) */
  exitInputMode: () => void;
  /** Toggle input mode */
  toggleInputMode: () => void;
}

export function useInputMode(initialMode: boolean = false): InputModeState {
  const [isInputMode, setIsInputMode] = useState(initialMode);

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
    enterInputMode,
    exitInputMode,
    toggleInputMode,
  };
}
