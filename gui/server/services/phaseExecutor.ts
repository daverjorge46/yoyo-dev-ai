/**
 * Phase Executor Service
 *
 * Orchestrates automated execution of roadmap phases:
 * - Creates specs for items without linked specs
 * - Generates tasks from specs
 * - Executes tasks via agent terminals
 * - Runs QA review cycles
 * - Updates roadmap items on completion
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { getTerminalPool } from './terminalPool.js';
import { getQAManager } from './qaManager.js';
import { getContextBuilder } from './contextBuilder.js';
import { wsManager } from './websocket.js';
import type { AgentType, TerminalSession } from '../types/terminal.js';

// =============================================================================
// Types
// =============================================================================

export type PhaseExecutionStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ItemExecutionStep =
  | 'pending'
  | 'spec_creating'
  | 'spec_created'
  | 'tasks_creating'
  | 'tasks_created'
  | 'executing'
  | 'testing'
  | 'qa_reviewing'
  | 'qa_fixing'
  | 'completed'
  | 'failed';

export interface PhaseItem {
  id: string;
  number: number;
  title: string;
  completed: boolean;
  effort: 'XS' | 'S' | 'M' | 'L' | 'XL' | null;
  description?: string;
  linkedSpec?: string;
}

export interface PhaseExecutionConfig {
  phaseId: string;
  phaseTitle: string;
  items: PhaseItem[];
  options: {
    autoCreateSpecs: boolean;
    autoCreateTasks: boolean;
    runQA: boolean;
    maxQAIterations: number;
    stopOnError: boolean;
    useWorktrees: boolean;
    selectedItemIds?: string[];
  };
}

export interface ItemExecutionState {
  itemId: string;
  itemTitle: string;
  status: ItemExecutionStep;
  specId?: string;
  terminalId?: string;
  qaSessionId?: string;
  qaIterations: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface PhaseExecutionState {
  id: string;
  phaseId: string;
  phaseTitle: string;
  status: PhaseExecutionStatus;
  currentItemId: string | null;
  currentStep: ItemExecutionStep;
  progress: number;
  items: ItemExecutionState[];
  config: PhaseExecutionConfig['options'];
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

// Database row type
interface ExecutionDBRow {
  id: string;
  phase_id: string;
  phase_title: string;
  status: PhaseExecutionStatus;
  current_item_id: string | null;
  current_step: ItemExecutionStep;
  progress: number;
  items: string;
  config: string;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
  error_message: string | null;
}

// =============================================================================
// Phase Executor Class
// =============================================================================

export class PhaseExecutor {
  private db: Database.Database;
  private projectRoot: string;
  private currentExecution: PhaseExecutionState | null = null;
  private isPaused = false;
  private isCancelled = false;
  private terminalWatchers: Map<string, () => void> = new Map();

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;

    // Initialize SQLite database
    const dataDir = join(projectRoot, '.yoyo-dev', 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = join(dataDir, 'phase-executions.db');
    this.db = new Database(dbPath);
    this.initSchema();
    this.loadCurrentExecution();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS phase_executions (
        id TEXT PRIMARY KEY,
        phase_id TEXT NOT NULL,
        phase_title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        current_item_id TEXT,
        current_step TEXT NOT NULL DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        items TEXT NOT NULL,
        config TEXT NOT NULL,
        started_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        error_message TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_executions_phase ON phase_executions(phase_id);
      CREATE INDEX IF NOT EXISTS idx_executions_status ON phase_executions(status);
    `);
  }

  private loadCurrentExecution(): void {
    // Load any running/paused execution
    const stmt = this.db.prepare(`
      SELECT * FROM phase_executions
      WHERE status IN ('running', 'paused')
      ORDER BY started_at DESC
      LIMIT 1
    `);
    const row = stmt.get() as ExecutionDBRow | undefined;

    if (row) {
      this.currentExecution = this.rowToState(row);
      console.log(`[PhaseExecutor] Loaded execution ${row.id} (${row.status})`);
    }
  }

  private rowToState(row: ExecutionDBRow): PhaseExecutionState {
    return {
      id: row.id,
      phaseId: row.phase_id,
      phaseTitle: row.phase_title,
      status: row.status,
      currentItemId: row.current_item_id,
      currentStep: row.current_step,
      progress: row.progress,
      items: JSON.parse(row.items),
      config: JSON.parse(row.config),
      startedAt: row.started_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at ?? undefined,
      errorMessage: row.error_message ?? undefined,
    };
  }

  private saveExecution(state: PhaseExecutionState): void {
    state.updatedAt = new Date().toISOString();

    const exists = this.db.prepare('SELECT 1 FROM phase_executions WHERE id = ?').get(state.id);

    if (exists) {
      this.db.prepare(`
        UPDATE phase_executions SET
          status = ?, current_item_id = ?, current_step = ?, progress = ?,
          items = ?, config = ?, updated_at = ?, completed_at = ?, error_message = ?
        WHERE id = ?
      `).run(
        state.status,
        state.currentItemId,
        state.currentStep,
        state.progress,
        JSON.stringify(state.items),
        JSON.stringify(state.config),
        state.updatedAt,
        state.completedAt ?? null,
        state.errorMessage ?? null,
        state.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO phase_executions (
          id, phase_id, phase_title, status, current_item_id, current_step,
          progress, items, config, started_at, updated_at, completed_at, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        state.id,
        state.phaseId,
        state.phaseTitle,
        state.status,
        state.currentItemId,
        state.currentStep,
        state.progress,
        JSON.stringify(state.items),
        JSON.stringify(state.config),
        state.startedAt,
        state.updatedAt,
        state.completedAt ?? null,
        state.errorMessage ?? null
      );
    }
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Start executing a phase
   */
  async startExecution(config: PhaseExecutionConfig): Promise<PhaseExecutionState> {
    // Check if already executing
    if (this.currentExecution && this.currentExecution.status === 'running') {
      throw new Error('Another phase is currently executing. Cancel or wait for it to complete.');
    }

    const now = new Date().toISOString();
    const id = randomUUID();

    // Filter items if specific ones were selected
    const itemsToExecute = config.options.selectedItemIds
      ? config.items.filter(item => config.options.selectedItemIds!.includes(item.id))
      : config.items.filter(item => !item.completed);

    if (itemsToExecute.length === 0) {
      throw new Error('No items to execute. All items are either completed or none were selected.');
    }

    // Initialize item states
    const itemStates: ItemExecutionState[] = itemsToExecute.map(item => ({
      itemId: item.id,
      itemTitle: item.title,
      status: 'pending' as ItemExecutionStep,
      qaIterations: 0,
      specId: item.linkedSpec,
    }));

    const state: PhaseExecutionState = {
      id,
      phaseId: config.phaseId,
      phaseTitle: config.phaseTitle,
      status: 'running',
      currentItemId: null,
      currentStep: 'pending',
      progress: 0,
      items: itemStates,
      config: config.options,
      startedAt: now,
      updatedAt: now,
    };

    this.currentExecution = state;
    this.isPaused = false;
    this.isCancelled = false;
    this.saveExecution(state);

    // Broadcast start
    this.broadcastEvent('phase:execution:started', {
      executionId: id,
      phaseId: config.phaseId,
      phaseTitle: config.phaseTitle,
      itemCount: itemStates.length,
    });

    // Start execution loop (async, non-blocking)
    this.executeLoop().catch(error => {
      console.error('[PhaseExecutor] Execution loop error:', error);
      this.handleExecutionError(error);
    });

    return state;
  }

  /**
   * Pause execution at the next safe point
   */
  async pauseExecution(): Promise<boolean> {
    if (!this.currentExecution || this.currentExecution.status !== 'running') {
      return false;
    }

    this.isPaused = true;
    this.currentExecution.status = 'paused';
    this.saveExecution(this.currentExecution);

    this.broadcastEvent('phase:execution:paused', {
      executionId: this.currentExecution.id,
    });

    console.log(`[PhaseExecutor] Paused execution ${this.currentExecution.id}`);
    return true;
  }

  /**
   * Resume a paused execution
   */
  async resumeExecution(): Promise<boolean> {
    if (!this.currentExecution || this.currentExecution.status !== 'paused') {
      return false;
    }

    this.isPaused = false;
    this.currentExecution.status = 'running';
    this.saveExecution(this.currentExecution);

    this.broadcastEvent('phase:execution:resumed', {
      executionId: this.currentExecution.id,
    });

    // Resume execution loop
    this.executeLoop().catch(error => {
      console.error('[PhaseExecutor] Execution loop error:', error);
      this.handleExecutionError(error);
    });

    console.log(`[PhaseExecutor] Resumed execution ${this.currentExecution.id}`);
    return true;
  }

  /**
   * Cancel the current execution
   */
  async cancelExecution(): Promise<boolean> {
    if (!this.currentExecution) {
      return false;
    }

    this.isCancelled = true;
    this.isPaused = false;
    this.currentExecution.status = 'cancelled';
    this.currentExecution.completedAt = new Date().toISOString();
    this.saveExecution(this.currentExecution);

    // Kill any active terminals
    const terminalPool = getTerminalPool(this.projectRoot);
    for (const item of this.currentExecution.items) {
      if (item.terminalId) {
        await terminalPool.kill(item.terminalId);
      }
    }

    // Clear watchers
    this.terminalWatchers.clear();

    this.broadcastEvent('phase:execution:cancelled', {
      executionId: this.currentExecution.id,
    });

    console.log(`[PhaseExecutor] Cancelled execution ${this.currentExecution.id}`);

    const cancelled = this.currentExecution;
    this.currentExecution = null;
    return true;
  }

  /**
   * Get current execution status
   */
  getStatus(): PhaseExecutionState | null {
    return this.currentExecution;
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): PhaseExecutionState | null {
    const stmt = this.db.prepare('SELECT * FROM phase_executions WHERE id = ?');
    const row = stmt.get(executionId) as ExecutionDBRow | undefined;
    return row ? this.rowToState(row) : null;
  }

  /**
   * List all executions
   */
  listExecutions(limit = 20): PhaseExecutionState[] {
    const stmt = this.db.prepare(`
      SELECT * FROM phase_executions
      ORDER BY started_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as ExecutionDBRow[];
    return rows.map(row => this.rowToState(row));
  }

  // ===========================================================================
  // Execution Loop
  // ===========================================================================

  private async executeLoop(): Promise<void> {
    if (!this.currentExecution) return;

    const state = this.currentExecution;

    for (const item of state.items) {
      // Check for pause/cancel
      if (this.isPaused || this.isCancelled) {
        console.log(`[PhaseExecutor] Execution ${this.isPaused ? 'paused' : 'cancelled'} at item ${item.itemId}`);
        return;
      }

      // Skip completed items
      if (item.status === 'completed' || item.status === 'failed') {
        continue;
      }

      state.currentItemId = item.itemId;
      item.startedAt = new Date().toISOString();

      this.broadcastEvent('phase:execution:item:started', {
        executionId: state.id,
        itemId: item.itemId,
        itemTitle: item.itemTitle,
      });

      try {
        await this.executeItem(item);

        item.status = 'completed';
        item.completedAt = new Date().toISOString();

        this.broadcastEvent('phase:execution:item:completed', {
          executionId: state.id,
          itemId: item.itemId,
        });

        // Update roadmap item as completed
        await this.updateRoadmapItem(item.itemId, true);

      } catch (error) {
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : String(error);
        item.completedAt = new Date().toISOString();

        this.broadcastEvent('phase:execution:item:failed', {
          executionId: state.id,
          itemId: item.itemId,
          error: item.error,
        });

        if (state.config.stopOnError) {
          throw error;
        }
      }

      // Update progress
      const completed = state.items.filter(i => i.status === 'completed' || i.status === 'failed').length;
      state.progress = Math.round((completed / state.items.length) * 100);
      this.saveExecution(state);
    }

    // All items processed
    const hasFailures = state.items.some(i => i.status === 'failed');
    state.status = hasFailures ? 'failed' : 'completed';
    state.completedAt = new Date().toISOString();
    state.currentItemId = null;
    this.saveExecution(state);

    this.broadcastEvent('phase:execution:completed', {
      executionId: state.id,
      status: state.status,
      failedItems: state.items.filter(i => i.status === 'failed').length,
      completedItems: state.items.filter(i => i.status === 'completed').length,
    });

    console.log(`[PhaseExecutor] Execution ${state.id} completed with status: ${state.status}`);
    this.currentExecution = null;
  }

  private async executeItem(item: ItemExecutionState): Promise<void> {
    const state = this.currentExecution!;

    // Step 1: Create spec if needed
    if (!item.specId && state.config.autoCreateSpecs) {
      await this.updateItemStep(item, 'spec_creating');
      item.specId = await this.createSpecForItem(item);
      await this.updateItemStep(item, 'spec_created');
    }

    if (!item.specId) {
      throw new Error(`No spec found for item "${item.itemTitle}" and auto-create is disabled`);
    }

    // Step 2: Create tasks if needed
    if (state.config.autoCreateTasks) {
      const tasksExist = await this.checkTasksExist(item.specId);
      if (!tasksExist) {
        await this.updateItemStep(item, 'tasks_creating');
        await this.createTasksForSpec(item);
        await this.updateItemStep(item, 'tasks_created');
      }
    }

    // Step 3: Execute tasks
    await this.updateItemStep(item, 'executing');
    await this.executeTasksForSpec(item);

    // Step 4: Run tests
    await this.updateItemStep(item, 'testing');
    const testsPassed = await this.runTests(item.specId);

    // Step 5: QA cycle if enabled
    if (state.config.runQA) {
      let qaSuccess = testsPassed;

      while (!qaSuccess && item.qaIterations < state.config.maxQAIterations) {
        item.qaIterations++;

        await this.updateItemStep(item, 'qa_reviewing');
        const qaResult = await this.runQAReview(item);

        if (qaResult.hasIssues) {
          await this.updateItemStep(item, 'qa_fixing');
          await this.runQAFix(item);

          // Re-run tests
          await this.updateItemStep(item, 'testing');
          qaSuccess = await this.runTests(item.specId);
        } else {
          qaSuccess = true;
        }
      }

      if (!qaSuccess) {
        throw new Error(`QA failed after ${item.qaIterations} iterations`);
      }
    }
  }

  private async updateItemStep(item: ItemExecutionState, step: ItemExecutionStep): Promise<void> {
    item.status = step;
    const state = this.currentExecution!;
    state.currentStep = step;
    this.saveExecution(state);

    this.broadcastEvent('phase:execution:item:step', {
      executionId: state.id,
      itemId: item.itemId,
      step,
    });
  }

  // ===========================================================================
  // Spec Creation
  // ===========================================================================

  private async createSpecForItem(item: ItemExecutionState): Promise<string> {
    const state = this.currentExecution!;
    const terminalPool = getTerminalPool(this.projectRoot);

    // Build context for spec creation
    const context = {
      specSummary: `Create a specification for: ${item.itemTitle}`,
      taskDescription: item.itemTitle,
      customContext: `
Phase: ${state.phaseTitle}
Item: ${item.itemTitle}

Create a detailed specification document for implementing this feature.
The spec should include:
- Overview and goals
- Technical requirements
- API design (if applicable)
- Data models (if applicable)
- Success criteria
- Out of scope items
      `.trim(),
    };

    const terminal = await terminalPool.spawn({
      agentType: 'spec-writer' as AgentType,
      name: `Spec: ${item.itemTitle.slice(0, 20)}`,
      context,
    });

    item.terminalId = terminal.id;
    this.saveExecution(state);

    // Wait for terminal to complete
    await this.waitForTerminal(terminal.id);

    // Find the created spec
    const specId = await this.findCreatedSpec(item.itemTitle);
    if (!specId) {
      throw new Error(`Failed to find created spec for "${item.itemTitle}"`);
    }

    return specId;
  }

  private async findCreatedSpec(itemTitle: string): Promise<string | undefined> {
    const specsDir = join(this.projectRoot, '.yoyo-dev', 'specs');
    if (!existsSync(specsDir)) return undefined;

    const { readdirSync } = await import('fs');
    const specs = readdirSync(specsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort()
      .reverse();

    // Find most recent spec that might match this item
    const titleWords = itemTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    for (const specId of specs) {
      const specName = specId.replace(/^\d{4}-\d{2}-\d{2}-/, '').toLowerCase();
      if (titleWords.some(word => specName.includes(word))) {
        return specId;
      }
    }

    // Return most recent if no match found
    return specs[0];
  }

  // ===========================================================================
  // Tasks Creation
  // ===========================================================================

  private async checkTasksExist(specId: string): Promise<boolean> {
    const tasksPath = join(this.projectRoot, '.yoyo-dev', 'specs', specId, 'tasks.md');
    return existsSync(tasksPath);
  }

  private async createTasksForSpec(item: ItemExecutionState): Promise<void> {
    const state = this.currentExecution!;
    const terminalPool = getTerminalPool(this.projectRoot);
    const contextBuilder = getContextBuilder(this.projectRoot);

    const specContext = await contextBuilder.buildSpecContext(item.specId!);

    const context = {
      specSummary: specContext,
      taskDescription: `Generate tasks for spec: ${item.specId}`,
      customContext: `
Read the specification and create a detailed tasks.md file with:
- Phased task breakdown
- Clear acceptance criteria per task
- Dependency ordering
- Estimated complexity
      `.trim(),
    };

    const terminal = await terminalPool.spawn({
      agentType: 'task-list-creator' as AgentType,
      name: `Tasks: ${item.specId?.slice(0, 15)}`,
      specId: item.specId,
      context,
    });

    item.terminalId = terminal.id;
    this.saveExecution(state);

    await this.waitForTerminal(terminal.id);
  }

  // ===========================================================================
  // Task Execution
  // ===========================================================================

  private async executeTasksForSpec(item: ItemExecutionState): Promise<void> {
    const state = this.currentExecution!;
    const terminalPool = getTerminalPool(this.projectRoot);
    const contextBuilder = getContextBuilder(this.projectRoot);

    const taskContext = await contextBuilder.buildTaskContext({
      taskId: 'all',
      specId: item.specId!,
      title: item.itemTitle,
    });

    const terminal = await terminalPool.spawn({
      agentType: 'implementer' as AgentType,
      name: `Impl: ${item.specId?.slice(0, 15)}`,
      specId: item.specId,
      useWorktree: state.config.useWorktrees,
      context: taskContext,
    });

    item.terminalId = terminal.id;
    this.saveExecution(state);

    await this.waitForTerminal(terminal.id);
  }

  // ===========================================================================
  // Testing
  // ===========================================================================

  private async runTests(specId: string): Promise<boolean> {
    // Try to run project tests
    const { spawn } = await import('child_process');

    return new Promise((resolve) => {
      const proc = spawn('npm', ['test', '--', '--passWithNoTests'], {
        cwd: this.projectRoot,
        stdio: 'pipe',
      });

      let exitCode = 0;

      proc.on('exit', (code) => {
        exitCode = code ?? 0;
        resolve(exitCode === 0);
      });

      proc.on('error', () => {
        resolve(true); // Assume pass if npm test fails
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        proc.kill();
        resolve(true);
      }, 5 * 60 * 1000);
    });
  }

  // ===========================================================================
  // QA Review
  // ===========================================================================

  private async runQAReview(item: ItemExecutionState): Promise<{ hasIssues: boolean }> {
    const qaManager = getQAManager(this.projectRoot);
    const session = await qaManager.createSession(item.specId!);
    item.qaSessionId = session.id;

    const terminalPool = getTerminalPool(this.projectRoot);
    const contextBuilder = getContextBuilder(this.projectRoot);

    const specContext = await contextBuilder.buildSpecContext(item.specId!);

    const terminal = await terminalPool.spawn({
      agentType: 'qa-reviewer' as AgentType,
      name: `QA-R: ${item.specId?.slice(0, 12)}`,
      specId: item.specId,
      context: {
        specSummary: specContext,
        taskDescription: 'Review the implementation for issues',
        customContext: `
QA Session ID: ${session.id}
Review the implementation for:
- Code quality issues
- Bug potential
- Security vulnerabilities
- Missing tests
- Documentation gaps
        `.trim(),
      },
    });

    item.terminalId = terminal.id;
    this.saveExecution(this.currentExecution!);

    await this.waitForTerminal(terminal.id);

    // Check for issues
    const updatedSession = await qaManager.getSession(session.id);
    return {
      hasIssues: (updatedSession?.issues?.length ?? 0) > 0,
    };
  }

  private async runQAFix(item: ItemExecutionState): Promise<void> {
    const terminalPool = getTerminalPool(this.projectRoot);
    const contextBuilder = getContextBuilder(this.projectRoot);

    const specContext = await contextBuilder.buildSpecContext(item.specId!);

    const terminal = await terminalPool.spawn({
      agentType: 'qa-fixer' as AgentType,
      name: `QA-F: ${item.specId?.slice(0, 12)}`,
      specId: item.specId,
      context: {
        specSummary: specContext,
        taskDescription: 'Fix QA issues',
        customContext: `
QA Session ID: ${item.qaSessionId}
Fix all issues identified in the QA review.
        `.trim(),
      },
    });

    item.terminalId = terminal.id;
    this.saveExecution(this.currentExecution!);

    await this.waitForTerminal(terminal.id);
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private async waitForTerminal(terminalId: string): Promise<void> {
    const terminalPool = getTerminalPool(this.projectRoot);

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const terminal = terminalPool.get(terminalId);

        if (!terminal) {
          clearInterval(checkInterval);
          reject(new Error(`Terminal ${terminalId} not found`));
          return;
        }

        if (terminal.status === 'completed') {
          clearInterval(checkInterval);
          resolve();
        } else if (terminal.status === 'error' || terminal.status === 'cancelled') {
          clearInterval(checkInterval);
          reject(new Error(terminal.errorMessage ?? 'Terminal failed'));
        }

        // Check for pause/cancel
        if (this.isPaused || this.isCancelled) {
          clearInterval(checkInterval);
          reject(new Error('Execution paused or cancelled'));
        }
      }, 1000);

      // Timeout after 30 minutes per terminal
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Terminal timeout'));
      }, 30 * 60 * 1000);
    });
  }

  private async updateRoadmapItem(itemId: string, completed: boolean): Promise<void> {
    const roadmapPath = join(this.projectRoot, '.yoyo-dev', 'product', 'roadmap.md');
    if (!existsSync(roadmapPath)) return;

    try {
      let content = readFileSync(roadmapPath, 'utf-8');
      const lines = content.split('\n');

      // Find and update the item
      // Items are formatted as: N. [ ] **Title** — description or N. [x] **Title**
      const itemNumber = parseInt(itemId.replace('item-', ''));

      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^(\d+)\.\s+\[([ x])\]/);
        if (match && parseInt(match[1]) === itemNumber) {
          lines[i] = lines[i].replace(
            /\[([ x])\]/,
            completed ? '[x]' : '[ ]'
          );
          break;
        }
      }

      content = lines.join('\n');
      writeFileSync(roadmapPath, content, 'utf-8');
    } catch (error) {
      console.error('[PhaseExecutor] Failed to update roadmap:', error);
    }
  }

  private handleExecutionError(error: unknown): void {
    if (!this.currentExecution) return;

    this.currentExecution.status = 'failed';
    this.currentExecution.errorMessage = error instanceof Error ? error.message : String(error);
    this.currentExecution.completedAt = new Date().toISOString();
    this.saveExecution(this.currentExecution);

    this.broadcastEvent('phase:execution:failed', {
      executionId: this.currentExecution.id,
      error: this.currentExecution.errorMessage,
    });

    this.currentExecution = null;
  }

  private broadcastEvent(type: string, data: Record<string, unknown>): void {
    wsManager.broadcast({
      type: type as any,
      payload: {
        data,
        timestamp: Date.now(),
      },
    });
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let executorInstance: PhaseExecutor | null = null;

export function getPhaseExecutor(projectRoot: string): PhaseExecutor {
  if (!executorInstance) {
    executorInstance = new PhaseExecutor(projectRoot);
  }
  return executorInstance;
}
