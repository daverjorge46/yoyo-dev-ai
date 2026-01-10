/**
 * QA Manager Service
 *
 * Manages QA review sessions:
 * - Triggers qa-reviewer agent to find issues
 * - Tracks issues and their status
 * - Triggers qa-fixer agent to resolve issues
 * - Persists sessions using SQLite
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

// =============================================================================
// Types
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

export type QASessionStatus =
  | 'pending'
  | 'reviewing'
  | 'review_complete'
  | 'fixing'
  | 'fix_complete'
  | 'verified'
  | 'failed';

export interface QAIssue {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  category: IssueCategory;
  status: IssueStatus;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  suggestedFix?: string;
  appliedFix?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QASession {
  id: string;
  specId: string;
  status: QASessionStatus;
  reviewerTerminalId?: string;
  fixerTerminalId?: string;
  focusAreas?: IssueCategory[];
  reviewStartedAt?: Date;
  reviewCompletedAt?: Date;
  fixStartedAt?: Date;
  fixCompletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  errorMessage?: string;
}

export interface QASessionWithIssues extends QASession {
  issues: QAIssue[];
}

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
// QA Manager Class
// =============================================================================

export class QAManager {
  private db: Database.Database;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;

    // Initialize SQLite database
    const dataDir = join(projectRoot, '.yoyo-dev', 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = join(dataDir, 'qa.db');
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS qa_sessions (
        id TEXT PRIMARY KEY,
        spec_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reviewer_terminal_id TEXT,
        fixer_terminal_id TEXT,
        focus_areas TEXT,
        review_started_at TEXT,
        review_completed_at TEXT,
        fix_started_at TEXT,
        fix_completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS qa_issues (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        file_path TEXT,
        line_start INTEGER,
        line_end INTEGER,
        suggested_fix TEXT,
        applied_fix TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES qa_sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_spec ON qa_sessions(spec_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON qa_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_issues_session ON qa_issues(session_id);
      CREATE INDEX IF NOT EXISTS idx_issues_status ON qa_issues(status);
    `);
  }

  // ===========================================================================
  // Session Management
  // ===========================================================================

  async createSession(specId: string, focusAreas?: IssueCategory[]): Promise<QASession> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO qa_sessions (id, spec_id, status, focus_areas, created_at, updated_at)
      VALUES (?, ?, 'pending', ?, ?, ?)
    `);

    stmt.run(id, specId, focusAreas ? JSON.stringify(focusAreas) : null, now, now);

    console.log(`[QAManager] Created session ${id} for spec ${specId}`);

    return {
      id,
      specId,
      status: 'pending',
      focusAreas,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async getSession(sessionId: string): Promise<QASessionWithIssues | null> {
    const stmt = this.db.prepare('SELECT * FROM qa_sessions WHERE id = ?');
    const row = stmt.get(sessionId) as Record<string, unknown> | undefined;

    if (!row) return null;

    const session = this.rowToSession(row);
    const issues = await this.getIssues(sessionId);

    return { ...session, issues };
  }

  async listSessions(): Promise<QASessionWithIssues[]> {
    const stmt = this.db.prepare('SELECT * FROM qa_sessions ORDER BY created_at DESC');
    const rows = stmt.all() as Record<string, unknown>[];

    const sessions: QASessionWithIssues[] = [];
    for (const row of rows) {
      const session = this.rowToSession(row);
      const issues = await this.getIssues(session.id);
      sessions.push({ ...session, issues });
    }

    return sessions;
  }

  async updateSessionStatus(
    sessionId: string,
    status: QASessionStatus,
    updates?: Partial<{
      reviewerTerminalId: string;
      fixerTerminalId: string;
      errorMessage: string;
    }>
  ): Promise<void> {
    const now = new Date().toISOString();
    const timeField = this.getTimeFieldForStatus(status);

    let sql = `UPDATE qa_sessions SET status = ?, updated_at = ?`;
    const params: unknown[] = [status, now];

    if (timeField) {
      sql += `, ${timeField} = ?`;
      params.push(now);
    }

    if (updates?.reviewerTerminalId !== undefined) {
      sql += ', reviewer_terminal_id = ?';
      params.push(updates.reviewerTerminalId);
    }

    if (updates?.fixerTerminalId !== undefined) {
      sql += ', fixer_terminal_id = ?';
      params.push(updates.fixerTerminalId);
    }

    if (updates?.errorMessage !== undefined) {
      sql += ', error_message = ?';
      params.push(updates.errorMessage);
    }

    sql += ' WHERE id = ?';
    params.push(sessionId);

    this.db.prepare(sql).run(...params);
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.db.prepare('DELETE FROM qa_sessions WHERE id = ?').run(sessionId);
    console.log(`[QAManager] Deleted session ${sessionId}`);
  }

  // ===========================================================================
  // Issue Management
  // ===========================================================================

  async addIssue(
    sessionId: string,
    issue: Omit<QAIssue, 'id' | 'sessionId' | 'createdAt' | 'updatedAt'>
  ): Promise<QAIssue> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO qa_issues (
        id, session_id, title, description, severity, category, status,
        file_path, line_start, line_end, suggested_fix, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      sessionId,
      issue.title,
      issue.description,
      issue.severity,
      issue.category,
      issue.status,
      issue.filePath || null,
      issue.lineStart || null,
      issue.lineEnd || null,
      issue.suggestedFix || null,
      now,
      now
    );

    return {
      id,
      sessionId,
      ...issue,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async getIssues(sessionId: string): Promise<QAIssue[]> {
    const stmt = this.db.prepare('SELECT * FROM qa_issues WHERE session_id = ? ORDER BY severity, created_at');
    const rows = stmt.all(sessionId) as Record<string, unknown>[];
    return rows.map((row) => this.rowToIssue(row));
  }

  async updateIssueStatus(
    sessionId: string,
    issueId: string,
    status: IssueStatus,
    appliedFix?: string
  ): Promise<void> {
    const now = new Date().toISOString();

    let sql = 'UPDATE qa_issues SET status = ?, updated_at = ?';
    const params: unknown[] = [status, now];

    if (appliedFix !== undefined) {
      sql += ', applied_fix = ?';
      params.push(appliedFix);
    }

    sql += ' WHERE id = ? AND session_id = ?';
    params.push(issueId, sessionId);

    this.db.prepare(sql).run(...params);
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  async getStats(): Promise<QAStats> {
    const sessionStats = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status IN ('reviewing', 'fixing') THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status IN ('review_complete', 'fix_complete', 'verified') THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM qa_sessions
    `).get() as Record<string, number>;

    const issueStats = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('open', 'in_progress') THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status IN ('fixed', 'verified') THEN 1 ELSE 0 END) as fixed
      FROM qa_issues
    `).get() as Record<string, number>;

    const severityStats = this.db.prepare(`
      SELECT severity, COUNT(*) as count
      FROM qa_issues
      WHERE status NOT IN ('fixed', 'verified', 'wont_fix')
      GROUP BY severity
    `).all() as Array<{ severity: IssueSeverity; count: number }>;

    const issuesBySeverity: Record<IssueSeverity, number> = {
      critical: 0,
      major: 0,
      minor: 0,
      suggestion: 0,
    };

    for (const row of severityStats) {
      issuesBySeverity[row.severity] = row.count;
    }

    return {
      totalSessions: sessionStats.total || 0,
      pendingSessions: sessionStats.pending || 0,
      activeSessions: sessionStats.active || 0,
      completedSessions: sessionStats.completed || 0,
      failedSessions: sessionStats.failed || 0,
      totalIssues: issueStats.total || 0,
      openIssues: issueStats.open || 0,
      fixedIssues: issueStats.fixed || 0,
      issuesBySeverity,
    };
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private rowToSession(row: Record<string, unknown>): QASession {
    return {
      id: row.id as string,
      specId: row.spec_id as string,
      status: row.status as QASessionStatus,
      reviewerTerminalId: row.reviewer_terminal_id as string | undefined,
      fixerTerminalId: row.fixer_terminal_id as string | undefined,
      focusAreas: row.focus_areas ? JSON.parse(row.focus_areas as string) : undefined,
      reviewStartedAt: row.review_started_at ? new Date(row.review_started_at as string) : undefined,
      reviewCompletedAt: row.review_completed_at ? new Date(row.review_completed_at as string) : undefined,
      fixStartedAt: row.fix_started_at ? new Date(row.fix_started_at as string) : undefined,
      fixCompletedAt: row.fix_completed_at ? new Date(row.fix_completed_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      errorMessage: row.error_message as string | undefined,
    };
  }

  private rowToIssue(row: Record<string, unknown>): QAIssue {
    return {
      id: row.id as string,
      sessionId: row.session_id as string,
      title: row.title as string,
      description: row.description as string,
      severity: row.severity as IssueSeverity,
      category: row.category as IssueCategory,
      status: row.status as IssueStatus,
      filePath: row.file_path as string | undefined,
      lineStart: row.line_start as number | undefined,
      lineEnd: row.line_end as number | undefined,
      suggestedFix: row.suggested_fix as string | undefined,
      appliedFix: row.applied_fix as string | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private getTimeFieldForStatus(status: QASessionStatus): string | null {
    switch (status) {
      case 'reviewing':
        return 'review_started_at';
      case 'review_complete':
        return 'review_completed_at';
      case 'fixing':
        return 'fix_started_at';
      case 'fix_complete':
      case 'verified':
        return 'fix_completed_at';
      default:
        return null;
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let managerInstance: QAManager | null = null;

export function getQAManager(projectRoot: string): QAManager {
  if (!managerInstance) {
    managerInstance = new QAManager(projectRoot);
  }
  return managerInstance;
}
