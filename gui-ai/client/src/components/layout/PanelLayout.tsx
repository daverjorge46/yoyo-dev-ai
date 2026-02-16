import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Menu, Wifi, WifiOff } from 'lucide-react';
import { CollapsibleSidebar } from './CollapsibleSidebar';
import { useGatewayStatus } from '../../hooks/useGatewayStatus';
import { ThemeToggle, useTheme } from '../ThemeToggle';

interface PanelLayoutProps {
  children: React.ReactNode;
  detail?: React.ReactNode;
  onDetailClose?: () => void;
}

export function PanelLayout({ children, detail, onDetailClose }: PanelLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [detailWidth, setDetailWidth] = useState(320);
  const [isResizingDetail, setIsResizingDetail] = useState(false);
  const { theme, setTheme } = useTheme();

  // Use WebSocket-based gateway status instead of removed HTTP endpoint
  const { isConnected: yoyoclawConnected } = useGatewayStatus();

  const handleDetailResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingDetail(true);

    const startX = e.clientX;
    const startWidth = detailWidth;

    const onMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const newWidth = Math.max(280, Math.min(600, startWidth + delta));
      setDetailWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingDetail(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [detailWidth]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-terminal-bg">
      {/* Sidebar */}
      <CollapsibleSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area - add left margin on mobile for icon strip */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden ml-16 lg:ml-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-terminal-card border-b border-gray-200 dark:border-terminal-border">
          {/* Left side - Mobile menu button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-500 dark:text-terminal-text-secondary hover:bg-gray-100 dark:hover:bg-terminal-elevated"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-terminal-text lg:hidden">
              Yoyo <span className="text-primary dark:text-terminal-orange">AI</span>
            </h1>
          </div>

          {/* Right side - Theme toggle and status */}
          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} onThemeChange={setTheme} />

            {/* Connection status */}
            <div className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-sm
              border
              ${yoyoclawConnected
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400'
              }
            `}>
              {yoyoclawConnected ? (
                <Wifi className="h-4 w-4" />
              ) : (
                <WifiOff className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {yoyoclawConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {detail && (
          <>
            {/* Detail resize handle */}
            <div
              className={`hidden lg:block w-1 cursor-col-resize hover:bg-primary/50 transition-colors ${
                isResizingDetail ? 'bg-primary' : 'bg-transparent'
              }`}
              onMouseDown={handleDetailResize}
            />

            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: detailWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="hidden lg:flex flex-shrink-0 border-l border-gray-200 dark:border-terminal-border bg-white dark:bg-terminal-card overflow-hidden"
            >
              <div className="h-full flex flex-col w-full">
                <div className="flex items-center justify-end p-2 border-b border-gray-200 dark:border-terminal-border">
                  <button
                    onClick={onDetailClose}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-terminal-elevated rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500 dark:text-terminal-text-secondary" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  {detail}
                </div>
              </div>
            </motion.div>

            {/* Mobile detail overlay */}
            <div className="lg:hidden fixed inset-0 z-50">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={onDetailClose}
                aria-hidden="true"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.2 }}
                className="absolute inset-y-0 right-0 w-full max-w-md bg-white dark:bg-terminal-card"
              >
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-terminal-border">
                    <span className="font-medium text-gray-900 dark:text-terminal-text">Details</span>
                    <button
                      onClick={onDetailClose}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-terminal-elevated rounded transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500 dark:text-terminal-text-secondary" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {detail}
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
