/**
 * App Component
 *
 * Root application component with panel-based layout.
 * Features resizable sidebar, main content area, and detail panel.
 * Includes theme toggle for dark/light mode.
 */

import { Routes, Route } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Specs from './pages/Specs';
import Fixes from './pages/Fixes';
import Tasks from './pages/Tasks';
import TasksKanban from './pages/TasksKanban';
import Roadmap from './pages/Roadmap';
import Memory from './pages/Memory';
import Skills from './pages/Skills';
import Recaps from './pages/Recaps';
import Patterns from './pages/Patterns';
import Chat from './pages/Chat';
import { ConnectionStatus } from './components/ConnectionStatus';
import { ThemeToggle, useTheme } from './components/ThemeToggle';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useWebSocketContext } from './contexts/WebSocketContext';
import type { ConnectionStatus as ConnectionStatusType } from './hooks/useWebSocket';
import {
  PanelLayout,
  PanelLayoutProvider,
  CollapsibleSidebar,
  DetailPanel,
  usePanelLayoutContext,
} from './components/layout';

// =============================================================================
// API Client
// =============================================================================

async function fetchStatus() {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

// =============================================================================
// Header Component
// =============================================================================

interface HeaderProps {
  isLoading: boolean;
  status: { framework?: { installed?: boolean } } | undefined;
  wsStatus: ConnectionStatusType;
  onReconnect: () => void;
}

function Header({ isLoading, status, wsStatus, onReconnect }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header
      className="
        flex items-center justify-between h-14 px-4
        bg-white dark:bg-terminal-card
        border-b border-gray-200 dark:border-terminal-border
      "
      role="banner"
    >
      {/* Left side - can add breadcrumbs or page title here */}
      <div className="flex-1" />

      {/* Right side - Status indicators and theme toggle */}
      <div className="flex items-center gap-3">
        {/* Project status */}
        {!isLoading && !status?.framework?.installed && (
          <span className="text-xs text-warning-dark dark:text-terminal-yellow bg-warning/10 dark:bg-terminal-yellow/10 px-2 py-1 rounded font-medium">
            Not initialized
          </span>
        )}

        {/* Theme toggle */}
        <ThemeToggle
          theme={theme}
          onThemeChange={setTheme}
        />

        {/* WebSocket connection status */}
        <ConnectionStatus status={wsStatus} onReconnect={onReconnect} />
      </div>
    </header>
  );
}

// =============================================================================
// Main Content Wrapper
// =============================================================================

interface MainContentProps {
  isLoading: boolean;
  status: { framework?: { installed?: boolean } } | undefined;
  wsStatus: ConnectionStatusType;
  onReconnect: () => void;
}

function MainContent({ isLoading, status, wsStatus, onReconnect }: MainContentProps) {
  return (
    <>
      {/* Header */}
      <Header
        isLoading={isLoading}
        status={status}
        wsStatus={wsStatus}
        onReconnect={onReconnect}
      />

      {/* Skip link for keyboard navigation */}
      <a href="#page-content" className="skip-link">
        Skip to page content
      </a>

      {/* Page content */}
      <div
        id="page-content"
        className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6"
      >
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/specs" element={<Specs />} />
            <Route path="/fixes" element={<Fixes />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/kanban" element={<TasksKanban />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/memory" element={<Memory />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/recaps" element={<Recaps />} />
            <Route path="/patterns" element={<Patterns />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </>
  );
}

// =============================================================================
// App Layout (uses context)
// =============================================================================

function AppLayout() {
  const { status: wsStatus, reconnect } = useWebSocketContext();
  const { state, toggleSidebar, detailContent, detailOpen, closeDetail } = usePanelLayoutContext();

  const { data: status, isLoading } = useQuery({
    queryKey: ['status'],
    queryFn: fetchStatus,
    // Reduce polling since WebSocket handles real-time updates
    refetchInterval: wsStatus === 'connected' ? 30000 : 5000,
  });

  return (
    <PanelLayout
      sidebar={
        <CollapsibleSidebar
          collapsed={state.sidebarCollapsed}
          onToggle={toggleSidebar}
        />
      }
      detail={
        detailOpen && detailContent ? (
          <DetailPanel onClose={closeDetail}>
            {detailContent}
          </DetailPanel>
        ) : undefined
      }
      detailOpen={detailOpen}
    >
      <MainContent
        isLoading={isLoading}
        status={status}
        wsStatus={wsStatus}
        onReconnect={reconnect}
      />
    </PanelLayout>
  );
}

// =============================================================================
// App Component (wraps with providers)
// =============================================================================

function App() {
  return (
    <PanelLayoutProvider>
      <AppLayout />
    </PanelLayoutProvider>
  );
}

export default App;
