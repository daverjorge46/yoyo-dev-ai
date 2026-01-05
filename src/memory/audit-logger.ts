/**
 * Audit Logger Module
 *
 * Comprehensive audit logging for memory operations.
 * Tracks all memory access, modifications, and system events.
 */

import type { MemoryBlockType, MemoryScope } from './types.js';
import type { Role, Operation } from './access-control.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Audit event types.
 */
export type AuditEventType =
  | 'memory_read'
  | 'memory_write'
  | 'memory_delete'
  | 'memory_search'
  | 'memory_export'
  | 'memory_import'
  | 'user_login'
  | 'user_logout'
  | 'role_change'
  | 'access_denied'
  | 'system_error'
  | 'config_change';

/**
 * Audit event severity levels.
 */
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Single audit log entry.
 */
export interface AuditEntry {
  /** Unique entry ID */
  id: string;
  /** Event type */
  type: AuditEventType;
  /** Severity level */
  severity: AuditSeverity;
  /** When the event occurred */
  timestamp: Date;
  /** User who performed the action (if applicable) */
  userId?: string;
  /** User's role at the time of action */
  userRole?: Role;
  /** Operation performed */
  operation?: Operation;
  /** Target block type (if applicable) */
  blockType?: MemoryBlockType;
  /** Target scope (if applicable) */
  scope?: MemoryScope;
  /** Human-readable description */
  description: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** IP address or client identifier */
  clientId?: string;
  /** Session ID */
  sessionId?: string;
}

/**
 * Audit query options.
 */
export interface AuditQueryOptions {
  /** Filter by event types */
  types?: AuditEventType[];
  /** Filter by severity levels */
  severities?: AuditSeverity[];
  /** Filter by user ID */
  userId?: string;
  /** Filter by time range - start */
  startTime?: Date;
  /** Filter by time range - end */
  endTime?: Date;
  /** Maximum entries to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort order */
  order?: 'asc' | 'desc';
}

/**
 * Audit statistics.
 */
export interface AuditStats {
  /** Total entries */
  totalEntries: number;
  /** Entries by type */
  byType: Record<AuditEventType, number>;
  /** Entries by severity */
  bySeverity: Record<AuditSeverity, number>;
  /** Most active users */
  topUsers: Array<{ userId: string; count: number }>;
  /** Recent activity */
  recentActivity: number; // entries in last hour
}

/**
 * Audit logger configuration.
 */
export interface AuditLoggerConfig {
  /** Maximum entries to keep in memory (default: 10000) */
  maxEntries: number;
  /** Whether to log to console (default: false) */
  consoleOutput: boolean;
  /** Minimum severity to log (default: 'info') */
  minSeverity: AuditSeverity;
  /** Whether to include metadata in logs (default: true) */
  includeMetadata: boolean;
  /** File path for persistent logging (optional) */
  logFile?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: AuditLoggerConfig = {
  maxEntries: 10000,
  consoleOutput: false,
  minSeverity: 'info',
  includeMetadata: true,
};

const SEVERITY_ORDER: AuditSeverity[] = ['info', 'warning', 'error', 'critical'];

// =============================================================================
// AuditLogger Class
// =============================================================================

/**
 * Audit logger for tracking memory operations.
 */
export class AuditLogger {
  private config: AuditLoggerConfig;
  private entries: AuditEntry[] = [];
  private entryCounter: number = 0;

  constructor(config: Partial<AuditLoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Log an audit event.
   */
  log(
    type: AuditEventType,
    severity: AuditSeverity,
    description: string,
    details: Partial<Omit<AuditEntry, 'id' | 'type' | 'severity' | 'timestamp' | 'description'>> = {}
  ): AuditEntry {
    // Check minimum severity
    if (!this.shouldLog(severity)) {
      // Return a dummy entry for skipped logs
      return {
        id: 'skipped',
        type,
        severity,
        timestamp: new Date(),
        description,
        ...details,
      };
    }

    const entry: AuditEntry = {
      id: this.generateId(),
      type,
      severity,
      timestamp: new Date(),
      description,
      ...details,
      metadata: this.config.includeMetadata ? details.metadata : undefined,
    };

    this.entries.push(entry);

    // Trim entries if over limit
    if (this.entries.length > this.config.maxEntries) {
      this.entries = this.entries.slice(-this.config.maxEntries);
    }

    // Console output if enabled
    if (this.config.consoleOutput) {
      this.outputToConsole(entry);
    }

    return entry;
  }

  /**
   * Log a memory read event.
   */
  logRead(
    userId: string,
    blockType: MemoryBlockType,
    scope: MemoryScope,
    metadata?: Record<string, unknown>
  ): AuditEntry {
    return this.log(
      'memory_read',
      'info',
      `Read ${blockType} block from ${scope} scope`,
      { userId, blockType, scope, operation: 'read', metadata }
    );
  }

  /**
   * Log a memory write event.
   */
  logWrite(
    userId: string,
    blockType: MemoryBlockType,
    scope: MemoryScope,
    isNew: boolean,
    metadata?: Record<string, unknown>
  ): AuditEntry {
    return this.log(
      'memory_write',
      'info',
      `${isNew ? 'Created' : 'Updated'} ${blockType} block in ${scope} scope`,
      { userId, blockType, scope, operation: 'write', metadata }
    );
  }

  /**
   * Log a memory delete event.
   */
  logDelete(
    userId: string,
    blockType: MemoryBlockType,
    scope: MemoryScope,
    metadata?: Record<string, unknown>
  ): AuditEntry {
    return this.log(
      'memory_delete',
      'warning',
      `Deleted ${blockType} block from ${scope} scope`,
      { userId, blockType, scope, operation: 'delete', metadata }
    );
  }

  /**
   * Log a search event.
   */
  logSearch(
    userId: string,
    query: string,
    resultCount: number,
    metadata?: Record<string, unknown>
  ): AuditEntry {
    return this.log(
      'memory_search',
      'info',
      `Searched for "${query.substring(0, 50)}" - ${resultCount} results`,
      { userId, operation: 'search', metadata: { ...metadata, query, resultCount } }
    );
  }

  /**
   * Log an access denied event.
   */
  logAccessDenied(
    userId: string,
    operation: Operation,
    reason: string,
    metadata?: Record<string, unknown>
  ): AuditEntry {
    return this.log(
      'access_denied',
      'warning',
      `Access denied for ${operation}: ${reason}`,
      { userId, operation, metadata: { ...metadata, reason } }
    );
  }

  /**
   * Log a system error.
   */
  logError(
    error: Error | string,
    context?: string,
    metadata?: Record<string, unknown>
  ): AuditEntry {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    return this.log(
      'system_error',
      'error',
      context ? `${context}: ${errorMessage}` : errorMessage,
      { metadata: { ...metadata, error: errorMessage, stack: errorStack } }
    );
  }

  /**
   * Log a role change.
   */
  logRoleChange(
    adminUserId: string,
    targetUserId: string,
    oldRole: Role,
    newRole: Role
  ): AuditEntry {
    return this.log(
      'role_change',
      'warning',
      `User ${targetUserId} role changed from ${oldRole} to ${newRole} by ${adminUserId}`,
      { userId: adminUserId, metadata: { targetUserId, oldRole, newRole } }
    );
  }

  /**
   * Query audit entries.
   */
  query(options: AuditQueryOptions = {}): AuditEntry[] {
    let results = [...this.entries];

    // Filter by types
    if (options.types?.length) {
      results = results.filter((e) => options.types!.includes(e.type));
    }

    // Filter by severities
    if (options.severities?.length) {
      results = results.filter((e) => options.severities!.includes(e.severity));
    }

    // Filter by user
    if (options.userId) {
      results = results.filter((e) => e.userId === options.userId);
    }

    // Filter by time range
    if (options.startTime) {
      results = results.filter((e) => e.timestamp >= options.startTime!);
    }
    if (options.endTime) {
      results = results.filter((e) => e.timestamp <= options.endTime!);
    }

    // Sort
    results.sort((a, b) => {
      const cmp = a.timestamp.getTime() - b.timestamp.getTime();
      return options.order === 'asc' ? cmp : -cmp;
    });

    // Pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? results.length;
    return results.slice(offset, offset + limit);
  }

  /**
   * Get audit statistics.
   */
  getStats(): AuditStats {
    const stats: AuditStats = {
      totalEntries: this.entries.length,
      byType: {} as Record<AuditEventType, number>,
      bySeverity: {} as Record<AuditSeverity, number>,
      topUsers: [],
      recentActivity: 0,
    };

    // Initialize counters
    const eventTypes: AuditEventType[] = [
      'memory_read', 'memory_write', 'memory_delete', 'memory_search',
      'memory_export', 'memory_import', 'user_login', 'user_logout',
      'role_change', 'access_denied', 'system_error', 'config_change',
    ];
    for (const type of eventTypes) {
      stats.byType[type] = 0;
    }
    for (const sev of SEVERITY_ORDER) {
      stats.bySeverity[sev] = 0;
    }

    // Count entries
    const userCounts = new Map<string, number>();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const entry of this.entries) {
      stats.byType[entry.type]++;
      stats.bySeverity[entry.severity]++;

      if (entry.userId) {
        userCounts.set(entry.userId, (userCounts.get(entry.userId) || 0) + 1);
      }

      if (entry.timestamp >= oneHourAgo) {
        stats.recentActivity++;
      }
    }

    // Top users
    stats.topUsers = Array.from(userCounts.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Clear all audit entries.
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Export entries as JSON.
   */
  export(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  /**
   * Get all entries.
   */
  getEntries(): AuditEntry[] {
    return [...this.entries];
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private generateId(): string {
    return `audit_${Date.now()}_${++this.entryCounter}`;
  }

  private shouldLog(severity: AuditSeverity): boolean {
    const minIndex = SEVERITY_ORDER.indexOf(this.config.minSeverity);
    const severityIndex = SEVERITY_ORDER.indexOf(severity);
    return severityIndex >= minIndex;
  }

  private outputToConsole(entry: AuditEntry): void {
    const prefix = `[AUDIT ${entry.severity.toUpperCase()}]`;
    const message = `${prefix} ${entry.type}: ${entry.description}`;

    switch (entry.severity) {
      case 'error':
      case 'critical':
        console.error(message);
        break;
      case 'warning':
        console.warn(message);
        break;
      default:
        console.log(message);
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an audit logger instance.
 *
 * @param config - Logger configuration
 * @returns AuditLogger instance
 */
export function createAuditLogger(config?: Partial<AuditLoggerConfig>): AuditLogger {
  return new AuditLogger(config);
}

// =============================================================================
// Singleton Instance
// =============================================================================

let _auditLogger: AuditLogger | null = null;

/**
 * Get the global audit logger instance.
 */
export function getAuditLogger(): AuditLogger {
  if (!_auditLogger) {
    _auditLogger = new AuditLogger();
  }
  return _auditLogger;
}

/**
 * Reset the global audit logger instance.
 */
export function resetAuditLogger(): void {
  _auditLogger = null;
}
