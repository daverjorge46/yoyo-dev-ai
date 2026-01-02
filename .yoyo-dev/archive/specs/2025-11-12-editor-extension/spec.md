# Specification: Yoyo Dev VS Code/Cursor Extension

## Goal

Transform Yoyo Dev from TUI-based dashboard to native editor extension while preserving all 16 workflows, specialized agents, and systematic development framework. Replace 12K lines of Textual TUI code with lightweight VS Code sidebar panels that provide better task tracking, spec visibility, and workflow integration directly in the developer's IDE.

## User Stories

- As a developer using Claude Code, I want to see my current tasks, specs, and roadmap directly in my editor sidebar so I don't need to switch to a separate TUI window
- As a solo developer building with AI, I want one-click access to all Yoyo Dev workflows (/plan-product, /create-new, /execute-tasks) from my command palette so I can start workflows without memorizing commands
- As a developer working on multiple specs, I want real-time updates when task files change so I always see current progress without manual refreshes

## Specific Requirements

**Extension Architecture**
- Use TypeScript with esbuild bundler for 10-100x faster builds than webpack
- Adopt Container pattern with dependency injection for service management (YoyoFileService, ClaudeCliService, GitService, StateService)
- Implement event-driven architecture with EventBus for cross-component communication
- Keep activation time under 100ms by using lazy loading and proper activation events
- Bundle size must stay under 1MB for fast installation and updates
- Use VS Code workspace state for persistence (current spec, last task, view states)

**File System Integration**
- Watch `.yoyo-dev/**/*.{md,json,yml}` for real-time updates using non-recursive watchers
- Debounce all file change events with 500ms minimum delay to prevent thrashing
- Parse tasks.md files to extract task hierarchies, completion status, dependencies
- Parse roadmap.md to extract phases, features, completion percentages
- Read state.json files for workflow state tracking
- Monitor spec-lite.md and mission-lite.md for context changes

**Task Tree View (Priority 1)**
- Display hierarchical task list with parent/child relationships using native VS Code TreeView
- Show checkboxes with completion status (checked/unchecked icons)
- Auto-refresh when tasks.md changes (file watcher triggered)
- Support multi-spec projects by grouping tasks under spec folders
- Provide context menu actions: "Mark Complete", "Open in Editor", "Execute Task"
- Click task to open corresponding section in tasks.md
- Show task count badge on sidebar icon

**Roadmap Tree View (Priority 1)**
- Display product roadmap phases with collapsible feature lists
- Show completion percentages per phase using progress indicators
- Auto-refresh when roadmap.md changes
- Provide context menu actions: "Create Spec from Feature", "Edit Roadmap"
- Click feature to create new spec with /create-spec
- Show overall roadmap progress in view title

**Status Bar Integration (Priority 1)**
- Left side: Display current active spec name with folder icon
- Left side: Display workflow state (Planning, Executing, Review, Complete) with appropriate codicons
- Right side: Display current task progress (e.g., "3/15 tasks")
- Make status items clickable to open corresponding view or file
- Update automatically when state.json changes
- Hide status items when no active spec detected

**Command Palette Integration (Priority 1)**
- Register all 16 slash commands as VS Code commands with "Yoyo Dev:" prefix
- Commands: Plan Product, Analyze Product, Create New, Create Spec, Create Tasks, Execute Tasks, Create Fix, Orchestrate Tasks, Design Init, Design Audit, Design Fix, Design Component, Review, Containerize Application, Improve Skills, Yoyo Help
- Each command launches Claude Code CLI in integrated terminal with proper working directory
- Support command flags (e.g., /execute-tasks --devil, /review --security)
- Show commands only when .yoyo-dev directory exists (conditional activation)

**Terminal Integration (Priority 2)**
- Create dedicated "Yoyo Dev" terminal when executing workflows
- Auto-focus terminal when command launches
- Send Claude Code CLI commands to terminal (e.g., "claude /create-new")
- Keep terminal open after command completes for user interaction
- Support cancellation via terminal kill

**Spec Webview Panel (Priority 2)**
- Display spec.md content with rich markdown rendering using marked library
- Include navigation for sections (Goal, User Stories, Requirements, etc.)
- Auto-scroll to relevant section when clicked from tree view
- Support opening spec-lite.md in read-only mode
- Update content automatically when spec files change
- Provide quick actions: "Create Tasks", "Execute Tasks", "Edit Spec"
- Use Content Security Policy with nonce for security

**Git Information View (Priority 2)**
- Show current branch name with git icon
- Display dirty file count if uncommitted changes exist
- Show ahead/behind commit count vs remote
- Provide quick actions: "Create Branch", "Commit Changes", "Push"
- Auto-refresh when .git directory changes
- Integrate with existing git-workflow agent

**Context Menu Integration (Priority 2)**
- Add "Yoyo Dev" submenu to editor context menu for markdown files in .yoyo-dev/
- Add "Create Spec Here" to explorer context menu on folders
- Add "Execute This Task" to tasks.md when cursor on task line
- Show context-aware commands based on file type and location

**Settings Panel (Priority 3)**
- Expose config.yml settings as VS Code settings (auto_refresh, parallel_execution, design_system enabled)
- Provide UI for toggling specialized agents on/off
- Allow customization of file watcher debounce delay
- Support changing default workflow mode (automatic vs orchestrated)
- Mirror important Yoyo Dev config without replacing config.yml

**Real-time CLI Output (Priority 3)**
- Stream Claude Code CLI output to Output Channel named "Yoyo Dev"
- Parse output for workflow progress indicators
- Show progress notifications for long-running workflows
- Detect workflow completion and trigger view refresh
- Handle errors gracefully with user-friendly messages

**Keyboard Shortcuts (Priority 3)**
- Cmd/Ctrl+Shift+Y: Open Yoyo Dev sidebar
- Cmd/Ctrl+Shift+T: Focus tasks view
- Cmd/Ctrl+Shift+R: Focus roadmap view
- Cmd/Ctrl+Shift+E: Execute next task
- Cmd/Ctrl+Shift+N: Create new spec
- Make all shortcuts customizable via VS Code keybindings

**CodeLens Task Annotations (Priority 3)**
- Show "Execute Task" CodeLens above each task in tasks.md
- Show "Mark Complete" CodeLens for unchecked tasks
- Show task metadata (assigned agent, dependencies) as hover info
- Update CodeLens when task status changes
- Integrate with implementer agent for execution

## Visual Design

No visual mockups provided. Extension should follow VS Code native design patterns:

**Sidebar Layout**
- Primary container in Activity Bar with Yoyo Dev icon (custom SVG logo)
- Four collapsible view sections: Tasks, Roadmap, Current Spec, Git Info
- Use VS Code theme colors (no custom theming needed)
- Icons from VS Code Codicons library (check, circle-outline, folder, git-branch, loading)

**Tree View Design**
- Use VS Code TreeItem with built-in checkbox/folder/file icons
- Indent child tasks consistently with VS Code file explorer
- Show completion percentage as description text (e.g., "User Auth (60%)")
- Use muted color for completed items
- Collapsible states persist in workspace state

**Webview Design**
- White background in light theme, dark background in dark theme
- Markdown styling matches VS Code's native markdown preview
- Navigation sidebar on left (sticky positioning)
- Content area on right with readable line length (max 80ch)
- Buttons use VS Code button component styling

**Status Bar Design**
- Use appropriate priority values for left/right alignment
- Workflow state colors: Planning (blue), Executing (yellow), Review (orange), Complete (green)
- Tooltip shows detailed info on hover
- Click behavior documented in tooltip text

## Existing Code to Leverage

**Yoyo Dev File Structure (.yoyo-dev/)**
- All file parsing logic can reuse existing file patterns (tasks.md checkbox format, state.json schema, roadmap.md structure)
- Existing YAML config parsing from config.yml can be ported to TypeScript
- Mission-lite.md and spec-lite.md formats are already optimized for AI consumption
- No changes needed to file structure - extension reads existing formats

**Claude Code CLI Integration**
- Existing bash scripts in .claude/commands/ show proper command invocation patterns
- State.json schema already tracks workflow state (active_step, completed_steps, metadata)
- Extension can monitor state.json for workflow progress without modifying CLI
- Terminal integration pattern: spawn terminal, send "claude /command", watch for completion

**MCP Server Configuration**
- Extension should detect if MCP servers (context7, memory, playwright, etc.) are installed
- Show MCP status in settings or dedicated view (optional Priority 3 feature)
- Provide quick action to install missing MCPs via setup/mcp-claude-installer.sh
- No direct MCP integration needed - Claude Code CLI handles MCP communication

**Specialized Agent Definitions**
- 16 specialized agents already defined in .claude/agents/ directory
- Extension doesn't need to modify agents - they work through Claude Code CLI
- Can show which agent is active in status bar by parsing state.json metadata
- Task assignments to specific agents already encoded in tasks.md frontmatter

**Workflow Reference System**
- Extension doesn't need to parse {{workflows/*}} syntax - that's handled by Claude
- Can display which workflow is active by reading state.json
- No changes needed to workflow expansion logic
- Extension is purely a view/control layer over existing workflow system

## Out of Scope

- Building custom AI integration or LLM calls (Claude Code CLI handles all AI interaction)
- Replacing Claude Code CLI or reimplementing agent logic in TypeScript
- Creating new workflow definitions or modifying existing agent instructions
- Providing inline code generation or autocomplete features
- Supporting editors other than VS Code and Cursor (focus on VS Code API only)
- Creating mobile or web-based dashboard versions
- Integrating with version control systems other than Git
- Providing cloud sync or team collaboration features (remains local-first)
- Building custom markdown editor (use VS Code's built-in editor)
- Implementing TUI features that don't translate to GUI (ASCII art, terminal colors, etc.)
