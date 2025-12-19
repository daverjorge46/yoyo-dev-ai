/**
 * File Watcher Service
 *
 * Monitors .yoyo-dev/ directory for changes and broadcasts events via WebSocket.
 * Uses chokidar for reliable cross-platform file watching.
 */

import chokidar from 'chokidar';
import { join, relative } from 'path';
import { wsManager } from './websocket.js';

// =============================================================================
// Types
// =============================================================================

interface FileWatcherOptions {
  projectRoot: string;
  debounceMs?: number;
}

type FileEventType = 'add' | 'change' | 'unlink';

interface PendingEvent {
  type: FileEventType;
  path: string;
  timestamp: number;
}

// =============================================================================
// File Watcher Service
// =============================================================================

class FileWatcherService {
  private watcher: chokidar.FSWatcher | null = null;
  private projectRoot: string = '';
  private debounceMs: number = 100;
  private pendingEvents: Map<string, PendingEvent> = new Map();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Start watching the .yoyo-dev directory
   */
  start(options: FileWatcherOptions): void {
    this.projectRoot = options.projectRoot;
    this.debounceMs = options.debounceMs ?? 100;

    const watchPath = join(this.projectRoot, '.yoyo-dev');

    console.log(`[FileWatcher] Starting to watch: ${watchPath}`);

    this.watcher = chokidar.watch(watchPath, {
      ignored: [
        /(^|[\/\\])\../, // Hidden files (except .yoyo-dev itself)
        /node_modules/,
        /\.cache/,
        /\.trash/,
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    this.watcher
      .on('add', (path) => this.queueEvent('add', path))
      .on('change', (path) => this.queueEvent('change', path))
      .on('unlink', (path) => this.queueEvent('unlink', path))
      .on('error', (error) => console.error('[FileWatcher] Error:', error))
      .on('ready', () => console.log('[FileWatcher] Ready and watching'));
  }

  /**
   * Queue an event for debounced processing
   */
  private queueEvent(type: FileEventType, absolutePath: string): void {
    const relativePath = relative(this.projectRoot, absolutePath);

    // Queue the event (latest event for each path wins)
    this.pendingEvents.set(relativePath, {
      type,
      path: relativePath,
      timestamp: Date.now(),
    });

    // Reset debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processPendingEvents();
    }, this.debounceMs);
  }

  /**
   * Process all pending events
   */
  private processPendingEvents(): void {
    const events = Array.from(this.pendingEvents.values());
    this.pendingEvents.clear();

    // Group events by spec/fix folder for aggregation
    const specUpdates = new Map<string, PendingEvent[]>();
    const fixUpdates = new Map<string, PendingEvent[]>();

    for (const event of events) {
      // Broadcast individual file events
      const wsEventType =
        event.type === 'add'
          ? 'file:created'
          : event.type === 'unlink'
            ? 'file:deleted'
            : 'file:changed';

      wsManager.broadcastFileChange(wsEventType, event.path);

      // Aggregate spec updates
      const specMatch = event.path.match(/^\.yoyo-dev\/specs\/([^\/]+)/);
      if (specMatch) {
        const specName = specMatch[1];
        if (!specUpdates.has(specName)) {
          specUpdates.set(specName, []);
        }
        specUpdates.get(specName)!.push(event);
      }

      // Aggregate fix updates
      const fixMatch = event.path.match(/^\.yoyo-dev\/fixes\/([^\/]+)/);
      if (fixMatch) {
        const fixName = fixMatch[1];
        if (!fixUpdates.has(fixName)) {
          fixUpdates.set(fixName, []);
        }
        fixUpdates.get(fixName)!.push(event);
      }

      // Check for execution progress updates
      if (event.path.includes('execution-progress.json')) {
        this.broadcastExecutionProgress();
      }
    }

    // Broadcast aggregated spec updates
    for (const [specName] of specUpdates) {
      this.broadcastSpecUpdate(specName);
    }

    // Broadcast aggregated fix updates
    for (const [fixName] of fixUpdates) {
      this.broadcastFixUpdate(fixName);
    }

    console.log(`[FileWatcher] Processed ${events.length} events`);
  }

  /**
   * Broadcast spec update with current progress
   */
  private async broadcastSpecUpdate(specName: string): Promise<void> {
    try {
      const { readFile } = await import('fs/promises');
      const stateFile = join(
        this.projectRoot,
        '.yoyo-dev',
        'specs',
        specName,
        'state.json'
      );

      try {
        const stateContent = await readFile(stateFile, 'utf-8');
        const state = JSON.parse(stateContent);

        // Calculate progress from tasks if available
        let progress = 0;
        if (state.completed_tasks && Array.isArray(state.completed_tasks)) {
          // This is a simplified progress calculation
          // Actual progress would need to parse tasks.md
          progress = state.completed_tasks.length * 10; // Rough estimate
        }

        wsManager.broadcastSpecUpdate(specName, progress, state.current_phase || 'unknown');
      } catch {
        // State file might not exist yet
        wsManager.broadcastSpecUpdate(specName, 0, 'planning');
      }
    } catch (err) {
      console.error(`[FileWatcher] Error reading spec state for ${specName}:`, err);
    }
  }

  /**
   * Broadcast fix update with current progress
   */
  private async broadcastFixUpdate(fixName: string): Promise<void> {
    try {
      const { readFile } = await import('fs/promises');
      const stateFile = join(
        this.projectRoot,
        '.yoyo-dev',
        'fixes',
        fixName,
        'state.json'
      );

      try {
        const stateContent = await readFile(stateFile, 'utf-8');
        const state = JSON.parse(stateContent);

        let progress = 0;
        if (state.completed_tasks && Array.isArray(state.completed_tasks)) {
          progress = state.completed_tasks.length * 10;
        }

        wsManager.broadcastFixUpdate(fixName, progress, state.current_phase || 'unknown');
      } catch {
        wsManager.broadcastFixUpdate(fixName, 0, 'planning');
      }
    } catch (err) {
      console.error(`[FileWatcher] Error reading fix state for ${fixName}:`, err);
    }
  }

  /**
   * Broadcast execution progress from cache file
   */
  private async broadcastExecutionProgress(): Promise<void> {
    try {
      const { readFile } = await import('fs/promises');
      const progressFile = join(
        this.projectRoot,
        '.yoyo-dev',
        '.cache',
        'execution-progress.json'
      );

      try {
        const content = await readFile(progressFile, 'utf-8');
        const data = JSON.parse(content);

        wsManager.broadcastExecutionProgress({
          isRunning: data.is_running ?? false,
          specName: data.spec_or_fix_name,
          phase: data.current_phase,
          currentTask: data.current_parent_task,
          percentage: data.percentage ?? 0,
        });
      } catch {
        // File might not exist
        wsManager.broadcastExecutionProgress({ isRunning: false });
      }
    } catch (err) {
      console.error('[FileWatcher] Error reading execution progress:', err);
    }
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      console.log('[FileWatcher] Stopped');
    }
  }

  /**
   * Check if watcher is running
   */
  isRunning(): boolean {
    return this.watcher !== null;
  }
}

// Singleton instance
export const fileWatcher = new FileWatcherService();
