import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface PanelLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  detail?: React.ReactNode;
  onDetailClose?: () => void;
}

export function PanelLayout({ sidebar, children, detail, onDetailClose }: PanelLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [detailWidth, setDetailWidth] = useState(320);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingDetail, setIsResizingDetail] = useState(false);

  const handleSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);

    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.max(180, Math.min(400, startWidth + delta));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingSidebar(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [sidebarWidth]);

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
    <div className="flex h-screen w-screen overflow-hidden bg-terminal-bg">
      {/* Sidebar */}
      <div
        className="flex-shrink-0 border-r border-terminal-border bg-terminal-card"
        style={{ width: sidebarWidth }}
      >
        {sidebar}
      </div>

      {/* Sidebar resize handle */}
      <div
        className={`w-1 cursor-col-resize hover:bg-primary-500/50 transition-colors ${
          isResizingSidebar ? 'bg-primary-500' : 'bg-transparent'
        }`}
        onMouseDown={handleSidebarResize}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
              className={`w-1 cursor-col-resize hover:bg-primary-500/50 transition-colors ${
                isResizingDetail ? 'bg-primary-500' : 'bg-transparent'
              }`}
              onMouseDown={handleDetailResize}
            />

            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: detailWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 border-l border-terminal-border bg-terminal-card overflow-hidden"
            >
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-end p-2 border-b border-terminal-border">
                  <button
                    onClick={onDetailClose}
                    className="p-1 hover:bg-terminal-elevated rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-terminal-text-secondary" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  {detail}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
