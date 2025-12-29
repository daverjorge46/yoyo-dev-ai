/**
 * RoadmapEditor Component
 *
 * Inline editing component for phase names and descriptions.
 * Supports keyboard shortcuts (Enter to save, Escape to cancel).
 */

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Check, X } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface RoadmapEditorProps {
  /** Initial value */
  value: string;
  /** Callback when save is triggered */
  onSave: (value: string) => void;
  /** Callback when cancel is triggered */
  onCancel: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Optional multiline mode */
  multiline?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function RoadmapEditor({
  value,
  onSave,
  onCancel,
  placeholder = 'Enter text',
  multiline = false,
}: RoadmapEditorProps) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    // Select all text
    if (inputRef.current) {
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      onSave(trimmed);
    }
  };

  const isValid = editValue.trim().length > 0;

  const inputClassName = `
    flex-1 px-2 py-1 text-sm
    bg-white dark:bg-gray-700
    border border-gray-300 dark:border-gray-600
    rounded focus:outline-none focus:ring-2 focus:ring-indigo-500
    text-gray-900 dark:text-white
  `;

  return (
    <div
      className="flex items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${inputClassName} min-h-[60px] resize-y`}
          rows={3}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClassName}
        />
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!isValid}
        className={`
          p-1.5 rounded transition-colors
          ${
            isValid
              ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
          }
        `}
        data-testid="save-button"
        aria-label="Save"
      >
        <Check className="h-4 w-4" />
      </button>

      {/* Cancel Button */}
      <button
        onClick={onCancel}
        className="p-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
        data-testid="cancel-button"
        aria-label="Cancel"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
