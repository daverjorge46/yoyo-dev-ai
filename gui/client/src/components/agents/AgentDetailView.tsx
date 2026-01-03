/**
 * AgentDetailView Component
 *
 * Displays detailed information about an agent.
 */

import { useState } from 'react';
import { Edit, Copy, Trash2, Bot, Thermometer, Cpu, Crown, ArrowLeft, AlertTriangle } from 'lucide-react';
import type { Agent } from '../../../../shared/types/agent';
import { MarkdownPreview } from '../MarkdownPreview';

interface AgentDetailViewProps {
  /** Agent data */
  agent: Agent;
  /** Edit handler */
  onEdit: () => void;
  /** Duplicate handler */
  onDuplicate: () => void;
  /** Delete handler */
  onDelete: () => void;
  /** Back/close handler */
  onBack: () => void;
  /** Additional className */
  className?: string;
}

export function AgentDetailView({
  agent,
  onEdit,
  onDuplicate,
  onDelete,
  onBack,
  className = '',
}: AgentDetailViewProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isPrimary = agent.mode === 'Primary';
  const isProtected = agent.id === 'yoyo-ai';

  // Format model name for display
  const formatModel = (model: string): string => {
    if (model.includes('opus')) return 'Claude Opus 4.5';
    if (model.includes('sonnet')) return 'Claude Sonnet 4';
    if (model.includes('gpt-4o-mini')) return 'GPT-4o Mini';
    if (model.includes('gpt-4o')) return 'GPT-4o';
    if (model.includes('gemini')) return 'Gemini';
    return model;
  };

  // Temperature color based on value
  const getTempColor = (temp: number): string => {
    if (temp <= 0.3) return 'text-blue-400';
    if (temp <= 0.7) return 'text-green-400';
    if (temp <= 1.2) return 'text-yellow-400';
    return 'text-red-400';
  };

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-terminal-border">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded hover:bg-terminal-bg-tertiary text-gray-400 hover:text-white transition-colors"
            aria-label="Back to list"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className={`
              p-2 rounded-lg
              ${isPrimary ? 'bg-terminal-orange/20 text-terminal-orange' : 'bg-terminal-cyan/20 text-terminal-cyan'}
            `}>
              {isPrimary ? <Crown className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{agent.name}</h2>
              <span className={`
                text-xs px-2 py-0.5 rounded-full
                ${isPrimary ? 'bg-terminal-orange/20 text-terminal-orange' : 'bg-terminal-cyan/20 text-terminal-cyan'}
              `}>
                {agent.mode}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-terminal-bg-tertiary text-gray-300 hover:text-white transition-colors"
          >
            <Edit className="h-4 w-4" />
            <span className="text-sm">Edit</span>
          </button>
          <button
            onClick={onDuplicate}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-terminal-bg-tertiary text-gray-300 hover:text-white transition-colors"
          >
            <Copy className="h-4 w-4" />
            <span className="text-sm">Duplicate</span>
          </button>
          {!isProtected && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span className="text-sm">Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Description */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
          <p className="text-gray-200">{agent.description}</p>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Model */}
          <div className="bg-terminal-bg-secondary rounded-lg p-3 border border-terminal-border">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Cpu className="h-4 w-4" />
              <span className="text-xs uppercase">Model</span>
            </div>
            <p className="text-white font-medium">{formatModel(agent.model)}</p>
          </div>

          {/* Temperature */}
          <div className="bg-terminal-bg-secondary rounded-lg p-3 border border-terminal-border">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Thermometer className={`h-4 w-4 ${getTempColor(agent.temperature)}`} />
              <span className="text-xs uppercase">Temperature</span>
            </div>
            <p className={`font-medium ${getTempColor(agent.temperature)}`}>
              {agent.temperature.toFixed(1)}
            </p>
          </div>

          {/* Version */}
          <div className="bg-terminal-bg-secondary rounded-lg p-3 border border-terminal-border">
            <div className="text-gray-400 text-xs uppercase mb-1">Version</div>
            <p className="text-white font-medium">{agent.version}</p>
          </div>

          {/* Tools */}
          <div className="bg-terminal-bg-secondary rounded-lg p-3 border border-terminal-border">
            <div className="text-gray-400 text-xs uppercase mb-1">Tool Access</div>
            <p className="text-white font-medium">
              {agent.tools === '*' ? 'All Tools' : agent.tools}
            </p>
          </div>
        </div>

        {/* Output prefix */}
        {agent.outputPrefix && (
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Output Prefix</h3>
            <code className="px-2 py-1 bg-terminal-bg-secondary rounded text-terminal-orange">
              {agent.outputPrefix}
            </code>
          </div>
        )}

        {/* Fallback model */}
        {agent.fallbackModel && (
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Fallback Model</h3>
            <p className="text-gray-200">{formatModel(agent.fallbackModel)}</p>
          </div>
        )}

        {/* Agent instructions */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Agent Instructions</h3>
          <div className="bg-terminal-bg-secondary rounded-lg p-4 border border-terminal-border">
            <MarkdownPreview content={agent.content} />
          </div>
        </div>

        {/* File path */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">File Path</h3>
          <code className="text-xs text-gray-500 block break-all">{agent.filePath}</code>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-terminal-bg-secondary border border-terminal-border rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-500/20">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Delete Agent</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete <strong>{agent.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg bg-terminal-bg-tertiary text-gray-300 hover:bg-terminal-bg-quaternary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
