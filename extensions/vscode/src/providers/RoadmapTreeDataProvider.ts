import * as vscode from 'vscode';
import { YoyoFileService } from '../services/YoyoFileService';
import { RoadmapParser, RoadmapPhase } from '../parsers/RoadmapParser';
import { EventBus, YoyoEvent } from '../utils/EventBus';
import { Logger } from '../utils/Logger';

/**
 * Tree item for roadmap phases and features
 */
export class RoadmapTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly isPhase: boolean,
    public readonly completed: boolean = false,
    public readonly features?: string[]
  ) {
    super(label, collapsibleState);

    this.contextValue = isPhase ? 'roadmapPhase' : 'roadmapFeature';

    // Set icon based on type and state
    if (completed) {
      this.iconPath = new vscode.ThemeIcon(
        'check',
        new vscode.ThemeColor('testing.iconPassed')
      );
      this.description = '✅';
    } else if (isPhase) {
      this.iconPath = new vscode.ThemeIcon('milestone');
    } else {
      this.iconPath = new vscode.ThemeIcon('circle-outline');
    }

    // Set tooltip
    if (isPhase && features) {
      const featureList = features.map((f) => `  • ${f}`).join('\n');
      this.tooltip = `${label}\n\nFeatures (${features.length}):\n${featureList}`;
    } else {
      this.tooltip = label;
    }
  }
}

/**
 * Data provider for roadmap tree view
 */
export class RoadmapTreeDataProvider implements vscode.TreeDataProvider<RoadmapTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<RoadmapTreeItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private fileService: YoyoFileService;
  private parser: RoadmapParser;
  private logger: Logger;
  private phases: RoadmapPhase[] = [];

  constructor(fileService: YoyoFileService) {
    this.fileService = fileService;
    this.parser = new RoadmapParser();
    this.logger = Logger.getInstance();

    // Listen for roadmap updates
    EventBus.getInstance().on(YoyoEvent.ROADMAP_UPDATED, () => {
      this.logger.debug('Roadmap updated event received, refreshing tree');
      this.refresh();
    });

    // Don't load roadmap in constructor - file service may not be initialized yet
  }

  /**
   * Initialize and load roadmap (call after file service is ready)
   */
  public async initialize(): Promise<void> {
    await this.loadRoadmap();
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Refresh tree view
   */
  public refresh(): void {
    this.loadRoadmap();
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Load roadmap from product/roadmap.md
   */
  private async loadRoadmap(): Promise<void> {
    try {
      const roadmapPath = 'product/roadmap.md';
      const content = await this.fileService.readFile(roadmapPath);

      if (!content) {
        this.logger.info('No roadmap.md found');
        this.phases = [];
        return;
      }

      this.phases = this.parser.parse(content);
      const stats = this.parser.getRoadmapStats(this.phases);

      this.logger.info(
        `Loaded ${this.phases.length} roadmap phases ` +
        `(${stats.completedPhases}/${stats.totalPhases} complete, ` +
        `${stats.totalFeatures} total features)`
      );
    } catch (error) {
      this.logger.error('Failed to load roadmap', error as Error);
      this.phases = [];
    }
  }

  /**
   * Get tree item
   */
  getTreeItem(element: RoadmapTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children
   */
  getChildren(element?: RoadmapTreeItem): Thenable<RoadmapTreeItem[]> {
    if (!element) {
      // Root level: return phases
      if (this.phases.length === 0) {
        return Promise.resolve([]);
      }

      return Promise.resolve(
        this.phases.map(
          (phase) =>
            new RoadmapTreeItem(
              phase.name,
              phase.features.length > 0
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None,
              true,
              phase.completed,
              phase.features
            )
        )
      );
    }

    // Return features for a phase
    if (element.isPhase && element.features) {
      return Promise.resolve(
        element.features.map(
          (feature) =>
            new RoadmapTreeItem(
              feature,
              vscode.TreeItemCollapsibleState.None,
              false,
              element.completed // Features inherit phase completion status
            )
        )
      );
    }

    return Promise.resolve([]);
  }

  /**
   * Get parent (for revealing items)
   */
  getParent(_element: RoadmapTreeItem): vscode.ProviderResult<RoadmapTreeItem> {
    return null;
  }
}
