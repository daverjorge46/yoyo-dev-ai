# VS Code & Cursor Extension Development Research

Research conducted: 2025-11-12
Purpose: Inform design of yoyo-dev editor extension

## Executive Summary

VS Code extensions offer robust APIs for building dev tool integrations. Key findings:

1. **Cursor is fully compatible** with VS Code extensions (built on VS Code core)
2. **Sidebar webviews + tree views** provide flexible UI options
3. **File system watchers** enable real-time updates without polling
4. **Message passing** enables bidirectional communication with webviews
5. **esbuild is recommended** for bundling (10-100x faster than webpack)
6. **Performance is critical** - bundling can reduce activation time by 50%+

## 1. Extension API Capabilities

### 1.1 Sidebar & View Panels

**Tree View API**
- Displays hierarchical data in sidebar (like file explorer)
- Conforms to VS Code's native styling
- Best for: Task lists, roadmap items, file structure
- API: `vscode.window.createTreeView()` + `TreeDataProvider`

**Webview Views**
- Custom HTML/CSS/JS in sidebar panels
- Can use React, Svelte, Vue (see section 5)
- Best for: Rich UI, interactive forms, formatted content
- API: `vscode.window.registerWebviewViewProvider()`

**Hybrid Approach** (Recommended)
- Use Tree View for task lists (native feel, better performance)
- Use Webview for spec content, git info, markdown rendering

**Key Limitation**: Webview UI Toolkit deprecated as of Jan 1, 2025 - use standard web frameworks instead.

### 1.2 Command Palette Integration

**Built-in Support**
```json
// package.json
"contributes": {
  "commands": [
    {
      "command": "yoyo.planProduct",
      "title": "Yoyo: Plan Product",
      "category": "Yoyo Dev"
    }
  ]
}
```

**Features**:
- Auto-appear in Command Palette (Cmd+Shift+P)
- Category grouping for organization
- Conditional visibility via `when` clauses
- Icon support
- Keyboard shortcut binding

**Best Practice**: Use category prefix "Yoyo Dev" for all commands to group them together.

### 1.3 Context Menus

**Supported Locations**:
- `editor/context` - Right-click in editor
- `explorer/context` - Right-click in file explorer
- `view/item/context` - Right-click on tree view items
- `view/title` - Actions in view title bar

**Example**:
```json
"menus": {
  "explorer/context": [
    {
      "command": "yoyo.createSpec",
      "when": "explorerResourceIsFolder",
      "group": "yoyo@1"
    }
  ]
}
```

**Group Conventions**:
- `navigation` group always sorts to top
- Use `@` separator for ordering (e.g., `yoyo@1`, `yoyo@2`)
- Context menus show disabled items (Command Palette filters them)

### 1.4 Status Bar Items

**Types**:
- **Left items**: Workspace-scoped (e.g., current spec status)
- **Right items**: File-scoped (e.g., current task progress)

**Example**:
```typescript
const statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Left,
  100
);
statusBarItem.text = "$(check) Spec: user-auth";
statusBarItem.command = "yoyo.showSpecPanel";
statusBarItem.show();
```

**Best Practice**: Use codicons (e.g., `$(check)`, `$(loading)`) for visual consistency.

### 1.5 File System Watchers

**API**:
```typescript
const watcher = vscode.workspace.createFileSystemWatcher(
  new vscode.RelativePattern(workspaceFolder, '.yoyo-dev/**/*.md')
);

watcher.onDidCreate(uri => { /* handle */ });
watcher.onDidChange(uri => { /* handle */ });
watcher.onDidDelete(uri => { /* handle */ });
```

**Performance Best Practices**:
1. **Minimize recursive watchers** - they're resource-intensive
2. **Use non-recursive when possible** - for specific directories
3. **Leverage default workspace watching** - VS Code already watches workspace recursively
4. **Configure exclusions** - use `files.watcherExclude` setting
5. **Dispose when done** - call `watcher.dispose()`

**For Yoyo Dev**:
- Watch `.yoyo-dev/**/*.md` for spec/task changes
- Watch `.yoyo-dev/**/state.json` for workflow state
- Watch `.yoyo-dev/product/roadmap.md` for roadmap updates
- Non-recursive watcher on `.yoyo-dev/` root should be sufficient

**Platform Limitation**: Linux can hit file handle limits with large folders.

### 1.6 Terminal Integration

**Creating Terminals**:
```typescript
const terminal = vscode.window.createTerminal({
  name: "Yoyo Dev",
  cwd: workspaceFolder.uri.fsPath
});
terminal.sendText("yoyo --no-split");
terminal.show();
```

**Shell Integration**:
- VS Code has custom OSC 633 escape sequences
- Events for shell integration activation
- Can detect command execution completion

**Subprocess Communication**:
Three approaches for Claude Code CLI integration:

1. **Two-layer wrapper process** (Recommended)
   - Start wrapper process that launches Claude Code CLI
   - Use socket.io or IPC for bidirectional communication
   - Wrapper observes CLI output and reports back

2. **IPC Socket/Named Pipe**
   - Create Unix socket (Linux/Mac) or named pipe (Windows)
   - Pass via environment variable to subprocess
   - Subprocess sends data to socket

3. **File Watcher Approach** (Simple)
   - Launch CLI with `bash -c` (non-interactive)
   - Watch output files for results
   - Less real-time, but simpler

**For Yoyo Dev**: Recommended approach is #1 (wrapper process) for real-time output streaming.

### 1.7 Configuration & Settings

**Contribution Point**:
```json
"contributes": {
  "configuration": {
    "title": "Yoyo Dev",
    "properties": {
      "yoyoDev.autoRefresh": {
        "type": "boolean",
        "default": true,
        "description": "Auto-refresh views on file changes"
      }
    }
  }
}
```

**Reading Settings**:
```typescript
const config = vscode.workspace.getConfiguration('yoyoDev');
const autoRefresh = config.get<boolean>('autoRefresh', true);
```

**Best Practice**: Mirror important config.yml settings in VS Code settings for user preference.

### 1.8 Extension State Persistence

**Four Storage Options**:

1. **Workspace State** (Recommended for Yoyo Dev)
   ```typescript
   context.workspaceState.update('currentSpec', specPath);
   const spec = context.workspaceState.get<string>('currentSpec');
   ```
   - Persists per workspace
   - Survives extension updates and VS Code restarts
   - Stored in SQLite DB (`state.vscdb`)

2. **Global State**
   ```typescript
   context.globalState.update('lastUsedFeature', 'create-spec');
   ```
   - Persists across all workspaces
   - Optional sync via `setKeysForSync()`

3. **Storage URI** (For large files)
   ```typescript
   const storageUri = context.storageUri; // workspace-specific
   const globalStorageUri = context.globalStorageUri; // global
   ```
   - Local directory with read/write access
   - Good for caching, temp files

4. **Secret Storage** (For sensitive data)
   ```typescript
   await context.secrets.store('apiKey', value);
   const apiKey = await context.secrets.get('apiKey');
   ```
   - Secure storage for API keys, tokens
   - Not needed for Yoyo Dev

**For Yoyo Dev**:
- Use workspace state for: current spec, last executed task, view collapse states
- Use global state for: user preferences, recently used commands

## 2. Cursor-Specific Findings

### 2.1 Compatibility Status

**Fully Compatible** - Cursor is built on VS Code's open-source core:
- All VS Code extension APIs work in Cursor
- Same extension marketplace access
- Identical activation and lifecycle

### 2.2 Microsoft Marketplace Restrictions (2025)

**Important**: Microsoft is enforcing marketplace restrictions:
- Extensions "may only be used with in-scope products"
- In-scope: VS Code, Visual Studio, GitHub Codespaces, Azure DevOps
- Some Microsoft extensions (C/C++, C# DevKit) restricted in Cursor
- Cursor provides workaround: direct marketplace access within IDE

**Impact on Yoyo Dev**: None - we'll publish to VS Code marketplace and it will work in both.

### 2.3 Cursor-Specific APIs

**No unique APIs** - Cursor uses standard VS Code extension API.

**AI Integration**: Cursor's AI features are not exposed to extensions (as of 2025).

### 2.4 Installation

Users can install from:
1. VS Code marketplace (within Cursor)
2. Import from VS Code installation
3. Manual VSIX installation

## 3. Best Practices from Dev Tool Extensions

### 3.1 GitLens Architecture Patterns

**Key Patterns**:

1. **Container Pattern** (Dependency Injection)
   ```typescript
   class Container {
     private static instance: Container;

     private constructor() {
       this.initializeServices();
     }

     static getInstance(): Container {
       if (!Container.instance) {
         Container.instance = new Container();
       }
       return Container.instance;
     }
   }
   ```
   - Centralized service management
   - Single source of truth for all components
   - Easier testing and mocking

2. **Service-Based Architecture**
   - Separate services: GitService, ViewService, CommandService
   - Clear separation of concerns
   - Modular and maintainable

3. **View System**
   - Multiple view providers for different panels
   - Tree views for hierarchical data
   - Webviews for complex visualizations

4. **Command Registration System**
   - Centralized command registration
   - Category-based organization
   - Context-aware enablement

**For Yoyo Dev**: Adopt Container pattern + service-based architecture.

### 3.2 Error Lens Real-Time Diagnostics

**Key Patterns**:

1. **Decorator Pattern**
   - Enhances existing VS Code diagnostics
   - Non-invasive extension of built-in features
   - Uses `vscode.languages.getDiagnostics()`

2. **Performance Optimization**
   - Minimum 500ms delay before showing decorations
   - Cuts off long messages to improve performance
   - Updates only on save (optional)
   - Old errors disappear faster than new errors appear

3. **Event-Driven Updates**
   ```typescript
   vscode.languages.onDidChangeDiagnostics(event => {
     setTimeout(() => {
       updateDecorations(event.uris);
     }, Math.max(500, config.delay));
   });
   ```

**For Yoyo Dev**: Use similar delay pattern for file watcher updates to avoid thrashing.

### 3.3 Thunder Client Storage & Architecture

**Key Patterns**:

1. **Local-First Storage**
   - All data stored locally on device
   - Works completely offline
   - Git-friendly: save requests to repo for team collaboration

2. **Tech Stack**
   - JavaScript/TypeScript
   - Ace Editor for code
   - Got for HTTP
   - Nedb for local database

3. **Real-Time Code Generation**
   - Updates code snippets as you modify requests
   - Supports multiple languages (Flutter, Dart, PHP, Python, etc.)

4. **Performance**
   - Lightweight, doesn't slow down VS Code
   - Efficient for large requests
   - Hand-crafted for simplicity

**For Yoyo Dev**: Adopt local-first storage, Git-friendly approach (already done with `.yoyo-dev/` folder).

### 3.4 Common Patterns Summary

**Activation**:
- Activate on specific events (not `onStartup`)
- Lazy load services
- Defer expensive operations

**Error Handling**:
- Use VS Code notifications (`vscode.window.showErrorMessage`)
- Log to output channel for debugging
- Graceful degradation

**UI Patterns**:
- Status bar for quick status
- Tree view for hierarchical data
- Webview for rich content
- Command palette for actions
- Context menus for file operations

## 4. Integration Patterns

### 4.1 Claude Code CLI Integration

**Recommended Architecture**:

```
Extension Host (Node.js)
    |
    |-- Wrapper Process (Node.js child_process)
    |       |
    |       |-- Claude Code CLI (subprocess)
    |       |
    |       |-- IPC Channel (socket.io or Unix socket)
    |
    |-- Webview (if needed)
            |
            |-- Message Passing API
```

**Implementation**:

```typescript
import { spawn } from 'child_process';
import * as net from 'net';

class ClaudeCliService {
  private process: ChildProcess | null = null;
  private socket: net.Socket | null = null;

  async start(workspaceRoot: string): Promise<void> {
    // Create IPC socket
    const socketPath = `/tmp/yoyo-dev-${Date.now()}.sock`;
    const server = net.createServer();

    // Spawn wrapper process
    this.process = spawn('node', ['wrapper.js'], {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        YOYO_IPC_SOCKET: socketPath
      }
    });

    // Handle output
    this.process.stdout.on('data', (data) => {
      this.handleOutput(data.toString());
    });

    // Wait for socket connection
    server.listen(socketPath);
    server.on('connection', (socket) => {
      this.socket = socket;
      this.socket.on('data', (data) => {
        this.handleMessage(JSON.parse(data.toString()));
      });
    });
  }

  sendCommand(command: string): void {
    if (this.socket) {
      this.socket.write(JSON.stringify({ type: 'command', data: command }));
    }
  }
}
```

**Wrapper Process** (`wrapper.js`):
```javascript
const { spawn } = require('child_process');
const net = require('net');
const socket = net.connect(process.env.YOYO_IPC_SOCKET);

const claude = spawn('claude', process.argv.slice(2), {
  stdio: ['inherit', 'pipe', 'pipe']
});

claude.stdout.on('data', (data) => {
  socket.write(JSON.stringify({
    type: 'stdout',
    data: data.toString()
  }));
});

socket.on('data', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === 'command') {
    claude.stdin.write(msg.data + '\n');
  }
});
```

**Alternative (Simpler)**: Use terminal integration + file watchers:
```typescript
const terminal = vscode.window.createTerminal('Claude Code');
terminal.sendText(`claude --output-file /tmp/yoyo-output.json`);

const watcher = vscode.workspace.createFileSystemWatcher(
  '/tmp/yoyo-output.json'
);
watcher.onDidChange(() => {
  // Read and parse output file
});
```

### 4.2 File System Watching Pattern

**Optimized Approach**:

```typescript
class YoyoFileWatcher {
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly workspaceRoot: string) {
    this.setupWatchers();
  }

  private setupWatchers(): void {
    // Watch .yoyo-dev directory (non-recursive for performance)
    const pattern = new vscode.RelativePattern(
      this.workspaceRoot,
      '.yoyo-dev/**/*.{md,json}'
    );

    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcher.onDidChange((uri) => this.handleChange(uri));
    watcher.onDidCreate((uri) => this.handleCreate(uri));
    watcher.onDidDelete((uri) => this.handleDelete(uri));
  }

  private handleChange(uri: vscode.Uri): void {
    const path = uri.fsPath;

    // Debounce updates (500ms minimum per Error Lens pattern)
    if (this.debounceTimers.has(path)) {
      clearTimeout(this.debounceTimers.get(path)!);
    }

    const timer = setTimeout(() => {
      this.processFileChange(uri);
      this.debounceTimers.delete(path);
    }, 500);

    this.debounceTimers.set(path, timer);
  }

  private processFileChange(uri: vscode.Uri): void {
    const relativePath = vscode.workspace.asRelativePath(uri);

    if (relativePath.includes('specs/') && relativePath.endsWith('tasks.md')) {
      this.refreshTaskView();
    } else if (relativePath.includes('product/roadmap.md')) {
      this.refreshRoadmapView();
    } else if (relativePath.endsWith('state.json')) {
      this.refreshStatusBar();
    }
  }
}
```

**Benefits**:
- Debouncing prevents thrashing on rapid saves
- Selective refresh based on file type
- Non-recursive watcher for `.yoyo-dev/` folder (performance)

### 4.3 Real-Time Updates Without Polling

**Event-Driven Architecture**:

```typescript
import * as vscode from 'vscode';
import { EventEmitter } from 'events';

class YoyoEventBus extends EventEmitter {
  static instance = new YoyoEventBus();

  // Event types
  static SPEC_CHANGED = 'spec:changed';
  static TASK_UPDATED = 'task:updated';
  static ROADMAP_UPDATED = 'roadmap:updated';
  static WORKFLOW_STATE_CHANGED = 'workflow:state:changed';
}

// In file watcher
watcher.onDidChange((uri) => {
  if (uri.fsPath.endsWith('tasks.md')) {
    YoyoEventBus.instance.emit(
      YoyoEventBus.TASK_UPDATED,
      { uri, timestamp: Date.now() }
    );
  }
});

// In tree view provider
YoyoEventBus.instance.on(YoyoEventBus.TASK_UPDATED, () => {
  this._onDidChangeTreeData.fire();
});

// In webview
YoyoEventBus.instance.on(YoyoEventBus.SPEC_CHANGED, (data) => {
  webviewPanel.webview.postMessage({
    type: 'specUpdated',
    content: data
  });
});
```

**Benefits**:
- Zero polling overhead
- Instant updates across all views
- Decoupled components
- Testable event handling

### 4.4 Markdown Rendering in Webviews

**Security-First Approach**:

```typescript
function getWebviewContent(webview: vscode.Webview, markdown: string): string {
  const nonce = getNonce();
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'main.js')
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'styles.css')
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 style-src ${webview.cspSource} 'unsafe-inline';
                 script-src 'nonce-${nonce}';
                 img-src ${webview.cspSource} https:;">
  <link href="${styleUri}" rel="stylesheet">
</head>
<body>
  <div id="content">${renderMarkdown(markdown)}</div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
```

**CSP Best Practices**:
- Always use Content Security Policy (defense in depth)
- Generate nonce for inline scripts
- Use `webview.asWebviewUri()` for all resources
- Never trust user input in markdown (sanitize HTML)
- Use `${webview.cspSource}` for loading resources

**Markdown Libraries**:
- `marked` - Fast, lightweight, widely used
- `markdown-it` - More extensible, plugins available
- `remark` - Unified ecosystem, AST-based

**VS Code Markdown Rendering**:
- VS Code uses its own markdown renderer
- Extensions can hook into it, but limited customization
- Custom webview gives full control

## 5. Technical Stack Recommendations

### 5.1 Language: TypeScript

**Why TypeScript**:
- Official VS Code extension language
- Strong typing catches errors at compile time
- Excellent VS Code API type definitions
- Better refactoring support

**Configuration** (`tsconfig.json`):
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
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", ".vscode-test"]
}
```

### 5.2 Build Tool: esbuild (Recommended)

**Why esbuild over webpack**:
- 10-100x faster build times
- Simpler configuration
- Built-in TypeScript support
- Better developer experience
- Recommended by VS Code team (2025)

**Configuration** (`esbuild.js`):
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
    plugins: [
      /* add any plugins here */
    ],
  });

  if (watch) {
    await ctx.watch();
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

**NPM Scripts** (`package.json`):
```json
{
  "scripts": {
    "vscode:prepublish": "npm run package",
    "compile": "node esbuild.js",
    "watch": "node esbuild.js --watch",
    "package": "node esbuild.js --production",
    "typecheck": "tsc --noEmit"
  }
}
```

**Important**: Run `tsc --noEmit` separately for type checking (esbuild doesn't type check).

### 5.3 Webview UI Framework: React or Svelte

**React** (Recommended for Yoyo Dev):
- Larger ecosystem
- More developers familiar with it
- Better TypeScript support
- More component libraries

**Svelte** (Alternative):
- Smaller bundle size (~50% smaller)
- Faster runtime performance
- Less boilerplate
- Compiled, not framework at runtime

**Comparison**:

| Factor | React | Svelte |
|--------|-------|--------|
| Bundle Size | ~140KB (React + ReactDOM) | ~15KB |
| Performance | Fast | Faster |
| Ecosystem | Larger | Growing |
| Learning Curve | Moderate | Easier |
| TypeScript | Excellent | Good |

**Recommendation**: Use **React** for Yoyo Dev due to:
1. Team familiarity (likely)
2. Larger component library ecosystem
3. Better debugging tools
4. Bundle size not critical for extension

**Setup with esbuild**:
```javascript
// esbuild-webview.js
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['webview-ui/index.tsx'],
  bundle: true,
  outfile: 'dist/webview.js',
  format: 'iife',
  platform: 'browser',
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts'
  },
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
});
```

**Note**: Webview UI Toolkit deprecated Jan 1, 2025 - use standard React/Svelte instead.

### 5.4 Testing Framework

**Official**: Mocha + @vscode/test-electron

**Alternative**: Jest (requires manual setup)

**Recommendation**: Use **official Mocha setup** for:
- Better VS Code integration
- Less configuration
- Official support and examples

**Test Structure**:
```typescript
// src/test/suite/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Sample test', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });
});
```

**For Jest** (if preferred):
```typescript
// __mocks__/vscode.js
module.exports = {
  window: {
    showInformationMessage: jest.fn(),
    createStatusBarItem: jest.fn(() => ({
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    })),
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
};
```

### 5.5 State Management

**For Extension Host** (Node.js side):
- Use VS Code's built-in state management
- `context.workspaceState` and `context.globalState`
- Event emitters for cross-component communication

**For Webview** (React side):
- **Simple state**: React hooks (`useState`, `useReducer`)
- **Complex state**: Zustand (lightweight, ~1KB)
- **Alternative**: Redux Toolkit (if already familiar)

**Recommendation**: Start with **React hooks + VS Code state**, add Zustand only if needed.

```typescript
// webview-ui/src/stores/taskStore.ts
import create from 'zustand';

interface TaskState {
  tasks: Task[];
  currentTask: Task | null;
  setTasks: (tasks: Task[]) => void;
  setCurrentTask: (task: Task) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  currentTask: null,
  setTasks: (tasks) => set({ tasks }),
  setCurrentTask: (currentTask) => set({ currentTask }),
}));
```

### 5.6 Additional Libraries

**Recommended**:
- `marked` - Markdown parsing (lightweight, fast)
- `js-yaml` - YAML parsing for config.yml
- `chokidar` - Enhanced file watching (if needed)
- `ws` - WebSocket for real-time CLI communication (alternative to socket.io)

**UI Libraries for Webview**:
- VSCode Codicons - VS Code's icon set
- Tailwind CSS - Utility-first CSS
- Radix UI - Headless UI components (React)

## 6. Performance Considerations

### 6.1 Bundle Size Impact

**Critical Metrics**:
- Activation time: Should be < 100ms
- Bundle size: Should be < 1MB
- Memory footprint: Should be < 50MB

**GitLens Example** (before/after bundling):
- Before: 6.2MB, slow activation
- After: 840KB, 50% faster activation

**Docker Extension Example**:
- Before: 3.5s activation (cold: 20s)
- After: <2s activation (cold: 2s)

**Key Takeaway**: Always bundle extensions with esbuild or webpack.

### 6.2 Activation Events

**Avoid**:
```json
"activationEvents": ["onStartup"]  // BAD: loads every VS Code launch
```

**Prefer**:
```json
"activationEvents": [
  "onCommand:yoyo.planProduct",
  "onView:yoyoDevTaskView",
  "workspaceContains:.yoyo-dev"
]
```

**Lazy Loading Pattern**:
```typescript
class YoyoExtension {
  private _gitService?: GitService;

  get gitService(): GitService {
    if (!this._gitService) {
      this._gitService = new GitService();
    }
    return this._gitService;
  }
}
```

### 6.3 Memory Management

**Best Practices**:

1. **Dispose resources properly**:
```typescript
export function activate(context: vscode.ExtensionContext) {
  const disposables: vscode.Disposable[] = [];

  disposables.push(vscode.commands.registerCommand(...));
  disposables.push(vscode.workspace.onDidChangeTextDocument(...));

  context.subscriptions.push(...disposables);
}
```

2. **Limit tree view items**:
```typescript
class TaskTreeDataProvider implements vscode.TreeDataProvider<TaskItem> {
  getChildren(element?: TaskItem): TaskItem[] {
    // Limit to 100 items, paginate rest
    return this.tasks.slice(0, 100);
  }
}
```

3. **Debounce expensive operations**:
```typescript
let debounceTimer: NodeJS.Timeout;
watcher.onDidChange((uri) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    this.refresh();
  }, 500);
});
```

4. **Avoid memory leaks in webviews**:
```typescript
webviewPanel.onDidDispose(() => {
  // Clean up listeners, timers, resources
  clearInterval(refreshTimer);
  eventBus.removeAllListeners();
});
```

### 6.4 File Watcher Performance

**Optimization Checklist**:
- [ ] Use non-recursive watchers when possible
- [ ] Watch specific patterns (e.g., `*.md`, `*.json`)
- [ ] Exclude unnecessary directories (done by default: `node_modules`, `.git`)
- [ ] Debounce change events (minimum 500ms)
- [ ] Batch updates when multiple files change
- [ ] Dispose watchers when view is hidden

**Linux Specific**:
- May hit file handle limits with large workspaces
- Monitor with `ulimit -n` and increase if needed
- Consider disabling watchers for very large repos

### 6.5 Webview Performance

**Best Practices**:

1. **Minimize webview usage** - They're expensive
2. **Reuse webview panels** - Don't create multiple
3. **Lazy load webview content** - Only when visible
4. **Use `retainContextWhenHidden: true` carefully** - Increases memory
5. **Optimize bundle size** - Use code splitting
6. **Virtual scrolling** - For long lists

**Example - Reusing Webviews**:
```typescript
class SpecViewProvider {
  private currentPanel?: vscode.WebviewPanel;

  show(spec: Spec): void {
    if (this.currentPanel) {
      this.currentPanel.reveal();
      this.updateContent(spec);
    } else {
      this.currentPanel = vscode.window.createWebviewPanel(...);
    }
  }
}
```

## 7. Recommended Architecture for Yoyo Dev Extension

### 7.1 Extension Structure

```
yoyo-dev-vscode/
├── src/
│   ├── extension.ts              # Entry point
│   ├── container.ts              # DI container
│   ├── services/
│   │   ├── YoyoFileService.ts    # Read .yoyo-dev files
│   │   ├── ClaudeCliService.ts   # Claude Code CLI integration
│   │   ├── GitService.ts         # Git operations
│   │   └── StateService.ts       # Extension state management
│   ├── views/
│   │   ├── TaskTreeView.ts       # Task list tree view
│   │   ├── RoadmapTreeView.ts    # Roadmap tree view
│   │   ├── SpecWebviewProvider.ts # Spec content webview
│   │   └── StatusBarProvider.ts  # Status bar items
│   ├── commands/
│   │   ├── planProduct.ts
│   │   ├── createSpec.ts
│   │   ├── executeTasks.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── fileWatcher.ts
│   │   ├── eventBus.ts
│   │   └── markdown.ts
│   └── test/
│       └── suite/
│           └── extension.test.ts
├── webview-ui/                   # React app for webviews
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── SpecViewer.tsx
│   │   │   ├── TaskList.tsx
│   │   │   └── RoadmapView.tsx
│   │   ├── stores/
│   │   │   └── taskStore.ts
│   │   └── utils/
│   │       └── vscodeApi.ts
│   ├── index.tsx
│   └── styles.css
├── media/                        # Static assets
│   ├── icons/
│   └── styles/
├── esbuild.js                    # esbuild config (extension)
├── esbuild-webview.js            # esbuild config (webview)
├── package.json
├── tsconfig.json
└── README.md
```

### 7.2 Core Components

**1. Sidebar Views** (Tree View + Webview):
- **Tasks Tree View**: Hierarchical task list with checkboxes
- **Roadmap Tree View**: Phases and features
- **Spec Webview**: Rich markdown rendering
- **Git Info Tree View**: Current branch, PR status

**2. Status Bar**:
- Left: Current spec/fix name
- Left: Workflow state (planning, executing, etc.)
- Right: Current task progress

**3. Commands** (Command Palette):
- `/plan-product`
- `/analyze-product`
- `/create-new`
- `/create-spec`
- `/create-fix`
- `/execute-tasks`
- All other yoyo commands

**4. Context Menus**:
- Explorer: "Create Yoyo Spec" (on folders)
- Editor: "Run Yoyo Command" (on markdown files)

### 7.3 Data Flow

```
File System (.yoyo-dev/)
    ↓
File Watcher (debounced)
    ↓
Event Bus (emits events)
    ↓
├── Tree Views (refresh data)
├── Webviews (postMessage)
└── Status Bar (update text)
```

### 7.4 Claude CLI Integration Flow

```
User clicks "Execute Tasks"
    ↓
Command Handler (src/commands/executeTasks.ts)
    ↓
Claude CLI Service (spawns wrapper process)
    ↓
Wrapper Process (IPC communication)
    ↓
Claude Code CLI (subprocess)
    ↓
Output Stream (socket.io / Unix socket)
    ↓
Extension Host (receives updates)
    ↓
├── Output Channel (show logs)
├── Progress Notification (show progress)
└── File Watcher (detects changes)
    ↓
Views Auto-Refresh
```

### 7.5 Minimal Viable Product (MVP) Scope

**Phase 1 - Core Views** (Week 1-2):
- [x] Basic extension scaffold
- [ ] Task tree view (read-only)
- [ ] Roadmap tree view (read-only)
- [ ] Status bar (current spec)
- [ ] File watcher for `.yoyo-dev/`

**Phase 2 - Commands** (Week 3-4):
- [ ] Command palette integration (all slash commands)
- [ ] Context menu integration
- [ ] Terminal integration (spawn Claude CLI)
- [ ] Output channel for logs

**Phase 3 - Rich UI** (Week 5-6):
- [ ] Spec webview (markdown rendering)
- [ ] Task checkboxes (interactive)
- [ ] Git info view
- [ ] Settings integration

**Phase 4 - Advanced** (Week 7+):
- [ ] Real-time CLI output streaming
- [ ] In-editor task annotations
- [ ] Workflow state machine visualization
- [ ] Quick actions (buttons in views)

### 7.6 Key Design Decisions

**1. Tree View vs Webview for Tasks**:
- **Decision**: Use Tree View
- **Rationale**: Native feel, better performance, less code
- **Alternative**: Webview for richer UI (if needed later)

**2. CLI Integration Approach**:
- **Decision**: Start with terminal integration + file watchers
- **Rationale**: Simpler, reliable, works out of the box
- **Future**: IPC wrapper for real-time streaming

**3. State Management**:
- **Decision**: VS Code workspace state + event bus
- **Rationale**: No external dependencies, VS Code native
- **Future**: Add Zustand only if webview state gets complex

**4. Webview Framework**:
- **Decision**: React
- **Rationale**: Team familiarity, ecosystem, debugging tools

**5. Build Tool**:
- **Decision**: esbuild
- **Rationale**: Fast, simple, recommended by VS Code

## 8. Code Examples

### 8.1 Basic Extension Activation

```typescript
// src/extension.ts
import * as vscode from 'vscode';
import { Container } from './container';

export async function activate(context: vscode.ExtensionContext) {
  console.log('Yoyo Dev extension is now active');

  // Initialize container (DI)
  const container = Container.getInstance(context);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.planProduct', async () => {
      await container.commandService.planProduct();
    })
  );

  // Register views
  const taskTreeProvider = container.viewService.taskTreeProvider;
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('yoyoDevTasks', taskTreeProvider)
  );

  // Setup file watchers
  const fileWatcher = container.fileWatcher;
  fileWatcher.start();

  // Show status bar
  const statusBar = container.statusBarProvider;
  statusBar.show();
}

export function deactivate() {
  Container.dispose();
}
```

### 8.2 Task Tree View Provider

```typescript
// src/views/TaskTreeView.ts
import * as vscode from 'vscode';
import { YoyoFileService } from '../services/YoyoFileService';
import { YoyoEventBus } from '../utils/eventBus';

export class TaskTreeViewProvider implements vscode.TreeDataProvider<TaskItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TaskItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private readonly fileService: YoyoFileService,
    private readonly eventBus: YoyoEventBus
  ) {
    // Listen for task updates
    eventBus.on('task:updated', () => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TaskItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TaskItem): Promise<TaskItem[]> {
    if (!element) {
      // Root level - return all specs
      const specs = await this.fileService.getActiveSpecs();
      return specs.map(spec => new TaskItem(
        spec.name,
        vscode.TreeItemCollapsibleState.Collapsed,
        'spec',
        spec
      ));
    } else if (element.type === 'spec') {
      // Spec level - return tasks
      const tasks = await this.fileService.getTasksForSpec(element.data);
      return tasks.map(task => new TaskItem(
        task.title,
        vscode.TreeItemCollapsibleState.None,
        'task',
        task
      ));
    }
    return [];
  }
}

class TaskItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: 'spec' | 'task',
    public readonly data: any
  ) {
    super(label, collapsibleState);

    if (type === 'task') {
      this.iconPath = new vscode.ThemeIcon(
        data.completed ? 'check' : 'circle-outline'
      );
      this.contextValue = 'task';
      this.command = {
        command: 'yoyoDev.showTask',
        title: 'Show Task',
        arguments: [data]
      };
    }
  }
}
```

### 8.3 File Watcher with Debouncing

```typescript
// src/utils/fileWatcher.ts
import * as vscode from 'vscode';
import { YoyoEventBus } from './eventBus';

export class YoyoFileWatcher {
  private watchers: vscode.FileSystemWatcher[] = [];
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly workspaceRoot: string,
    private readonly eventBus: YoyoEventBus
  ) {}

  start(): void {
    const pattern = new vscode.RelativePattern(
      this.workspaceRoot,
      '.yoyo-dev/**/*.{md,json,yml}'
    );

    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcher.onDidChange((uri) => this.handleChange(uri));
    watcher.onDidCreate((uri) => this.handleCreate(uri));
    watcher.onDidDelete((uri) => this.handleDelete(uri));

    this.watchers.push(watcher);
  }

  private handleChange(uri: vscode.Uri): void {
    const path = uri.fsPath;

    // Debounce (500ms)
    if (this.debounceTimers.has(path)) {
      clearTimeout(this.debounceTimers.get(path)!);
    }

    const timer = setTimeout(() => {
      this.processChange(uri);
      this.debounceTimers.delete(path);
    }, 500);

    this.debounceTimers.set(path, timer);
  }

  private processChange(uri: vscode.Uri): void {
    const relative = vscode.workspace.asRelativePath(uri);

    if (relative.includes('tasks.md')) {
      this.eventBus.emit('task:updated', { uri });
    } else if (relative.includes('roadmap.md')) {
      this.eventBus.emit('roadmap:updated', { uri });
    } else if (relative.endsWith('state.json')) {
      this.eventBus.emit('workflow:state:changed', { uri });
    }
  }

  dispose(): void {
    this.watchers.forEach(w => w.dispose());
    this.debounceTimers.forEach(t => clearTimeout(t));
  }
}
```

### 8.4 Command Handler

```typescript
// src/commands/planProduct.ts
import * as vscode from 'vscode';
import { ClaudeCliService } from '../services/ClaudeCliService';

export async function planProduct(
  claudeService: ClaudeCliService
): Promise<void> {
  // Show progress notification
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Planning Product',
      cancellable: true
    },
    async (progress, token) => {
      progress.report({ message: 'Starting Claude Code...' });

      try {
        // Execute command via terminal
        const terminal = vscode.window.createTerminal('Yoyo Dev');
        terminal.sendText('claude /plan-product');
        terminal.show();

        progress.report({ message: 'Running /plan-product...' });

        // Watch for completion
        await claudeService.waitForCompletion(token);

        vscode.window.showInformationMessage('Product planning complete!');
      } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
      }
    }
  );
}
```

### 8.5 Webview with Message Passing

```typescript
// src/views/SpecWebviewProvider.ts
import * as vscode from 'vscode';
import * as path from 'path';

export class SpecWebviewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    webviewView.webview.html = this.getHtmlContent(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'openFile':
          vscode.commands.executeCommand('vscode.open', vscode.Uri.file(message.path));
          break;
        case 'runCommand':
          vscode.commands.executeCommand(message.command);
          break;
      }
    });
  }

  public updateSpec(spec: Spec): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'updateSpec',
        spec: spec
      });
    }
  }

  private getHtmlContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'styles.css')
    );
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 style-src ${webview.cspSource} 'unsafe-inline';
                 script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
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

### 8.6 React Webview Component

```typescript
// webview-ui/src/App.tsx
import React, { useEffect, useState } from 'react';
import { SpecViewer } from './components/SpecViewer';

// Get VS Code API
const vscode = acquireVsCodeApi();

interface Spec {
  name: string;
  content: string;
  tasks: Task[];
}

export const App: React.FC = () => {
  const [spec, setSpec] = useState<Spec | null>(null);

  useEffect(() => {
    // Handle messages from extension
    window.addEventListener('message', (event) => {
      const message = event.data;
      switch (message.type) {
        case 'updateSpec':
          setSpec(message.spec);
          break;
      }
    });
  }, []);

  const handleOpenFile = (path: string) => {
    vscode.postMessage({
      type: 'openFile',
      path: path
    });
  };

  const handleRunCommand = (command: string) => {
    vscode.postMessage({
      type: 'runCommand',
      command: command
    });
  };

  if (!spec) {
    return <div className="empty">No spec selected</div>;
  }

  return (
    <div className="app">
      <SpecViewer
        spec={spec}
        onOpenFile={handleOpenFile}
        onRunCommand={handleRunCommand}
      />
    </div>
  );
};
```

## 9. Next Steps

### 9.1 Immediate Actions

1. **Scaffold Extension**:
   ```bash
   npm install -g yo generator-code
   yo code
   # Select: New Extension (TypeScript)
   ```

2. **Setup Build System**:
   - Install esbuild
   - Create `esbuild.js` config
   - Configure npm scripts

3. **Implement MVP Phase 1**:
   - Basic task tree view (read-only)
   - File watcher for `.yoyo-dev/`
   - Status bar with current spec

4. **Test in VS Code & Cursor**:
   - F5 to launch Extension Development Host
   - Test basic functionality
   - Verify Cursor compatibility

### 9.2 Research Gaps

**Still need to investigate**:
1. VS Code language server integration (for intelligent task parsing)
2. Extension marketplaceublishing process
3. Extension telemetry and analytics (if desired)
4. Multi-root workspace support
5. Remote development support (SSH, containers)

### 9.3 Resources

**Official Documentation**:
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Guides](https://code.visualstudio.com/api/extension-guides/overview)
- [UX Guidelines](https://code.visualstudio.com/api/ux-guidelines/overview)

**Examples**:
- [VS Code Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [GitLens Source](https://github.com/gitkraken/vscode-gitlens)
- [Error Lens Source](https://github.com/usernamehw/vscode-error-lens)

**Tools**:
- [Extension Generator](https://github.com/microsoft/vscode-generator-code)
- [vsce - Publishing Tool](https://github.com/microsoft/vscode-vsce)
- [@vscode/test-electron](https://github.com/microsoft/vscode-test)

## 10. Conclusion

VS Code provides a comprehensive extension API that perfectly suits yoyo-dev's needs. The recommended architecture uses:

- **Tree views** for tasks and roadmap (native, performant)
- **Webviews** for rich spec content (React-based)
- **File watchers** for real-time updates (debounced)
- **Terminal integration** for Claude CLI (simple, reliable)
- **esbuild** for bundling (fast, modern)
- **TypeScript** for type safety (VS Code native)

The extension will be fully compatible with both VS Code and Cursor, providing a seamless experience across editors.

**Key Success Factors**:
1. Keep activation time < 100ms
2. Bundle with esbuild for performance
3. Use non-recursive file watchers
4. Debounce all updates (500ms minimum)
5. Follow VS Code UX guidelines
6. Dispose resources properly

**Estimated Development Time**: 6-8 weeks for full MVP (all 4 phases)

---

*End of Research Document*
