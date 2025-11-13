import * as vscode from 'vscode';
import { EventBus } from './EventBus';
import { Logger } from './Logger';

/**
 * File watcher with debouncing for .yoyo-dev files
 */
export class FileWatcher {
  private logger: Logger;
  private eventBus: EventBus;
  private watcher: vscode.FileSystemWatcher | null = null;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceDelay: number;

  constructor() {
    this.logger = Logger.getInstance();
    this.eventBus = EventBus.getInstance();

    // Get debounce delay from configuration
    const config = vscode.workspace.getConfiguration('yoyoDev');
    this.debounceDelay = config.get<number>('fileWatcher.debounceDelay', 500);

    this.setupWatcher();
  }

  /**
   * Setup file system watcher
   */
  private setupWatcher(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      this.logger.warn('No workspace folder found for file watcher');
      return;
    }

    // Watch .yoyo-dev/**/*.{md,json,yml}
    const pattern = new vscode.RelativePattern(
      workspaceFolders[0],
      '.yoyo-dev/**/*.{md,json,yml}'
    );

    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

    // Handle file changes with debouncing
    this.watcher.onDidChange((uri) => this.handleFileChange(uri, 'modified'));
    this.watcher.onDidCreate((uri) => this.handleFileChange(uri, 'created'));
    this.watcher.onDidDelete((uri) => this.handleFileChange(uri, 'deleted'));

    this.logger.info('File watcher initialized');
  }

  /**
   * Handle file change with debouncing
   */
  private handleFileChange(
    uri: vscode.Uri,
    changeType: 'created' | 'modified' | 'deleted'
  ): void {
    const filePath = uri.fsPath;

    // Clear existing timer for this file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.processFileChange(uri, changeType);
      this.debounceTimers.delete(filePath);
    }, this.debounceDelay);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Process file change after debounce
   */
  private processFileChange(
    uri: vscode.Uri,
    changeType: 'created' | 'modified' | 'deleted'
  ): void {
    const filePath = uri.fsPath;
    const fileName = filePath.split('/').pop() || '';

    this.logger.debug(`File ${changeType}: ${fileName}`);

    // Emit appropriate events based on file type
    if (fileName === 'tasks.md') {
      const specPath = filePath.replace('/tasks.md', '');
      this.eventBus.emitTaskUpdated(specPath);
    } else if (fileName === 'roadmap.md') {
      this.eventBus.emitRoadmapUpdated(filePath);
    } else if (fileName === 'state.json') {
      // Parse spec name from path
      const specName = filePath.split('/specs/')[1]?.split('/')[0] || '';
      this.eventBus.emitWorkflowStateChanged('unknown', specName);
    } else if (fileName.includes('spec')) {
      this.eventBus.emitSpecChanged(filePath, changeType);
    } else if (fileName === 'config.yml') {
      this.eventBus.emit('config:changed', { timestamp: Date.now() });
    }
  }

  /**
   * Dispose watcher
   */
  public dispose(): void {
    // Clear all debounce timers
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();

    // Dispose VS Code watcher
    this.watcher?.dispose();
    this.watcher = null;

    this.logger.info('File watcher disposed');
  }
}
