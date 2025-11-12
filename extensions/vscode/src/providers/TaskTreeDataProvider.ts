import * as vscode from 'vscode';
import { YoyoFileService } from '../services/YoyoFileService';
import { TasksParser, Task } from '../parsers/TasksParser';
import { EventBus, YoyoEvent } from '../utils/EventBus';
import { Logger } from '../utils/Logger';

/**
 * Tree item for tasks
 */
export class TaskTreeItem extends vscode.TreeItem {
  constructor(
    public readonly task: Task,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(task.title, collapsibleState);

    this.id = task.id;
    this.description = task.completed ? '✅' : '';
    this.contextValue = task.isGroup ? 'taskGroup' : 'task';

    // Set icon based on task state
    if (task.completed) {
      this.iconPath = new vscode.ThemeIcon(
        'check',
        new vscode.ThemeColor('testing.iconPassed')
      );
    } else if (task.isGroup) {
      this.iconPath = new vscode.ThemeIcon('folder');
    } else {
      this.iconPath = new vscode.ThemeIcon('circle-outline');
    }

    // Set tooltip with description
    this.tooltip = task.description
      ? `${task.title}\n\n${task.description}`
      : task.title;

    // Make individual tasks clickable to toggle completion
    if (!task.isGroup) {
      this.command = {
        command: 'yoyoDev.toggleTaskComplete',
        title: 'Toggle Task Complete',
        arguments: [this],
      };
    }
  }
}

/**
 * Data provider for task tree view
 */
export class TaskTreeDataProvider implements vscode.TreeDataProvider<TaskTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TaskTreeItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private fileService: YoyoFileService;
  private parser: TasksParser;
  private logger: Logger;
  private tasks: Task[] = [];
  private currentSpec: string | null = null;

  constructor(fileService: YoyoFileService) {
    this.fileService = fileService;
    this.parser = new TasksParser();
    this.logger = Logger.getInstance();

    // Listen for task updates
    EventBus.getInstance().on(YoyoEvent.TASK_UPDATED, () => {
      this.logger.debug('Task updated event received, refreshing tree');
      this.refresh();
    });

    // Load initial tasks
    this.loadTasks();
  }

  /**
   * Refresh tree view
   */
  public refresh(): void {
    this.loadTasks();
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Load tasks from most recent spec
   */
  private async loadTasks(): Promise<void> {
    try {
      // Get all specs
      const specs = await this.fileService.listSpecs();

      if (specs.length === 0) {
        this.logger.info('No specs found');
        this.tasks = [];
        this.currentSpec = null;
        return;
      }

      // Get most recent spec (already sorted by listSpecs)
      const latestSpec = specs[0];
      this.currentSpec = latestSpec;

      const tasksPath = `specs/${latestSpec}/tasks.md`;
      const content = await this.fileService.readFile(tasksPath);

      if (!content) {
        this.logger.warn(`No tasks.md found for spec: ${latestSpec}`);
        this.tasks = [];
        return;
      }

      this.tasks = this.parser.parse(content);
      const stats = this.parser.getTaskStats(this.tasks);

      this.logger.info(
        `Loaded ${this.tasks.length} task groups from ${latestSpec} ` +
        `(${stats.completed}/${stats.total} tasks complete)`
      );
    } catch (error) {
      this.logger.error('Failed to load tasks', error as Error);
      this.tasks = [];
    }
  }

  /**
   * Get current spec name
   */
  public getCurrentSpec(): string | null {
    return this.currentSpec;
  }

  /**
   * Get tree item
   */
  getTreeItem(element: TaskTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children
   */
  getChildren(element?: TaskTreeItem): Thenable<TaskTreeItem[]> {
    if (!element) {
      // Root level: return task groups
      if (this.tasks.length === 0) {
        return Promise.resolve([]);
      }

      return Promise.resolve(
        this.tasks.map(
          (task) =>
            new TaskTreeItem(
              task,
              task.subtasks.length > 0
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None
            )
        )
      );
    }

    // Return subtasks
    return Promise.resolve(
      element.task.subtasks.map(
        (task) =>
          new TaskTreeItem(task, vscode.TreeItemCollapsibleState.None)
      )
    );
  }

  /**
   * Get parent (for revealing items)
   */
  getParent(element: TaskTreeItem): vscode.ProviderResult<TaskTreeItem> {
    // For now, simple two-level hierarchy
    // Can enhance later if needed
    return null;
  }
}
