# Spec-Lite: Yoyo Dev VS Code Extension

## Core Objective
Replace 12K-line Textual TUI with native VS Code extension that preserves all 16 workflows, agents, and standards while providing better task visibility and workflow integration.

## Key Components

**Architecture**: TypeScript + esbuild, Container pattern DI, event-driven with EventBus, <100ms activation, <1MB bundle

**File Watching**: Monitor `.yoyo-dev/**/*.{md,json,yml}` with 500ms debounce, parse tasks.md/roadmap.md/state.json, trigger view updates

**Priority 1 (MVP)**:
- Task tree view (hierarchical, checkboxes, auto-refresh, click-to-open)
- Roadmap tree view (phases/features, progress %, auto-refresh)
- Status bar (current spec, workflow state, task progress)
- Command palette (all 16 /commands with Yoyo Dev: prefix)
- File watcher (debounced, event-driven updates)

**Priority 2**:
- Spec webview (markdown rendering, navigation, auto-update)
- Terminal integration (dedicated Yoyo Dev terminal, Claude CLI execution)
- Git info view (branch, dirty files, ahead/behind)
- Context menus (editor/explorer integration)

**Priority 3**:
- Settings panel (config.yml mirror)
- Real-time CLI output streaming
- Keyboard shortcuts (customizable)
- CodeLens annotations (execute task, mark complete)

**Integration Points**:
- All workflows execute via Claude Code CLI in integrated terminal
- State tracking via existing state.json (no modifications needed)
- File structure unchanged (reads existing .yoyo-dev/ formats)
- Agent system unchanged (CLI handles agent orchestration)

**Design Principles**:
- Native VS Code look/feel (no custom theming)
- Non-intrusive (offer workflows, don't force them)
- Zero ceremony (fast access, minimal clicks)
- Editor-native (feels like built-in feature)

**Not In Scope**: Custom AI integration, new workflow creation, non-VSCode editors, cloud sync, custom markdown editor, TUI features that don't translate to GUI
