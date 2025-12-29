/**
 * usePanelLayout Hook
 *
 * Manages panel layout state with localStorage persistence.
 * Handles sidebar and detail panel widths, collapsed states.
 *
 * Features:
 * - Debounced localStorage writes during resize
 * - Width clamping to min/max bounds
 * - Reset to defaults functionality
 * - Detail panel content management
 */

import { useState, useCallback, useEffect, useRef, ReactNode } from 'react';

// =============================================================================
// Constants
// =============================================================================

export const STORAGE_KEY = 'yoyo-panel-layout';

export const PANEL_DEFAULTS = {
  sidebarWidth: 240,
  sidebarMinWidth: 180,
  sidebarMaxWidth: 400,
  sidebarCollapsed: false,
  detailWidth: 400,
  detailMinWidth: 280,
  detailMaxWidth: 600,
  detailCollapsed: true, // Detail panel starts collapsed
  collapsedWidth: 56, // Icon-only width
} as const;

// =============================================================================
// Types
// =============================================================================

export interface PanelLayoutState {
  sidebarWidth: number;
  detailWidth: number;
  sidebarCollapsed: boolean;
  detailCollapsed: boolean;
}

export interface UsePanelLayoutReturn {
  state: PanelLayoutState;
  setSidebarWidth: (width: number) => void;
  setDetailWidth: (width: number) => void;
  toggleSidebar: () => void;
  toggleDetail: () => void;
  openDetail: () => void;
  closeDetail: () => void;
  resetSidebar: () => void;
  resetDetail: () => void;
  resetAll: () => void;
  // Computed values for convenience
  sidebarEffectiveWidth: number;
  detailEffectiveWidth: number;
  // Detail content management
  detailContent: ReactNode;
  setDetailContent: (content: ReactNode) => void;
  detailOpen: boolean;
  setDetailOpen: (open: boolean) => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Clamps a value between min and max bounds.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Loads panel layout state from localStorage.
 * Returns defaults if no saved state or corrupted data.
 */
function loadState(): PanelLayoutState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return getDefaultState();
    }
    const parsed = JSON.parse(saved);
    // Validate shape of saved data
    if (
      typeof parsed.sidebarWidth !== 'number' ||
      typeof parsed.detailWidth !== 'number' ||
      typeof parsed.sidebarCollapsed !== 'boolean' ||
      typeof parsed.detailCollapsed !== 'boolean'
    ) {
      return getDefaultState();
    }
    return {
      sidebarWidth: clamp(
        parsed.sidebarWidth,
        PANEL_DEFAULTS.sidebarMinWidth,
        PANEL_DEFAULTS.sidebarMaxWidth
      ),
      detailWidth: clamp(
        parsed.detailWidth,
        PANEL_DEFAULTS.detailMinWidth,
        PANEL_DEFAULTS.detailMaxWidth
      ),
      sidebarCollapsed: parsed.sidebarCollapsed,
      detailCollapsed: parsed.detailCollapsed,
    };
  } catch {
    return getDefaultState();
  }
}

/**
 * Returns default panel layout state.
 */
function getDefaultState(): PanelLayoutState {
  return {
    sidebarWidth: PANEL_DEFAULTS.sidebarWidth,
    detailWidth: PANEL_DEFAULTS.detailWidth,
    sidebarCollapsed: PANEL_DEFAULTS.sidebarCollapsed,
    detailCollapsed: PANEL_DEFAULTS.detailCollapsed,
  };
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function usePanelLayout(): UsePanelLayoutReturn {
  const [state, setState] = useState<PanelLayoutState>(loadState);
  const [detailContent, setDetailContent] = useState<ReactNode>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Ref for debounced save timeout
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Persists state to localStorage with debouncing.
   * Debounce prevents excessive writes during resize dragging.
   */
  const persistState = useCallback((newState: PanelLayoutState) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce write by 150ms
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (error) {
        console.warn('[usePanelLayout] Failed to save state:', error);
      }
    }, 150);
  }, []);

  /**
   * Updates state and triggers persistence.
   */
  const updateState = useCallback(
    (updates: Partial<PanelLayoutState>) => {
      setState((prev) => {
        const newState = { ...prev, ...updates };
        persistState(newState);
        return newState;
      });
    },
    [persistState]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Sync detail panel collapsed state with detailOpen
  useEffect(() => {
    if (detailOpen && state.detailCollapsed) {
      updateState({ detailCollapsed: false });
    } else if (!detailOpen && !state.detailCollapsed) {
      updateState({ detailCollapsed: true });
    }
  }, [detailOpen, state.detailCollapsed, updateState]);

  // -----------------------------------------------------------------------------
  // Sidebar Operations
  // -----------------------------------------------------------------------------

  const setSidebarWidth = useCallback(
    (width: number) => {
      const clampedWidth = clamp(
        width,
        PANEL_DEFAULTS.sidebarMinWidth,
        PANEL_DEFAULTS.sidebarMaxWidth
      );
      updateState({ sidebarWidth: clampedWidth });
    },
    [updateState]
  );

  const toggleSidebar = useCallback(() => {
    updateState({ sidebarCollapsed: !state.sidebarCollapsed });
  }, [state.sidebarCollapsed, updateState]);

  const resetSidebar = useCallback(() => {
    updateState({
      sidebarWidth: PANEL_DEFAULTS.sidebarWidth,
      sidebarCollapsed: PANEL_DEFAULTS.sidebarCollapsed,
    });
  }, [updateState]);

  // -----------------------------------------------------------------------------
  // Detail Panel Operations
  // -----------------------------------------------------------------------------

  const setDetailWidth = useCallback(
    (width: number) => {
      const clampedWidth = clamp(
        width,
        PANEL_DEFAULTS.detailMinWidth,
        PANEL_DEFAULTS.detailMaxWidth
      );
      updateState({ detailWidth: clampedWidth });
    },
    [updateState]
  );

  const toggleDetail = useCallback(() => {
    const newCollapsed = !state.detailCollapsed;
    updateState({ detailCollapsed: newCollapsed });
    setDetailOpen(!newCollapsed);
  }, [state.detailCollapsed, updateState]);

  const openDetail = useCallback(() => {
    updateState({ detailCollapsed: false });
    setDetailOpen(true);
  }, [updateState]);

  const closeDetail = useCallback(() => {
    updateState({ detailCollapsed: true });
    setDetailOpen(false);
  }, [updateState]);

  const resetDetail = useCallback(() => {
    updateState({
      detailWidth: PANEL_DEFAULTS.detailWidth,
      detailCollapsed: PANEL_DEFAULTS.detailCollapsed,
    });
    setDetailOpen(false);
    setDetailContent(null);
  }, [updateState]);

  // -----------------------------------------------------------------------------
  // Reset All
  // -----------------------------------------------------------------------------

  const resetAll = useCallback(() => {
    const defaultState = getDefaultState();
    setState(defaultState);
    persistState(defaultState);
    setDetailOpen(false);
    setDetailContent(null);
  }, [persistState]);

  // -----------------------------------------------------------------------------
  // Computed Values
  // -----------------------------------------------------------------------------

  const sidebarEffectiveWidth = state.sidebarCollapsed
    ? PANEL_DEFAULTS.collapsedWidth
    : state.sidebarWidth;

  const detailEffectiveWidth = state.detailCollapsed ? 0 : state.detailWidth;

  return {
    state,
    setSidebarWidth,
    setDetailWidth,
    toggleSidebar,
    toggleDetail,
    openDetail,
    closeDetail,
    resetSidebar,
    resetDetail,
    resetAll,
    sidebarEffectiveWidth,
    detailEffectiveWidth,
    detailContent,
    setDetailContent,
    detailOpen,
    setDetailOpen,
  };
}
