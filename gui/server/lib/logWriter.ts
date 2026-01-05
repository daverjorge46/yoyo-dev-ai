/**
 * JSONL Log Writer
 *
 * Writes execution logs to JSONL files with:
 * - Append-only writing for performance
 * - File rotation when size exceeds threshold
 * - Max 3 rotated files per execution
 */

import { existsSync, mkdirSync, appendFileSync, statSync, renameSync, unlinkSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';

// =============================================================================
// Types
// =============================================================================

export interface LogEntry {
  ts: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  msg: string;
  meta?: Record<string, unknown>;
}

export interface LogWriterOptions {
  /** Base directory for logs (e.g., .yoyo-dev/ralph/logs) */
  logsDir: string;
  /** Execution ID for log file naming */
  executionId: string;
  /** Max file size before rotation (default: 50MB) */
  maxFileSize?: number;
  /** Max rotated files to keep (default: 3) */
  maxRotatedFiles?: number;
}

export interface LogReaderOptions {
  /** Number of entries to read */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Filter by log level */
  level?: LogEntry['level'];
}

export interface LogReadResult {
  logs: LogEntry[];
  total: number;
  hasMore: boolean;
}

// =============================================================================
// LogWriter Class
// =============================================================================

export class LogWriter {
  private logsDir: string;
  private executionId: string;
  private maxFileSize: number;
  private maxRotatedFiles: number;
  private lineCount: number = 0;
  private initialized: boolean = false;

  constructor(options: LogWriterOptions) {
    this.logsDir = options.logsDir;
    this.executionId = options.executionId;
    this.maxFileSize = options.maxFileSize ?? 50 * 1024 * 1024; // 50MB default
    this.maxRotatedFiles = options.maxRotatedFiles ?? 3;
  }

  // ===========================================================================
  // Path Helpers
  // ===========================================================================

  /**
   * Get the main log file path
   */
  getLogFilePath(): string {
    return join(this.logsDir, `${this.executionId}.jsonl`);
  }

  /**
   * Get rotated log file path
   */
  private getRotatedFilePath(index: number): string {
    return join(this.logsDir, `${this.executionId}.jsonl.${index}`);
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  /**
   * Initialize the log writer, creating directories if needed
   */
  private initialize(): void {
    if (this.initialized) return;

    // Ensure logs directory exists
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true });
    }

    // Count existing lines
    const logPath = this.getLogFilePath();
    if (existsSync(logPath)) {
      try {
        const content = readFileSync(logPath, 'utf-8');
        this.lineCount = content.split('\n').filter(line => line.trim()).length;
      } catch {
        this.lineCount = 0;
      }
    }

    this.initialized = true;
  }

  // ===========================================================================
  // Writing
  // ===========================================================================

  /**
   * Write a log entry
   */
  write(entry: Omit<LogEntry, 'ts'>): void {
    this.initialize();

    const fullEntry: LogEntry = {
      ts: new Date().toISOString(),
      ...entry,
    };

    const line = JSON.stringify(fullEntry) + '\n';
    const logPath = this.getLogFilePath();

    // Check if rotation needed
    this.rotateIfNeeded();

    // Append to file
    appendFileSync(logPath, line);
    this.lineCount++;
  }

  /**
   * Write multiple log entries
   */
  writeBatch(entries: Array<Omit<LogEntry, 'ts'>>): void {
    for (const entry of entries) {
      this.write(entry);
    }
  }

  // ===========================================================================
  // Rotation
  // ===========================================================================

  /**
   * Check if rotation is needed and perform it
   */
  private rotateIfNeeded(): void {
    const logPath = this.getLogFilePath();

    if (!existsSync(logPath)) {
      return;
    }

    try {
      const stats = statSync(logPath);
      if (stats.size >= this.maxFileSize) {
        this.rotate();
      }
    } catch {
      // Ignore stat errors
    }
  }

  /**
   * Rotate log files
   */
  private rotate(): void {
    const logPath = this.getLogFilePath();

    // Delete oldest if at max
    const oldestPath = this.getRotatedFilePath(this.maxRotatedFiles);
    if (existsSync(oldestPath)) {
      try {
        unlinkSync(oldestPath);
      } catch {
        // Ignore
      }
    }

    // Shift existing rotated files
    for (let i = this.maxRotatedFiles - 1; i >= 1; i--) {
      const fromPath = this.getRotatedFilePath(i);
      const toPath = this.getRotatedFilePath(i + 1);

      if (existsSync(fromPath)) {
        try {
          renameSync(fromPath, toPath);
        } catch {
          // Ignore
        }
      }
    }

    // Rotate current log file
    const firstRotatedPath = this.getRotatedFilePath(1);
    try {
      renameSync(logPath, firstRotatedPath);
    } catch {
      // Ignore
    }

    // Reset line count for new file
    this.lineCount = 0;
  }

  // ===========================================================================
  // Reading
  // ===========================================================================

  /**
   * Read log entries with pagination
   */
  read(options: LogReaderOptions = {}): LogReadResult {
    this.initialize();

    const { limit = 100, offset = 0, level } = options;
    const logPath = this.getLogFilePath();

    if (!existsSync(logPath)) {
      return { logs: [], total: 0, hasMore: false };
    }

    try {
      const content = readFileSync(logPath, 'utf-8');
      let lines = content.split('\n').filter(line => line.trim());

      // Parse all lines
      let logs: LogEntry[] = lines.map(line => {
        try {
          return JSON.parse(line) as LogEntry;
        } catch {
          return null;
        }
      }).filter((log): log is LogEntry => log !== null);

      // Filter by level if specified
      if (level) {
        logs = logs.filter(log => log.level === level);
      }

      const total = logs.length;

      // Apply pagination
      const paginatedLogs = logs.slice(offset, offset + limit);

      return {
        logs: paginatedLogs,
        total,
        hasMore: offset + paginatedLogs.length < total,
      };
    } catch {
      return { logs: [], total: 0, hasMore: false };
    }
  }

  /**
   * Read logs from all files (including rotated)
   */
  readAll(options: LogReaderOptions = {}): LogReadResult {
    const { limit = 100, offset = 0, level } = options;
    const allLogs: LogEntry[] = [];

    // Read from rotated files first (oldest to newest)
    for (let i = this.maxRotatedFiles; i >= 1; i--) {
      const rotatedPath = this.getRotatedFilePath(i);
      if (existsSync(rotatedPath)) {
        try {
          const content = readFileSync(rotatedPath, 'utf-8');
          const lines = content.split('\n').filter(line => line.trim());
          for (const line of lines) {
            try {
              allLogs.push(JSON.parse(line) as LogEntry);
            } catch {
              // Ignore parse errors
            }
          }
        } catch {
          // Ignore read errors
        }
      }
    }

    // Read from main log file
    const mainResult = this.read({ level });
    allLogs.push(...mainResult.logs);

    // Filter by level if specified
    let filteredLogs = level ? allLogs.filter(log => log.level === level) : allLogs;

    const total = filteredLogs.length;

    // Apply pagination
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    return {
      logs: paginatedLogs,
      total,
      hasMore: offset + paginatedLogs.length < total,
    };
  }

  // ===========================================================================
  // Utility
  // ===========================================================================

  /**
   * Get current line count
   */
  getLineCount(): number {
    return this.lineCount;
  }

  /**
   * Get current file size in bytes
   */
  getFileSize(): number {
    const logPath = this.getLogFilePath();
    if (!existsSync(logPath)) {
      return 0;
    }

    try {
      return statSync(logPath).size;
    } catch {
      return 0;
    }
  }

  /**
   * Delete all log files for this execution
   */
  cleanup(): void {
    const logPath = this.getLogFilePath();

    // Delete main log file
    if (existsSync(logPath)) {
      try {
        unlinkSync(logPath);
      } catch {
        // Ignore
      }
    }

    // Delete rotated files
    for (let i = 1; i <= this.maxRotatedFiles; i++) {
      const rotatedPath = this.getRotatedFilePath(i);
      if (existsSync(rotatedPath)) {
        try {
          unlinkSync(rotatedPath);
        } catch {
          // Ignore
        }
      }
    }

    this.lineCount = 0;
    this.initialized = false;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a log writer for an execution
 */
export function createLogWriter(projectRoot: string, executionId: string): LogWriter {
  return new LogWriter({
    logsDir: join(projectRoot, '.yoyo-dev', 'ralph', 'logs'),
    executionId,
  });
}

/**
 * List all log files in the logs directory
 */
export function listLogFiles(projectRoot: string): string[] {
  const logsDir = join(projectRoot, '.yoyo-dev', 'ralph', 'logs');

  if (!existsSync(logsDir)) {
    return [];
  }

  try {
    return readdirSync(logsDir)
      .filter(file => file.endsWith('.jsonl'))
      .map(file => file.replace('.jsonl', ''));
  } catch {
    return [];
  }
}
