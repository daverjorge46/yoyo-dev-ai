/**
 * PanelLayout Component
 *
 * Main layout wrapper with resizable sidebar and detail panels.
 * Uses flexbox for layout with resizable panels on left and right.
 *
 * Layout structure:
 * +------------------+---------------------------+------------------+
 * | Sidebar (Nav)    | Main Content Area         | Detail Panel     |
 * | - Dashboard      | - Kanban Board            | - Task Details   |
 * | - Tasks          | - Chat Interface          | - File Preview   |
 * | - Specs          | - Roadmap Timeline        | - Agent Logs     |
 * | - Roadmap        |                           |                  |
 * +------------------+---------------------------+------------------+
 */

import { ReactNode } from 'react';
import { ResizablePanel } from './ResizablePanel';
import { usePanelLayoutContext } from './PanelLayoutContext';
import { PANEL_DEFAULTS } from '../../hooks/usePanelLayout';

// =============================================================================
// Types
// =============================================================================

export interface PanelLayoutProps {
  /** Sidebar content (navigation) */
  sidebar: ReactNode;
  /** Main content area */
  children: ReactNode;
  /** Detail panel content (optional) */
  detail?: ReactNode;
  /** Force detail panel open (overrides state) */
  detailOpen?: boolean;
  /** Additional class names for the layout container */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function PanelLayout({
  sidebar,
  children,
  detail,
  detailOpen,
  className = '',
}: PanelLayoutProps) {
  const {
    state,
    setSidebarWidth,
    setDetailWidth,
    resetSidebar,
    resetDetail,
  } = usePanelLayoutContext();

  // Determine if detail panel should be visible
  const showDetail =
    detail !== undefined && (detailOpen !== undefined ? detailOpen : !state.detailCollapsed);

  return (
    <div
      className={`
        flex h-screen overflow-hidden
        bg-gray-50 dark:bg-gray-900
        ${className}
      `.trim()}
      data-testid="panel-layout"
    >
      {/* Sidebar Panel - Desktop only (mobile sidebar is rendered by CollapsibleSidebar as fixed overlay) */}
      <div className="hidden lg:block">
        <ResizablePanel
          side="left"
          width={state.sidebarWidth}
          minWidth={PANEL_DEFAULTS.sidebarMinWidth}
          maxWidth={PANEL_DEFAULTS.sidebarMaxWidth}
          collapsed={state.sidebarCollapsed}
          collapsedWidth={PANEL_DEFAULTS.collapsedWidth}
          onWidthChange={setSidebarWidth}
          onDoubleClick={resetSidebar}
          data-testid="sidebar-panel"
        >
          {sidebar}
        </ResizablePanel>
      </div>

      {/* Mobile: Render sidebar outside ResizablePanel for fixed positioning */}
      <div className="lg:hidden">
        {sidebar}
      </div>

      {/* Main Content Area */}
      <main
        className="flex-1 min-w-0 overflow-hidden flex flex-col"
        role="main"
        id="main-content"
      >
        {children}
      </main>

      {/* Detail Panel (conditional) */}
      {showDetail && (
        <ResizablePanel
          side="right"
          width={state.detailWidth}
          minWidth={PANEL_DEFAULTS.detailMinWidth}
          maxWidth={PANEL_DEFAULTS.detailMaxWidth}
          collapsed={false}
          onWidthChange={setDetailWidth}
          onDoubleClick={resetDetail}
          data-testid="detail-panel"
        >
          {detail}
        </ResizablePanel>
      )}
    </div>
  );
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export { PanelLayoutProvider, usePanelLayoutContext } from './PanelLayoutContext';
export { CollapsibleSidebar } from './CollapsibleSidebar';
export { DetailPanel, DetailPanelEmpty } from './DetailPanel';
export { ResizablePanel } from './ResizablePanel';
