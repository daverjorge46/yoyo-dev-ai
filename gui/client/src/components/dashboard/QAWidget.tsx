/**
 * QA Dashboard Widget
 *
 * Shows QA review status summary with quick links to the QA page.
 */

import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  Circle,
} from 'lucide-react';
import { useQA } from '../../hooks/useQA';

// =============================================================================
// Severity Badge
// =============================================================================

function SeverityBadge({ severity, count }: { severity: string; count: number }) {
  const colorMap: Record<string, string> = {
    critical: 'bg-terminal-red/10 text-terminal-red',
    major: 'bg-terminal-orange/10 text-terminal-orange',
    minor: 'bg-terminal-yellow/10 text-terminal-yellow',
    suggestion: 'bg-terminal-blue/10 text-terminal-blue',
  };

  if (count === 0) return null;

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorMap[severity] ?? 'bg-gray-100 text-gray-600'}`}>
      {count} {severity}
    </span>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function QAWidget() {
  const navigate = useNavigate();
  const { stats, isLoading } = useQA();

  const hasIssues = stats.openIssues > 0;
  const hasActive = stats.activeSessions > 0;

  return (
    <div className="terminal-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-brand dark:text-terminal-orange" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-terminal-text uppercase tracking-wide">
            QA Status
          </h3>
        </div>
        <button
          onClick={() => navigate('/qa')}
          className="text-xs text-brand dark:text-terminal-orange hover:underline flex items-center gap-1"
        >
          View all <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center py-2 px-3 rounded bg-gray-50 dark:bg-terminal-elevated">
          <div className="text-lg font-bold text-gray-900 dark:text-terminal-text">
            {isLoading ? '-' : stats.totalSessions}
          </div>
          <div className="text-xs text-gray-500 dark:text-terminal-text-muted">Sessions</div>
        </div>
        <div className="text-center py-2 px-3 rounded bg-gray-50 dark:bg-terminal-elevated">
          <div className={`text-lg font-bold ${hasActive ? 'text-terminal-blue' : 'text-gray-900 dark:text-terminal-text'}`}>
            {isLoading ? '-' : stats.activeSessions}
          </div>
          <div className="text-xs text-gray-500 dark:text-terminal-text-muted">Active</div>
        </div>
        <div className="text-center py-2 px-3 rounded bg-gray-50 dark:bg-terminal-elevated">
          <div className={`text-lg font-bold ${hasIssues ? 'text-terminal-yellow' : 'text-terminal-green'}`}>
            {isLoading ? '-' : stats.openIssues}
          </div>
          <div className="text-xs text-gray-500 dark:text-terminal-text-muted">Open Issues</div>
        </div>
      </div>

      {/* Issues by Severity */}
      {!isLoading && (
        <div className="space-y-3">
          {/* Severity breakdown */}
          <div className="flex flex-wrap gap-2">
            <SeverityBadge severity="critical" count={stats.issuesBySeverity?.critical ?? 0} />
            <SeverityBadge severity="major" count={stats.issuesBySeverity?.major ?? 0} />
            <SeverityBadge severity="minor" count={stats.issuesBySeverity?.minor ?? 0} />
            <SeverityBadge severity="suggestion" count={stats.issuesBySeverity?.suggestion ?? 0} />
          </div>

          {/* Quick Status */}
          <div className="flex items-center justify-between py-2 px-3 rounded bg-gray-50 dark:bg-terminal-elevated">
            <div className="flex items-center gap-2">
              {hasIssues ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-terminal-yellow" />
                  <span className="text-sm text-gray-700 dark:text-terminal-text-secondary">
                    {stats.openIssues} issues need attention
                  </span>
                </>
              ) : stats.totalSessions > 0 ? (
                <>
                  <CheckCircle className="h-4 w-4 text-terminal-green" />
                  <span className="text-sm text-gray-700 dark:text-terminal-text-secondary">
                    All issues resolved
                  </span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-gray-400 dark:text-terminal-text-muted" />
                  <span className="text-sm text-gray-500 dark:text-terminal-text-muted">
                    No QA reviews yet
                  </span>
                </>
              )}
            </div>
            <button
              onClick={() => navigate('/qa')}
              className="text-xs text-brand dark:text-terminal-orange hover:underline"
            >
              {hasIssues ? 'Fix issues' : stats.totalSessions > 0 ? 'View history' : 'Start review'}
            </button>
          </div>

          {/* Fixed vs Total */}
          {stats.totalIssues > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-terminal-text-muted">
              <Circle className="h-2 w-2 fill-terminal-green text-terminal-green" />
              <span>
                {stats.fixedIssues} of {stats.totalIssues} issues fixed ({Math.round((stats.fixedIssues / stats.totalIssues) * 100)}%)
              </span>
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-4">
          <div className="animate-pulse text-sm text-gray-500 dark:text-terminal-text-muted">
            Loading...
          </div>
        </div>
      )}
    </div>
  );
}
