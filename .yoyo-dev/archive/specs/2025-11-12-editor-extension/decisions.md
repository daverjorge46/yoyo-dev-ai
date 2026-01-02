# Technical Decisions: Yoyo Dev Extension

## Architecture Decisions

### Decision 1: TypeScript + esbuild over JavaScript + webpack
**Rationale**:
- esbuild provides 10-100x faster build times than webpack
- TypeScript catches errors at compile time with VS Code API type definitions
- VS Code team recommends esbuild as of 2025
- Better developer experience with hot reload

**Tradeoffs**:
- esbuild doesn't type-check (requires separate `tsc --noEmit` step)
- Slightly more complex build configuration

**Alternatives Considered**:
- JavaScript + webpack (rejected: slow builds, no type safety)
- JavaScript + esbuild (rejected: no type safety)

### Decision 2: Tree View for tasks/roadmap, Webview for spec content
**Rationale**:
- Tree View provides native VS Code feel with built-in checkbox/folder icons
- Better performance than webview for simple hierarchical data
- Webview needed only for rich markdown rendering with navigation

**Tradeoffs**:
- Webview has higher memory footprint but needed for spec content
- Mixed UI approach (tree + webview) but leverages each strength

**Alternatives Considered**:
- All webviews (rejected: poor performance, not native feel)
- All tree views (rejected: can't render markdown properly)

### Decision 3: Terminal + file watcher integration over IPC wrapper
**Rationale**:
- Simpler implementation with integrated terminal + file watchers
- Reliable detection of workflow completion via state.json changes
- Users can interact with Claude CLI directly in terminal
- Less complexity than maintaining IPC wrapper process

**Tradeoffs**:
- No real-time CLI output streaming in Phase 1
- Can add IPC wrapper in Phase 4 if needed

**Alternatives Considered**:
- IPC wrapper with socket.io (deferred to Phase 4 - Priority 3)
- Direct subprocess management (rejected: harder to debug)

### Decision 4: VS Code workspace state over external database
**Rationale**:
- VS Code native persistence survives restarts and updates
- No external dependencies or database setup
- Workspace-scoped state perfect for per-project tracking

**Tradeoffs**:
- Limited to key-value storage (sufficient for current needs)
- Not suitable for complex queries (not needed)

**Alternatives Considered**:
- SQLite database (rejected: overkill, adds dependency)
- JSON files in .yoyo-dev/ (rejected: conflicts with existing structure)

### Decision 5: React for webview UI
**Rationale**:
- Larger ecosystem with more component libraries
- Better TypeScript support and debugging tools
- Team likely familiar with React
- Bundle size not critical for extension (vs mobile app)

**Tradeoffs**:
- Larger bundle (~140KB) than Svelte (~15KB)
- Runtime framework overhead

**Alternatives Considered**:
- Svelte (rejected: smaller ecosystem, less familiar)
- Vanilla JS (rejected: too much boilerplate for complex UI)

## Integration Decisions

### Decision 6: Read-only integration with existing workflows
**Rationale**:
- All 16 workflows remain unchanged in .yoyo-dev/instructions/
- Extension is purely a view/control layer
- Claude Code CLI handles all AI interaction and agent orchestration
- Reduces extension complexity and maintains single source of truth

**Tradeoffs**:
- Extension can't optimize workflow execution directly
- Dependent on Claude CLI being available

**Alternatives Considered**:
- Reimplement workflows in TypeScript (rejected: massive duplication)
- Modify workflows for extension (rejected: breaks CLI compatibility)

### Decision 7: Event-driven updates over polling
**Rationale**:
- File system watchers provide instant updates without polling overhead
- EventBus decouples components for better testability
- Zero CPU usage when files not changing

**Tradeoffs**:
- More complex event management
- Need proper debouncing to prevent thrashing

**Alternatives Considered**:
- Polling every 2 seconds (rejected: CPU waste, 2s delay)
- Manual refresh only (rejected: poor UX)

### Decision 8: Non-recursive file watchers
**Rationale**:
- `.yoyo-dev/` directory structure is shallow (max 2-3 levels)
- Non-recursive watchers are more performant
- Avoids hitting Linux file handle limits

**Tradeoffs**:
- Need separate watchers for subdirectories if structure deepens
- More configuration needed

**Alternatives Considered**:
- Recursive watcher on `.yoyo-dev/` (rejected: performance concerns)
- VS Code default workspace watching (rejected: too broad, includes node_modules)

## UI/UX Decisions

### Decision 9: Four-panel sidebar layout
**Rationale**:
- Tasks and Roadmap are most frequently accessed (top position)
- Current Spec provides context for active work
- Git Info helps with branch management
- All collapsible for space efficiency

**Tradeoffs**:
- Four panels may feel cluttered on small screens
- Users can collapse unwanted panels

**Alternatives Considered**:
- Single tabbed view (rejected: requires clicking to switch)
- Separate activity bar icons (rejected: too much real estate)

### Decision 10: Command palette over custom UI for workflows
**Rationale**:
- Developers already familiar with Cmd+Shift+P pattern
- No learning curve for command discovery
- Searchable and categorized automatically
- Keyboard-friendly

**Tradeoffs**:
- Less discoverable for new users vs buttons
- Can add quick action buttons in Phase 2

**Alternatives Considered**:
- Dedicated workflow panel with buttons (deferred to Phase 3)
- Toolbar buttons (rejected: clutters UI)

### Decision 11: 500ms debounce for file changes
**Rationale**:
- Error Lens pattern shows 500ms minimum prevents thrashing
- Balances responsiveness with performance
- Typical save + format cycle completes within 500ms

**Tradeoffs**:
- Slight delay in updates (acceptable for non-critical updates)
- Very fast editors may still trigger multiple updates

**Alternatives Considered**:
- 200ms debounce (rejected: still causes thrashing)
- 1000ms debounce (rejected: feels sluggish)

## Performance Decisions

### Decision 12: Lazy loading services with Container pattern
**Rationale**:
- GitLens and other large extensions use this pattern
- Reduces activation time by deferring expensive initialization
- Only load services when actually needed

**Tradeoffs**:
- Slightly more complex dependency management
- First use of service has initialization cost

**Alternatives Considered**:
- Load all services on activation (rejected: slow activation)
- Manual service instantiation (rejected: hard to test)

### Decision 13: Activation event on workspaceContains:.yoyo-dev
**Rationale**:
- Extension only activates in projects using Yoyo Dev
- Prevents unnecessary activation in non-Yoyo projects
- Meets VS Code performance best practices

**Tradeoffs**:
- First command in new project requires manual activation
- Can add onCommand events for first-time users

**Alternatives Considered**:
- onStartup (rejected: bad performance practice)
- onCommand only (rejected: views don't appear until command run)

### Decision 14: Limit tree view items to 100 per level
**Rationale**:
- Prevents memory issues with very large task lists
- Typical spec has 10-30 tasks (well under limit)
- Can add pagination if needed

**Tradeoffs**:
- Need pagination for 100+ task specs (rare)
- Adds complexity if implemented

**Alternatives Considered**:
- No limit (rejected: potential memory issues)
- Limit to 50 (rejected: too restrictive)

## Quality Decisions

### Decision 15: Mocha + @vscode/test-electron for testing
**Rationale**:
- Official VS Code testing framework
- Better integration with VS Code extension host
- Less configuration than Jest
- Examples available in official samples

**Tradeoffs**:
- Mocha less familiar than Jest to some developers
- Async test syntax requires care

**Alternatives Considered**:
- Jest (rejected: requires manual VS Code mocking)
- No tests (rejected: quality requirement)

### Decision 16: Content Security Policy with nonce for webviews
**Rationale**:
- Security best practice for webview HTML
- Prevents XSS attacks from malicious markdown
- Required by VS Code marketplace

**Tradeoffs**:
- More complex HTML generation
- Nonce must be generated per render

**Alternatives Considered**:
- No CSP (rejected: security vulnerability)
- Unsafe inline scripts (rejected: marketplace violation)

## Migration Decisions

### Decision 17: Preserve TUI code for v1.6 compatibility
**Rationale**:
- Some users may prefer TUI (terminal-only environments, SSH)
- Extension requires GUI and VS Code installation
- Can deprecate TUI in future release after extension adoption

**Tradeoffs**:
- Maintains 12K lines of TUI code short-term
- Requires testing both UIs during transition

**Alternatives Considered**:
- Immediate TUI removal (rejected: breaks existing users)
- Maintain both indefinitely (rejected: maintenance burden)

### Decision 18: Extension as opt-in for existing users
**Rationale**:
- Existing TUI users continue working unchanged
- Extension users opt-in via VS Code marketplace
- Both can coexist during transition period
- Natural migration path as users discover extension

**Tradeoffs**:
- Dual documentation needed (TUI + extension)
- Need clear migration guide

**Alternatives Considered**:
- Force migration (rejected: disruptive)
- Extension only for new users (rejected: confusing split)
