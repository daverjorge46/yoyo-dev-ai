/**
 * Terminal Pool Service
 *
 * Manages a pool of Agent Terminals with:
 * - Spawn, pause, resume, kill lifecycle management
 * - Session persistence using SQLite
 * - WebSocket streaming for real-time output
 * - Max concurrent terminal enforcement (default: 12)
 */

import { spawn, type ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import { join, basename } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import Database from 'better-sqlite3';
import type {
  AgentType,
  TerminalStatus,
  TerminalContext,
  TerminalSession,
  TerminalDBRow,
  TerminalPoolConfig,
  SpawnOptions,
  OutputLine,
  DEFAULT_POOL_CONFIG,
} from '../types/terminal.js';
import { wsManager } from './websocket.js';

// =============================================================================
// Constants
// =============================================================================

const AGENT_TYPE_NAMES: Record<AgentType, string> = {
  'yoyo-ai': 'Yoyo',
  'dave-engineer': 'Dave',
  'arthas-oracle': 'Arthas',
  'alma-librarian': 'Alma',
  'alvaro-explore': 'Alvaro',
  'angeles-writer': 'Angeles',
  'implementer': 'Impl',
  'qa-reviewer': 'QA-R',
  'qa-fixer': 'QA-F',
};

// =============================================================================
// Terminal Pool Class
// =============================================================================

export class TerminalPool {
  private config: TerminalPoolConfig;
  private db: Database.Database;
  private sessions: Map<string, TerminalSession> = new Map();
  private nameCounter: Map<AgentType, number> = new Map();

  constructor(config: Partial<TerminalPoolConfig> & { projectRoot: string }) {
    this.config = {
      maxConcurrent: config.maxConcurrent ?? 12,
      autoCleanupHours: config.autoCleanupHours ?? 24,
      defaultAgent: config.defaultAgent ?? 'yoyo-ai',
      worktreeEnabled: config.worktreeEnabled ?? true,
      outputBufferSize: config.outputBufferSize ?? 1000,
      projectRoot: config.projectRoot,
    };

    // Initialize database
    const dbDir = join(this.config.projectRoot, '.yoyo-dev', 'data');
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = join(dbDir, 'terminals.db');
    this.db = new Database(dbPath);

    this.initializeDatabase();
    this.loadPersistedSessions();
    this.startCleanupTimer();
  }

  // ===========================================================================
  // Database Setup
  // ===========================================================================

  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS terminals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_activity_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        bound_task_id TEXT,
        bound_spec_id TEXT,
        worktree_path TEXT,
        worktree_branch TEXT,
        injected_context TEXT,
        progress INTEGER DEFAULT 0,
        error_message TEXT,
        exit_code INTEGER,
        last_output_line TEXT,
        output_line_count INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_terminals_status ON terminals(status);
      CREATE INDEX IF NOT EXISTS idx_terminals_created ON terminals(created_at);
    `);
  }

  private loadPersistedSessions(): void {
    const rows = this.db.prepare(`
      SELECT * FROM terminals WHERE status NOT IN ('completed', 'error', 'cancelled')
    `).all() as TerminalDBRow[];

    for (const row of rows) {
      const session = this.rowToSession(row);
      // Mark as error since process is gone after server restart
      if (session.status === 'running' || session.status === 'paused') {
        session.status = 'error';
        session.errorMessage = 'Server restarted - process lost';
        this.updateSession(session);
      }
      this.sessions.set(session.id, session);
    }

    console.log(`[TerminalPool] Loaded ${this.sessions.size} persisted sessions`);
  }

  private rowToSession(row: TerminalDBRow): TerminalSession {
    return {
      id: row.id,
      name: row.name,
      agentType: row.agent_type,
      status: row.status,
      createdAt: new Date(row.created_at),
      lastActivityAt: new Date(row.last_activity_at),
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      boundTaskId: row.bound_task_id ?? undefined,
      boundSpecId: row.bound_spec_id ?? undefined,
      worktreePath: row.worktree_path ?? undefined,
      worktreeBranch: row.worktree_branch ?? undefined,
      injectedContext: row.injected_context ? JSON.parse(row.injected_context) : undefined,
      progress: row.progress,
      errorMessage: row.error_message ?? undefined,
      exitCode: row.exit_code ?? undefined,
      lastOutputLine: row.last_output_line ?? undefined,
      outputLineCount: row.output_line_count,
      outputBuffer: [],
      maxBufferSize: this.config.outputBufferSize,
    };
  }

  private sessionToRow(session: TerminalSession): TerminalDBRow {
    return {
      id: session.id,
      name: session.name,
      agent_type: session.agentType,
      status: session.status,
      created_at: session.createdAt.toISOString(),
      last_activity_at: session.lastActivityAt.toISOString(),
      started_at: session.startedAt?.toISOString() ?? null,
      completed_at: session.completedAt?.toISOString() ?? null,
      bound_task_id: session.boundTaskId ?? null,
      bound_spec_id: session.boundSpecId ?? null,
      worktree_path: session.worktreePath ?? null,
      worktree_branch: session.worktreeBranch ?? null,
      injected_context: session.injectedContext ? JSON.stringify(session.injectedContext) : null,
      progress: session.progress,
      error_message: session.errorMessage ?? null,
      exit_code: session.exitCode ?? null,
      last_output_line: session.lastOutputLine ?? null,
      output_line_count: session.outputLineCount,
    };
  }

  private insertSession(session: TerminalSession): void {
    const row = this.sessionToRow(session);
    this.db.prepare(`
      INSERT INTO terminals (
        id, name, agent_type, status, created_at, last_activity_at,
        started_at, completed_at, bound_task_id, bound_spec_id,
        worktree_path, worktree_branch, injected_context,
        progress, error_message, exit_code, last_output_line, output_line_count
      ) VALUES (
        @id, @name, @agent_type, @status, @created_at, @last_activity_at,
        @started_at, @completed_at, @bound_task_id, @bound_spec_id,
        @worktree_path, @worktree_branch, @injected_context,
        @progress, @error_message, @exit_code, @last_output_line, @output_line_count
      )
    `).run(row);
  }

  private updateSession(session: TerminalSession): void {
    session.lastActivityAt = new Date();
    const row = this.sessionToRow(session);
    this.db.prepare(`
      UPDATE terminals SET
        name = @name,
        agent_type = @agent_type,
        status = @status,
        last_activity_at = @last_activity_at,
        started_at = @started_at,
        completed_at = @completed_at,
        bound_task_id = @bound_task_id,
        bound_spec_id = @bound_spec_id,
        worktree_path = @worktree_path,
        worktree_branch = @worktree_branch,
        injected_context = @injected_context,
        progress = @progress,
        error_message = @error_message,
        exit_code = @exit_code,
        last_output_line = @last_output_line,
        output_line_count = @output_line_count
      WHERE id = @id
    `).run(row);
  }

  // ===========================================================================
  // Name Generation
  // ===========================================================================

  private generateTerminalName(agentType: AgentType): string {
    const count = (this.nameCounter.get(agentType) ?? 0) + 1;
    this.nameCounter.set(agentType, count);
    return `${AGENT_TYPE_NAMES[agentType]}-${count}`;
  }

  // ===========================================================================
  // Pool Statistics
  // ===========================================================================

  getStats(): {
    total: number;
    running: number;
    paused: number;
    completed: number;
    error: number;
    maxConcurrent: number;
  } {
    let running = 0;
    let paused = 0;
    let completed = 0;
    let error = 0;

    for (const session of this.sessions.values()) {
      switch (session.status) {
        case 'running':
          running++;
          break;
        case 'paused':
          paused++;
          break;
        case 'completed':
          completed++;
          break;
        case 'error':
        case 'cancelled':
          error++;
          break;
      }
    }

    return {
      total: this.sessions.size,
      running,
      paused,
      completed,
      error,
      maxConcurrent: this.config.maxConcurrent,
    };
  }

  // ===========================================================================
  // Lifecycle Management
  // ===========================================================================

  /**
   * Spawn a new terminal with the specified agent type
   */
  async spawn(options: SpawnOptions): Promise<TerminalSession> {
    const stats = this.getStats();
    if (stats.running >= this.config.maxConcurrent) {
      throw new Error(
        `Maximum concurrent terminals reached (${this.config.maxConcurrent}). ` +
        `Please stop or wait for existing terminals to complete.`
      );
    }

    const id = randomUUID();
    const name = options.name ?? this.generateTerminalName(options.agentType);
    const now = new Date();

    const session: TerminalSession = {
      id,
      name,
      agentType: options.agentType,
      status: 'idle',
      createdAt: now,
      lastActivityAt: now,
      boundTaskId: options.taskId,
      boundSpecId: options.specId,
      injectedContext: options.context,
      progress: 0,
      outputLineCount: 0,
      outputBuffer: [],
      maxBufferSize: this.config.outputBufferSize,
    };

    // Persist to database
    this.insertSession(session);
    this.sessions.set(id, session);

    // Start the agent process
    await this.startProcess(session);

    console.log(`[TerminalPool] Spawned terminal ${name} (${id}) with agent ${options.agentType}`);
    return session;
  }

  /**
   * Start the agent process for a session
   */
  private async startProcess(session: TerminalSession): Promise<void> {
    const previousStatus = session.status;
    session.status = 'running';
    session.startedAt = new Date();
    session.lastActivityAt = new Date();

    // Build context prompt if provided
    let contextPrompt = '';
    if (session.injectedContext) {
      contextPrompt = this.buildContextPrompt(session.injectedContext);
    }

    // Determine working directory
    const cwd = session.worktreePath ?? this.config.projectRoot;

    // Build command - using claude CLI with print mode for programmatic interaction
    const args: string[] = ['--print'];
    if (contextPrompt) {
      args.push(contextPrompt);
    }

    try {
      const proc = spawn('claude', args, {
        cwd,
        env: {
          ...process.env,
          YOYO_PROJECT_ROOT: this.config.projectRoot,
          YOYO_TERMINAL_ID: session.id,
          YOYO_AGENT_TYPE: session.agentType,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      session.process = proc;

      // Handle stdout
      proc.stdout?.on('data', (data: Buffer) => {
        this.handleOutput(session, data.toString(), 'stdout');
      });

      // Handle stderr
      proc.stderr?.on('data', (data: Buffer) => {
        this.handleOutput(session, data.toString(), 'stderr');
      });

      // Handle exit
      proc.on('exit', (code, signal) => {
        this.handleExit(session, code, signal);
      });

      // Handle error
      proc.on('error', (error) => {
        this.handleError(session, error);
      });

      // Broadcast status change
      this.broadcastStatusChange(session, previousStatus);
      this.updateSession(session);
    } catch (error) {
      session.status = 'error';
      session.errorMessage = error instanceof Error ? error.message : String(error);
      this.broadcastStatusChange(session, previousStatus);
      this.updateSession(session);
      throw error;
    }
  }

  /**
   * Build context prompt from injected context
   */
  private buildContextPrompt(context: TerminalContext): string {
    const parts: string[] = [];

    if (context.specSummary) {
      parts.push(`## Specification\n${context.specSummary}`);
    }

    if (context.taskDescription) {
      parts.push(`## Current Task\n${context.taskDescription}`);
    }

    if (context.codebaseContext) {
      parts.push(`## Codebase Context\n${context.codebaseContext}`);
    }

    if (context.memoryContext) {
      parts.push(`## Memory Context\n${context.memoryContext}`);
    }

    if (context.techStackContext) {
      parts.push(`## Tech Stack\n${context.techStackContext}`);
    }

    if (context.customContext) {
      parts.push(`## Additional Context\n${context.customContext}`);
    }

    return parts.join('\n\n---\n\n');
  }

  /**
   * Handle output from the process
   */
  private handleOutput(session: TerminalSession, data: string, stream: 'stdout' | 'stderr'): void {
    const lines = data.split('\n').filter(line => line.length > 0);

    for (const content of lines) {
      const line: OutputLine = {
        id: randomUUID(),
        content,
        timestamp: new Date(),
        stream,
      };

      // Add to buffer (ring buffer behavior)
      session.outputBuffer.push(line);
      if (session.outputBuffer.length > session.maxBufferSize) {
        session.outputBuffer.shift();
      }

      session.outputLineCount++;
      session.lastOutputLine = content;
      session.lastActivityAt = new Date();

      // Broadcast output via WebSocket
      wsManager.broadcast({
        type: 'agent:log',
        payload: {
          data: {
            terminalId: session.id,
            line,
          },
          timestamp: Date.now(),
        },
      });
    }

    // Periodic database update (don't update on every line)
    if (session.outputLineCount % 100 === 0) {
      this.updateSession(session);
    }
  }

  /**
   * Handle process exit
   */
  private handleExit(session: TerminalSession, code: number | null, signal: string | null): void {
    const previousStatus = session.status;
    session.status = code === 0 ? 'completed' : 'error';
    session.completedAt = new Date();
    session.lastActivityAt = new Date();
    session.exitCode = code ?? undefined;
    session.progress = 100;
    session.process = undefined;

    if (code !== 0) {
      session.errorMessage = signal ? `Process killed with signal ${signal}` : `Process exited with code ${code}`;
    }

    this.updateSession(session);
    this.broadcastStatusChange(session, previousStatus);

    // Broadcast completion
    wsManager.broadcast({
      type: 'agent:completed',
      payload: {
        data: {
          terminalId: session.id,
          exitCode: code,
          success: code === 0,
        },
        timestamp: Date.now(),
      },
    });

    console.log(`[TerminalPool] Terminal ${session.name} (${session.id}) exited with code ${code}`);
  }

  /**
   * Handle process error
   */
  private handleError(session: TerminalSession, error: Error): void {
    const previousStatus = session.status;
    session.status = 'error';
    session.completedAt = new Date();
    session.lastActivityAt = new Date();
    session.errorMessage = error.message;
    session.process = undefined;

    this.updateSession(session);
    this.broadcastStatusChange(session, previousStatus);

    wsManager.broadcast({
      type: 'agent:failed',
      payload: {
        data: {
          terminalId: session.id,
          error: error.message,
        },
        timestamp: Date.now(),
      },
    });

    console.error(`[TerminalPool] Terminal ${session.name} (${session.id}) error:`, error.message);
  }

  /**
   * Broadcast status change via WebSocket
   */
  private broadcastStatusChange(session: TerminalSession, previousStatus: TerminalStatus): void {
    wsManager.broadcast({
      type: 'agent:progress',
      payload: {
        data: {
          terminalId: session.id,
          status: session.status,
          previousStatus,
          progress: session.progress,
        },
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Pause a running terminal (SIGTSTP)
   */
  async pause(terminalId: string): Promise<boolean> {
    const session = this.sessions.get(terminalId);
    if (!session || session.status !== 'running' || !session.process) {
      return false;
    }

    try {
      session.process.kill('SIGTSTP');
      const previousStatus = session.status;
      session.status = 'paused';
      session.lastActivityAt = new Date();
      this.updateSession(session);
      this.broadcastStatusChange(session, previousStatus);
      console.log(`[TerminalPool] Paused terminal ${session.name} (${session.id})`);
      return true;
    } catch (error) {
      console.error(`[TerminalPool] Failed to pause terminal ${terminalId}:`, error);
      return false;
    }
  }

  /**
   * Resume a paused terminal (SIGCONT)
   */
  async resume(terminalId: string): Promise<boolean> {
    const session = this.sessions.get(terminalId);
    if (!session || session.status !== 'paused' || !session.process) {
      return false;
    }

    try {
      session.process.kill('SIGCONT');
      const previousStatus = session.status;
      session.status = 'running';
      session.lastActivityAt = new Date();
      this.updateSession(session);
      this.broadcastStatusChange(session, previousStatus);
      console.log(`[TerminalPool] Resumed terminal ${session.name} (${session.id})`);
      return true;
    } catch (error) {
      console.error(`[TerminalPool] Failed to resume terminal ${terminalId}:`, error);
      return false;
    }
  }

  /**
   * Kill a terminal (SIGTERM, then SIGKILL after 5s)
   */
  async kill(terminalId: string): Promise<boolean> {
    const session = this.sessions.get(terminalId);
    if (!session) {
      return false;
    }

    const previousStatus = session.status;

    if (session.process) {
      try {
        // Try graceful shutdown first
        session.process.kill('SIGTERM');

        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (session.process) {
            session.process.kill('SIGKILL');
          }
        }, 5000);
      } catch (error) {
        console.error(`[TerminalPool] Failed to kill terminal ${terminalId}:`, error);
      }
    }

    session.status = 'cancelled';
    session.completedAt = new Date();
    session.lastActivityAt = new Date();
    session.process = undefined;

    this.updateSession(session);
    this.broadcastStatusChange(session, previousStatus);

    console.log(`[TerminalPool] Killed terminal ${session.name} (${session.id})`);
    return true;
  }

  /**
   * Kill all terminals
   */
  async killAll(): Promise<number> {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.status === 'running' || session.status === 'paused') {
        if (await this.kill(session.id)) {
          count++;
        }
      }
    }
    console.log(`[TerminalPool] Killed ${count} terminals`);
    return count;
  }

  /**
   * Inject context into a terminal
   */
  async injectContext(terminalId: string, context: TerminalContext, append = false): Promise<boolean> {
    const session = this.sessions.get(terminalId);
    if (!session) {
      return false;
    }

    if (append && session.injectedContext) {
      // Merge contexts
      session.injectedContext = {
        specSummary: session.injectedContext.specSummary ?? context.specSummary,
        taskDescription: session.injectedContext.taskDescription ?? context.taskDescription,
        codebaseContext: [session.injectedContext.codebaseContext, context.codebaseContext]
          .filter(Boolean)
          .join('\n\n'),
        memoryContext: [session.injectedContext.memoryContext, context.memoryContext]
          .filter(Boolean)
          .join('\n\n'),
        techStackContext: session.injectedContext.techStackContext ?? context.techStackContext,
        customContext: [session.injectedContext.customContext, context.customContext]
          .filter(Boolean)
          .join('\n\n'),
      };
    } else {
      session.injectedContext = context;
    }

    session.lastActivityAt = new Date();
    this.updateSession(session);

    // If process is running, send context as stdin
    if (session.process && session.status === 'running') {
      const prompt = this.buildContextPrompt(context);
      session.process.stdin?.write(prompt + '\n');
    }

    console.log(`[TerminalPool] Injected context into terminal ${session.name} (${session.id})`);
    return true;
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  /**
   * Get a terminal session by ID
   */
  get(terminalId: string): TerminalSession | undefined {
    return this.sessions.get(terminalId);
  }

  /**
   * Get all terminal sessions
   */
  getAll(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get output buffer for a terminal
   */
  getOutput(terminalId: string): OutputLine[] {
    const session = this.sessions.get(terminalId);
    return session?.outputBuffer ?? [];
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  private startCleanupTimer(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupOldTerminals();
    }, 60 * 60 * 1000);
  }

  private cleanupOldTerminals(): void {
    const cutoff = new Date(Date.now() - this.config.autoCleanupHours * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [id, session] of this.sessions) {
      if (
        (session.status === 'completed' || session.status === 'error' || session.status === 'cancelled') &&
        session.lastActivityAt < cutoff
      ) {
        this.sessions.delete(id);
        this.db.prepare('DELETE FROM terminals WHERE id = ?').run(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[TerminalPool] Cleaned up ${cleaned} old terminals`);
    }
  }

  /**
   * Shutdown the pool
   */
  async shutdown(): Promise<void> {
    await this.killAll();
    this.db.close();
    console.log('[TerminalPool] Shutdown complete');
  }
}

// =============================================================================
// Singleton Factory
// =============================================================================

let poolInstance: TerminalPool | null = null;

export function getTerminalPool(projectRoot: string): TerminalPool {
  if (!poolInstance) {
    poolInstance = new TerminalPool({ projectRoot });
  }
  return poolInstance;
}

export function resetTerminalPool(): void {
  if (poolInstance) {
    poolInstance.shutdown();
  }
  poolInstance = null;
}
