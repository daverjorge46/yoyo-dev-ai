/**
 * PanelLayoutContext
 *
 * React context for sharing panel layout state across components.
 * Wraps usePanelLayout hook to provide centralized state management.
 */

import { createContext, useContext, ReactNode } from 'react';
import { usePanelLayout, UsePanelLayoutReturn } from '../../hooks/usePanelLayout';

// =============================================================================
// Context
// =============================================================================

const PanelLayoutContext = createContext<UsePanelLayoutReturn | null>(null);

// =============================================================================
// Provider
// =============================================================================

export interface PanelLayoutProviderProps {
  children: ReactNode;
}

export function PanelLayoutProvider({ children }: PanelLayoutProviderProps) {
  const panelLayout = usePanelLayout();

  return (
    <PanelLayoutContext.Provider value={panelLayout}>
      {children}
    </PanelLayoutContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Access panel layout context.
 * Must be used within PanelLayoutProvider.
 */
export function usePanelLayoutContext(): UsePanelLayoutReturn {
  const context = useContext(PanelLayoutContext);

  if (!context) {
    throw new Error(
      'usePanelLayoutContext must be used within a PanelLayoutProvider'
    );
  }

  return context;
}
