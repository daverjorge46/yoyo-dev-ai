/**
 * CreateFixModal Component
 *
 * Modal for creating a new fix with problem summary and root cause fields.
 */

import { useState } from 'react';
import { X, Wrench, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CreateFixInput {
  name: string;
  problemSummary: string;
  rootCause?: string;
  affectedFiles?: string[];
}

interface CreateFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (fixId: string) => void;
}

async function createFix(input: CreateFixInput) {
  const res = await fetch('/api/fixes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to create fix');
  }

  return res.json();
}

export function CreateFixModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateFixModalProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [problemSummary, setProblemSummary] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [affectedFiles, setAffectedFiles] = useState<string[]>([]);
  const [newFile, setNewFile] = useState('');

  const mutation = useMutation({
    mutationFn: createFix,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fixes'] });
      onSuccess?.(data.id);
      handleClose();
    },
  });

  if (!isOpen) return null;

  const handleClose = () => {
    if (mutation.isPending) return;
    setName('');
    setProblemSummary('');
    setRootCause('');
    setAffectedFiles([]);
    setNewFile('');
    mutation.reset();
    onClose();
  };

  const handleAddFile = () => {
    if (newFile.trim() && !affectedFiles.includes(newFile.trim())) {
      setAffectedFiles([...affectedFiles, newFile.trim()]);
      setNewFile('');
    }
  };

  const handleRemoveFile = (file: string) => {
    setAffectedFiles(affectedFiles.filter((f) => f !== file));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !problemSummary.trim()) return;

    mutation.mutate({
      name: name.trim(),
      problemSummary: problemSummary.trim(),
      rootCause: rootCause.trim() || undefined,
      affectedFiles: affectedFiles.length > 0 ? affectedFiles : undefined,
    });
  };

  const isValid = name.trim() && problemSummary.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create New Fix
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={mutation.isPending}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fix Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., login-redirect-issue"
              disabled={mutation.isPending}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              A short, descriptive name for the bug fix
            </p>
          </div>

          {/* Problem Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Problem Summary <span className="text-red-500">*</span>
            </label>
            <textarea
              value={problemSummary}
              onChange={(e) => setProblemSummary(e.target.value)}
              placeholder="Describe the bug or issue that needs to be fixed..."
              rows={3}
              disabled={mutation.isPending}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 resize-none"
            />
          </div>

          {/* Root Cause */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Root Cause (Optional)
            </label>
            <textarea
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="If known, describe the underlying cause of the issue..."
              rows={2}
              disabled={mutation.isPending}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 resize-none"
            />
          </div>

          {/* Affected Files */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Affected Files (Optional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newFile}
                onChange={(e) => setNewFile(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFile();
                  }
                }}
                placeholder="e.g., src/auth/login.ts"
                disabled={mutation.isPending}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 font-mono text-sm"
              />
              <button
                type="button"
                onClick={handleAddFile}
                disabled={mutation.isPending || !newFile.trim()}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {affectedFiles.length > 0 && (
              <div className="space-y-1">
                {affectedFiles.map((file) => (
                  <div
                    key={file}
                    className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded text-sm font-mono"
                  >
                    <span className="text-gray-700 dark:text-gray-300 truncate">
                      {file}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(file)}
                      disabled={mutation.isPending}
                      className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error message */}
          {mutation.isError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Failed to create fix'}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 justify-end p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={mutation.isPending}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Fix
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
