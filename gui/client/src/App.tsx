/**
 * App Component
 *
 * Root application component with panel-based layout.
 * Features resizable sidebar, main content area, and detail panel.
 * Includes theme toggle for dark/light mode.
 */

import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Menu } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Specs from './pages/Specs';
import Fixes from './pages/Fixes';
import TasksKanban from './pages/TasksKanban';
import Roadmap from './pages/Roadmap';
import Memory from './pages/Memory';
import Skills from './pages/Skills';
import Recaps from './pages/Recaps';
import Patterns from './pages/Patterns';
import Agents from './pages/Agents';
import Terminals from './pages/Terminals';
import QA from './pages/QA';
import Help from './pages/Help';
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
import { ChatPanelProvider, useChatPanel } from './contexts/ChatPanelContext';
import { ChatSidebarPanel } from './components/layout/ChatSidebarPanel';

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
  onMenuOpen: () => void;
}

function Header({ isLoading, status, wsStatus, onReconnect, onMenuOpen }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header
      className="
        flex items-center justify-between h-14 px-4
        bg-white dark:bg-terminal-card
        border-b border-gray-200 dark:border-terminal-border
        ml-16 lg:ml-0
      "
      role="banner"
    >
      {/* Left side - Hamburger menu on mobile */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpen}
          className="lg:hidden p-2 -ml-2 rounded-md text-gray-500 dark:text-terminal-text-secondary hover:bg-gray-100 dark:hover:bg-terminal-elevated"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-terminal-text lg:hidden">
          Yoyo <span className="text-primary dark:text-terminal-orange">Dev</span>
        </h1>
      </div>

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
  onMenuOpen: () => void;
}

function MainContent({ isLoading, status, wsStatus, onReconnect, onMenuOpen }: MainContentProps) {
  return (
    <>
      {/* Header */}
      <Header
        isLoading={isLoading}
        status={status}
        wsStatus={wsStatus}
        onReconnect={onReconnect}
        onMenuOpen={onMenuOpen}
      />

      {/* Skip link for keyboard navigation */}
      <a href="#page-content" className="skip-link">
        Skip to page content
      </a>

      {/* Page content - add left margin on mobile for icon strip */}
      <div
        id="page-content"
        className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 ml-16 lg:ml-0"
      >
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/specs" element={<Specs />} />
            <Route path="/fixes" element={<Fixes />} />
            <Route path="/tasks" element={<TasksKanban />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/memory" element={<Memory />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/recaps" element={<Recaps />} />
            <Route path="/patterns" element={<Patterns />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/terminals" element={<Terminals />} />
            <Route path="/qa" element={<QA />} />
            <Route path="/help" element={<Help />} />
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
  const { isChatOpen, closeChat } = useChatPanel();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['status'],
    queryFn: fetchStatus,
    // Reduce polling since WebSocket handles real-time updates
    refetchInterval: wsStatus === 'connected' ? 30000 : 5000,
  });

  return (
    <>
      <PanelLayout
        sidebar={
          <CollapsibleSidebar
            collapsed={state.sidebarCollapsed}
            onToggle={toggleSidebar}
            mobileOpen={mobileMenuOpen}
            onMobileClose={() => setMobileMenuOpen(false)}
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
          onMenuOpen={() => setMobileMenuOpen(true)}
        />
      </PanelLayout>

      {/* Chat Sidebar Panel */}
      <ChatSidebarPanel isOpen={isChatOpen} onClose={closeChat} />
    </>
  );
}

// =============================================================================
// App Component (wraps with providers)
// =============================================================================

function App() {
  return (
    <ChatPanelProvider>
      <PanelLayoutProvider>
        <AppLayout />
      </PanelLayoutProvider>
    </ChatPanelProvider>
  );
}

export default App;
