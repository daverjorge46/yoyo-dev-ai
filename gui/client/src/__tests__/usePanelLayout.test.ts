/**
 * usePanelLayout Hook Tests
 *
 * Tests for panel layout state management with localStorage persistence.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePanelLayout, PanelLayoutState, PANEL_DEFAULTS, STORAGE_KEY } from '../hooks/usePanelLayout';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('usePanelLayout', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default values when localStorage is empty', () => {
      const { result } = renderHook(() => usePanelLayout());

      expect(result.current.state).toEqual({
        sidebarWidth: PANEL_DEFAULTS.sidebarWidth,
        detailWidth: PANEL_DEFAULTS.detailWidth,
        sidebarCollapsed: PANEL_DEFAULTS.sidebarCollapsed,
        detailCollapsed: PANEL_DEFAULTS.detailCollapsed,
      });
    });

    it('should restore state from localStorage on mount', () => {
      const savedState: PanelLayoutState = {
        sidebarWidth: 300,
        detailWidth: 450,
        sidebarCollapsed: true,
        detailCollapsed: false,
      };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(savedState));

      const { result } = renderHook(() => usePanelLayout());

      expect(result.current.state.sidebarWidth).toBe(300);
      expect(result.current.state.detailWidth).toBe(450);
      expect(result.current.state.sidebarCollapsed).toBe(true);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.setItem(STORAGE_KEY, 'invalid-json');

      const { result } = renderHook(() => usePanelLayout());

      expect(result.current.state).toEqual({
        sidebarWidth: PANEL_DEFAULTS.sidebarWidth,
        detailWidth: PANEL_DEFAULTS.detailWidth,
        sidebarCollapsed: PANEL_DEFAULTS.sidebarCollapsed,
        detailCollapsed: PANEL_DEFAULTS.detailCollapsed,
      });
    });
  });

  describe('sidebar operations', () => {
    it('should update sidebar width', () => {
      const { result } = renderHook(() => usePanelLayout());

      act(() => {
        result.current.setSidebarWidth(280);
      });

      expect(result.current.state.sidebarWidth).toBe(280);
    });

    it('should clamp sidebar width to min/max bounds', () => {
      const { result } = renderHook(() => usePanelLayout());

      act(() => {
        result.current.setSidebarWidth(100); // Below min
      });
      expect(result.current.state.sidebarWidth).toBe(PANEL_DEFAULTS.sidebarMinWidth);

      act(() => {
        result.current.setSidebarWidth(600); // Above max
      });
      expect(result.current.state.sidebarWidth).toBe(PANEL_DEFAULTS.sidebarMaxWidth);
    });

    it('should toggle sidebar collapsed state', () => {
      const { result } = renderHook(() => usePanelLayout());

      expect(result.current.state.sidebarCollapsed).toBe(false);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.state.sidebarCollapsed).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.state.sidebarCollapsed).toBe(false);
    });
  });

  describe('detail panel operations', () => {
    it('should update detail panel width', () => {
      const { result } = renderHook(() => usePanelLayout());

      act(() => {
        result.current.setDetailWidth(500);
      });

      expect(result.current.state.detailWidth).toBe(500);
    });

    it('should clamp detail width to min/max bounds', () => {
      const { result } = renderHook(() => usePanelLayout());

      act(() => {
        result.current.setDetailWidth(150); // Below min
      });
      expect(result.current.state.detailWidth).toBe(PANEL_DEFAULTS.detailMinWidth);

      act(() => {
        result.current.setDetailWidth(800); // Above max
      });
      expect(result.current.state.detailWidth).toBe(PANEL_DEFAULTS.detailMaxWidth);
    });

    it('should toggle detail panel collapsed state', () => {
      const { result } = renderHook(() => usePanelLayout());

      expect(result.current.state.detailCollapsed).toBe(true); // Default collapsed

      act(() => {
        result.current.toggleDetail();
      });

      expect(result.current.state.detailCollapsed).toBe(false);
    });

    it('should open detail panel with content', () => {
      const { result } = renderHook(() => usePanelLayout());

      act(() => {
        result.current.openDetail();
      });

      expect(result.current.state.detailCollapsed).toBe(false);
    });

    it('should close detail panel', () => {
      const { result } = renderHook(() => usePanelLayout());

      act(() => {
        result.current.openDetail();
      });
      expect(result.current.state.detailCollapsed).toBe(false);

      act(() => {
        result.current.closeDetail();
      });
      expect(result.current.state.detailCollapsed).toBe(true);
    });
  });

  describe('reset operations', () => {
    it('should reset sidebar to default width', () => {
      const { result } = renderHook(() => usePanelLayout());

      act(() => {
        result.current.setSidebarWidth(300);
      });
      expect(result.current.state.sidebarWidth).toBe(300);

      act(() => {
        result.current.resetSidebar();
      });
      expect(result.current.state.sidebarWidth).toBe(PANEL_DEFAULTS.sidebarWidth);
    });

    it('should reset detail panel to default width', () => {
      const { result } = renderHook(() => usePanelLayout());

      act(() => {
        result.current.setDetailWidth(500);
      });
      expect(result.current.state.detailWidth).toBe(500);

      act(() => {
        result.current.resetDetail();
      });
      expect(result.current.state.detailWidth).toBe(PANEL_DEFAULTS.detailWidth);
    });

    it('should reset all panels to defaults', () => {
      const { result } = renderHook(() => usePanelLayout());

      act(() => {
        result.current.setSidebarWidth(300);
        result.current.setDetailWidth(500);
        result.current.toggleSidebar();
      });

      act(() => {
        result.current.resetAll();
      });

      expect(result.current.state).toEqual({
        sidebarWidth: PANEL_DEFAULTS.sidebarWidth,
        detailWidth: PANEL_DEFAULTS.detailWidth,
        sidebarCollapsed: PANEL_DEFAULTS.sidebarCollapsed,
        detailCollapsed: PANEL_DEFAULTS.detailCollapsed,
      });
    });
  });

  describe('localStorage persistence', () => {
    it('should persist state changes to localStorage after debounce', () => {
      const { result } = renderHook(() => usePanelLayout());

      act(() => {
        result.current.setSidebarWidth(280);
      });

      // Advance timers to trigger debounced save (150ms debounce)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('"sidebarWidth":280')
      );
    });

    it('should debounce localStorage writes during rapid updates', () => {
      const { result } = renderHook(() => usePanelLayout());

      // Rapid width updates (simulating drag)
      act(() => {
        for (let i = 240; i <= 300; i += 10) {
          result.current.setSidebarWidth(i);
        }
      });

      // Advance timers to trigger debounced save
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Final state should reflect last value
      expect(result.current.state.sidebarWidth).toBe(300);

      // localStorage should have been called with the final value
      expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
        STORAGE_KEY,
        expect.stringContaining('"sidebarWidth":300')
      );
    });
  });
});
