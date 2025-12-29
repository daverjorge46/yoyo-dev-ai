/**
 * ChangelogGenerator Component
 *
 * Modal dialog for generating changelogs from completed specs.
 * Provides format selection, preview, copy, and download functionality.
 */

import { useState, useEffect, useRef } from 'react';
import { X, FileText, Download, Copy, Check, RefreshCw, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { ChangelogFormatSelector, type ChangelogFormat } from './ChangelogFormatSelector';
import { ChangelogPreview } from './ChangelogPreview';

// =============================================================================
// Types
// =============================================================================

interface ChangelogGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  specId: string;
  specName: string;
}

interface GenerateChangelogInput {
  specId: string;
  format: ChangelogFormat;
}

interface GenerateChangelogResponse {
  changelog: string;
  sections: ChangelogSection[];
}

interface ChangelogSection {
  type: 'Added' | 'Changed' | 'Fixed' | 'Removed';
  entries: string[];
}

// =============================================================================
// API Functions
// =============================================================================

async function generateChangelog(
  input: GenerateChangelogInput
): Promise<GenerateChangelogResponse> {
  const res = await fetch('/api/changelog/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to generate changelog');
  }

  return res.json();
}

// =============================================================================
// Component
// =============================================================================

export function ChangelogGenerator({
  isOpen,
  onClose,
  specId,
  specName,
}: ChangelogGeneratorProps) {
  const [format, setFormat] = useState<ChangelogFormat>('keepachangelog');
  const [changelog, setChangelog] = useState('');
  const [copied, setCopied] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setChangelog('');
      setCopied(false);
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: generateChangelog,
    onSuccess: (data) => {
      setChangelog(data.changelog);
    },
  });

  if (!isOpen) return null;

  const handleGenerate = () => {
    mutation.mutate({ specId, format });
  };

  const handleClose = () => {
    if (mutation.isPending) return;
    onClose();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(changelog);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([changelog], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CHANGELOG-${specId}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasChangelog = changelog.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        data-testid="modal-backdrop"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-title"
        className="
          relative
          bg-white dark:bg-gray-800
          rounded-lg shadow-xl
          max-w-3xl w-full mx-4
          max-h-[90vh]
          overflow-hidden
          flex flex-col
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
              <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2
                id="changelog-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                Generate Changelog
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {specName}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={handleClose}
            disabled={mutation.isPending}
            className="
              p-2
              text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
              rounded-lg
              hover:bg-gray-100 dark:hover:bg-gray-700
              transition-colors
              disabled:opacity-50
            "
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Format selector */}
          <ChangelogFormatSelector
            value={format}
            onChange={setFormat}
            disabled={mutation.isPending}
            showDescription
          />

          {/* Generate button */}
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={mutation.isPending}
              className="
                flex items-center gap-2
                px-4 py-2
                bg-indigo-600 text-white
                rounded-lg
                hover:bg-indigo-700
                transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              aria-label="Generate changelog"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : hasChangelog ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generate
                </>
              )}
            </button>
          </div>

          {/* Error message */}
          {mutation.isError && (
            <div
              className="
                p-3
                bg-red-50 dark:bg-red-900/20
                border border-red-200 dark:border-red-800
                rounded-lg
                text-sm text-red-600 dark:text-red-400
              "
              role="alert"
            >
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Failed to generate changelog'}
            </div>
          )}

          {/* Preview */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview
            </h3>
            <ChangelogPreview
              content={changelog}
              isLoading={mutation.isPending}
              showCopyButton={hasChangelog}
            />
          </div>
        </div>

        {/* Footer with actions */}
        {hasChangelog && (
          <div className="flex gap-3 justify-end p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleCopy}
              className="
                flex items-center gap-2
                px-4 py-2
                text-gray-700 dark:text-gray-300
                bg-gray-100 dark:bg-gray-700
                rounded-lg
                hover:bg-gray-200 dark:hover:bg-gray-600
                transition-colors
              "
              aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="
                flex items-center gap-2
                px-4 py-2
                bg-indigo-600 text-white
                rounded-lg
                hover:bg-indigo-700
                transition-colors
              "
              aria-label="Download changelog"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
