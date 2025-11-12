import * as vscode from 'vscode';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Centralized logging service with Output Channel
 */
export class Logger {
  private static _instance: Logger | undefined;
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel = LogLevel.INFO;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Yoyo Dev');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): Logger {
    if (!Logger._instance) {
      Logger._instance = new Logger();
    }
    return Logger._instance;
  }

  /**
   * Set log level
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Show output channel
   */
  public show(): void {
    this.outputChannel.show();
  }

  /**
   * Log debug message
   */
  public debug(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.log('DEBUG', message, ...args);
    }
  }

  /**
   * Log info message
   */
  public info(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.log('INFO', message, ...args);
    }
  }

  /**
   * Log warning message
   */
  public warn(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.log('WARN', message, ...args);
    }
  }

  /**
   * Log error message
   */
  public error(message: string, error?: Error, ...args: any[]): void {
    if (this.logLevel <= LogLevel.ERROR) {
      const errorInfo = error ? `\n${error.stack || error.message}` : '';
      this.log('ERROR', message + errorInfo, ...args);
    }
  }

  /**
   * Internal log method
   */
  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;

    // Write to output channel
    this.outputChannel.appendLine(formattedMessage);

    // Also log args if present
    if (args.length > 0) {
      this.outputChannel.appendLine(JSON.stringify(args, null, 2));
    }

    // In dev mode, also log to console
    if (process.env.NODE_ENV === 'development') {
      console.log(formattedMessage, ...args);
    }
  }

  /**
   * Dispose logger
   */
  public dispose(): void {
    this.outputChannel.dispose();
    Logger._instance = undefined;
  }
}
