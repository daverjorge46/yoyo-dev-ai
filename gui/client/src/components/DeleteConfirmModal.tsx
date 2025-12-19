/**
 * DeleteConfirmModal Component
 *
 * A safety-focused deletion modal requiring name confirmation.
 */

import { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  itemType: 'spec' | 'fix';
  itemName: string;
  itemId: string;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemType,
  itemName,
  itemId,
}: DeleteConfirmModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfirmed = confirmText === itemName || confirmText === itemId;

  const handleConfirm = async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmText('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Delete {itemType === 'spec' ? 'Specification' : 'Fix'}
          </h2>
        </div>

        {/* Warning text */}
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            You are about to delete{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {itemName}
            </span>
            . This action will move the {itemType} to the trash folder.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            To confirm, type{' '}
            <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-red-600 dark:text-red-400">
              {itemName}
            </code>{' '}
            below:
          </p>
        </div>

        {/* Confirmation input */}
        <div className="mb-4">
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`Type "${itemName}" to confirm`}
            disabled={isDeleting}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"
            autoFocus
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmed || isDeleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete {itemType === 'spec' ? 'Spec' : 'Fix'}
              </>
            )}
          </button>
        </div>

        {/* Recovery note */}
        <p className="mt-4 text-xs text-gray-400 text-center">
          Items can be recovered from{' '}
          <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
            .yoyo-dev/.trash/
          </code>
        </p>
      </div>
    </div>
  );
}
