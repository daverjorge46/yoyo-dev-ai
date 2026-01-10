/**
 * Terminals Page
 *
 * Agent terminal management interface featuring:
 * - Grid of terminal cards
 * - New terminal spawning with agent selection
 * - Bulk actions (Kill All, Pause All)
 * - Terminal detail panel
 */

import { useState } from 'react';
import {
  Terminal,
  Plus,
  Square,
  Pause,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useTerminals } from '../hooks/useTerminals';
import { usePanelLayoutContext } from '../components/layout';
import { TerminalCard, TerminalDetailPanel } from '../components/terminals';
import type { AgentTerminal, AgentType } from '../types/terminal';
import { AGENT_TYPE_LABELS } from '../types/terminal';

// =============================================================================
// Agent Selection Modal
// =============================================================================

interface AgentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (agentType: AgentType) => void;
  isSpawning: boolean;
}

function AgentSelectionModal({ isOpen, onClose, onSelect, isSpawning }: AgentSelectionModalProps) {
  if (!isOpen) return null;

  const agents: { type: AgentType; description: string }[] = [
    { type: 'yoyo-ai', description: 'Primary orchestrator for complex multi-step tasks' },
    { type: 'dave-engineer', description: 'Frontend and UI specialist' },
    { type: 'implementer', description: 'Focused code implementation' },
    { type: 'arthas-oracle', description: 'Strategic advisor and debugger' },
    { type: 'alma-librarian', description: 'External research and documentation' },
    { type: 'alvaro-explore', description: 'Codebase search and exploration' },
    { type: 'angeles-writer', description: 'Technical documentation writer' },
    { type: 'qa-reviewer', description: 'Quality assurance validation' },
    { type: 'qa-fixer', description: 'Issue resolution from QA reports' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-terminal-card rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-terminal-border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-terminal-text">
            Select Agent
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-terminal-bg-hover transition-colors"
            disabled={isSpawning}
          >
            <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          <div className="space-y-2">
            {agents.map(({ type, description }) => (
              <button
                key={type}
                onClick={() => onSelect(type)}
                disabled={isSpawning}
                className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-terminal-border hover:bg-gray-50 dark:hover:bg-terminal-bg-hover transition-colors disabled:opacity-50"
              >
                <div className="font-medium text-gray-900 dark:text-terminal-text">
                  {AGENT_TYPE_LABELS[type]}
                </div>
                <div className="text-sm text-gray-500 dark:text-terminal-text-muted">
                  {description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export default function Terminals() {
  const {
    terminals,
    stats,
    isLoading,
    error,
    spawn,
    kill,
    pause,
    resume,
    killAll,
    refresh,
    isSpawning,
  } = useTerminals();

  const { setDetailContent, setDetailOpen } = usePanelLayoutContext();
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [, setSelectedTerminal] = useState<AgentTerminal | null>(null);

  // Handle agent selection
  const handleAgentSelect = async (agentType: AgentType) => {
    try {
      await spawn({ agentType });
      setShowAgentModal(false);
    } catch (err) {
      console.error('Failed to spawn terminal:', err);
    }
  };

  // Handle terminal focus
  const handleFocus = (terminalId: string) => {
    const terminal = terminals.find((t) => t.id === terminalId);
    if (terminal) {
      setSelectedTerminal(terminal);
      setDetailContent(
        <TerminalDetailPanel
          terminal={terminal}
          onClose={() => {
            setSelectedTerminal(null);
            setDetailOpen(false);
          }}
          onPause={pause}
          onResume={resume}
          onKill={kill}
        />
      );
      setDetailOpen(true);
    }
  };

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 terminal-card p-8">
        <AlertCircle className="h-10 w-10 text-error dark:text-terminal-red mb-3" />
        <p className="text-error dark:text-terminal-red font-medium mb-1">
          Failed to load terminals
        </p>
        <p className="text-sm text-gray-500 dark:text-terminal-text-muted">
          {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-terminal-text flex items-center gap-2">
            <Terminal className="h-6 w-6 text-brand dark:text-terminal-orange" />
            Agent Terminals
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-terminal-text-muted">
            Manage parallel AI agent sessions
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-terminal-text bg-white dark:bg-terminal-bg-secondary border border-gray-300 dark:border-terminal-border rounded-md hover:bg-gray-50 dark:hover:bg-terminal-bg-hover transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {stats.running > 0 && (
            <>
              <button
                onClick={() => {
                  // Pause all running terminals
                  terminals
                    .filter((t) => t.status === 'running')
                    .forEach((t) => pause(t.id));
                }}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-yellow-700 dark:text-terminal-yellow bg-yellow-50 dark:bg-terminal-yellow/10 border border-yellow-300 dark:border-terminal-yellow/30 rounded-md hover:bg-yellow-100 dark:hover:bg-terminal-yellow/20 transition-colors"
              >
                <Pause className="h-4 w-4" />
                Pause All
              </button>
              <button
                onClick={() => killAll()}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 dark:text-terminal-red bg-red-50 dark:bg-terminal-red/10 border border-red-300 dark:border-terminal-red/30 rounded-md hover:bg-red-100 dark:hover:bg-terminal-red/20 transition-colors"
              >
                <Square className="h-4 w-4" />
                Kill All
              </button>
            </>
          )}

          <button
            onClick={() => setShowAgentModal(true)}
            disabled={stats.running >= stats.maxConcurrent}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand dark:bg-terminal-orange rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            New Terminal
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-terminal-text-muted">Total:</span>
          <span className="font-medium text-gray-900 dark:text-terminal-text">{stats.total}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-terminal-text-muted">Running:</span>
          <span className="font-medium text-blue-600 dark:text-terminal-cyan">{stats.running}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-terminal-text-muted">Paused:</span>
          <span className="font-medium text-yellow-600 dark:text-terminal-yellow">{stats.paused}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-terminal-text-muted">Completed:</span>
          <span className="font-medium text-green-600 dark:text-terminal-green">{stats.completed}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-terminal-text-muted">Max:</span>
          <span className="font-medium text-gray-900 dark:text-terminal-text">{stats.maxConcurrent}</span>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-brand dark:text-terminal-orange animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && terminals.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 terminal-card p-8">
          <Terminal className="h-12 w-12 text-gray-400 dark:text-terminal-text-muted mb-4" />
          <p className="text-gray-600 dark:text-terminal-text-muted mb-4">
            No terminals running
          </p>
          <button
            onClick={() => setShowAgentModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand dark:bg-terminal-orange rounded-md hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Create your first terminal
          </button>
        </div>
      )}

      {/* Terminal Grid */}
      {!isLoading && terminals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {terminals.map((terminal) => (
            <TerminalCard
              key={terminal.id}
              terminal={terminal}
              onPause={pause}
              onResume={resume}
              onKill={kill}
              onFocus={handleFocus}
            />
          ))}
        </div>
      )}

      {/* Agent Selection Modal */}
      <AgentSelectionModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        onSelect={handleAgentSelect}
        isSpawning={isSpawning}
      />
    </div>
  );
}
