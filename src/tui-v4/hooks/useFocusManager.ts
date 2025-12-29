/**
 * useFocusManager Hook
 *
 * Manages focus state between panels:
 * - Tracks active panel ("left" | "right")
 * - Handles h/l or Tab to switch focus
 * - Provides visual indicators (bright vs dim borders)
 */

import { useState, useCallback } from 'react';

export type FocusedPanel = 'left' | 'right';

export interface UseFocusManagerResult {
  focusedPanel: FocusedPanel;
  setFocusedPanel: (panel: FocusedPanel) => void;
  focusLeft: () => void;
  focusRight: () => void;
  toggleFocus: () => void;
  isLeftFocused: boolean;
  isRightFocused: boolean;
}

export function useFocusManager(
  initialPanel: FocusedPanel = 'left'
): UseFocusManagerResult {
  const [focusedPanel, setFocusedPanel] = useState<FocusedPanel>(initialPanel);

  const focusLeft = useCallback(() => {
    setFocusedPanel('left');
  }, []);

  const focusRight = useCallback(() => {
    setFocusedPanel('right');
  }, []);

  const toggleFocus = useCallback(() => {
    setFocusedPanel((prev) => (prev === 'left' ? 'right' : 'left'));
  }, []);

  return {
    focusedPanel,
    setFocusedPanel,
    focusLeft,
    focusRight,
    toggleFocus,
    isLeftFocused: focusedPanel === 'left',
    isRightFocused: focusedPanel === 'right',
  };
}
