# Task Breakdown: Yoyo Dev VS Code Extension

## Overview

Transform Yoyo Dev from TUI-based dashboard to native VS Code/Cursor extension while preserving all 16 workflows, specialized agents, and systematic development framework.

**Total Tasks**: 48 tasks organized in 13 groups
**Estimated Timeline**: 8 weeks MVP (Phases 1-2), 12 weeks full feature set (Phases 1-4)
**Target Bundle Size**: <1MB
**Target Activation Time**: <100ms

## Project Phases

- **Phase 1: Foundation (Weeks 1-2)** - Core infrastructure, basic views, command integration
- **Phase 2: Core Features (Weeks 3-4)** - Interactive features, webview, terminal integration
- **Phase 3: Rich UI (Weeks 5-6)** - Advanced features, polish, performance
- **Phase 4: Quality & Launch (Weeks 7-8)** - Testing, documentation, publishing

---

## Task Groups

### Task Group 1: Project Setup & Scaffolding

**Dependencies**: None
**Phase**: 1
**Complexity**: M

#### Task 1.1: Initialize Extension Project Structure ✅

**Description**: Set up TypeScript extension project with esbuild configuration

**Acceptance Criteria**:
- [x] Extension directory created with standard VS Code structure
- [x] package.json configured with metadata, engines, activation events
- [x] TypeScript configured with strict mode and ES2020 target
- [x] esbuild configuration for extension (src/extension.ts)
- [x] esbuild configuration for webview (webview-ui/)
- [x] ESLint configured with VS Code extension rules
- [x] .vscodeignore configured for marketplace publishing

**Dependencies**: None

**Complexity**: M

**Files Affected**:
- package.json
- tsconfig.json
- esbuild.js
- esbuild-webview.js
- .eslintrc.json
- .vscodeignore

**Parallel Safe**: Yes

**Testing**:
- Unit: N/A (configuration files)
- Integration: Verify build completes without errors
- Manual: Run `npm run compile` and check dist/ output

**Notes**: Use VS Code extension generator as starting template but customize for esbuild

---

#### Task 1.2: Create Development Environment Configuration ✅

**Description**: Set up debug launch configuration and development tasks

**Acceptance Criteria**:
- [x] .vscode/launch.json configured for extension debugging
- [x] .vscode/tasks.json configured for compile and watch tasks
- [x] Debug configuration launches extension host correctly
- [x] Test configuration runs Mocha tests in extension host
- [x] Watch mode works for both extension and webview

**Dependencies**: 1.1

**Complexity**: S

**Files Affected**:
- .vscode/launch.json
- .vscode/tasks.json

**Parallel Safe**: Yes

**Testing**:
- Unit: N/A (configuration)
- Integration: N/A
- Manual: Launch debugger and verify breakpoints work

---

#### Task 1.3: Implement Dependency Injection Container ✅

**Description**: Create Container class with lazy loading for service management

**Acceptance Criteria**:
- [x] Container class with singleton pattern
- [x] Lazy loading getters for all services
- [x] Service initialization deferred until first access
- [x] Container provides: fileService, claudeService, gitService, stateService
- [x] Container disposed properly on extension deactivation

**Dependencies**: 1.1

**Complexity**: M

**Files Affected**:
- src/container.ts
- src/extension.ts

**Parallel Safe**: Yes

**Testing**:
- Unit: Test lazy loading (service not initialized until accessed)
- Unit: Test singleton pattern (same instance returned)
- Integration: N/A
- Manual: Verify activation time <100ms

---

### Task Group 2: Core Extension Infrastructure

**Dependencies**: Task Group 1
**Phase**: 1
**Complexity**: L

#### Task 2.1: Implement Extension Activation and Lifecycle

**Description**: Create main extension entry point with proper activation/deactivation

**Acceptance Criteria**:
- [ ] extension.ts exports activate() and deactivate() functions
- [ ] Activation events: workspaceContains:.yoyo-dev, onCommand:yoyoDev.*, onView:yoyoDevTasks
- [ ] Container initialized on activation
- [ ] EventBus initialized and available globally
- [ ] All services properly disposed on deactivation
- [ ] Activation completes in <100ms (measured)

**Dependencies**: 1.3

**Complexity**: M

**Files Affected**:
- src/extension.ts
- package.json (activation events)

**Parallel Safe**: No

**Testing**:
- Unit: Test activate() initializes container
- Unit: Test deactivate() disposes services
- Integration: Test extension activates when .yoyo-dev present
- Manual: Open VS Code in yoyo-dev project, verify extension activates

---

#### Task 2.2: Create EventBus for Cross-Component Communication

**Description**: Implement event-driven architecture with typed events

**Acceptance Criteria**:
- [ ] EventBus extends Node EventEmitter
- [ ] Singleton pattern for global access
- [ ] Typed event constants: TASK_UPDATED, ROADMAP_UPDATED, SPEC_CHANGED, WORKFLOW_STATE_CHANGED, GIT_STATUS_CHANGED
- [ ] Helper methods: emitTaskUpdated, emitRoadmapUpdated, etc.
- [ ] Events include timestamp and relevant metadata

**Dependencies**: 1.3

**Complexity**: M

**Files Affected**:
- src/utils/EventBus.ts

**Parallel Safe**: Yes

**Testing**:
- Unit: Test event emission and subscription
- Unit: Test singleton pattern
- Unit: Test event metadata structure
- Integration: N/A
- Manual: Verify events fire when files change

---

#### Task 2.3: Implement Logger with Output Channel

**Description**: Create centralized logging service for debugging and user feedback

**Acceptance Criteria**:
- [ ] Logger class with Output Channel named "Yoyo Dev"
- [ ] Log levels: debug, info, warn, error
- [ ] Timestamp and context included in log messages
- [ ] show() method to reveal Output Channel
- [ ] Logs written to channel and optionally console in dev mode

**Dependencies**: 2.1

**Complexity**: S

**Files Affected**:
- src/utils/Logger.ts

**Parallel Safe**: Yes

**Testing**:
- Unit: Test log message formatting
- Unit: Test log level filtering
- Integration: N/A
- Manual: Verify logs appear in Output Channel

---

### Task Group 3: File System Integration

**Dependencies**: Task Group 2
**Phase**: 1
**Complexity**: L

#### Task 3.1: Create File Parsers for Yoyo Dev Files

**Description**: Implement parsers for tasks.md, roadmap.md, state.json, spec.md

**Acceptance Criteria**:
- [ ] TasksParser extracts task hierarchy, completion status, metadata
- [ ] TasksParser handles nested tasks (parent/child relationships)
- [ ] RoadmapParser extracts phases, features, completion percentages
- [ ] StateParser reads state.json and returns WorkflowState model
- [ ] MarkdownParser extracts spec sections (Goal, Requirements, etc.)
- [ ] All parsers handle malformed input gracefully

**Dependencies**: 2.1

**Complexity**: L

**Files Affected**:
- src/parsers/TasksParser.ts
- src/parsers/RoadmapParser.ts
- src/parsers/StateParser.ts
- src/parsers/MarkdownParser.ts
- src/models/Task.ts
- src/models/Spec.ts
- src/models/Roadmap.ts
- src/models/WorkflowState.ts

**Parallel Safe**: Yes

**Testing**:
- Unit: Test TasksParser with sample tasks.md (2-3 tests)
- Unit: Test RoadmapParser with sample roadmap.md (2-3 tests)
- Unit: Test StateParser with sample state.json (2 tests)
- Unit: Test error handling for malformed files (2 tests)
- Integration: N/A
- Manual: Parse actual yoyo-dev files and verify output

**Notes**: Reference existing file formats in .yoyo-dev/ for test cases

---

#### Task 3.2: Implement YoyoFileService

**Description**: Create service to read and cache .yoyo-dev files

**Acceptance Criteria**:
- [ ] getActiveSpecs() returns all specs in .yoyo-dev/specs/
- [ ] getTasksForSpec(spec) returns parsed tasks for given spec
- [ ] getRoadmap() returns parsed roadmap.md
- [ ] getCurrentSpec() returns active spec from state.json
- [ ] getMissionLite() returns condensed mission for context
- [ ] Results cached with 5-second TTL to reduce I/O
- [ ] invalidateCache() method to force refresh

**Dependencies**: 3.1

**Complexity**: M

**Files Affected**:
- src/services/YoyoFileService.ts

**Parallel Safe**: Yes

**Testing**:
- Unit: Test file reading and parsing integration (2-3 tests)
- Unit: Test caching behavior (2 tests)
- Integration: Test with actual .yoyo-dev directory
- Manual: Verify file reads don't block UI

---

#### Task 3.3: Implement File Watcher with Debouncing

**Description**: Watch .yoyo-dev files and emit events on changes

**Acceptance Criteria**:
- [ ] Watch patterns: .yoyo-dev/specs/**/tasks.md, **/state.json, **/spec.md, product/roadmap.md
- [ ] Debounce all changes with 500ms delay (configurable)
- [ ] Emit appropriate EventBus events on file changes
- [ ] Handle file create, change, and delete events
- [ ] Extract spec name from file path for event metadata
- [ ] Dispose watchers properly on deactivation

**Dependencies**: 2.2, 3.2

**Complexity**: M

**Files Affected**:
- src/utils/FileWatcher.ts

**Parallel Safe**: Yes

**Testing**:
- Unit: Test debounce logic (2 tests)
- Unit: Test event emission on file change (2-3 tests)
- Integration: Test with actual file system changes
- Manual: Modify tasks.md and verify views refresh

---

### Task Group 4: Task Tree View

**Dependencies**: Task Group 3
**Phase**: 1
**Complexity**: L

#### Task 4.1: Create Task Tree Data Provider

**Description**: Implement TreeDataProvider for hierarchical task display

**Acceptance Criteria**:
- [ ] TaskTreeProvider implements vscode.TreeDataProvider<TaskTreeItem>
- [ ] Root level returns SpecTreeItem for each active spec
- [ ] Spec level returns TaskTreeItem for each task
- [ ] Task level returns children if task has subtasks
- [ ] Refresh triggered by EventBus.TASK_UPDATED event
- [ ] Tree items show completion status with appropriate icons

**Dependencies**: 3.1, 3.2

**Complexity**: M

**Files Affected**:
- src/providers/TaskTreeProvider.ts
- src/models/TreeItems.ts

**Parallel Safe**: Yes (independent of other providers)

**Testing**:
- Unit: Test getChildren returns correct hierarchy (3-4 tests)
- Unit: Test refresh updates tree (2 tests)
- Integration: Test with sample spec data
- Manual: Verify tree displays correctly in sidebar

---

#### Task 4.2: Register Task Tree View in Extension

**Description**: Wire task tree view into extension activation

**Acceptance Criteria**:
- [ ] View container "yoyoDev" added to activity bar with custom icon
- [ ] View "yoyoDevTasks" registered under yoyoDev container
- [ ] TaskTreeProvider created and registered in activate()
- [ ] View refresh command registered and wired to provider
- [ ] Task count badge shows on activity bar icon
- [ ] Context menu items registered for task actions

**Dependencies**: 4.1

**Complexity**: M

**Files Affected**:
- src/extension.ts
- package.json (contributes.viewsContainers, contributes.views)
- media/icons/yoyo-dev.svg

**Parallel Safe**: No (modifies extension.ts)

**Testing**:
- Unit: N/A (mostly configuration)
- Integration: Test view appears in activity bar
- Manual: Click activity bar icon, verify task tree loads

---

#### Task 4.3: Implement Task Context Menu Actions

**Description**: Add right-click actions for tasks (Execute, Mark Complete, Open)

**Acceptance Criteria**:
- [ ] "Execute Task" command registered and added to context menu
- [ ] "Mark Complete" command toggles checkbox in tasks.md
- [ ] "Open in Editor" command opens tasks.md at task line
- [ ] Context menu items show only for task items (not specs)
- [ ] Commands handle errors gracefully (task not found, file read-only)

**Dependencies**: 4.2

**Complexity**: M

**Files Affected**:
- src/commands/taskActions.ts
- package.json (contributes.commands, contributes.menus)

**Parallel Safe**: Yes

**Testing**:
- Unit: Test mark complete updates tasks.md (2 tests)
- Unit: Test error handling (2 tests)
- Integration: Test context menu appears and actions work
- Manual: Right-click task, verify actions work

---

### Task Group 5: Roadmap Tree View

**Dependencies**: Task Group 3
**Phase**: 1
**Complexity**: M

#### Task 5.1: Create Roadmap Tree Data Provider

**Description**: Implement TreeDataProvider for roadmap phases and features

**Acceptance Criteria**:
- [ ] RoadmapTreeProvider implements vscode.TreeDataProvider
- [ ] Root level returns PhaseTreeItem for each roadmap phase
- [ ] Phase level returns FeatureTreeItem for each feature
- [ ] Tree items show completion status (checkmark, gear, circle icons)
- [ ] Tree items show progress percentage in description
- [ ] Refresh triggered by EventBus.ROADMAP_UPDATED event

**Dependencies**: 3.1, 3.2

**Complexity**: M

**Files Affected**:
- src/providers/RoadmapTreeProvider.ts

**Parallel Safe**: Yes (independent of task tree)

**Testing**:
- Unit: Test getChildren returns phases and features (3 tests)
- Unit: Test progress calculation (2 tests)
- Integration: Test with sample roadmap data
- Manual: Verify roadmap displays correctly

---

#### Task 5.2: Register Roadmap Tree View in Extension

**Description**: Wire roadmap tree view into extension activation

**Acceptance Criteria**:
- [ ] View "yoyoDevRoadmap" registered under yoyoDev container
- [ ] RoadmapTreeProvider created and registered
- [ ] View refresh command registered
- [ ] Context menu items: "Create Spec", "View Spec", "Edit Roadmap"
- [ ] Overall progress shown in view title

**Dependencies**: 5.1

**Complexity**: S

**Files Affected**:
- src/extension.ts
- package.json (contributes.views, contributes.commands)

**Parallel Safe**: No (modifies extension.ts)

**Testing**:
- Unit: N/A
- Integration: Test view appears below tasks
- Manual: Verify roadmap tree displays

---

#### Task 5.3: Implement Roadmap Context Menu Actions

**Description**: Add actions to create specs from roadmap features

**Acceptance Criteria**:
- [ ] "Create Spec" command launches /create-spec with feature name
- [ ] "View Spec" command opens spec.md if spec exists
- [ ] "Edit Roadmap" command opens roadmap.md in editor
- [ ] Commands check for spec existence before showing "View Spec"
- [ ] Feature name passed as context to /create-spec

**Dependencies**: 5.2

**Complexity**: M

**Files Affected**:
- src/commands/roadmapActions.ts
- package.json (contributes.menus)

**Parallel Safe**: Yes

**Testing**:
- Unit: Test spec existence check (2 tests)
- Integration: Test creating spec from feature
- Manual: Right-click feature, create spec, verify workflow starts

---

### Task Group 6: Status Bar Integration

**Dependencies**: Task Group 3
**Phase**: 1
**Complexity**: M

#### Task 6.1: Create StatusBarProvider Service

**Description**: Manage status bar items for current spec and progress

**Acceptance Criteria**:
- [ ] Left status bar item: current spec name with folder icon
- [ ] Left status bar item: workflow state with appropriate icon and color
- [ ] Right status bar item: task progress (e.g., "8/12 tasks")
- [ ] Items update when EventBus events fire (SPEC_CHANGED, TASK_UPDATED, WORKFLOW_STATE_CHANGED)
- [ ] Items hidden when no active spec detected
- [ ] Click behavior: spec name opens spec.md, progress focuses task view

**Dependencies**: 3.2

**Complexity**: M

**Files Affected**:
- src/providers/StatusBarProvider.ts

**Parallel Safe**: Yes

**Testing**:
- Unit: Test status bar updates on events (3-4 tests)
- Unit: Test visibility logic (2 tests)
- Integration: Test click behavior
- Manual: Verify status bar shows correct info

---

#### Task 6.2: Register Status Bar Items in Extension

**Description**: Wire status bar provider into extension activation

**Acceptance Criteria**:
- [ ] StatusBarProvider created in activate()
- [ ] Status bar items created with correct priorities
- [ ] Items disposed on deactivation
- [ ] Tooltips show detailed info on hover
- [ ] Commands registered for click actions

**Dependencies**: 6.1

**Complexity**: S

**Files Affected**:
- src/extension.ts

**Parallel Safe**: No (modifies extension.ts)

**Testing**:
- Unit: N/A
- Integration: Test status bar appears
- Manual: Click status items, verify actions

---

### Task Group 7: Command Integration

**Dependencies**: Task Group 2
**Phase**: 1
**Complexity**: L

#### Task 7.1: Implement ClaudeCliService

**Description**: Create service to execute Claude Code CLI commands in integrated terminal

**Acceptance Criteria**:
- [ ] executeCommand(command, args) sends command to terminal
- [ ] Terminal named "Yoyo Dev" created or reused
- [ ] Terminal auto-focused when command executes
- [ ] Terminal cwd set to workspace root
- [ ] waitForCompletion(stateFilePath) monitors state.json for workflow completion
- [ ] Cancellation token support for interrupting workflows

**Dependencies**: 2.1

**Complexity**: M

**Files Affected**:
- src/services/ClaudeCliService.ts

**Parallel Safe**: Yes

**Testing**:
- Unit: Test terminal creation and reuse (2 tests)
- Unit: Test command formatting (2 tests)
- Integration: Test actual Claude CLI execution (if available)
- Manual: Run command, verify terminal shows output

---

#### Task 7.2: Register All 16 Slash Commands

**Description**: Create command handlers for all Yoyo Dev workflows

**Acceptance Criteria**:
- [ ] Commands registered: planProduct, analyzeProduct, createNew, createSpec, createTasks, executeTasks, createFix, orchestrateTasks
- [ ] Commands registered: designInit, designAudit, designFix, designComponent, review, containerize, improveSkills, yoyo-help
- [ ] All commands prefixed with "Yoyo Dev:" in command palette
- [ ] Each command handler calls ClaudeCliService.executeCommand()
- [ ] Commands show only when .yoyo-dev exists (activation context)
- [ ] Flags supported (e.g., /execute-tasks --devil)

**Dependencies**: 7.1

**Complexity**: L

**Files Affected**:
- src/commands/index.ts
- src/commands/planProduct.ts
- src/commands/createNew.ts
- src/commands/executeTasks.ts
- src/commands/review.ts
- [... 12 more command files]
- package.json (contributes.commands)

**Parallel Safe**: Yes (each command file independent)

**Testing**:
- Unit: Test command registration (2 tests)
- Unit: Test flag parsing (2-3 tests)
- Integration: Test command execution flow
- Manual: Run each command via command palette

**Notes**: Commands can be implemented in parallel once ClaudeCliService is complete

---

### Task Group 8: Spec Webview

**Dependencies**: Task Group 3
**Phase**: 2
**Complexity**: L

#### Task 8.1: Create React Webview UI

**Description**: Build React app for spec content display with markdown rendering

**Acceptance Criteria**:
- [ ] React app scaffolded in webview-ui/
- [ ] SpecViewer component renders markdown with marked library
- [ ] Navigation component shows spec sections (Goal, Requirements, etc.)
- [ ] Navigation sticky positioned on left side
- [ ] Click section scrolls to section in content
- [ ] useVsCodeApi hook for extension messaging
- [ ] Dark/light theme support based on VS Code theme

**Dependencies**: 3.1

**Complexity**: L

**Files Affected**:
- webview-ui/src/App.tsx
- webview-ui/src/components/SpecViewer.tsx
- webview-ui/src/components/Navigation.tsx
- webview-ui/src/hooks/useVsCodeApi.ts
- webview-ui/src/styles/main.css

**Parallel Safe**: Yes (independent of extension code)

**Testing**:
- Unit: Test markdown rendering (2-3 tests)
- Unit: Test navigation behavior (2 tests)
- Integration: Test messaging with extension
- Manual: Render sample spec.md and verify display

---

#### Task 8.2: Implement SpecWebviewProvider

**Description**: Create webview provider to host React app in VS Code panel

**Acceptance Criteria**:
- [ ] SpecWebviewProvider implements vscode.WebviewViewProvider
- [ ] Webview HTML includes React bundle with CSP nonce
- [ ] postMessage sends spec content to webview
- [ ] onDidReceiveMessage handles webview actions (openFile, createTasks, executeTasks)
- [ ] Webview refreshes when EventBus.SPEC_CHANGED fires
- [ ] Content Security Policy configured correctly

**Dependencies**: 8.1

**Complexity**: M

**Files Affected**:
- src/providers/SpecWebviewProvider.ts

**Parallel Safe**: Yes

**Testing**:
- Unit: Test message handling (3-4 tests)
- Unit: Test CSP nonce generation (1 test)
- Integration: Test webview updates on spec change
- Manual: Open spec, verify content displays

---

#### Task 8.3: Register Spec Webview in Extension

**Description**: Wire spec webview into extension activation

**Acceptance Criteria**:
- [ ] View "yoyoDevCurrentSpec" registered as webview type
- [ ] SpecWebviewProvider created and registered
- [ ] Webview appears below roadmap in sidebar
- [ ] Quick action buttons: "View Spec", "Execute Tasks", "Edit Spec"
- [ ] Empty state shown when no active spec

**Dependencies**: 8.2

**Complexity**: S

**Files Affected**:
- src/extension.ts
- package.json (contributes.views)

**Parallel Safe**: No (modifies extension.ts)

**Testing**:
- Unit: N/A
- Integration: Test webview appears and loads
- Manual: Verify spec displays in sidebar

---

### Task Group 9: Context Menu Integration

**Dependencies**: Task Group 7
**Phase**: 2
**Complexity**: M

#### Task 9.1: Add Editor Context Menu for Markdown Files

**Description**: Add "Yoyo Dev" submenu to context menu in .yoyo-dev/*.md files

**Acceptance Criteria**:
- [ ] Submenu appears only for markdown files in .yoyo-dev/ directory
- [ ] Submenu items: "Create Tasks", "Execute Tasks", "View in Sidebar", "Open Roadmap"
- [ ] Commands execute appropriate workflow
- [ ] Submenu uses when clause: resourcePath =~ /\\.yoyo-dev\\/.*\\.md$/

**Dependencies**: 7.2

**Complexity**: M

**Files Affected**:
- package.json (contributes.menus.editor/context)
- package.json (contributes.submenus)

**Parallel Safe**: Yes

**Testing**:
- Unit: N/A (configuration)
- Integration: Test context menu appears in correct files
- Manual: Right-click in spec.md, verify submenu

---

#### Task 9.2: Add Explorer Context Menu for Folders

**Description**: Add "Yoyo Dev" submenu to explorer context menu

**Acceptance Criteria**:
- [ ] Submenu items: "Create Spec Here", "Create Fix"
- [ ] "Create Spec Here" passes folder path to /create-spec
- [ ] Submenu appears for all folders
- [ ] Commands handle folder context correctly

**Dependencies**: 7.2

**Complexity**: S

**Files Affected**:
- package.json (contributes.menus.explorer/context)

**Parallel Safe**: Yes

**Testing**:
- Unit: N/A
- Integration: Test context menu in explorer
- Manual: Right-click folder, verify actions work

---

#### Task 9.3: Add CodeLens for Tasks in tasks.md

**Description**: Show inline "Execute Task" annotations above tasks

**Acceptance Criteria**:
- [ ] CodeLens provider registered for tasks.md files
- [ ] "Execute Task" CodeLens above each unchecked task
- [ ] "Mark Complete" CodeLens for unchecked tasks
- [ ] CodeLens shows task metadata (agent, dependencies) on hover
- [ ] CodeLens updates when task status changes

**Dependencies**: 4.3

**Complexity**: M

**Files Affected**:
- src/providers/TaskCodeLensProvider.ts
- package.json (contributes.codeLens)

**Parallel Safe**: Yes

**Testing**:
- Unit: Test CodeLens generation (2-3 tests)
- Integration: Test CodeLens appears in editor
- Manual: Open tasks.md, verify CodeLens shows

---

### Task Group 10: Git Integration

**Dependencies**: Task Group 2
**Phase**: 2
**Complexity**: M

#### Task 10.1: Implement GitService

**Description**: Create service to read git status and branch info

**Acceptance Criteria**:
- [ ] getCurrentBranch() returns branch name
- [ ] getStatus() returns dirty file count and uncommitted changes
- [ ] getRemoteStatus() returns ahead/behind commit counts
- [ ] All operations use VS Code Git extension API when available
- [ ] Fallback to git CLI if extension not available
- [ ] Results cached with 10-second TTL

**Dependencies**: 2.1

**Complexity**: M

**Files Affected**:
- src/services/GitService.ts

**Parallel Safe**: Yes

**Testing**:
- Unit: Test git status parsing (2-3 tests)
- Integration: Test with actual git repo
- Manual: Verify git info accuracy

---

#### Task 10.2: Create Git Info Tree View

**Description**: Display git status in sidebar panel

**Acceptance Criteria**:
- [ ] GitTreeProvider shows current branch
- [ ] Shows uncommitted changes count
- [ ] Shows ahead/behind status vs remote
- [ ] Quick action buttons: "Commit", "Push"
- [ ] Refreshes when EventBus.GIT_STATUS_CHANGED fires
- [ ] Clean state shows "Working directory clean"

**Dependencies**: 10.1

**Complexity**: M

**Files Affected**:
- src/providers/GitTreeProvider.ts

**Parallel Safe**: Yes

**Testing**:
- Unit: Test tree generation (2 tests)
- Integration: Test with dirty working directory
- Manual: Make changes, verify status updates

---

#### Task 10.3: Register Git View in Extension

**Description**: Wire git view into extension activation

**Acceptance Criteria**:
- [ ] View "yoyoDevGit" registered
- [ ] GitTreeProvider created and registered
- [ ] View appears below current spec panel
- [ ] File watcher monitors .git/ directory
- [ ] Commands registered for commit and push actions

**Dependencies**: 10.2

**Complexity**: S

**Files Affected**:
- src/extension.ts
- package.json (contributes.views)

**Parallel Safe**: No (modifies extension.ts)

**Testing**:
- Unit: N/A
- Integration: Test view appears
- Manual: Verify git status displays

---

### Task Group 11: Settings and Configuration

**Dependencies**: Task Group 2
**Phase**: 2
**Complexity**: M

#### Task 11.1: Implement ConfigService

**Description**: Read and parse config.yml settings

**Acceptance Criteria**:
- [ ] ConfigService reads .yoyo-dev/config.yml
- [ ] Parses config to TypeScript configuration object
- [ ] Provides getters for all config sections
- [ ] Merged with VS Code extension settings (extension overrides config.yml)
- [ ] Validation for required fields
- [ ] Defaults provided for missing values

**Dependencies**: 2.1

**Complexity**: M

**Files Affected**:
- src/services/ConfigService.ts

**Parallel Safe**: Yes

**Testing**:
- Unit: Test config parsing (2-3 tests)
- Unit: Test defaults and validation (2 tests)
- Integration: Test with actual config.yml
- Manual: Verify config values used correctly

---

#### Task 11.2: Expose Settings in VS Code Settings UI

**Description**: Register extension settings in package.json

**Acceptance Criteria**:
- [ ] Settings registered: autoRefresh, debounceDelay, maxTreeItems
- [ ] Settings registered: parallelExecution, designSystemEnabled
- [ ] Settings UI shows descriptions and defaults
- [ ] Settings changes trigger appropriate refreshes
- [ ] Settings override config.yml values when set

**Dependencies**: 11.1

**Complexity**: S

**Files Affected**:
- package.json (contributes.configuration)
- src/services/StateService.ts

**Parallel Safe**: Yes

**Testing**:
- Unit: Test setting access (2 tests)
- Integration: Test changing settings and verifying behavior
- Manual: Open settings, verify UI

---

### Task Group 12: Advanced Features

**Dependencies**: Task Groups 4-11
**Phase**: 3
**Complexity**: L

#### Task 12.1: Implement Keyboard Shortcuts

**Description**: Register default keyboard shortcuts for common actions

**Acceptance Criteria**:
- [ ] Cmd+Shift+Y: Open Yoyo Dev sidebar
- [ ] Cmd+Shift+T: Focus tasks view
- [ ] Cmd+Shift+R: Focus roadmap view
- [ ] Cmd+Shift+E: Execute next task
- [ ] Cmd+Shift+N: Create new spec
- [ ] All shortcuts customizable via VS Code keybindings
- [ ] Shortcuts documented in README

**Dependencies**: 7.2

**Complexity**: S

**Files Affected**:
- package.json (contributes.keybindings)

**Parallel Safe**: Yes

**Testing**:
- Unit: N/A (configuration)
- Integration: Test shortcuts trigger commands
- Manual: Press shortcuts, verify actions

---

#### Task 12.2: Add Progress Notifications for Long-Running Workflows

**Description**: Show progress notifications during workflow execution

**Acceptance Criteria**:
- [ ] Progress notification shown when workflow starts
- [ ] Notification updates with current step (parsed from state.json)
- [ ] Progress bar shows percentage complete
- [ ] Cancel button sends cancellation signal
- [ ] Success notification on completion with "View Recap" action
- [ ] Error notification on failure with "View Logs" action

**Dependencies**: 7.1

**Complexity**: M

**Files Affected**:
- src/services/ClaudeCliService.ts
- src/services/NotificationService.ts

**Parallel Safe**: Yes

**Testing**:
- Unit: Test notification creation (2 tests)
- Unit: Test progress updates (2 tests)
- Integration: Test with actual workflow
- Manual: Run /execute-tasks, verify notifications

---

#### Task 12.3: Implement Real-Time CLI Output Streaming (Optional)

**Description**: Stream Claude CLI output to Output Channel with progress parsing

**Acceptance Criteria**:
- [ ] Output Channel "Yoyo Dev" receives CLI output in real-time
- [ ] Output parsed for progress indicators (step X of Y)
- [ ] Workflow completion detected from output
- [ ] Error messages highlighted in output
- [ ] Output timestamped

**Dependencies**: 7.1

**Complexity**: M

**Files Affected**:
- src/services/ClaudeCliService.ts
- src/utils/OutputParser.ts

**Parallel Safe**: Yes

**Testing**:
- Unit: Test output parsing (3-4 tests)
- Integration: Test with actual CLI execution
- Manual: Run workflow, verify output streams

**Notes**: Priority 3 feature, defer if time constrained

---

#### Task 12.4: Add View Title Actions and Quick Filters

**Description**: Add inline actions to view titles for common operations

**Acceptance Criteria**:
- [ ] Tasks view title: Refresh, Create Task, Execute Next icons
- [ ] Roadmap view title: Refresh, Edit, Add Phase icons
- [ ] Current Spec panel: Quick action buttons (View Spec, Execute, Edit)
- [ ] Git view: Commit, Push buttons
- [ ] Icons use VS Code Codicons
- [ ] Actions enabled/disabled based on context

**Dependencies**: 4.2, 5.2, 8.3, 10.3

**Complexity**: M

**Files Affected**:
- package.json (contributes.menus.view/title)

**Parallel Safe**: Yes

**Testing**:
- Unit: N/A (configuration)
- Integration: Test actions trigger commands
- Manual: Click view title icons, verify actions

---

### Task Group 13: Testing & Quality

**Dependencies**: Task Groups 1-12
**Phase**: 4
**Complexity**: L

#### Task 13.1: Write Unit Tests for Core Functionality

**Description**: Create comprehensive unit test suite

**Acceptance Criteria**:
- [ ] Tests for all parsers (TasksParser, RoadmapParser, StateParser)
- [ ] Tests for EventBus event handling
- [ ] Tests for FileWatcher debouncing
- [ ] Tests for TreeDataProviders
- [ ] Tests for command execution flow
- [ ] All tests pass with 80%+ code coverage for core logic
- [ ] Test suite runs in <30 seconds

**Dependencies**: 3.1, 3.3, 4.1, 5.1, 7.1

**Complexity**: L

**Files Affected**:
- src/test/suite/parsers/*.test.ts
- src/test/suite/utils/*.test.ts
- src/test/suite/providers/*.test.ts
- src/test/suite/services/*.test.ts

**Parallel Safe**: Yes

**Testing**:
- Unit: Test suite itself (verify test runner works)
- Integration: N/A
- Manual: Run `npm test`, verify all pass

**Notes**: Limit to 30-40 focused tests maximum across all test files

---

#### Task 13.2: Write Integration Tests

**Description**: Test extension in realistic scenarios

**Acceptance Criteria**:
- [ ] Test extension activation in workspace with .yoyo-dev
- [ ] Test command registration and availability
- [ ] Test tree view rendering with sample data
- [ ] Test file watcher triggering view refresh
- [ ] Test webview message passing
- [ ] All integration tests pass consistently

**Dependencies**: 2.1, 4.2, 5.2, 8.3

**Complexity**: M

**Files Affected**:
- src/test/suite/integration/*.test.ts

**Parallel Safe**: Yes

**Testing**:
- Unit: N/A
- Integration: Test suite itself
- Manual: Run integration tests, verify pass

**Notes**: Limit to 15-20 integration tests maximum

---

#### Task 13.3: Performance Optimization and Bundle Size Reduction

**Description**: Optimize extension performance and reduce bundle size

**Acceptance Criteria**:
- [ ] Activation time measured and optimized to <100ms
- [ ] Bundle size <1MB (measure with production build)
- [ ] Tree view refresh doesn't block UI (measured)
- [ ] File operations don't block activation
- [ ] Lazy loading verified for all services
- [ ] Memory leaks checked with extension profiler

**Dependencies**: All previous tasks

**Complexity**: M

**Files Affected**:
- src/container.ts
- src/extension.ts
- esbuild.js

**Parallel Safe**: No (affects all code)

**Testing**:
- Unit: N/A
- Integration: Performance benchmarks
- Manual: Profile extension with VS Code extension profiler

---

#### Task 13.4: Error Handling and Graceful Degradation

**Description**: Ensure extension handles errors gracefully

**Acceptance Criteria**:
- [ ] Centralized ErrorHandler for user-facing errors
- [ ] All async operations wrapped in try-catch
- [ ] Empty states shown when no data available
- [ ] Helpful error messages with action buttons (View Logs, Report Issue)
- [ ] Extension doesn't crash on malformed .yoyo-dev files
- [ ] Claude CLI not installed handled gracefully

**Dependencies**: All previous tasks

**Complexity**: M

**Files Affected**:
- src/utils/ErrorHandler.ts
- All service files (error handling added)

**Parallel Safe**: No (touches many files)

**Testing**:
- Unit: Test error handling paths (5-6 tests)
- Integration: Test with missing/corrupted files
- Manual: Remove .yoyo-dev, verify graceful degradation

---

### Task Group 14: Documentation & Migration

**Dependencies**: Task Group 13
**Phase**: 4
**Complexity**: M

#### Task 14.1: Write Extension README and Usage Guide

**Description**: Create comprehensive documentation for extension

**Acceptance Criteria**:
- [ ] README.md with installation instructions
- [ ] Feature overview with screenshots
- [ ] Command reference for all 16 workflows
- [ ] Keyboard shortcuts documented
- [ ] Troubleshooting section
- [ ] Link to full Yoyo Dev documentation

**Dependencies**: All previous tasks

**Complexity**: M

**Files Affected**:
- README.md
- CHANGELOG.md

**Parallel Safe**: Yes

**Testing**:
- Unit: N/A (documentation)
- Integration: N/A
- Manual: Follow README, verify instructions work

---

#### Task 14.2: Create Migration Guide from TUI to Extension

**Description**: Write guide for existing TUI users to migrate

**Acceptance Criteria**:
- [ ] Side-by-side comparison (TUI vs Extension)
- [ ] Step-by-step migration instructions
- [ ] FAQ for common migration questions
- [ ] Note about TUI/extension coexistence
- [ ] Link to migration plan document

**Dependencies**: 14.1

**Complexity**: S

**Files Affected**:
- docs/migration-guide.md

**Parallel Safe**: Yes

**Testing**:
- Unit: N/A
- Integration: N/A
- Manual: Ask TUI user to follow guide

---

#### Task 14.3: Create Video Demo and Tutorial

**Description**: Record screencast demonstrating extension features

**Acceptance Criteria**:
- [ ] 3-5 minute demo video showing key features
- [ ] Covers: installation, task view, command execution, spec viewer
- [ ] High-quality recording (1080p minimum)
- [ ] Uploaded to YouTube or similar
- [ ] Embedded in README and marketplace listing

**Dependencies**: 14.1

**Complexity**: M

**Files Affected**:
- README.md (video embed)

**Parallel Safe**: Yes

**Testing**:
- Unit: N/A
- Integration: N/A
- Manual: Watch video, verify clarity

---

### Task Group 15: Publishing & Distribution

**Dependencies**: Task Group 14
**Phase**: 4
**Complexity**: M

#### Task 15.1: Prepare Extension for Marketplace Publishing

**Description**: Package extension and prepare marketplace listing

**Acceptance Criteria**:
- [ ] Extension icon created (256x256 PNG)
- [ ] package.json metadata complete (publisher, repository, license)
- [ ] CHANGELOG.md with v1.0.0 release notes
- [ ] .vscodeignore configured to exclude dev files
- [ ] Extension packaged with vsce package
- [ ] Package size verified <1MB
- [ ] Manual testing of packaged .vsix

**Dependencies**: 13.3, 14.1

**Complexity**: M

**Files Affected**:
- package.json
- CHANGELOG.md
- media/icons/yoyo-dev.png
- .vscodeignore

**Parallel Safe**: Yes

**Testing**:
- Unit: N/A
- Integration: Install .vsix manually and test
- Manual: Verify all features work in packaged extension

---

#### Task 15.2: Create Marketplace Listing

**Description**: Write compelling marketplace description

**Acceptance Criteria**:
- [ ] Short description (80 chars max)
- [ ] Long description with feature highlights
- [ ] Screenshots (4-5 high-quality images)
- [ ] Tags and categories configured
- [ ] Marketplace Q&A section monitored
- [ ] Link to GitHub repository

**Dependencies**: 15.1

**Complexity**: S

**Files Affected**:
- Marketplace listing (web form)

**Parallel Safe**: Yes

**Testing**:
- Unit: N/A
- Integration: N/A
- Manual: Preview marketplace listing

---

#### Task 15.3: Publish Extension to Marketplace

**Description**: Deploy extension to VS Code Marketplace

**Acceptance Criteria**:
- [ ] Publisher account created
- [ ] Extension published via vsce publish
- [ ] Marketplace listing verified (visible to public)
- [ ] Extension installable via VS Code marketplace search
- [ ] GitHub releases tagged (v1.0.0)
- [ ] Announcement posted to GitHub Discussions

**Dependencies**: 15.2

**Complexity**: S

**Files Affected**:
- N/A (marketplace deployment)

**Parallel Safe**: No (deployment task)

**Testing**:
- Unit: N/A
- Integration: N/A
- Manual: Install extension from marketplace

---

## Execution Strategy

### Critical Path

These tasks block other work and must be completed sequentially:

1. Task 1.1 (Project setup) → blocks all development
2. Task 2.1 (Extension activation) → blocks view registration
3. Task 3.1 (File parsers) → blocks all data display
4. Task 7.1 (ClaudeCliService) → blocks command integration

### Parallel Execution Opportunities

These task groups can be developed concurrently:

**Week 1-2 Parallelization**:
- Task Group 3 (File System) + Task Group 7.1 (ClaudeCliService) - independent teams
- Task Group 4 (Task Tree) + Task Group 5 (Roadmap Tree) - independent UI components

**Week 3-4 Parallelization**:
- Task Group 8 (Spec Webview) + Task Group 10 (Git Integration) - separate UI areas
- Task Group 9 (Context Menus) + Task Group 11 (Settings) - independent features

**Week 5-6 Parallelization**:
- Task Group 12 (Advanced Features) - all subtasks can run parallel
- Task Group 13.1 (Unit tests) - can start once core features stable

### Dependencies by Phase

**Phase 1 (Weeks 1-2)**: Foundation
- Task Groups 1 → 2 → 3 → (4 + 5 + 6 + 7)
- All views and commands blocked by infrastructure

**Phase 2 (Weeks 3-4)**: Core Features
- Task Groups (8 + 9 + 10 + 11) can run parallel
- All depend on Phase 1 completion

**Phase 3 (Weeks 5-6)**: Rich UI
- Task Group 12 depends on relevant Phase 2 features
- All subtasks in Group 12 are independent

**Phase 4 (Weeks 7-8)**: Quality & Launch
- Task Groups 13 → 14 → 15 (sequential)
- Testing must complete before documentation
- Documentation before publishing

---

## Testing Summary

**Total Test Estimate**:
- Unit tests: 30-40 tests across all parsers, services, providers
- Integration tests: 15-20 tests for extension lifecycle and UI
- Manual testing: Required for all user-facing features

**Test Execution Strategy**:
- Run unit tests after each task group completion
- Run integration tests at phase boundaries
- Run full test suite before publishing

**Critical Test Areas**:
1. File parsing (tasks.md, roadmap.md, state.json)
2. Event-driven updates (file watcher → EventBus → tree refresh)
3. Command execution flow (command → CLI service → terminal)
4. Webview messaging (extension ↔ React app)
5. Error handling and graceful degradation

---

## Risk Mitigation

**Risk: Activation time exceeds 100ms**
- Mitigation: Lazy load all services, defer non-critical initialization
- Verification: Task 13.3 measures and optimizes

**Risk: Bundle size exceeds 1MB**
- Mitigation: Use esbuild minification, tree-shaking, no heavy dependencies
- Verification: Task 13.3 measures bundle size

**Risk: File watcher causes performance issues**
- Mitigation: 500ms debounce, non-recursive watchers, event coalescing
- Verification: Task 3.3 tests debounce, Task 13.3 profiles

**Risk: Extension conflicts with TUI**
- Mitigation: Both read same files, no writes to .yoyo-dev structure
- Verification: Integration tests with TUI running

**Risk: Complex state management**
- Mitigation: EventBus decouples components, single source of truth (files)
- Verification: Integration tests verify state consistency

---

## Success Criteria

**MVP Success (Phase 1-2)**:
- ✅ All 16 commands available in command palette
- ✅ Task and roadmap trees display correctly
- ✅ Real-time file watching works (500ms debounce)
- ✅ Status bar shows current spec and progress
- ✅ Extension activates in <100ms
- ✅ Bundle size <1MB

**Full Feature Success (Phase 3-4)**:
- ✅ Spec webview renders markdown beautifully
- ✅ Git integration shows branch and status
- ✅ Context menus work in editor and explorer
- ✅ Progress notifications for workflows
- ✅ 80%+ test coverage for core logic
- ✅ Published to VS Code Marketplace

**User Satisfaction**:
- ✅ Installation count >100 in first month
- ✅ Average rating >4.0 stars
- ✅ Zero critical bugs reported
- ✅ Positive feedback on GitHub Discussions
