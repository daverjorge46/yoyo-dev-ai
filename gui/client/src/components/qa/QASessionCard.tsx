/**
 * QASessionCard Component
 *
 * Displays a QA review session with its issues and actions.
 */

import { useState } from 'react';
import {
  Search,
  Wrench,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Play,
  Loader2,
  FileSearch,
  Trash2,
} from 'lucide-react';
import type { QASession, IssueStatus } from '../../types/qa';
import { SEVERITY_CONFIG } from '../../types/qa';
import { QAIssueCard } from './QAIssueCard';

// =============================================================================
// Types
// =============================================================================

export interface QASessionCardProps {
  session: QASession;
  onStartFix?: (sessionId: string) => Promise<void>;
  onUpdateIssue?: (sessionId: string, issueId: string, status: IssueStatus) => Promise<void>;
  onCancel?: (sessionId: string) => Promise<void>;
  isFixing?: boolean;
}

// =============================================================================
// Status Configuration
// =============================================================================

const SESSION_STATUS_CONFIG: Record<QASession['status'], {
  label: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    colorClass: 'text-gray-500 dark:text-terminal-text-muted',
    bgClass: 'bg-gray-100 dark:bg-terminal-elevated',
  },
  reviewing: {
    label: 'Reviewing',
    icon: Search,
    colorClass: 'text-info dark:text-terminal-blue',
    bgClass: 'bg-info/10 dark:bg-terminal-blue/10',
  },
  review_complete: {
    label: 'Review Complete',
    icon: FileSearch,
    colorClass: 'text-warning dark:text-terminal-yellow',
    bgClass: 'bg-warning/10 dark:bg-terminal-yellow/10',
  },
  fixing: {
    label: 'Fixing',
    icon: Wrench,
    colorClass: 'text-purple-500 dark:text-terminal-magenta',
    bgClass: 'bg-purple-100 dark:bg-terminal-magenta/10',
  },
  fix_complete: {
    label: 'Fix Complete',
    icon: CheckCircle2,
    colorClass: 'text-success dark:text-terminal-green',
    bgClass: 'bg-success/10 dark:bg-terminal-green/10',
  },
  verified: {
    label: 'Verified',
    icon: CheckCircle2,
    colorClass: 'text-success dark:text-terminal-green',
    bgClass: 'bg-success/10 dark:bg-terminal-green/10',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    colorClass: 'text-error dark:text-terminal-red',
    bgClass: 'bg-error/10 dark:bg-terminal-red/10',
  },
};

// =============================================================================
// Component
// =============================================================================

export function QASessionCard({
  session,
  onStartFix,
  onUpdateIssue,
  onCancel,
  isFixing = false,
}: QASessionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const statusConfig = SESSION_STATUS_CONFIG[session.status];
  const StatusIcon = statusConfig.icon;

  // Calculate issue stats
  const issueStats = {
    total: session.issues.length,
    open: session.issues.filter((i) => i.status === 'open' || i.status === 'in_progress').length,
    fixed: session.issues.filter((i) => i.status === 'fixed' || i.status === 'verified').length,
    critical: session.issues.filter((i) => i.severity === 'critical' && i.status !== 'verified').length,
    major: session.issues.filter((i) => i.severity === 'major' && i.status !== 'verified').length,
  };

  const handleUpdateIssue = async (issueId: string, status: IssueStatus) => {
    if (!onUpdateIssue) return;
    setIsUpdating(true);
    try {
      await onUpdateIssue(session.id, issueId, status);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartFix = async () => {
    if (!onStartFix) return;
    await onStartFix(session.id);
  };

  const handleCancel = async () => {
    if (!onCancel) return;
    await onCancel(session.id);
  };

  const isActive = session.status === 'reviewing' || session.status === 'fixing';

  return (
    <div className="terminal-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-terminal-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-gray-900 dark:text-terminal-text truncate">
                {session.specId}
              </h3>
              <span
                className={`
                  inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
                  ${statusConfig.bgClass} ${statusConfig.colorClass}
                `}
              >
                {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
                {!isActive && <StatusIcon className="h-3 w-3" />}
                {statusConfig.label}
              </span>
            </div>

            {/* Issue summary */}
            {session.issues.length > 0 && (
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-gray-500 dark:text-terminal-text-muted">
                  {issueStats.total} issues
                </span>
                {issueStats.critical > 0 && (
                  <span className={SEVERITY_CONFIG.critical.color}>
                    {issueStats.critical} critical
                  </span>
                )}
                {issueStats.major > 0 && (
                  <span className={SEVERITY_CONFIG.major.color}>
                    {issueStats.major} major
                  </span>
                )}
                {issueStats.fixed > 0 && (
                  <span className="text-success dark:text-terminal-green">
                    {issueStats.fixed} fixed
                  </span>
                )}
              </div>
            )}

            {/* Error message */}
            {session.errorMessage && (
              <div className="mt-2 flex items-center gap-1.5 text-sm text-error dark:text-terminal-red">
                <AlertCircle className="h-4 w-4" />
                {session.errorMessage}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {session.status === 'review_complete' && issueStats.open > 0 && onStartFix && (
              <button
                onClick={handleStartFix}
                disabled={isFixing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded bg-brand dark:bg-terminal-orange text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isFixing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Start Fixing
              </button>
            )}

            {isActive && onCancel && (
              <button
                onClick={handleCancel}
                className="p-1.5 rounded text-gray-500 dark:text-terminal-text-muted hover:bg-gray-100 dark:hover:bg-terminal-elevated transition-colors"
                title="Cancel session"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            {session.issues.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded text-gray-500 dark:text-terminal-text-muted hover:bg-gray-100 dark:hover:bg-terminal-elevated transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Issues */}
      {isExpanded && session.issues.length > 0 && (
        <div className="p-4 space-y-3 bg-gray-50 dark:bg-terminal-bg-secondary">
          {session.issues.map((issue) => (
            <QAIssueCard
              key={issue.id}
              issue={issue}
              onStatusChange={onUpdateIssue ? handleUpdateIssue : undefined}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {isExpanded && session.issues.length === 0 && session.status === 'reviewing' && (
        <div className="p-8 text-center text-gray-500 dark:text-terminal-text-muted bg-gray-50 dark:bg-terminal-bg-secondary">
          <Search className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p>Reviewing codebase for issues...</p>
        </div>
      )}
    </div>
  );
}
