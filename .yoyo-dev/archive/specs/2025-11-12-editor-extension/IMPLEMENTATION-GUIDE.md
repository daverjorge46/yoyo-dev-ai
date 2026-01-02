# Yoyo Dev VS Code Extension - Implementation Guide

**Status**: Task Group 1 Complete (3/48 tasks)
**Target**: MVP (Phase 1+2, tasks 1-32)
**Current**: Ready for Task Group 2

---

## Quick Start

### Current State
✅ Extension scaffold created at `extensions/vscode/`
✅ Build system working (esbuild + TypeScript)
✅ Container pattern implemented
✅ package.json configured with 16 commands + 3 views

### Development Workflow

```bash
# Navigate to extension directory
cd extensions/vscode

# Install dependencies (already done)
npm install

# Compile extension
npm run compile

# Watch mode (auto-recompile on changes)
npm run watch

# Debug extension
# 1. Open extensions/vscode/ in VS Code
# 2. Press F5 or Run > Start Debugging
# 3. Extension Host window opens with extension loaded
```

### Project Structure

```
extensions/vscode/
├── src/
│   ├── extension.ts              # ✅ Entry point
│   ├── container.ts              # ✅ DI container
│   ├── utils/                    # TODO: EventBus, FileWatcher, Logger
│   ├── services/                 # TODO: File, State, Config services
│   ├── parsers/                  # TODO: Tasks, Roadmap, State parsers
│   ├── providers/                # TODO: Tree data providers
│   └── commands/                 # TODO: Command handlers
├── webview-ui/                   # TODO Phase 2: React webview
├── dist/                         # Build output
└── package.json                  # Extension manifest
```

---

## Phase 1: Foundation (Weeks 1-2)

### Task Group 2: Core Infrastructure

**Goal**: Create EventBus, Logger, and StateService

#### Task 2.1: Extension Activation (Already partially done, enhance it)

Current extension.ts is basic. It needs EventBus initialization.

**After Task 2.2 is done**, update `src/extension.ts`:

```typescript
import * as vscode from 'vscode';
import { Container } from './container';
import { EventBus } from './utils/EventBus';
import { Logger } from './utils/Logger';

export function activate(context: vscode.ExtensionContext) {
  const startTime = Date.now();

  // Initialize logger first
  const logger = Logger.getInstance();
  logger.info('Yoyo Dev extension activating...');

  // Initialize dependency injection container
  Container.initialize(context);

  // Initialize event bus
  EventBus.getInstance();

  // Register logger and event bus for disposal
  context.subscriptions.push(logger, EventBus.getInstance());

  // TODO: Register commands (Task 8.1)
  // TODO: Register tree views (Tasks 5.1, 6.1)

  // Register simple help command for now
  const disposable = vscode.commands.registerCommand('yoyoDev.help', () => {
    vscode.window.showInformationMessage('Yoyo Dev Extension is active!');
  });
  context.subscriptions.push(disposable);

  // Register container for disposal
  context.subscriptions.push({
    dispose: () => Container.instance.dispose()
  });

  const activationTime = Date.now() - startTime;
  logger.info(`Yoyo Dev extension activated in ${activationTime}ms`);

  if (activationTime > 100) {
    logger.warn(`⚠️  Activation time (${activationTime}ms) exceeds 100ms target`);
  }
}

export function deactivate() {
  Logger.getInstance().info('Yoyo Dev extension deactivating...');
  // Disposal handled automatically via context.subscriptions
}
```

#### Task 2.2: EventBus Implementation

Create `src/utils/EventBus.ts`:

```typescript
import { EventEmitter } from 'events';

/**
 * Event type constants
 */
export enum YoyoEvent {
  TASK_UPDATED = 'task:updated',
  ROADMAP_UPDATED = 'roadmap:updated',
  SPEC_CHANGED = 'spec:changed',
  WORKFLOW_STATE_CHANGED = 'workflow:state:changed',
  GIT_STATUS_CHANGED = 'git:status:changed',
  CONFIG_CHANGED = 'config:changed',
}

/**
 * Event payload interfaces
 */
export interface TaskUpdatedEvent {
  specPath: string;
  taskId?: string;
  timestamp: number;
}

export interface RoadmapUpdatedEvent {
  roadmapPath: string;
  timestamp: number;
}

export interface SpecChangedEvent {
  specPath: string;
  changeType: 'created' | 'modified' | 'deleted';
  timestamp: number;
}

export interface WorkflowStateChangedEvent {
  state: string;
  specName: string;
  timestamp: number;
}

export interface GitStatusChangedEvent {
  branch: string;
  isDirty: boolean;
  timestamp: number;
}

/**
 * Centralized event bus for cross-component communication
 * Follows singleton pattern
 */
export class EventBus extends EventEmitter {
  private static _instance: EventBus | undefined;

  private constructor() {
    super();
    this.setMaxListeners(50); // Increase for multiple subscribers
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EventBus {
    if (!EventBus._instance) {
      EventBus._instance = new EventBus();
    }
    return EventBus._instance;
  }

  /**
   * Emit task updated event
   */
  public emitTaskUpdated(specPath: string, taskId?: string): void {
    this.emit(YoyoEvent.TASK_UPDATED, {
      specPath,
      taskId,
      timestamp: Date.now(),
    } as TaskUpdatedEvent);
  }

  /**
   * Emit roadmap updated event
   */
  public emitRoadmapUpdated(roadmapPath: string): void {
    this.emit(YoyoEvent.ROADMAP_UPDATED, {
      roadmapPath,
      timestamp: Date.now(),
    } as RoadmapUpdatedEvent);
  }

  /**
   * Emit spec changed event
   */
  public emitSpecChanged(
    specPath: string,
    changeType: 'created' | 'modified' | 'deleted'
  ): void {
    this.emit(YoyoEvent.SPEC_CHANGED, {
      specPath,
      changeType,
      timestamp: Date.now(),
    } as SpecChangedEvent);
  }

  /**
   * Emit workflow state changed event
   */
  public emitWorkflowStateChanged(state: string, specName: string): void {
    this.emit(YoyoEvent.WORKFLOW_STATE_CHANGED, {
      state,
      specName,
      timestamp: Date.now(),
    } as WorkflowStateChangedEvent);
  }

  /**
   * Emit git status changed event
   */
  public emitGitStatusChanged(branch: string, isDirty: boolean): void {
    this.emit(YoyoEvent.GIT_STATUS_CHANGED, {
      branch,
      isDirty,
      timestamp: Date.now(),
    } as GitStatusChangedEvent);
  }

  /**
   * Dispose event bus
   */
  public dispose(): void {
    this.removeAllListeners();
    EventBus._instance = undefined;
  }
}
```

**Test it**: After creating, add to extension.ts and compile. Check for errors.

#### Task 2.3: Logger Implementation

Create `src/utils/Logger.ts`:

```typescript
import * as vscode from 'vscode';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Centralized logging service with Output Channel
 */
export class Logger {
  private static _instance: Logger | undefined;
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel = LogLevel.INFO;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Yoyo Dev');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): Logger {
    if (!Logger._instance) {
      Logger._instance = new Logger();
    }
    return Logger._instance;
  }

  /**
   * Set log level
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Show output channel
   */
  public show(): void {
    this.outputChannel.show();
  }

  /**
   * Log debug message
   */
  public debug(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.log('DEBUG', message, ...args);
    }
  }

  /**
   * Log info message
   */
  public info(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.log('INFO', message, ...args);
    }
  }

  /**
   * Log warning message
   */
  public warn(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.log('WARN', message, ...args);
    }
  }

  /**
   * Log error message
   */
  public error(message: string, error?: Error, ...args: any[]): void {
    if (this.logLevel <= LogLevel.ERROR) {
      const errorInfo = error ? `\n${error.stack || error.message}` : '';
      this.log('ERROR', message + errorInfo, ...args);
    }
  }

  /**
   * Internal log method
   */
  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;

    // Write to output channel
    this.outputChannel.appendLine(formattedMessage);

    // Also log args if present
    if (args.length > 0) {
      this.outputChannel.appendLine(JSON.stringify(args, null, 2));
    }

    // In dev mode, also log to console
    if (process.env.NODE_ENV === 'development') {
      console.log(formattedMessage, ...args);
    }
  }

  /**
   * Dispose logger
   */
  public dispose(): void {
    this.outputChannel.dispose();
    Logger._instance = undefined;
  }
}
```

**Test it**: Compile and debug. Open Command Palette > "Output: Show Output Channels" > Select "Yoyo Dev" to see logs.

#### Task 2.4: State Service

Create `src/services/StateService.ts`:

```typescript
import * as vscode from 'vscode';

/**
 * State management service using VS Code workspace state
 */
export class StateService {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Get value from workspace state
   */
  public get<T>(key: string, defaultValue?: T): T | undefined {
    return this.context.workspaceState.get<T>(key, defaultValue);
  }

  /**
   * Set value in workspace state
   */
  public async set<T>(key: string, value: T): Promise<void> {
    await this.context.workspaceState.update(key, value);
  }

  /**
   * Get value from global state
   */
  public getGlobal<T>(key: string, defaultValue?: T): T | undefined {
    return this.context.globalState.get<T>(key, defaultValue);
  }

  /**
   * Set value in global state
   */
  public async setGlobal<T>(key: string, value: T): Promise<void> {
    await this.context.globalState.update(key, value);
  }

  /**
   * Clear all workspace state
   */
  public async clearWorkspace(): Promise<void> {
    const keys = this.context.workspaceState.keys();
    for (const key of keys) {
      await this.context.workspaceState.update(key, undefined);
    }
  }

  /**
   * Get all workspace state keys
   */
  public getKeys(): readonly string[] {
    return this.context.workspaceState.keys();
  }

  /**
   * Dispose (no-op, state persists automatically)
   */
  public dispose(): void {
    // No cleanup needed
  }
}
```

**Update Container.ts** to create StateService properly:

```typescript
// In src/container.ts, replace the stateService getter:

public get stateService(): StateService {
  if (!this._stateService) {
    this._stateService = new StateService(this._context);
  }
  return this._stateService;
}
```

Don't forget to import: `import { StateService } from './services/StateService';`

---

### Task Group 3: File System Integration

#### Task 3.1: Yoyo File Service

Create `src/services/YoyoFileService.ts`:

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Logger } from '../utils/Logger';

/**
 * Service for reading .yoyo-dev files
 */
export class YoyoFileService {
  private logger: Logger;
  private yoyoDevPath: string | null = null;

  constructor() {
    this.logger = Logger.getInstance();
    this.findYoyoDevPath();
  }

  /**
   * Find .yoyo-dev directory in workspace
   */
  private findYoyoDevPath(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      this.logger.warn('No workspace folder found');
      return;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    this.yoyoDevPath = path.join(rootPath, '.yoyo-dev');
    this.logger.info(`Yoyo Dev path: ${this.yoyoDevPath}`);
  }

  /**
   * Get .yoyo-dev path
   */
  public getYoyoDevPath(): string | null {
    return this.yoyoDevPath;
  }

  /**
   * Read file from .yoyo-dev directory
   */
  public async readFile(relativePath: string): Promise<string | null> {
    if (!this.yoyoDevPath) {
      this.logger.error('Yoyo Dev path not found');
      return null;
    }

    const filePath = path.join(this.yoyoDevPath, relativePath);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      this.logger.error(`Failed to read file: ${filePath}`, error as Error);
      return null;
    }
  }

  /**
   * Check if file exists
   */
  public async fileExists(relativePath: string): Promise<boolean> {
    if (!this.yoyoDevPath) {
      return false;
    }

    const filePath = path.join(this.yoyoDevPath, relativePath);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all spec directories
   */
  public async listSpecs(): Promise<string[]> {
    if (!this.yoyoDevPath) {
      return [];
    }

    const specsPath = path.join(this.yoyoDevPath, 'specs');

    try {
      const entries = await fs.readdir(specsPath, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch (error) {
      this.logger.error('Failed to list specs', error as Error);
      return [];
    }
  }

  /**
   * Get path to spec directory
   */
  public getSpecPath(specName: string): string | null {
    if (!this.yoyoDevPath) {
      return null;
    }
    return path.join(this.yoyoDevPath, 'specs', specName);
  }

  /**
   * Dispose service
   */
  public dispose(): void {
    // No cleanup needed
  }
}
```

**Update Container.ts** fileService getter to use YoyoFileService.

#### Task 3.2: Config Service

Create `src/services/ConfigService.ts`:

```typescript
import { YoyoFileService } from './YoyoFileService';
import { Logger } from '../utils/Logger';
import * as yaml from 'js-yaml'; // Add to package.json: "js-yaml": "^4.1.0"

export interface YoyoConfig {
  yoyo_dev_version: string;
  agents: {
    claude_code: { enabled: boolean };
    cursor: { enabled: boolean };
  };
  multi_agent: {
    enabled: boolean;
    use_workflow_references: boolean;
  };
  // Add other config fields as needed
}

/**
 * Service for reading config.yml
 */
export class ConfigService {
  private logger: Logger;
  private fileService: YoyoFileService;
  private config: YoyoConfig | null = null;

  constructor(fileService: YoyoFileService) {
    this.logger = Logger.getInstance();
    this.fileService = fileService;
  }

  /**
   * Load config.yml
   */
  public async loadConfig(): Promise<YoyoConfig | null> {
    const content = await this.fileService.readFile('config.yml');

    if (!content) {
      this.logger.warn('config.yml not found');
      return null;
    }

    try {
      this.config = yaml.load(content) as YoyoConfig;
      this.logger.info('Config loaded successfully');
      return this.config;
    } catch (error) {
      this.logger.error('Failed to parse config.yml', error as Error);
      return null;
    }
  }

  /**
   * Get cached config (loads if not cached)
   */
  public async getConfig(): Promise<YoyoConfig | null> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config;
  }

  /**
   * Reload config from disk
   */
  public async reloadConfig(): Promise<YoyoConfig | null> {
    this.config = null;
    return this.loadConfig();
  }

  /**
   * Dispose service
   */
  public dispose(): void {
    this.config = null;
  }
}
```

**Add js-yaml dependency**:
```bash
npm install js-yaml
npm install --save-dev @types/js-yaml
```

**Update Container.ts** for configService.

#### Task 3.3: File Watcher

Create `src/utils/FileWatcher.ts`:

```typescript
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
  private readonly DEBOUNCE_DELAY = 500; // ms

  constructor() {
    this.logger = Logger.getInstance();
    this.eventBus = EventBus.getInstance();
    this.setupWatcher();
  }

  /**
   * Setup file system watcher
   */
  private setupWatcher(): void {
    // Watch .yoyo-dev/**/*.{md,json,yml}
    const pattern = new vscode.RelativePattern(
      vscode.workspace.workspaceFolders![0],
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
    }, this.DEBOUNCE_DELAY);

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
```

**Activate FileWatcher** in extension.ts:

```typescript
// In activate():
const fileWatcher = new FileWatcher();
context.subscriptions.push(fileWatcher);
```

---

### Task Group 4: Parsers

#### Task 4.1: Tasks Parser

Create `src/parsers/TasksParser.ts`:

```typescript
import { Logger } from '../utils/Logger';

export interface Task {
  id: string;          // e.g., "1.1", "2.3"
  title: string;       // Task title
  description: string;
  completed: boolean;
  subtasks: Task[];
  isGroup: boolean;    // true if "Task Group", false if individual task
  depth: number;       // Nesting level
}

/**
 * Parser for tasks.md files
 */
export class TasksParser {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Parse tasks.md content into hierarchical structure
   */
  public parse(content: string): Task[] {
    const lines = content.split('\n');
    const tasks: Task[] = [];
    let currentGroup: Task | null = null;
    let currentTask: Task | null = null;

    for (const line of lines) {
      // Task Group: ### Task Group N: Name
      if (line.startsWith('### Task Group')) {
        const match = line.match(/### Task Group (\d+):\s*(.+)/);
        if (match) {
          currentGroup = {
            id: match[1],
            title: match[2].trim(),
            description: '',
            completed: line.includes('✅'),
            subtasks: [],
            isGroup: true,
            depth: 0,
          };
          tasks.push(currentGroup);
          currentTask = null;
        }
      }
      // Individual Task: #### Task N.M: Name
      else if (line.startsWith('#### Task')) {
        const match = line.match(/#### Task ([\d.]+):\s*(.+)/);
        if (match && currentGroup) {
          currentTask = {
            id: match[1],
            title: match[2].trim(),
            description: '',
            completed: line.includes('✅'),
            subtasks: [],
            isGroup: false,
            depth: 1,
          };
          currentGroup.subtasks.push(currentTask);
        }
      }
      // Description line (after task header)
      else if (line.startsWith('**Description**:') && currentTask) {
        currentTask.description = line.replace('**Description**:', '').trim();
      }
      // Check for completion status in acceptance criteria
      else if (line.trim().startsWith('- [x]') && currentTask) {
        currentTask.completed = true;
      }
    }

    // Mark groups as complete if all subtasks complete
    for (const group of tasks) {
      if (group.subtasks.length > 0) {
        group.completed = group.subtasks.every((t) => t.completed);
      }
    }

    this.logger.debug(`Parsed ${tasks.length} task groups`);
    return tasks;
  }
}
```

#### Task 4.2: Roadmap Parser

Create `src/parsers/RoadmapParser.ts`:

```typescript
import { Logger } from '../utils/Logger';

export interface RoadmapPhase {
  name: string;
  features: string[];
  completed: boolean;
}

/**
 * Parser for roadmap.md files
 */
export class RoadmapParser {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Parse roadmap.md content
   */
  public parse(content: string): RoadmapPhase[] {
    const lines = content.split('\n');
    const phases: RoadmapPhase[] = [];
    let currentPhase: RoadmapPhase | null = null;

    for (const line of lines) {
      // Phase header: ## Phase N: Name
      if (line.startsWith('## Phase')) {
        const match = line.match(/## Phase \d+:\s*(.+)/);
        if (match) {
          currentPhase = {
            name: match[1].trim(),
            features: [],
            completed: line.includes('✅') || line.includes('(Completed)'),
          };
          phases.push(currentPhase);
        }
      }
      // Feature item: - Feature name
      else if (line.trim().startsWith('- ') && currentPhase) {
        const feature = line.trim().substring(2).trim();
        if (feature && !feature.startsWith('**')) {
          currentPhase.features.push(feature);
        }
      }
    }

    this.logger.debug(`Parsed ${phases.length} roadmap phases`);
    return phases;
  }
}
```

#### Task 4.3: State Parser

Create `src/parsers/StateParser.ts`:

```typescript
import { Logger } from '../utils/Logger';

export interface WorkflowState {
  spec_name: string;
  created_at: string;
  execution_started?: string;
  current_phase: string;
  active_task?: string;
  workflow_state: string;
  last_updated: string;
}

/**
 * Parser for state.json files
 */
export class StateParser {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Parse state.json content
   */
  public parse(content: string): WorkflowState | null {
    try {
      const state = JSON.parse(content) as WorkflowState;
      return state;
    } catch (error) {
      this.logger.error('Failed to parse state.json', error as Error);
      return null;
    }
  }
}
```

---

### Task Group 5: Task Tree View

#### Task 5.1: Task Tree Data Provider

Create `src/providers/TaskTreeDataProvider.ts`:

```typescript
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
    this.iconPath = task.completed
      ? new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'))
      : task.isGroup
      ? new vscode.ThemeIcon('folder')
      : new vscode.ThemeIcon('circle-outline');

    // Set tooltip
    this.tooltip = `${task.title}\n${task.description}`;

    // Make tasks clickable
    if (!task.isGroup) {
      this.command = {
        command: 'yoyoDev.openSpec',
        title: 'Open Spec',
        arguments: [task],
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

  constructor(fileService: YoyoFileService) {
    this.fileService = fileService;
    this.parser = new TasksParser();
    this.logger = Logger.getInstance();

    // Listen for task updates
    EventBus.getInstance().on(YoyoEvent.TASK_UPDATED, () => {
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
   * Load tasks from tasks.md
   */
  private async loadTasks(): Promise<void> {
    // For now, load from most recent spec
    // TODO: Allow user to select which spec to view
    const specs = await this.fileService.listSpecs();
    if (specs.length === 0) {
      this.logger.info('No specs found');
      this.tasks = [];
      return;
    }

    // Get most recent spec (last in alphabetical order)
    const latestSpec = specs.sort().reverse()[0];
    const tasksPath = `specs/${latestSpec}/tasks.md`;

    const content = await this.fileService.readFile(tasksPath);
    if (!content) {
      this.logger.warn(`No tasks.md found for spec: ${latestSpec}`);
      this.tasks = [];
      return;
    }

    this.tasks = this.parser.parse(content);
    this.logger.info(`Loaded ${this.tasks.length} task groups`);
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
}
```

**Register in extension.ts**:

```typescript
// In activate(), after Container initialization:
const taskTreeDataProvider = new TaskTreeDataProvider(Container.instance.fileService);
const taskTreeView = vscode.window.createTreeView('yoyoDevTasks', {
  treeDataProvider: taskTreeDataProvider,
});
context.subscriptions.push(taskTreeView);

// Register refresh command
context.subscriptions.push(
  vscode.commands.registerCommand('yoyoDev.refreshTasks', () => {
    taskTreeDataProvider.refresh();
  })
);
```

---

## Continue Implementation

This guide covers the critical foundation (Task Groups 2-5). For remaining tasks:

**Task Group 6**: Roadmap tree view (similar pattern to Task tree)
**Task Group 7**: Status bar (simple StatusBarItem with text/tooltip)
**Task Group 8**: Command integration (register 16 command handlers)

**Phase 2** (weeks 3-4): Webview, terminal integration, git info, context menus

---

## Testing Strategy

### Manual Testing Checklist

After implementing each task group:

- [ ] Extension compiles without errors
- [ ] Extension activates in <100ms
- [ ] Output channel shows logs
- [ ] Tree views appear in sidebar
- [ ] Refresh buttons work
- [ ] File changes trigger updates (after 500ms)
- [ ] No console errors

### Unit Testing (Future)

Create tests in `src/test/` directory:
- Parser tests (tasks.md, roadmap.md, state.json)
- Service tests (file reading, state management)
- Provider tests (tree data providers)

---

## Troubleshooting

### Build Errors

**Error: Cannot find module**
- Check imports match file paths
- Ensure TypeScript can resolve paths
- Run `npm install` if dependency missing

**Error: Property does not exist**
- Update interface/type definitions
- Check TypeScript version (should be 5.3.3)

### Extension Not Activating

- Check `activationEvents` in package.json
- Verify `.yoyo-dev/` folder exists in workspace
- Check Output > Yoyo Dev for error messages
- Try reloading window (Cmd+Shift+P > "Reload Window")

### Tree View Not Updating

- Check EventBus is emitting events (add logger.debug in emit methods)
- Verify FileWatcher is set up correctly
- Check debounce delay (may need to wait 500ms after file change)
- Try manual refresh button

### Performance Issues

- Check activation time in Output channel
- Reduce max items in tree views if >100 tasks
- Increase debounce delay if too many file changes
- Profile with VS Code's extension profiler

---

## Next Steps

1. **Complete Phase 1** (Task Groups 2-8)
2. **Test thoroughly** in Extension Development Host
3. **Commit Phase 1** with recap
4. **Start Phase 2** (webview, terminal, git integration)
5. **Iterate and improve** based on usage

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [TreeView API](https://code.visualstudio.com/api/extension-guides/tree-view)
- [FileSystemWatcher API](https://code.visualstudio.com/api/references/vscode-api#FileSystemWatcher)
- [Webview API](https://code.visualstudio.com/api/extension-guides/webview)

---

**Good luck with the implementation! You've got a solid foundation to build on.** 🚀
