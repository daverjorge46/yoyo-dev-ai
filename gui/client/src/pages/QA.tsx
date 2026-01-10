/**
 * QA Page
 *
 * Quality Assurance pipeline interface featuring:
 * - Start new QA reviews
 * - View active and completed sessions
 * - Track issues and fixes
 */

import { useState } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react';
import { useQA } from '../hooks/useQA';
import { QASessionCard } from '../components/qa';
import type { IssueCategory } from '../types/qa';

// =============================================================================
// Start Review Modal
// =============================================================================

interface StartReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (specId: string, focusAreas?: IssueCategory[]) => Promise<void>;
  isStarting: boolean;
}

function StartReviewModal({ isOpen, onClose, onStart, isStarting }: StartReviewModalProps) {
  const [specId, setSpecId] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<IssueCategory[]>([]);

  if (!isOpen) return null;

  const focusAreas: { id: IssueCategory; label: string }[] = [
    { id: 'bug', label: 'Bugs' },
    { id: 'security', label: 'Security' },
    { id: 'performance', label: 'Performance' },
    { id: 'accessibility', label: 'Accessibility' },
    { id: 'code-quality', label: 'Code Quality' },
    { id: 'testing', label: 'Testing' },
    { id: 'documentation', label: 'Documentation' },
  ];

  const toggleArea = (area: IssueCategory) => {
    setSelectedAreas((prev) =>
      prev.includes(area)
        ? prev.filter((a) => a !== area)
        : [...prev, area]
    );
  };

  const handleStart = async () => {
    if (!specId.trim()) return;
    await onStart(specId.trim(), selectedAreas.length > 0 ? selectedAreas : undefined);
    setSpecId('');
    setSelectedAreas([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-terminal-card rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-terminal-border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-terminal-text">
            Start QA Review
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-terminal-bg-hover transition-colors"
            disabled={isStarting}
          >
            <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Spec ID input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-terminal-text-secondary mb-1">
              Specification ID
            </label>
            <input
              type="text"
              value={specId}
              onChange={(e) => setSpecId(e.target.value)}
              placeholder="e.g., 2024-01-10-feature-name"
              className="w-full terminal-input"
              disabled={isStarting}
            />
          </div>

          {/* Focus areas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-terminal-text-secondary mb-2">
              Focus Areas (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {focusAreas.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => toggleArea(id)}
                  className={`
                    px-3 py-1.5 text-sm rounded-full border transition-colors
                    ${selectedAreas.includes(id)
                      ? 'bg-brand/10 dark:bg-terminal-orange/10 border-brand dark:border-terminal-orange text-brand dark:text-terminal-orange'
                      : 'bg-gray-50 dark:bg-terminal-elevated border-gray-200 dark:border-terminal-border text-gray-600 dark:text-terminal-text-muted hover:border-gray-300 dark:hover:border-terminal-text-muted'}
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-terminal-border">
          <button
            onClick={onClose}
            disabled={isStarting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-terminal-text-secondary hover:bg-gray-100 dark:hover:bg-terminal-elevated rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!specId.trim() || isStarting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand dark:bg-terminal-orange rounded hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isStarting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {isStarting ? 'Starting...' : 'Start Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export default function QA() {
  const {
    sessions,
    stats,
    isLoading,
    error,
    startReview,
    startFix,
    updateIssue,
    cancel,
    refresh,
    isStarting,
    isFixing,
  } = useQA();

  const [showStartModal, setShowStartModal] = useState(false);

  const handleStartReview = async (specId: string, focusAreas?: IssueCategory[]) => {
    await startReview({ specId, focusAreas });
  };

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 terminal-card p-8">
        <AlertCircle className="h-10 w-10 text-error dark:text-terminal-red mb-3" />
        <p className="text-error dark:text-terminal-red font-medium mb-1">
          Failed to load QA sessions
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
            <ClipboardList className="h-6 w-6 text-brand dark:text-terminal-orange" />
            QA Reviews
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-terminal-text-muted">
            Automated code review and issue tracking
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-terminal-text bg-white dark:bg-terminal-bg-secondary border border-gray-300 dark:border-terminal-border rounded-md hover:bg-gray-50 dark:hover:bg-terminal-bg-hover transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowStartModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand dark:bg-terminal-orange rounded-md hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            New Review
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="terminal-card p-4">
          <p className="text-sm text-gray-500 dark:text-terminal-text-muted">Total Sessions</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-terminal-text">{stats.totalSessions}</p>
        </div>
        <div className="terminal-card p-4">
          <p className="text-sm text-gray-500 dark:text-terminal-text-muted">Active</p>
          <p className="text-2xl font-semibold text-info dark:text-terminal-blue">{stats.activeSessions}</p>
        </div>
        <div className="terminal-card p-4">
          <p className="text-sm text-gray-500 dark:text-terminal-text-muted">Completed</p>
          <p className="text-2xl font-semibold text-success dark:text-terminal-green">{stats.completedSessions}</p>
        </div>
        <div className="terminal-card p-4">
          <p className="text-sm text-gray-500 dark:text-terminal-text-muted">Open Issues</p>
          <p className="text-2xl font-semibold text-warning dark:text-terminal-yellow">{stats.openIssues}</p>
        </div>
        <div className="terminal-card p-4">
          <p className="text-sm text-gray-500 dark:text-terminal-text-muted">Fixed Issues</p>
          <p className="text-2xl font-semibold text-success dark:text-terminal-green">{stats.fixedIssues}</p>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-brand dark:text-terminal-orange animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 terminal-card p-8">
          <ClipboardList className="h-12 w-12 text-gray-400 dark:text-terminal-text-muted mb-4" />
          <p className="text-gray-600 dark:text-terminal-text-muted mb-4">
            No QA reviews yet
          </p>
          <button
            onClick={() => setShowStartModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand dark:bg-terminal-orange rounded-md hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Start your first review
          </button>
        </div>
      )}

      {/* Sessions */}
      {!isLoading && sessions.length > 0 && (
        <div className="space-y-4">
          {sessions.map((session) => (
            <QASessionCard
              key={session.id}
              session={session}
              onStartFix={startFix}
              onUpdateIssue={updateIssue}
              onCancel={cancel}
              isFixing={isFixing}
            />
          ))}
        </div>
      )}

      {/* Start Review Modal */}
      <StartReviewModal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        onStart={handleStartReview}
        isStarting={isStarting}
      />
    </div>
  );
}
