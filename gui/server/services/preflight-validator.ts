/**
 * Pre-flight Validation Module
 *
 * Validates prerequisites before spawning ralph --monitor:
 * - Ralph CLI installed and accessible
 * - Project properly initialized (.yoyo-dev/, ralph-prompt-generator.sh)
 * - PROMPT.md generation successful
 */

import { exec as execCallback, ChildProcess } from 'child_process';
import { existsSync, accessSync, constants } from 'fs';
import { join } from 'path';

// Error codes for execution failures
export type ExecutionErrorCode =
  | 'RALPH_NOT_FOUND'
  | 'PROJECT_NOT_INITIALIZED'
  | 'PROMPT_GENERATION_FAILED'
  | 'SPAWN_FAILED'
  | 'PROCESS_CRASHED'
  | 'EXECUTION_NOT_RUNNING'
  | 'ALREADY_RUNNING';

// Result of a single validation check
export interface CheckResult {
  success: boolean;
  check: string;
  errorCode?: ExecutionErrorCode;
  message?: string;
  details?: string;
}

// Result of full validation
export interface ValidationResult {
  success: boolean;
  errorCode?: ExecutionErrorCode;
  message?: string;
  checks: CheckResult[];
  durationMs: number;
}

// Options for PreflightValidator
export interface PreflightValidatorOptions {
  exec?: (
    cmd: string,
    opts: any,
    callback: (error: Error | null, stdout: string, stderr: string) => void
  ) => ChildProcess;
  promptTimeout?: number; // Timeout for prompt generation in ms
}

// Error messages for each error code
const ERROR_MESSAGES: Record<ExecutionErrorCode, string> = {
  RALPH_NOT_FOUND: 'Ralph CLI not installed. Run: pip install ralph-cli',
  PROJECT_NOT_INITIALIZED: 'Project not set up for Ralph execution.',
  PROMPT_GENERATION_FAILED: 'Failed to generate execution prompt.',
  SPAWN_FAILED: 'Failed to start Ralph process. Check system resources.',
  PROCESS_CRASHED: 'Ralph exited unexpectedly. Check logs for details.',
  EXECUTION_NOT_RUNNING: 'No execution in progress.',
  ALREADY_RUNNING: 'Execution already in progress. Stop current execution first.',
};

export class PreflightValidator {
  private projectRoot: string;
  private exec: PreflightValidatorOptions['exec'];
  private promptTimeout: number;

  constructor(projectRoot: string, options: PreflightValidatorOptions = {}) {
    this.projectRoot = projectRoot;
    this.exec = options.exec ?? this.defaultExec.bind(this);
    this.promptTimeout = options.promptTimeout ?? 10000; // 10 seconds default
  }

  /**
   * Default exec wrapper that promisifies child_process.exec
   */
  private defaultExec(
    cmd: string,
    opts: any,
    callback: (error: Error | null, stdout: string, stderr: string) => void
  ): ChildProcess {
    return execCallback(cmd, opts, callback);
  }

  /**
   * Check if Ralph CLI is installed and accessible
   */
  async checkRalphInstalled(): Promise<CheckResult> {
    const checkName = 'ralph_installed';

    try {
      // Check if ralph is in PATH
      const whichResult = await this.execPromise('which ralph || command -v ralph');

      if (!whichResult.stdout.trim()) {
        return {
          success: false,
          check: checkName,
          errorCode: 'RALPH_NOT_FOUND',
          message: ERROR_MESSAGES.RALPH_NOT_FOUND,
          details: 'Ralph binary not found in PATH',
        };
      }

      // Verify version works
      try {
        await this.execPromise('ralph --version');
      } catch (versionError) {
        // Binary exists but --version failed - still usable
        // Log warning but don't fail
      }

      return {
        success: true,
        check: checkName,
      };
    } catch (error) {
      return {
        success: false,
        check: checkName,
        errorCode: 'RALPH_NOT_FOUND',
        message: ERROR_MESSAGES.RALPH_NOT_FOUND,
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if project is properly initialized for Ralph execution
   */
  async checkProjectInitialized(): Promise<CheckResult> {
    const checkName = 'project_initialized';

    // Check project root exists and is non-empty
    if (!this.projectRoot || !existsSync(this.projectRoot)) {
      return {
        success: false,
        check: checkName,
        errorCode: 'PROJECT_NOT_INITIALIZED',
        message: ERROR_MESSAGES.PROJECT_NOT_INITIALIZED,
        details: 'Project root does not exist',
      };
    }

    // Check .yoyo-dev directory exists
    const yoyoDevPath = join(this.projectRoot, '.yoyo-dev');
    if (!existsSync(yoyoDevPath)) {
      return {
        success: false,
        check: checkName,
        errorCode: 'PROJECT_NOT_INITIALIZED',
        message: ERROR_MESSAGES.PROJECT_NOT_INITIALIZED,
        details: '.yoyo-dev directory not found. Run: yoyo-init',
      };
    }

    // Check ralph-prompt-generator.sh exists and is executable
    const generatorPath = join(this.projectRoot, 'setup', 'ralph-prompt-generator.sh');
    if (!existsSync(generatorPath)) {
      return {
        success: false,
        check: checkName,
        errorCode: 'PROJECT_NOT_INITIALIZED',
        message: ERROR_MESSAGES.PROJECT_NOT_INITIALIZED,
        details: 'ralph-prompt-generator.sh not found in setup/',
      };
    }

    try {
      accessSync(generatorPath, constants.X_OK);
    } catch {
      return {
        success: false,
        check: checkName,
        errorCode: 'PROJECT_NOT_INITIALIZED',
        message: ERROR_MESSAGES.PROJECT_NOT_INITIALIZED,
        details: 'ralph-prompt-generator.sh is not executable',
      };
    }

    return {
      success: true,
      check: checkName,
    };
  }

  /**
   * Generate PROMPT.md by running ralph-prompt-generator.sh
   */
  async generatePrompt(phaseId: string): Promise<CheckResult> {
    const checkName = 'prompt_generation';
    const generatorPath = join(this.projectRoot, 'setup', 'ralph-prompt-generator.sh');
    const promptPath = join(this.projectRoot, '.yoyo-dev', 'PROMPT.md');

    try {
      // Run generator with timeout
      const cmd = `bash "${generatorPath}" "${phaseId}"`;

      await this.execPromiseWithTimeout(cmd, this.promptTimeout);

      // Verify PROMPT.md was created
      if (!existsSync(promptPath)) {
        return {
          success: false,
          check: checkName,
          errorCode: 'PROMPT_GENERATION_FAILED',
          message: ERROR_MESSAGES.PROMPT_GENERATION_FAILED,
          details: 'PROMPT.md was not created after running generator',
        };
      }

      return {
        success: true,
        check: checkName,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = errorMessage.includes('timeout');

      return {
        success: false,
        check: checkName,
        errorCode: 'PROMPT_GENERATION_FAILED',
        message: ERROR_MESSAGES.PROMPT_GENERATION_FAILED,
        details: isTimeout
          ? `Prompt generation timeout after ${this.promptTimeout}ms`
          : `Generator failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Run all validation checks
   * Stops on first failure to provide quick feedback
   */
  async validateAll(phaseId: string): Promise<ValidationResult> {
    const startTime = Date.now();
    const checks: CheckResult[] = [];

    // 1. Check Ralph installed
    const ralphCheck = await this.checkRalphInstalled();
    checks.push(ralphCheck);

    if (!ralphCheck.success) {
      return {
        success: false,
        errorCode: ralphCheck.errorCode,
        message: ralphCheck.message,
        checks,
        durationMs: Date.now() - startTime,
      };
    }

    // 2. Check project initialized
    const projectCheck = await this.checkProjectInitialized();
    checks.push(projectCheck);

    if (!projectCheck.success) {
      return {
        success: false,
        errorCode: projectCheck.errorCode,
        message: projectCheck.message,
        checks,
        durationMs: Date.now() - startTime,
      };
    }

    // 3. Generate prompt
    const promptCheck = await this.generatePrompt(phaseId);
    checks.push(promptCheck);

    if (!promptCheck.success) {
      return {
        success: false,
        errorCode: promptCheck.errorCode,
        message: promptCheck.message,
        checks,
        durationMs: Date.now() - startTime,
      };
    }

    return {
      success: true,
      checks,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Helper to promisify exec call
   */
  private execPromise(cmd: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      this.exec!(cmd, { cwd: this.projectRoot }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  /**
   * Helper to promisify exec call with timeout
   */
  private execPromiseWithTimeout(
    cmd: string,
    timeout: number
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      let timedOut = false;
      let childProcess: ChildProcess | null = null;

      const timer = setTimeout(() => {
        timedOut = true;
        if (childProcess && typeof childProcess.kill === 'function') {
          childProcess.kill('SIGTERM');
        }
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);

      childProcess = this.exec!(cmd, { cwd: this.projectRoot }, (error, stdout, stderr) => {
        clearTimeout(timer);
        if (timedOut) return; // Already rejected

        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }
}

/**
 * Factory function for creating a validator instance
 */
export function createPreflightValidator(
  projectRoot: string,
  options?: PreflightValidatorOptions
): PreflightValidator {
  return new PreflightValidator(projectRoot, options);
}
