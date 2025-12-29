/**
 * AgentControls Component
 *
 * Start/stop/cancel controls for agent operations.
 */

import { useState } from 'react';
import { XCircle, Trash2, Loader2 } from 'lucide-react';

export type AgentStatus = 'waiting' | 'running' | 'completed' | 'failed' | 'cancelled';

interface AgentControlsProps {
  agentId: string;
  status: AgentStatus;
  onCancel?: (agentId: string) => Promise<void>;
  onRemove?: (agentId: string) => Promise<void>;
  compact?: boolean;
  className?: string;
}

export function AgentControls({
  agentId,
  status,
  onCancel,
  onRemove,
  compact = false,
  className = '',
}: AgentControlsProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleCancel = async () => {
    if (!onCancel || isCancelling) return;

    setIsCancelling(true);
    try {
      await onCancel(agentId);
    } catch (error) {
      console.error('Failed to cancel agent:', error);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove || isRemoving) return;

    setIsRemoving(true);
    try {
      await onRemove(agentId);
    } catch (error) {
      console.error('Failed to remove agent:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  const canCancel = (status === 'running' || status === 'waiting') && onCancel;
  const canRemove = (status === 'completed' || status === 'failed' || status === 'cancelled') && onRemove;

  if (!canCancel && !canRemove) {
    return null;
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="p-1 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Cancel agent"
            aria-label="Cancel agent execution"
          >
            {isCancelling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
          </button>
        )}
        {canRemove && (
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="p-1 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Remove agent"
            aria-label="Remove agent from list"
          >
            {isRemoving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={isCancelling}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Cancel agent execution"
        >
          {isCancelling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <span>Cancel</span>
        </button>
      )}
      {canRemove && (
        <button
          onClick={handleRemove}
          disabled={isRemoving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Remove agent from list"
        >
          {isRemoving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          <span>Remove</span>
        </button>
      )}
    </div>
  );
}
