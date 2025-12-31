/**
 * Chat Service
 *
 * Handles Claude Code CLI integration for codebase chat.
 * Uses subprocess communication with `claude --print` for programmatic interaction.
 */

import { spawn as nodeSpawn, type ChildProcess, type SpawnOptions } from 'child_process';

// =============================================================================
// Types
// =============================================================================

export interface ChatServiceOptions {
  /** Timeout in milliseconds for chat requests (default: 5 minutes) */
  timeoutMs?: number;
  /** Custom spawn function for testing */
  spawn?: typeof nodeSpawn;
}

export interface ClaudeAvailability {
  available: boolean;
  version?: string;
  error?: string;
}

// Type for spawn function
type SpawnFn = (
  command: string,
  args: string[],
  options: SpawnOptions
) => ChildProcess;

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const CLAUDE_DOWNLOAD_URL = 'https://claude.ai/download';

// =============================================================================
// Service
// =============================================================================

export class ChatService {
  private projectRoot: string;
  private timeoutMs: number;
  private spawn: SpawnFn;
  private currentProcess: ChildProcess | null = null;

  constructor(projectRoot: string, options: ChatServiceOptions = {}) {
    this.projectRoot = projectRoot;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.spawn = (options.spawn ?? nodeSpawn) as SpawnFn;
  }

  /**
   * Check if Claude Code CLI is available on the system
   */
  async checkClaudeAvailability(): Promise<ClaudeAvailability> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      const proc = this.spawn('claude', ['--version'], {
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') {
          resolve({
            available: false,
            error: `Claude Code CLI not found. Install from ${CLAUDE_DOWNLOAD_URL}`,
          });
        } else {
          resolve({
            available: false,
            error: error.message,
          });
        }
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({
            available: true,
            version: stdout.trim(),
          });
        } else {
          // Non-zero exit could mean auth required or other issues
          const errorMsg = stderr.trim() || stdout.trim() || 'Unknown error';
          resolve({
            available: false,
            error: errorMsg,
          });
        }
      });
    });
  }

  /**
   * Send a chat message and stream the response
   * Returns an async iterable that yields response chunks
   *
   * @param message - The message to send to Claude
   * @param sessionId - Optional session ID for conversation continuity
   */
  chat(message: string, sessionId?: string): AsyncIterable<string> {
    const self = this;

    return {
      [Symbol.asyncIterator](): AsyncIterator<string> {
        let proc: ChildProcess | null = null;
        let stderr = '';
        let processError: Error | null = null;
        let resolveNext: ((value: IteratorResult<string>) => void) | null = null;
        let rejectNext: ((error: Error) => void) | null = null;
        const chunks: string[] = [];
        let done = false;
        let timeoutId: NodeJS.Timeout | null = null;

        // Build CLI arguments
        const args = ['-p'];
        if (sessionId) {
          args.push('--session-id', sessionId);
        }
        args.push(message);

        // Start the process
        proc = self.spawn('claude', args, {
          cwd: self.projectRoot,
          env: { ...process.env },
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        self.currentProcess = proc;

        // Set up timeout
        timeoutId = setTimeout(() => {
          if (proc && !done) {
            // Set error BEFORE kill() since kill may synchronously trigger close event
            processError = new Error('Claude Code request timeout');
            done = true;
            proc.kill();
            if (rejectNext) {
              rejectNext(processError);
              rejectNext = null;
            }
          }
        }, self.timeoutMs);

        proc.stdout?.on('data', (data: Buffer) => {
          const chunk = data.toString();
          if (resolveNext) {
            resolveNext({ value: chunk, done: false });
            resolveNext = null;
          } else {
            chunks.push(chunk);
          }
        });

        proc.stderr?.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        proc.on('error', (error: NodeJS.ErrnoException) => {
          if (timeoutId) clearTimeout(timeoutId);
          done = true;
          self.currentProcess = null;

          if (error.code === 'ENOENT') {
            processError = new Error('Claude Code CLI not found. Install from ' + CLAUDE_DOWNLOAD_URL);
          } else {
            processError = error;
          }

          if (rejectNext) {
            rejectNext(processError);
            rejectNext = null;
          }
        });

        proc.on('close', (code) => {
          if (timeoutId) clearTimeout(timeoutId);
          done = true;
          self.currentProcess = null;

          if (code !== 0 && !processError) {
            const errorMsg = stderr.trim() || 'Claude Code exited with error';
            processError = new Error(errorMsg);
          }

          if (resolveNext) {
            if (processError) {
              if (rejectNext) {
                rejectNext(processError);
                rejectNext = null;
              }
            } else {
              resolveNext({ value: undefined as any, done: true });
            }
            resolveNext = null;
          }
        });

        return {
          async next(): Promise<IteratorResult<string>> {
            // If we have buffered chunks, return them
            if (chunks.length > 0) {
              return { value: chunks.shift()!, done: false };
            }

            // If process is done
            if (done) {
              if (processError) {
                throw processError;
              }
              return { value: undefined as any, done: true };
            }

            // Wait for next chunk
            return new Promise((resolve, reject) => {
              resolveNext = resolve;
              rejectNext = reject;
            });
          },

          async return(): Promise<IteratorResult<string>> {
            if (timeoutId) clearTimeout(timeoutId);
            if (proc && !done) {
              proc.kill();
            }
            done = true;
            self.currentProcess = null;
            return { value: undefined as any, done: true };
          },
        };
      },
    };
  }

  /**
   * Abort the current chat request
   */
  abort(): void {
    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = null;
    }
  }
}

// =============================================================================
// Singleton Factory
// =============================================================================

let chatServiceInstance: ChatService | null = null;

/**
 * Get or create chat service instance
 */
export function getChatService(projectRoot: string): ChatService {
  if (!chatServiceInstance || (chatServiceInstance as any).projectRoot !== projectRoot) {
    chatServiceInstance = new ChatService(projectRoot);
  }
  return chatServiceInstance;
}

/**
 * Reset singleton instance (for testing)
 */
export function resetChatService(): void {
  chatServiceInstance = null;
}

export default ChatService;
