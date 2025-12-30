/**
 * Error Handler for TUI v4
 *
 * Handles crashes gracefully:
 * - Logs to .yoyo-dev/tui-errors.log
 * - Displays user-friendly error message
 * - Exits with error code to trigger fallback
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const ERROR_LOG_FILE = '.yoyo-dev/tui-errors.log';

/**
 * Log error to file
 */
export function logError(error: Error, context?: string): void {
  try {
    const logPath = join(process.cwd(), ERROR_LOG_FILE);
    const logDir = dirname(logPath);

    // Ensure .yoyo-dev directory exists
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : '';
    const logEntry = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TUI v4 Error${contextStr}
Time: ${timestamp}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Error: ${error.name}
Message: ${error.message}

Stack Trace:
${error.stack}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    // Create or append to log file
    if (existsSync(logPath)) {
      appendFileSync(logPath, logEntry, 'utf-8');
    } else {
      writeFileSync(logPath, logEntry, 'utf-8');
    }
  } catch (logErr) {
    // If logging fails, write to stderr but don't throw
    console.error('[ErrorHandler] Failed to write error log:', logErr);
  }
}

/**
 * Display error message to user
 */
export function displayError(error: Error, context?: string): void {
  const contextStr = context ? ` (${context})` : '';

  console.error('\n');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error(`TUI v4 Crashed${contextStr}`);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('');
  console.error(`Error: ${error.message}`);
  console.error('');
  console.error(`Error details have been logged to: ${ERROR_LOG_FILE}`);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('\n');
}

/**
 * Handle fatal error
 * - Logs error
 * - Displays message
 * - Exits with error code
 */
export function handleFatalError(error: Error, context?: string): never {
  logError(error, context);
  displayError(error, context);

  // Exit with error code 1
  process.exit(1);
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    handleFatalError(error, 'Uncaught Exception');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    handleFatalError(error, 'Unhandled Promise Rejection');
  });

  // Handle SIGTERM gracefully
  process.on('SIGTERM', () => {
    console.log('\n\nReceived SIGTERM, shutting down gracefully...');
    process.exit(0);
  });

  // Handle SIGINT gracefully (Ctrl+C)
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT, shutting down gracefully...');
    process.exit(0);
  });
}

/**
 * Wrap async function with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    handleFatalError(error instanceof Error ? error : new Error(String(error)), context);
  }
}
