/**
 * File System Watchers
 *
 * Watches .yoyo-dev/specs/ directory for changes to:
 * - tasks.md files
 * - spec.md files
 * - state.json files
 *
 * Triggers state updates via services on file changes.
 */

import chokidar from 'chokidar';
import { debounce } from './utils.js';
import { taskService } from './services/TaskService.js';
import { specService } from './services/SpecService.js';
import { useAppStore } from './state-manager.js';

const DEBOUNCE_MS = 100;
const WATCH_PATHS = [
  '.yoyo-dev/specs/*/tasks.md',
  '.yoyo-dev/specs/*/spec.md',
  '.yoyo-dev/specs/*/spec-lite.md',
  '.yoyo-dev/specs/*/state.json',
];

export class FileWatcherService {
  private watcher: chokidar.FSWatcher | null = null;
  private isWatching = false;

  /**
   * Start watching files
   */
  start(): void {
    if (this.isWatching) {
      console.warn('[FileWatcher] Already watching');
      return;
    }

    console.log('[FileWatcher] Starting file watchers...');

    this.watcher = chokidar.watch(WATCH_PATHS, {
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    // Debounced handlers to prevent rapid-fire updates
    const handleTaskChange = debounce(async () => {
      console.log('[FileWatcher] Tasks changed, reloading...');
      const tasks = await taskService.getTasks();
      useAppStore.getState().setTasks(tasks);
    }, DEBOUNCE_MS);

    const handleSpecChange = debounce(async () => {
      console.log('[FileWatcher] Specs changed, reloading...');
      const specs = await specService.getAllSpecs();
      useAppStore.getState().setSpecs(specs);

      // Update active spec if needed
      const activeSpec = await specService.getActiveSpec();
      if (activeSpec) {
        useAppStore.getState().setActiveSpec(activeSpec);
      }
    }, DEBOUNCE_MS);

    // Watch for file changes
    this.watcher.on('change', (path) => {
      if (path.includes('tasks.md')) {
        handleTaskChange();
      } else if (path.includes('spec.md') || path.includes('spec-lite.md')) {
        handleSpecChange();
      } else if (path.includes('state.json')) {
        // State file changed, reload both tasks and specs
        handleTaskChange();
        handleSpecChange();
      }
    });

    // Watch for new files
    this.watcher.on('add', (path) => {
      console.log('[FileWatcher] New file detected:', path);
      if (path.includes('tasks.md') || path.includes('spec.md')) {
        handleTaskChange();
        handleSpecChange();
      }
    });

    // Watch for deleted files
    this.watcher.on('unlink', (path) => {
      console.log('[FileWatcher] File deleted:', path);
      if (path.includes('tasks.md') || path.includes('spec.md')) {
        handleTaskChange();
        handleSpecChange();
      }
    });

    // Handle errors
    this.watcher.on('error', (error) => {
      console.error('[FileWatcher] Error:', error);
    });

    this.isWatching = true;
    console.log('[FileWatcher] Watching:', WATCH_PATHS);
  }

  /**
   * Stop watching files
   */
  async stop(): Promise<void> {
    if (!this.isWatching || !this.watcher) {
      return;
    }

    console.log('[FileWatcher] Stopping file watchers...');
    await this.watcher.close();
    this.watcher = null;
    this.isWatching = false;
  }

  /**
   * Check if watching
   */
  isActive(): boolean {
    return this.isWatching;
  }
}

export const fileWatcher = new FileWatcherService();
