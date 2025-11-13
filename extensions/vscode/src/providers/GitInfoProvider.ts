import * as vscode from 'vscode';
import { GitService } from '../services/GitService';
import { EventBus, YoyoEvent } from '../utils/EventBus';
import { Logger } from '../utils/Logger';

/**
 * Tree item for git info
 */
export class GitInfoTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly value: string,
    public readonly icon?: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);

    this.description = value;

    if (icon) {
      this.iconPath = new vscode.ThemeIcon(icon);
    }

    this.tooltip = `${label}: ${value}`;
  }
}

/**
 * Data provider for git info tree view
 */
export class GitInfoProvider implements vscode.TreeDataProvider<GitInfoTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<GitInfoTreeItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private gitService: GitService;
  private logger: Logger;

  constructor(gitService: GitService) {
    this.gitService = gitService;
    this.logger = Logger.getInstance();

    // Listen for git status changes
    EventBus.getInstance().on(YoyoEvent.GIT_STATUS_CHANGED, () => {
      this.logger.debug('Git status changed, refreshing tree');
      this.refresh();
    });

    // Refresh periodically using configured interval
    const config = vscode.workspace.getConfiguration('yoyoDev');
    const interval = config.get<number>('git.autoRefreshInterval', 5000);
    setInterval(() => this.refresh(), interval);
  }

  /**
   * Refresh tree view
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Get tree item
   */
  getTreeItem(element: GitInfoTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children
   */
  async getChildren(): Promise<GitInfoTreeItem[]> {
    const status = await this.gitService.getStatus();

    if (!status) {
      return [
        new GitInfoTreeItem(
          'Status',
          'Not a git repository',
          'error'
        ),
      ];
    }

    const items: GitInfoTreeItem[] = [
      new GitInfoTreeItem('Branch', status.branch, 'git-branch'),
      new GitInfoTreeItem(
        'Status',
        status.isDirty ? 'Dirty (uncommitted changes)' : 'Clean',
        status.isDirty ? 'warning' : 'check'
      ),
    ];

    if (status.aheadBehind.ahead > 0 || status.aheadBehind.behind > 0) {
      items.push(
        new GitInfoTreeItem(
          'Sync',
          `↑${status.aheadBehind.ahead} ↓${status.aheadBehind.behind}`,
          'sync'
        )
      );
    }

    return items;
  }
}
