# Technical Specification: Yoyo Dev Extension

## Extension Structure

### Directory Layout
```
yoyo-dev-vscode/
├── src/
│   ├── extension.ts              # Entry point, activation
│   ├── container.ts              # DI container
│   │
│   ├── services/
│   │   ├── YoyoFileService.ts    # Read .yoyo-dev files
│   │   ├── ClaudeCliService.ts   # Claude Code CLI integration
│   │   ├── GitService.ts         # Git operations
│   │   ├── StateService.ts       # Extension state persistence
│   │   └── ConfigService.ts      # config.yml parsing
│   │
│   ├── providers/
│   │   ├── TaskTreeProvider.ts   # Task tree view data
│   │   ├── RoadmapTreeProvider.ts # Roadmap tree view data
│   │   ├── SpecWebviewProvider.ts # Spec webview
│   │   └── StatusBarProvider.ts  # Status bar items
│   │
│   ├── commands/
│   │   ├── index.ts              # Command registration
│   │   ├── planProduct.ts
│   │   ├── createNew.ts
│   │   ├── createSpec.ts
│   │   ├── createFix.ts
│   │   ├── executeTasks.ts
│   │   ├── orchestrateTasks.ts
│   │   ├── review.ts
│   │   └── [...13 more commands]
│   │
│   ├── models/
│   │   ├── Task.ts               # Task data model
│   │   ├── Spec.ts               # Spec data model
│   │   ├── Roadmap.ts            # Roadmap data model
│   │   └── WorkflowState.ts      # State machine model
│   │
│   ├── parsers/
│   │   ├── TasksParser.ts        # Parse tasks.md
│   │   ├── RoadmapParser.ts      # Parse roadmap.md
│   │   ├── StateParser.ts        # Parse state.json
│   │   └── MarkdownParser.ts     # Parse spec markdown
│   │
│   ├── utils/
│   │   ├── FileWatcher.ts        # File watching with debounce
│   │   ├── EventBus.ts           # Event emitter for components
│   │   ├── Logger.ts             # Output channel logging
│   │   └── Validation.ts         # Input validation
│   │
│   └── test/
│       ├── suite/
│       │   ├── extension.test.ts
│       │   ├── TasksParser.test.ts
│       │   └── [...more tests]
│       └── runTest.ts
│
├── webview-ui/                   # React app for webviews
│   ├── src/
│   │   ├── App.tsx               # Main webview app
│   │   ├── components/
│   │   │   ├── SpecViewer.tsx    # Spec content display
│   │   │   ├── Navigation.tsx    # Spec navigation
│   │   │   └── ProgressBar.tsx   # Progress indicator
│   │   ├── hooks/
│   │   │   ├── useVsCodeApi.ts   # VS Code messaging
│   │   │   └── useSpec.ts        # Spec state management
│   │   └── styles/
│   │       └── main.css
│   ├── index.tsx
│   └── tsconfig.json
│
├── media/                        # Static assets
│   ├── icons/
│   │   ├── yoyo-dev.svg          # Extension icon
│   │   └── task-*.svg            # Custom task icons
│   └── styles/
│       └── webview.css
│
├── esbuild.js                    # Extension build config
├── esbuild-webview.js            # Webview build config
├── package.json
├── tsconfig.json
├── .vscodeignore
├── .eslintrc.json
└── README.md
```

## Package.json Configuration

### Metadata
```json
{
  "name": "yoyo-dev",
  "displayName": "Yoyo Dev",
  "description": "AI-assisted development workflow framework",
  "version": "1.0.0",
  "publisher": "yoyo-dev",
  "repository": "https://github.com/yoyo-dev/vscode-extension",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Other"],
  "keywords": ["ai", "workflow", "productivity", "claude", "development"],
  "icon": "media/icons/yoyo-dev.png"
}
```

### Activation Events
```json
{
  "activationEvents": [
    "workspaceContains:.yoyo-dev",
    "onCommand:yoyoDev.planProduct",
    "onView:yoyoDevTasks"
  ]
}
```

### Contributes: Views
```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "yoyoDev",
          "title": "Yoyo Dev",
          "icon": "media/icons/yoyo-dev.svg"
        }
      ]
    },
    "views": {
      "yoyoDev": [
        {
          "id": "yoyoDevTasks",
          "name": "Tasks",
          "contextualTitle": "Yoyo Dev Tasks"
        },
        {
          "id": "yoyoDevRoadmap",
          "name": "Roadmap",
          "contextualTitle": "Yoyo Dev Roadmap"
        },
        {
          "id": "yoyoDevCurrentSpec",
          "name": "Current Spec",
          "type": "webview"
        },
        {
          "id": "yoyoDevGit",
          "name": "Git Info"
        }
      ]
    }
  }
}
```

### Contributes: Commands
```json
{
  "contributes": {
    "commands": [
      {
        "command": "yoyoDev.planProduct",
        "title": "Plan Product",
        "category": "Yoyo Dev",
        "icon": "$(notebook)"
      },
      {
        "command": "yoyoDev.createNew",
        "title": "Create New Feature",
        "category": "Yoyo Dev",
        "icon": "$(add)"
      },
      {
        "command": "yoyoDev.executeTasks",
        "title": "Execute Tasks",
        "category": "Yoyo Dev",
        "icon": "$(run)"
      }
      // ... 13 more commands
    ]
  }
}
```

### Contributes: Menus
```json
{
  "contributes": {
    "menus": {
      "explorer/context": [
        {
          "command": "yoyoDev.createSpec",
          "when": "explorerResourceIsFolder",
          "group": "yoyo@1"
        }
      ],
      "editor/context": [
        {
          "submenu": "yoyoDev.editorContext",
          "when": "resourcePath =~ /\\.yoyo-dev\\/.*\\.md$/",
          "group": "yoyo@1"
        }
      ],
      "view/title": [
        {
          "command": "yoyoDev.refreshTasks",
          "when": "view == yoyoDevTasks",
          "group": "navigation"
        }
      ],
      "view/item/context": [
        {
          "command": "yoyoDev.executeTask",
          "when": "view == yoyoDevTasks && viewItem == task",
          "group": "inline"
        }
      ]
    }
  }
}
```

### Contributes: Configuration
```json
{
  "contributes": {
    "configuration": {
      "title": "Yoyo Dev",
      "properties": {
        "yoyoDev.autoRefresh": {
          "type": "boolean",
          "default": true,
          "description": "Auto-refresh views on file changes"
        },
        "yoyoDev.debounceDelay": {
          "type": "number",
          "default": 500,
          "description": "File watcher debounce delay in milliseconds"
        },
        "yoyoDev.maxTreeItems": {
          "type": "number",
          "default": 100,
          "description": "Maximum items per tree view level"
        },
        "yoyoDev.parallelExecution": {
          "type": "boolean",
          "default": true,
          "description": "Enable parallel task execution"
        },
        "yoyoDev.designSystemEnabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable design system validation"
        }
      }
    }
  }
}
```

## Core Services

### YoyoFileService
```typescript
export class YoyoFileService {
  constructor(private readonly workspaceRoot: string) {}

  async getActiveSpecs(): Promise<Spec[]> {
    const specsDir = path.join(this.workspaceRoot, '.yoyo-dev', 'specs');
    const specDirs = await fs.readdir(specsDir);

    return Promise.all(
      specDirs.map(async (dir) => {
        const specPath = path.join(specsDir, dir, 'spec.md');
        const statePath = path.join(specsDir, dir, 'state.json');

        const specContent = await fs.readFile(specPath, 'utf8');
        const stateContent = await fs.readFile(statePath, 'utf8');

        return {
          name: dir,
          path: specPath,
          content: specContent,
          state: JSON.parse(stateContent)
        };
      })
    );
  }

  async getTasksForSpec(spec: Spec): Promise<Task[]> {
    const tasksPath = path.join(
      path.dirname(spec.path),
      'tasks.md'
    );

    const content = await fs.readFile(tasksPath, 'utf8');
    return TasksParser.parse(content);
  }

  async getRoadmap(): Promise<Roadmap> {
    const roadmapPath = path.join(
      this.workspaceRoot,
      '.yoyo-dev',
      'product',
      'roadmap.md'
    );

    const content = await fs.readFile(roadmapPath, 'utf8');
    return RoadmapParser.parse(content);
  }

  async getCurrentSpec(): Promise<Spec | null> {
    // Read state.json files to find active spec
    const specs = await this.getActiveSpecs();
    return specs.find(s => s.state.status === 'active') || null;
  }
}
```

### ClaudeCliService
```typescript
export class ClaudeCliService {
  private terminal: vscode.Terminal | null = null;

  async executeCommand(command: string, args?: string[]): Promise<void> {
    if (!this.terminal || this.terminal.exitStatus !== undefined) {
      this.terminal = vscode.window.createTerminal({
        name: 'Yoyo Dev',
        cwd: vscode.workspace.workspaceFolders?.[0].uri.fsPath
      });
    }

    const fullCommand = args
      ? `claude ${command} ${args.join(' ')}`
      : `claude ${command}`;

    this.terminal.sendText(fullCommand);
    this.terminal.show();
  }

  async waitForCompletion(
    stateFilePath: string,
    token: vscode.CancellationToken
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const watcher = vscode.workspace.createFileSystemWatcher(
        stateFilePath
      );

      const checkCompletion = async () => {
        const state = await StateParser.parse(stateFilePath);
        if (state.status === 'complete') {
          watcher.dispose();
          resolve();
        }
      };

      watcher.onDidChange(checkCompletion);
      token.onCancellationRequested(() => {
        watcher.dispose();
        reject(new Error('Cancelled by user'));
      });

      // Initial check
      checkCompletion();
    });
  }

  dispose(): void {
    this.terminal?.dispose();
  }
}
```

### StateService
```typescript
export class StateService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  getCurrentSpec(): string | undefined {
    return this.context.workspaceState.get<string>('currentSpec');
  }

  setCurrentSpec(specName: string): Thenable<void> {
    return this.context.workspaceState.update('currentSpec', specName);
  }

  getLastExecutedTask(): string | undefined {
    return this.context.workspaceState.get<string>('lastExecutedTask');
  }

  setLastExecutedTask(taskId: string): Thenable<void> {
    return this.context.workspaceState.update('lastExecutedTask', taskId);
  }

  getViewStates(): Record<string, boolean> {
    return this.context.workspaceState.get<Record<string, boolean>>(
      'viewStates',
      {}
    );
  }

  setViewState(viewId: string, collapsed: boolean): Thenable<void> {
    const states = this.getViewStates();
    states[viewId] = collapsed;
    return this.context.workspaceState.update('viewStates', states);
  }
}
```

## File Parsers

### TasksParser
```typescript
export class TasksParser {
  static parse(content: string): Task[] {
    const lines = content.split('\n');
    const tasks: Task[] = [];
    let currentParent: Task | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match task pattern: - [ ] or - [x]
      const match = line.match(/^(\s*)- \[([ x])\] (.+)$/);
      if (!match) continue;

      const [, indent, checked, title] = match;
      const level = indent.length / 2; // 2 spaces = 1 level

      const task: Task = {
        id: `task-${i}`,
        title: title.trim(),
        completed: checked === 'x',
        level,
        line: i,
        children: [],
        metadata: this.parseMetadata(lines, i)
      };

      if (level === 0) {
        tasks.push(task);
        currentParent = task;
      } else if (currentParent && level === 1) {
        currentParent.children.push(task);
      }
    }

    return tasks;
  }

  static parseMetadata(lines: string[], taskLine: number): TaskMetadata {
    // Look for metadata in following lines
    // Example:
    //   Agent: implementer
    //   Dependencies: task-1, task-2
    //   Files: src/auth.ts

    const metadata: TaskMetadata = {};
    let i = taskLine + 1;

    while (i < lines.length && lines[i].startsWith('  ')) {
      const line = lines[i].trim();
      const [key, value] = line.split(':').map(s => s.trim());

      if (key && value) {
        metadata[key.toLowerCase()] = value;
      }
      i++;
    }

    return metadata;
  }
}
```

### RoadmapParser
```typescript
export class RoadmapParser {
  static parse(content: string): Roadmap {
    const phases: Phase[] = [];
    let currentPhase: Phase | null = null;

    const lines = content.split('\n');

    for (const line of lines) {
      // Phase header: ## Phase 1: Foundation (100%)
      const phaseMatch = line.match(/^##\s+Phase\s+(\d+):\s+(.+?)\s*\((\d+)%\)$/);
      if (phaseMatch) {
        const [, number, name, progress] = phaseMatch;
        currentPhase = {
          number: parseInt(number),
          name: name.trim(),
          progress: parseInt(progress),
          features: []
        };
        phases.push(currentPhase);
        continue;
      }

      // Feature line: - [x] User Authentication
      const featureMatch = line.match(/^-\s+\[([ x])\]\s+(.+)$/);
      if (featureMatch && currentPhase) {
        const [, status, name] = featureMatch;
        currentPhase.features.push({
          name: name.trim(),
          completed: status === 'x',
          specExists: false // Will be populated separately
        });
      }
    }

    return { phases };
  }
}
```

### StateParser
```typescript
export class StateParser {
  static async parse(filePath: string): Promise<WorkflowState> {
    const content = await fs.readFile(filePath, 'utf8');
    const json = JSON.parse(content);

    return {
      specName: json.spec_name,
      status: json.status,
      currentStep: json.current_step,
      totalSteps: json.total_steps,
      activeAgent: json.active_agent,
      startedAt: json.started_at ? new Date(json.started_at) : undefined,
      completedAt: json.completed_at ? new Date(json.completed_at) : undefined,
      metadata: json.metadata || {}
    };
  }
}
```

## Tree View Providers

### TaskTreeProvider
```typescript
export class TaskTreeProvider implements vscode.TreeDataProvider<TaskTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TaskTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private readonly fileService: YoyoFileService,
    private readonly eventBus: EventBus
  ) {
    eventBus.on('task:updated', () => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TaskTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TaskTreeItem): Promise<TaskTreeItem[]> {
    if (!element) {
      // Root level - return specs
      const specs = await this.fileService.getActiveSpecs();
      return specs.map(spec => new SpecTreeItem(spec));
    }

    if (element instanceof SpecTreeItem) {
      // Spec level - return tasks
      const tasks = await this.fileService.getTasksForSpec(element.spec);
      return tasks.map(task => new TaskTreeItem(task, element.spec));
    }

    if (element instanceof TaskTreeItem && element.task.children.length > 0) {
      // Task with children
      return element.task.children.map(
        task => new TaskTreeItem(task, element.spec)
      );
    }

    return [];
  }
}

class SpecTreeItem extends vscode.TreeItem {
  constructor(public readonly spec: Spec) {
    super(
      `${spec.name} (${spec.completedTasks}/${spec.totalTasks})`,
      vscode.TreeItemCollapsibleState.Collapsed
    );

    this.iconPath = new vscode.ThemeIcon('folder');
    this.contextValue = 'spec';
    this.tooltip = `${spec.name}\n${spec.completedTasks} of ${spec.totalTasks} tasks complete`;
  }
}

class TaskTreeItem extends vscode.TreeItem {
  constructor(
    public readonly task: Task,
    public readonly spec: Spec
  ) {
    super(
      task.title,
      task.children.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    this.iconPath = new vscode.ThemeIcon(
      task.completed ? 'check' : 'circle-outline'
    );
    this.contextValue = 'task';
    this.command = {
      command: 'yoyoDev.openTask',
      title: 'Open Task',
      arguments: [this.task, this.spec]
    };

    this.tooltip = this.buildTooltip();
  }

  private buildTooltip(): string {
    const parts = [`Task: ${this.task.title}`];

    if (this.task.metadata.agent) {
      parts.push(`Agent: ${this.task.metadata.agent}`);
    }

    if (this.task.metadata.dependencies) {
      parts.push(`Dependencies: ${this.task.metadata.dependencies}`);
    }

    return parts.join('\n');
  }
}
```

## Event System

### EventBus
```typescript
export class EventBus extends EventEmitter {
  private static instance: EventBus;

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  // Event types
  static readonly TASK_UPDATED = 'task:updated';
  static readonly ROADMAP_UPDATED = 'roadmap:updated';
  static readonly SPEC_CHANGED = 'spec:changed';
  static readonly WORKFLOW_STATE_CHANGED = 'workflow:state:changed';
  static readonly GIT_STATUS_CHANGED = 'git:status:changed';

  emitTaskUpdated(specName: string): void {
    this.emit(EventBus.TASK_UPDATED, { specName, timestamp: Date.now() });
  }

  emitRoadmapUpdated(): void {
    this.emit(EventBus.ROADMAP_UPDATED, { timestamp: Date.now() });
  }

  emitSpecChanged(specName: string): void {
    this.emit(EventBus.SPEC_CHANGED, { specName, timestamp: Date.now() });
  }

  emitWorkflowStateChanged(state: WorkflowState): void {
    this.emit(EventBus.WORKFLOW_STATE_CHANGED, { state, timestamp: Date.now() });
  }

  emitGitStatusChanged(): void {
    this.emit(EventBus.GIT_STATUS_CHANGED, { timestamp: Date.now() });
  }
}
```

### FileWatcher
```typescript
export class FileWatcher {
  private watchers: vscode.FileSystemWatcher[] = [];
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly workspaceRoot: string,
    private readonly eventBus: EventBus,
    private readonly config: FileWatcherConfig
  ) {}

  start(): void {
    this.setupWatcher('.yoyo-dev/specs/**/tasks.md', this.handleTasksChange);
    this.setupWatcher('.yoyo-dev/product/roadmap.md', this.handleRoadmapChange);
    this.setupWatcher('.yoyo-dev/**/state.json', this.handleStateChange);
    this.setupWatcher('.yoyo-dev/specs/**/spec.md', this.handleSpecChange);
  }

  private setupWatcher(
    pattern: string,
    handler: (uri: vscode.Uri) => void
  ): void {
    const relativePattern = new vscode.RelativePattern(
      this.workspaceRoot,
      pattern
    );

    const watcher = vscode.workspace.createFileSystemWatcher(relativePattern);

    watcher.onDidChange((uri) => this.debounce(uri, handler));
    watcher.onDidCreate((uri) => this.debounce(uri, handler));
    watcher.onDidDelete((uri) => this.debounce(uri, handler));

    this.watchers.push(watcher);
  }

  private debounce(uri: vscode.Uri, handler: (uri: vscode.Uri) => void): void {
    const path = uri.fsPath;

    if (this.debounceTimers.has(path)) {
      clearTimeout(this.debounceTimers.get(path)!);
    }

    const timer = setTimeout(() => {
      handler.call(this, uri);
      this.debounceTimers.delete(path);
    }, this.config.debounceDelay);

    this.debounceTimers.set(path, timer);
  }

  private handleTasksChange = (uri: vscode.Uri): void => {
    const specName = this.extractSpecName(uri);
    this.eventBus.emitTaskUpdated(specName);
  };

  private handleRoadmapChange = (): void => {
    this.eventBus.emitRoadmapUpdated();
  };

  private handleStateChange = async (uri: vscode.Uri): Promise<void> => {
    const state = await StateParser.parse(uri.fsPath);
    this.eventBus.emitWorkflowStateChanged(state);
  };

  private handleSpecChange = (uri: vscode.Uri): void => {
    const specName = this.extractSpecName(uri);
    this.eventBus.emitSpecChanged(specName);
  };

  private extractSpecName(uri: vscode.Uri): string {
    // Extract spec name from path like:
    // .yoyo-dev/specs/2025-11-08-user-auth/tasks.md
    const parts = uri.fsPath.split(path.sep);
    const specsIndex = parts.indexOf('specs');
    return parts[specsIndex + 1];
  }

  dispose(): void {
    this.watchers.forEach(w => w.dispose());
    this.debounceTimers.forEach(t => clearTimeout(t));
  }
}
```

## Webview Implementation

### SpecWebviewProvider
```typescript
export class SpecWebviewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly fileService: YoyoFileService,
    private readonly eventBus: EventBus
  ) {
    eventBus.on(EventBus.SPEC_CHANGED, this.handleSpecChange);
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'dist'),
        vscode.Uri.joinPath(this.extensionUri, 'media')
      ]
    };

    webviewView.webview.html = this.getHtmlContent(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(this.handleMessage);

    this.loadCurrentSpec();
  }

  private async loadCurrentSpec(): Promise<void> {
    const spec = await this.fileService.getCurrentSpec();
    if (spec && this._view) {
      this._view.webview.postMessage({
        type: 'updateSpec',
        spec: spec
      });
    }
  }

  private handleMessage = async (message: any): Promise<void> => {
    switch (message.type) {
      case 'openFile':
        await vscode.commands.executeCommand(
          'vscode.open',
          vscode.Uri.file(message.path)
        );
        break;

      case 'createTasks':
        await vscode.commands.executeCommand('yoyoDev.createTasks');
        break;

      case 'executeTasks':
        await vscode.commands.executeCommand('yoyoDev.executeTasks');
        break;
    }
  };

  private handleSpecChange = async (event: any): Promise<void> => {
    await this.loadCurrentSpec();
  };

  private getHtmlContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'styles', 'webview.css')
    );
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 style-src ${webview.cspSource} 'unsafe-inline';
                 script-src 'nonce-${nonce}';
                 img-src ${webview.cspSource} https:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${styleUri}" rel="stylesheet">
  <title>Spec Viewer</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private getNonce(): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
```

## Build Configuration

### esbuild.js (Extension)
```javascript
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'info',
    target: 'es2020',
    tsconfig: './tsconfig.json'
  });

  if (watch) {
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
```

### esbuild-webview.js (React)
```javascript
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['webview-ui/index.tsx'],
    bundle: true,
    format: 'iife',
    minify: production,
    sourcemap: !production,
    platform: 'browser',
    outfile: 'dist/webview.js',
    logLevel: 'info',
    target: 'es2020',
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
      '.css': 'css'
    },
    define: {
      'process.env.NODE_ENV': production ? '"production"' : '"development"'
    }
  });

  if (watch) {
    await ctx.watch();
    console.log('Watching webview for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "lib": ["ES2020"],
    "outDir": "out",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", ".vscode-test", "out", "dist", "webview-ui"]
}
```

## Testing Strategy

### Unit Tests (Mocha + @vscode/test-electron)
```typescript
// src/test/suite/TasksParser.test.ts
import * as assert from 'assert';
import { TasksParser } from '../../parsers/TasksParser';

suite('TasksParser Test Suite', () => {
  test('Parse simple task list', () => {
    const content = `
# Tasks

- [ ] Task 1
- [x] Task 2
- [ ] Task 3
    `;

    const tasks = TasksParser.parse(content);

    assert.strictEqual(tasks.length, 3);
    assert.strictEqual(tasks[0].completed, false);
    assert.strictEqual(tasks[1].completed, true);
    assert.strictEqual(tasks[2].completed, false);
  });

  test('Parse nested tasks', () => {
    const content = `
- [ ] Parent Task
  - [ ] Child 1
  - [x] Child 2
    `;

    const tasks = TasksParser.parse(content);

    assert.strictEqual(tasks.length, 1);
    assert.strictEqual(tasks[0].children.length, 2);
    assert.strictEqual(tasks[0].children[1].completed, true);
  });

  test('Parse task metadata', () => {
    const content = `
- [ ] Implement login
  Agent: implementer
  Dependencies: task-1, task-2
    `;

    const tasks = TasksParser.parse(content);

    assert.strictEqual(tasks[0].metadata.agent, 'implementer');
    assert.strictEqual(tasks[0].metadata.dependencies, 'task-1, task-2');
  });
});
```

### Integration Tests
```typescript
// src/test/suite/integration.test.ts
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Integration Test Suite', () => {
  test('Extension activation', async () => {
    const ext = vscode.extensions.getExtension('yoyo-dev.yoyo-dev');
    assert.ok(ext);

    await ext.activate();
    assert.strictEqual(ext.isActive, true);
  });

  test('Task tree view registration', async () => {
    const treeView = vscode.window.createTreeView('yoyoDevTasks', {
      treeDataProvider: {} as any
    });

    assert.ok(treeView);
    treeView.dispose();
  });

  test('Command registration', async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes('yoyoDev.planProduct'));
    assert.ok(commands.includes('yoyoDev.createNew'));
    assert.ok(commands.includes('yoyoDev.executeTasks'));
  });
});
```

## Performance Optimization

### Lazy Loading Pattern
```typescript
export class Container {
  private static instance: Container;
  private _fileService?: YoyoFileService;
  private _claudeService?: ClaudeCliService;
  private _gitService?: GitService;

  get fileService(): YoyoFileService {
    if (!this._fileService) {
      this._fileService = new YoyoFileService(this.workspaceRoot);
    }
    return this._fileService;
  }

  get claudeService(): ClaudeCliService {
    if (!this._claudeService) {
      this._claudeService = new ClaudeCliService();
    }
    return this._claudeService;
  }

  get gitService(): GitService {
    if (!this._gitService) {
      this._gitService = new GitService(this.workspaceRoot);
    }
    return this._gitService;
  }
}
```

### Memoization for Expensive Operations
```typescript
export class YoyoFileService {
  private specCache = new Map<string, Spec>();
  private cacheTimeout = 5000; // 5 seconds

  async getActiveSpecs(): Promise<Spec[]> {
    const cacheKey = 'active-specs';

    if (this.specCache.has(cacheKey)) {
      const cached = this.specCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    const specs = await this.loadActiveSpecs();
    this.specCache.set(cacheKey, {
      data: specs,
      timestamp: Date.now()
    });

    return specs;
  }

  invalidateCache(): void {
    this.specCache.clear();
  }
}
```

## Error Handling

### Centralized Error Handler
```typescript
export class ErrorHandler {
  static async handle(error: Error, context: string): Promise<void> {
    Logger.error(`Error in ${context}:`, error);

    const action = await vscode.window.showErrorMessage(
      `Yoyo Dev: ${error.message}`,
      'View Logs',
      'Report Issue'
    );

    if (action === 'View Logs') {
      Logger.show();
    } else if (action === 'Report Issue') {
      vscode.env.openExternal(
        vscode.Uri.parse('https://github.com/yoyo-dev/issues/new')
      );
    }
  }
}
```

### Graceful Degradation
```typescript
export class YoyoFileService {
  async getActiveSpecs(): Promise<Spec[]> {
    try {
      return await this.loadActiveSpecs();
    } catch (error) {
      Logger.warn('Failed to load specs, returning empty array', error);
      return [];
    }
  }
}
```

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build extension
npm run compile

# Build webview
npm run compile:webview

# Watch mode (both)
npm run watch

# Run tests
npm test

# Package extension
npm run package
```

### Debug Configuration (.vscode/launch.json)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/dist/**/*.js"
      ],
      "preLaunchTask": "npm: compile"
    },
    {
      "name": "Extension Tests",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionTestsPath=${workspaceFolder}/out/test/suite/index"
      ],
      "outFiles": [
        "${workspaceFolder}/out/test/**/*.js"
      ],
      "preLaunchTask": "npm: compile"
    }
  ]
}
```

### Tasks Configuration (.vscode/tasks.json)
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "npm: compile",
      "type": "npm",
      "script": "compile",
      "problemMatcher": "$tsc",
      "isBackground": false
    },
    {
      "label": "npm: watch",
      "type": "npm",
      "script": "watch",
      "problemMatcher": "$tsc-watch",
      "isBackground": true
    }
  ]
}
```
