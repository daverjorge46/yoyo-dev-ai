/**
 * FileEditorModal Component
 *
 * Modal with split-pane markdown editor and preview.
 */

import { useState, useCallback, useEffect } from 'react';
import { X, Save, RefreshCw, Eye, EyeOff, AlertTriangle, Check } from 'lucide-react';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { useFileEditor } from '../hooks/useFileEditor';

interface FileEditorModalProps {
  filePath: string;
  onClose: () => void;
  title?: string;
}

export function FileEditorModal({ filePath, onClose, title }: FileEditorModalProps) {
  const [showPreview, setShowPreview] = useState(true);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const {
    content,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    error,
    lastSaved,
    setContent,
    save,
    reload,
    discardChanges,
  } = useFileEditor(filePath, {
    autoSave: true,
    autoSaveDelay: 2000,
    onSaveSuccess: () => {
      setSaveMessage('Saved');
      setTimeout(() => setSaveMessage(null), 2000);
    },
    onSaveError: (err) => {
      setSaveMessage(`Error: ${err.message}`);
      setTimeout(() => setSaveMessage(null), 3000);
    },
    onConflict: () => {
      setConflictMessage(
        'File was modified externally. Reload to see changes or save to overwrite.'
      );
    },
  });

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (hasUnsavedChanges) {
          if (confirm('You have unsaved changes. Discard them?')) {
            onClose();
          }
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, onClose]);

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      await save();
      setConflictMessage(null);
    } catch {
      // Error handled by onSaveError
    }
  }, [save]);

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Discard them?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    const startX = e.clientX;
    const startRatio = splitRatio;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const container = document.getElementById('editor-container');
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const deltaX = moveEvent.clientX - startX;
      const deltaRatio = deltaX / containerRect.width;
      const newRatio = Math.max(0.2, Math.min(0.8, startRatio + deltaRatio));
      setSplitRatio(newRatio);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [splitRatio]);

  const displayTitle = title || filePath.split('/').pop() || 'Editor';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-[95vw] h-[90vh] bg-gray-900 rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">{displayTitle}</h2>
            {hasUnsavedChanges && (
              <span className="px-2 py-0.5 text-xs bg-yellow-600 text-white rounded">
                Unsaved
              </span>
            )}
            {saveMessage && (
              <span
                className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 ${
                  saveMessage === 'Saved'
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white'
                }`}
              >
                {saveMessage === 'Saved' && <Check className="h-3 w-3" />}
                {saveMessage}
              </span>
            )}
            {lastSaved && !saveMessage && !hasUnsavedChanges && (
              <span className="text-xs text-gray-400">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Preview */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title={showPreview ? 'Hide Preview' : 'Show Preview'}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>

            {/* Reload */}
            <button
              onClick={reload}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
              title="Reload from disk"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>

            {/* Close */}
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Conflict Warning */}
        {conflictMessage && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-900/50 border-b border-yellow-700 text-yellow-200 text-sm">
            <AlertTriangle className="h-4 w-4" />
            {conflictMessage}
            <button
              onClick={() => {
                reload();
                setConflictMessage(null);
              }}
              className="ml-2 underline hover:no-underline"
            >
              Reload
            </button>
            <button
              onClick={() => setConflictMessage(null)}
              className="ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-red-900/50 border-b border-red-700 text-red-200 text-sm">
            Error: {error.message}
          </div>
        )}

        {/* Editor Area */}
        <div id="editor-container" className="flex-1 flex overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading...
            </div>
          ) : (
            <>
              {/* Editor Pane */}
              <div
                style={{ width: showPreview ? `${splitRatio * 100}%` : '100%' }}
                className="h-full overflow-hidden"
              >
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  onSave={handleSave}
                />
              </div>

              {/* Resizer */}
              {showPreview && (
                <div
                  className="w-1 bg-gray-700 hover:bg-indigo-500 cursor-col-resize transition-colors"
                  onMouseDown={handleMouseDown}
                />
              )}

              {/* Preview Pane */}
              {showPreview && (
                <div
                  style={{ width: `${(1 - splitRatio) * 100}%` }}
                  className="h-full overflow-hidden border-l border-gray-700"
                >
                  <MarkdownPreview content={content} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
          <span>{filePath}</span>
          <div className="flex items-center gap-4">
            <span>Ctrl+S to save</span>
            <span>Ctrl+B bold</span>
            <span>Ctrl+I italic</span>
            <span>Ctrl+K link</span>
          </div>
        </div>
      </div>
    </div>
  );
}
