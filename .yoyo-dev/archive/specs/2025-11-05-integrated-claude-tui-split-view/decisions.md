# Technical Decisions: Integrated Claude Code + TUI Split View

**Created:** 2025-11-05
**Version:** 1.0

## Decision Log

### D1: Built-in Terminal Splitting vs External Multiplexer

**Status:** ✅ Decided
**Decision:** Implement built-in terminal splitting using `pty` module and ANSI escape sequences
**Date:** 2025-11-05

**Context:**
Need to provide split-screen functionality to show Claude Code and TUI side-by-side.

**Options Considered:**

1. **Built-in terminal splitting**
   - Pros: No external dependencies, full control over UX, easier installation
   - Cons: More complex implementation, need to handle terminal quirks

2. **tmux integration**
   - Pros: Mature, feature-rich, well-tested
   - Cons: External dependency, less control over UX, user must install tmux

3. **screen integration**
   - Pros: Widely available, simple
   - Cons: Less features than tmux, aging codebase, limited customization

**Decision:** Built-in terminal splitting

**Rationale:**
- Aligns with Yoyo Dev philosophy of minimal dependencies
- Allows precise control over visual indicators and UX
- Python's `pty` module provides necessary primitives
- Easier for users (no external tool installation)
- Can always add tmux/screen support later as optional enhancement

**Consequences:**
- More implementation complexity
- Need comprehensive testing across terminal emulators
- Must handle terminal edge cases ourselves
- Better long-term maintainability and UX

---

### D2: Process Management Strategy

**Status:** ✅ Decided
**Decision:** Use separate OS processes with pseudo-terminals (pty)
**Date:** 2025-11-05

**Context:**
Need to run both Claude Code and Yoyo TUI simultaneously with independent lifecycles.

**Options Considered:**

1. **Separate processes with pty**
   - Pros: Clean separation, independent failures, standard Unix pattern
   - Cons: More complex IPC, harder debugging

2. **Threads within single process**
   - Pros: Simpler communication, shared memory
   - Cons: GIL limitations, coupled failures, harder to isolate

3. **Async/await with subprocess**
   - Pros: Modern Python pattern, clean async code
   - Cons: Complexity with pty, event loop challenges

**Decision:** Separate processes with pty

**Rationale:**
- Claude Code is external CLI tool (must be subprocess)
- TUI already has event loop (Textual)
- pty provides clean terminal isolation
- Independent process lifecycle (can close one, keep other)
- Standard Unix pattern (proven approach)

**Consequences:**
- Need IPC for coordination (not critical for v1)
- Must handle process monitoring
- Clean architecture with clear boundaries

---

### D3: Layout Persistence Location

**Status:** ✅ Decided
**Decision:** Store in `.yoyo-dev/config.yml`
**Date:** 2025-11-05

**Context:**
Users want layout preferences (split ratio, active pane) to persist across sessions.

**Options Considered:**

1. **`.yoyo-dev/config.yml`**
   - Pros: Consistent with existing config, per-project, version controllable
   - Cons: None significant

2. **`~/.yoyo-dev/config.yml`** (global)
   - Pros: User-wide preferences
   - Cons: Not per-project, can't customize per codebase

3. **Separate `.yoyo-dev/split-view.yml`**
   - Pros: Isolated configuration
   - Cons: Config fragmentation, more files to manage

**Decision:** `.yoyo-dev/config.yml`

**Rationale:**
- Consistent with existing Yoyo Dev config pattern
- Per-project customization (different projects may need different layouts)
- Users can gitignore if they want (or commit for team defaults)
- Single source of truth for all Yoyo Dev configuration

**Consequences:**
- Must extend existing config schema
- Need migration logic for old configs
- Config file grows (acceptable trade-off)

---

### D4: Focus Switching Keyboard Shortcuts

**Status:** ✅ Decided
**Decision:** Use Ctrl+B prefix (tmux-like) for all split view shortcuts
**Date:** 2025-11-05

**Context:**
Need intuitive keyboard shortcuts that don't conflict with Claude Code or TUI.

**Options Considered:**

1. **Ctrl+B prefix** (tmux-style)
   - Pros: Familiar to terminal users, clear prefix mode, no conflicts
   - Cons: Requires learning for non-tmux users

2. **Alt+Arrow** (simpler)
   - Pros: More intuitive, single keypress
   - Cons: Alt keys often captured by terminal emulator or OS

3. **Ctrl+Arrow** (VS Code-like)
   - Pros: Familiar to IDE users
   - Cons: Conflicts with readline shortcuts in shells

**Decision:** Ctrl+B prefix

**Rationale:**
- Widely familiar (tmux has 20+ years of user training)
- No conflicts with common terminal applications
- Prefix pattern is extensible (can add more shortcuts later)
- Clear mental model (Ctrl+B enters "split view mode")

**Consequences:**
- Must document shortcuts prominently
- Need visual hints on first use
- Minimal learning curve for terminal users

---

### D5: TUI Reactivity Implementation

**Status:** ✅ Decided
**Decision:** Rely on existing FileWatcherService (no changes needed)
**Date:** 2025-11-05

**Context:**
TUI should update when Claude Code creates/modifies files.

**Options Considered:**

1. **Existing FileWatcherService**
   - Pros: Already implemented, tested, works well
   - Cons: None

2. **IPC notifications from Claude pane**
   - Pros: Instant updates, no file watching delay
   - Cons: Complex IPC, tight coupling, harder to implement

3. **Polling-based updates**
   - Pros: Simple
   - Cons: Inefficient, delayed updates, CPU overhead

**Decision:** Existing FileWatcherService

**Rationale:**
- Already monitors `.yoyo-dev/` directory
- No changes needed - works automatically
- Proven reliability (414 tests passing)
- Decoupled architecture (TUI doesn't know about Claude)
- 500ms debounce is acceptable latency

**Consequences:**
- No additional implementation needed
- ~500ms delay for TUI updates (acceptable)
- Clean separation between panes

---

### D6: Claude Code Detection Strategy

**Status:** ✅ Decided
**Decision:** Use `shutil.which('claude')` with graceful fallback
**Date:** 2025-11-05

**Context:**
Need to detect if Claude Code is installed before launching split view.

**Options Considered:**

1. **`shutil.which('claude')`**
   - Pros: Standard Python approach, respects PATH
   - Cons: None

2. **Try to import Claude Code as library**
   - Pros: More reliable
   - Cons: Claude Code is CLI tool, not library

3. **Check specific installation paths**
   - Pros: Handles non-PATH installations
   - Cons: Platform-specific, fragile, misses custom locations

**Decision:** `shutil.which('claude')`

**Rationale:**
- Standard Python pattern
- Respects user's PATH configuration
- Works across all platforms
- Handles custom installations (if in PATH)
- Simple and reliable

**Consequences:**
- Users must have `claude` in PATH
- Show clear instructions if not found
- Provide `--no-split` flag for TUI-only mode

---

### D7: Terminal Minimum Size

**Status:** ✅ Decided
**Decision:** Minimum 120x30 characters (120 cols, 30 rows)
**Date:** 2025-11-05

**Context:**
Need to define minimum terminal size for usable split view.

**Options Considered:**

1. **120x30** (proposed)
   - Pros: Enough for both panes to be functional
   - Cons: May be large for some users

2. **80x24** (standard terminal)
   - Pros: Most common default size
   - Cons: Too cramped for split view

3. **160x40** (generous)
   - Pros: Very comfortable
   - Cons: Excludes many users with smaller screens

**Decision:** 120x30

**Rationale:**
- Provides ~48 cols for Claude (40%) + ~70 cols for TUI (60%)
- 48 cols is minimum for readable Claude Code output
- 70 cols is sufficient for TUI dashboard
- 30 rows gives decent vertical space
- Balanced between usability and accessibility

**Consequences:**
- Must validate terminal size on launch
- Show clear error if too small
- Users may need to resize terminal

---

### D8: Split Ratio Adjustability

**Status:** ✅ Decided
**Decision:** Resizable via keyboard shortcuts with persistence
**Date:** 2025-11-05

**Context:**
Users may want different split ratios for different workflows.

**Options Considered:**

1. **Fixed 40/60 ratio**
   - Pros: Simplicity, fewer edge cases
   - Cons: Not flexible for user preferences

2. **Resizable with keyboard shortcuts**
   - Pros: Flexible, persists preferences
   - Cons: More implementation complexity

3. **Mouse-based resizing**
   - Pros: Intuitive for desktop users
   - Cons: Complex in terminal, not all terminals support mouse

**Decision:** Resizable with keyboard shortcuts (Ctrl+B < and Ctrl+B >)

**Rationale:**
- User requirement: "resizable" specified
- Keyboard shortcuts fit terminal workflow
- Can persist ratio in config.yml
- Mouse support can be added later (v2)

**Consequences:**
- Must implement resize logic
- Need smooth rerendering on resize
- Store updated ratio in config

---

### D9: Independent Pane Exit

**Status:** ✅ Decided
**Decision:** Allow independent pane exit without affecting the other pane
**Date:** 2025-11-05

**Context:**
Users may want to close one pane while keeping the other running.

**Options Considered:**

1. **Independent exit**
   - Pros: Flexible, respects user intent
   - Cons: More complex lifecycle management

2. **Linked exit** (closing one closes both)
   - Pros: Simple, clean shutdown
   - Cons: Rigid, frustrating for users

**Decision:** Independent exit

**Rationale:**
- User requirement: "allow independent operation for closing"
- Respects user workflow flexibility
- One pane failure shouldn't kill the other
- Standard terminal behavior

**Consequences:**
- Must handle single-pane state gracefully
- Exit split view entirely when last pane closes
- Show remaining pane in original layout

---

### D10: Visual Active Pane Indicators

**Status:** ✅ Decided
**Decision:** Use border color (bright cyan vs dim white)
**Date:** 2025-11-05

**Context:**
Users need clear indication of which pane is active.

**Options Considered:**

1. **Border color change**
   - Pros: Clear, non-intrusive, standard terminal pattern
   - Cons: None significant

2. **Title bar highlighting**
   - Pros: Clear
   - Cons: Takes vertical space, less prominent

3. **Cursor visibility**
   - Pros: Subtle
   - Cons: May not be noticeable enough

**Decision:** Border color (bright cyan for active, dim white for inactive)

**Rationale:**
- User requirement: "visual indicators showing which pane is active"
- Border color is prominent but not distracting
- Standard pattern in terminal multiplexers
- Works across all color schemes
- Doesn't require extra screen space

**Consequences:**
- Must render borders on every focus change
- Need to handle color in different terminal themes
- Simple and clear UX

---

### D11: Platform Support for V1

**Status:** ✅ Decided
**Decision:** Linux only for v1, defer macOS/Windows to v2
**Date:** 2025-11-05

**Context:**
Need to scope platform support for initial release.

**Options Considered:**

1. **Linux only**
   - Pros: Focused development, faster delivery, most Yoyo Dev users
   - Cons: Excludes macOS/Windows users

2. **Linux + macOS**
   - Pros: Covers most users
   - Cons: Longer development, more testing

3. **All platforms**
   - Pros: Maximum reach
   - Cons: Significant complexity (Windows terminal differences)

**Decision:** Linux only for v1

**Rationale:**
- User requirement: "Linux at the moment"
- Most Yoyo Dev users are on Linux
- Terminal APIs are most consistent on Linux
- Can iterate faster with focused scope
- macOS is very similar (easy v2 addition)
- Windows WSL is future consideration

**Consequences:**
- Document Linux-only support clearly
- Design for easy platform extension
- Validate on multiple Linux terminals

---

## Future Decisions Needed

### FD1: Mouse Support
**Question:** Should we support mouse-based pane resizing?
**Timeline:** V2 consideration
**Factors:** Terminal mouse support, user demand, implementation complexity

### FD2: Three-Pane Layout
**Question:** Should we support Claude + TUI + Terminal layout?
**Timeline:** V3 consideration
**Factors:** User feedback, use cases, screen space requirements

### FD3: Vertical Split
**Question:** Should we support horizontal stacking (top/bottom) in addition to side-by-side?
**Timeline:** V2 consideration
**Factors:** User preferences, terminal aspect ratios

### FD4: Custom Pane Commands
**Question:** Should users be able to run arbitrary commands (not just Claude Code) in the left pane?
**Timeline:** V2 consideration
**Factors:** Use cases, security, configuration complexity

---

## Decision Review Process

**When to Review:**
- After user feedback from v1 beta
- When new use cases emerge
- When technical constraints change
- Before v2 planning

**Who Reviews:**
- Product owner (yoga999)
- Development team
- Beta users

**Review Criteria:**
- User satisfaction
- Technical feasibility
- Maintenance burden
- Alignment with product vision
