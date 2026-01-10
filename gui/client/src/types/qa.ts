/**
 * QA Pipeline Types
 *
 * Types for the QA review system that:
 * - Runs qa-reviewer agent to find issues
 * - Tracks identified issues
 * - Runs qa-fixer agent to resolve issues
 */

// =============================================================================
// Issue Types
// =============================================================================

export type IssueSeverity = 'critical' | 'major' | 'minor' | 'suggestion';

export type IssueCategory =
  | 'bug'
  | 'security'
  | 'performance'
  | 'accessibility'
  | 'code-quality'
  | 'testing'
  | 'documentation';

export type IssueStatus =
  | 'open'
  | 'in_progress'
  | 'fixed'
  | 'verified'
  | 'wont_fix'
  | 'deferred';

export interface QAIssue {
  /** Unique issue ID */
  id: string;
  /** Issue title */
  title: string;
  /** Detailed description */
  description: string;
  /** Severity level */
  severity: IssueSeverity;
  /** Category */
  category: IssueCategory;
  /** Current status */
  status: IssueStatus;
  /** Affected file path */
  filePath?: string;
  /** Line range (start-end) */
  lineRange?: { start: number; end: number };
  /** Suggested fix */
  suggestedFix?: string;
  /** Fix applied by qa-fixer */
  appliedFix?: string;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

// =============================================================================
// Session Types
// =============================================================================

export type QASessionStatus =
  | 'pending'
  | 'reviewing'
  | 'review_complete'
  | 'fixing'
  | 'fix_complete'
  | 'verified'
  | 'failed';

export interface QASession {
  /** Unique session ID */
  id: string;
  /** Associated spec ID */
  specId: string;
  /** Session status */
  status: QASessionStatus;
  /** Reviewer terminal ID */
  reviewerTerminalId?: string;
  /** Fixer terminal ID */
  fixerTerminalId?: string;
  /** List of issues */
  issues: QAIssue[];
  /** Review started at */
  reviewStartedAt?: Date;
  /** Review completed at */
  reviewCompletedAt?: Date;
  /** Fix started at */
  fixStartedAt?: Date;
  /** Fix completed at */
  fixCompletedAt?: Date;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Error message if failed */
  errorMessage?: string;
}

// =============================================================================
// Summary Stats
// =============================================================================

export interface QAStats {
  totalSessions: number;
  pendingSessions: number;
  activeSessions: number;
  completedSessions: number;
  failedSessions: number;
  totalIssues: number;
  openIssues: number;
  fixedIssues: number;
  issuesBySeverity: Record<IssueSeverity, number>;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface StartQARequest {
  /** Spec ID to review */
  specId: string;
  /** Focus areas for review */
  focusAreas?: IssueCategory[];
}

export interface QASessionResponse {
  session: QASession;
}

export interface QASessionListResponse {
  sessions: QASession[];
  stats: QAStats;
}

export interface FixIssueRequest {
  /** Session ID */
  sessionId: string;
  /** Issue ID to fix */
  issueId: string;
  /** Whether to auto-fix using qa-fixer */
  autoFix?: boolean;
}

export interface UpdateIssueStatusRequest {
  /** Session ID */
  sessionId: string;
  /** Issue ID */
  issueId: string;
  /** New status */
  status: IssueStatus;
  /** Optional note */
  note?: string;
}

// =============================================================================
// Severity Configuration
// =============================================================================

export const SEVERITY_CONFIG: Record<IssueSeverity, {
  label: string;
  color: string;
  bgColor: string;
  priority: number;
}> = {
  critical: {
    label: 'Critical',
    color: 'text-error dark:text-terminal-red',
    bgColor: 'bg-error/10 dark:bg-terminal-red/10',
    priority: 1,
  },
  major: {
    label: 'Major',
    color: 'text-warning dark:text-terminal-yellow',
    bgColor: 'bg-warning/10 dark:bg-terminal-yellow/10',
    priority: 2,
  },
  minor: {
    label: 'Minor',
    color: 'text-info dark:text-terminal-blue',
    bgColor: 'bg-info/10 dark:bg-terminal-blue/10',
    priority: 3,
  },
  suggestion: {
    label: 'Suggestion',
    color: 'text-gray-500 dark:text-terminal-text-muted',
    bgColor: 'bg-gray-100 dark:bg-terminal-elevated',
    priority: 4,
  },
};

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  bug: 'Bug',
  security: 'Security',
  performance: 'Performance',
  accessibility: 'Accessibility',
  'code-quality': 'Code Quality',
  testing: 'Testing',
  documentation: 'Documentation',
};

export const STATUS_CONFIG: Record<IssueStatus, {
  label: string;
  color: string;
}> = {
  open: { label: 'Open', color: 'text-gray-600 dark:text-terminal-text-secondary' },
  in_progress: { label: 'In Progress', color: 'text-info dark:text-terminal-blue' },
  fixed: { label: 'Fixed', color: 'text-success dark:text-terminal-green' },
  verified: { label: 'Verified', color: 'text-success dark:text-terminal-green' },
  wont_fix: { label: "Won't Fix", color: 'text-gray-500 dark:text-terminal-text-muted' },
  deferred: { label: 'Deferred', color: 'text-warning dark:text-terminal-yellow' },
};
