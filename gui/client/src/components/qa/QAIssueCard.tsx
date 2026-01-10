/**
 * QAIssueCard Component
 *
 * Displays a QA issue with severity, status, and action buttons.
 */

import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  FileCode,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  Wrench,
} from 'lucide-react';
import type { QAIssue, IssueStatus } from '../../types/qa';
import { SEVERITY_CONFIG, CATEGORY_LABELS, STATUS_CONFIG } from '../../types/qa';

// =============================================================================
// Types
// =============================================================================

export interface QAIssueCardProps {
  issue: QAIssue;
  onStatusChange?: (issueId: string, status: IssueStatus) => void;
  isUpdating?: boolean;
}

// =============================================================================
// Severity Icons
// =============================================================================

const SEVERITY_ICONS = {
  critical: AlertCircle,
  major: AlertTriangle,
  minor: Info,
  suggestion: Lightbulb,
};

// =============================================================================
// Component
// =============================================================================

export function QAIssueCard({
  issue,
  onStatusChange,
  isUpdating = false,
}: QAIssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const severityConfig = SEVERITY_CONFIG[issue.severity];
  const statusConfig = STATUS_CONFIG[issue.status];
  const SeverityIcon = SEVERITY_ICONS[issue.severity];

  return (
    <div className="terminal-card p-0 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-terminal-bg-hover transition-colors"
      >
        {/* Severity Icon */}
        <div className={`mt-0.5 ${severityConfig.color}`}>
          <SeverityIcon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-gray-900 dark:text-terminal-text">
              {issue.title}
            </h4>
            <span
              className={`
                inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                ${severityConfig.bgColor} ${severityConfig.color}
              `}
            >
              {severityConfig.label}
            </span>
            <span className="text-xs text-gray-500 dark:text-terminal-text-muted">
              {CATEGORY_LABELS[issue.category]}
            </span>
          </div>

          {/* File info */}
          {issue.filePath && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 dark:text-terminal-text-muted">
              <FileCode className="h-3.5 w-3.5" />
              <span className="font-mono">{issue.filePath}</span>
              {issue.lineRange && (
                <span className="font-mono">
                  :{issue.lineRange.start}
                  {issue.lineRange.end !== issue.lineRange.start && `-${issue.lineRange.end}`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Status and expand */}
        <div className="flex items-center gap-2">
          <span className={`text-xs ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-terminal-border">
          {/* Description */}
          <div className="pt-4">
            <h5 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-terminal-text-muted mb-2">
              Description
            </h5>
            <p className="text-sm text-gray-700 dark:text-terminal-text-secondary whitespace-pre-wrap">
              {issue.description}
            </p>
          </div>

          {/* Suggested Fix */}
          {issue.suggestedFix && (
            <div className="mt-4">
              <h5 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-terminal-text-muted mb-2">
                Suggested Fix
              </h5>
              <pre className="p-3 rounded bg-gray-50 dark:bg-terminal-elevated text-xs font-mono overflow-x-auto">
                {issue.suggestedFix}
              </pre>
            </div>
          )}

          {/* Applied Fix */}
          {issue.appliedFix && (
            <div className="mt-4">
              <h5 className="text-xs font-medium uppercase tracking-wider text-success dark:text-terminal-green mb-2 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Applied Fix
              </h5>
              <pre className="p-3 rounded bg-success/5 dark:bg-terminal-green/10 text-xs font-mono overflow-x-auto border border-success/20 dark:border-terminal-green/20">
                {issue.appliedFix}
              </pre>
            </div>
          )}

          {/* Actions */}
          {onStatusChange && issue.status !== 'verified' && (
            <div className="mt-4 flex items-center gap-2">
              {issue.status === 'open' && (
                <button
                  onClick={() => onStatusChange(issue.id, 'in_progress')}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-info/10 dark:bg-terminal-blue/10 text-info dark:text-terminal-blue hover:bg-info/20 dark:hover:bg-terminal-blue/20 transition-colors disabled:opacity-50"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Start Fixing
                </button>
              )}
              {(issue.status === 'open' || issue.status === 'in_progress') && (
                <>
                  <button
                    onClick={() => onStatusChange(issue.id, 'fixed')}
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-success/10 dark:bg-terminal-green/10 text-success dark:text-terminal-green hover:bg-success/20 dark:hover:bg-terminal-green/20 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark Fixed
                  </button>
                  <button
                    onClick={() => onStatusChange(issue.id, 'wont_fix')}
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-gray-100 dark:bg-terminal-elevated text-gray-600 dark:text-terminal-text-muted hover:bg-gray-200 dark:hover:bg-terminal-bg-hover transition-colors disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Won't Fix
                  </button>
                  <button
                    onClick={() => onStatusChange(issue.id, 'deferred')}
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-warning/10 dark:bg-terminal-yellow/10 text-warning dark:text-terminal-yellow hover:bg-warning/20 dark:hover:bg-terminal-yellow/20 transition-colors disabled:opacity-50"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Defer
                  </button>
                </>
              )}
              {issue.status === 'fixed' && (
                <button
                  onClick={() => onStatusChange(issue.id, 'verified')}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-success/10 dark:bg-terminal-green/10 text-success dark:text-terminal-green hover:bg-success/20 dark:hover:bg-terminal-green/20 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verify Fix
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
