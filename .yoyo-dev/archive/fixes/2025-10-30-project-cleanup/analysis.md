# Project Structure Cleanup Analysis

**Date:** 2025-10-30
**Type:** Maintenance
**Priority:** Medium

## Problem Statement

The yoyo-dev codebase has accumulated:
- Duplicate directory structures
- Obsolete scripts superseded by new implementations
- Temporary test files in root directory
- Resolved issue documentation not archived
- Mystery directories from old tests

This creates confusion and makes the project harder to navigate.

## Root Cause Analysis

**Why this happened:**
1. **Rapid development** - Features added quickly without cleanup
2. **Migration to yoyo_tui_v3** - Old TUI scripts not removed after migration
3. **Test artifacts** - Temporary test files left in root
4. **Documentation drift** - Resolved issues not moved to proper location

## Cleanup Strategy

### 1. Remove Duplicate Command Directories

**Current state:**
```
commands/           # Old location (empty folders)
.claude/commands/   # New active location
```

**Action:** Remove `commands/` directory entirely (`.claude/commands/` is canonical)

**Justification:** All active commands are in `.claude/commands/`. The `commands/` directory contains only empty subdirectories from old structure.

### 2. Remove Obsolete Root Files

**Files to remove:**
- `test_task_tree_fix.py` - Temporary test file (functionality now in tests/)
- `TUI-SPLIT-PANE-FIX.md` - Resolved issue (move to recaps/)

**Action:** Delete test file, archive documentation

### 3. Remove Mystery Directory

**Directory:** `path/to/venv/`

**Analysis:** This appears to be a leftover test artifact. No code references this directory.

**Action:** Remove entirely

### 4. Consolidate Old TUI Scripts

**Obsolete scripts in lib/:**
- `lib/task-monitor.sh` - Superseded by yoyo_tui_v3
- `lib/task-monitor-tmux.sh` - Superseded by yoyo_tui_v3
- `lib/yoyo-tui.py` - Superseded by yoyo_tui_v3/app.py

**Current active TUI:**
- `lib/yoyo_tui_v3/` - Modern Textual-based TUI (complete rewrite)

**Action:** Create archive directory for old implementations, move obsolete scripts there

**Justification:**
- yoyo_tui_v3 is a complete rewrite with better architecture
- Old scripts are no longer referenced by any launcher
- Keep for historical reference but move out of main lib/

### 5. Keep Active Scripts

**Scripts to KEEP in lib/:**
- `lib/yoyo-status.sh` - Still used as bash fallback dashboard
- `lib/yoyo_tui_v3/` - Active TUI implementation

## Proposed New Structure

```
lib/
├── yoyo-status.sh              # Active: Bash dashboard fallback
├── yoyo_tui_v3/                # Active: Modern TUI
│   ├── app.py
│   ├── models.py
│   ├── config.py
│   ├── screens/
│   ├── widgets/
│   ├── services/
│   ├── parsers/
│   └── utils/
└── archive/                    # NEW: Historical implementations
    ├── yoyo-tui-v1.py         # Old monolithic TUI
    ├── task-monitor.sh        # Old bash monitor
    └── task-monitor-tmux.sh   # Old tmux monitor

setup/
├── yoyo.sh                     # Active launchers
├── yoyo-tmux.sh
├── yoyo-tui-launcher.sh
├── project.sh                  # Active installers
├── yoyo-update.sh
├── install-deps.sh
├── install-tui-deps.sh
├── install-dashboard-deps.sh
├── install-global-command.sh
├── fix-global-symlinks.sh
├── mcp-installer.sh            # Active MCP tools
├── mcp-prerequisites.sh
├── functions.sh                # Active utilities
└── parse-utils.sh

.claude/                        # Canonical Claude Code integration
├── commands/                   # Active commands
└── agents/

tests/                          # All test files
├── unit/
├── integration/
├── e2e/
├── mcp/
└── ...

docs/                           # Archive resolved issues
└── resolved-issues/
    └── TUI-SPLIT-PANE-FIX.md

[REMOVED]
commands/                       # Remove: Empty duplicate
path/                          # Remove: Test artifact
test_task_tree_fix.py          # Remove: Temporary test
TUI-SPLIT-PANE-FIX.md          # Move to docs/
```

## Safety Measures

**Before removal:**
1. ✅ Verify no active scripts reference files to be removed
2. ✅ Check git history isn't broken
3. ✅ Archive (don't delete) old implementations
4. ✅ Update documentation references

**Validation:**
1. Run all tests after cleanup
2. Verify `yoyo` command still works
3. Verify TUI launches correctly
4. Check all setup scripts execute without errors

## Benefits

**Clarity:**
- Single source of truth for commands (`.claude/commands/`)
- Clear separation of active vs archived code
- No confusion about which TUI to use

**Maintainability:**
- Easier to navigate codebase
- Clear what's active vs obsolete
- Better onboarding for new contributors

**Hygiene:**
- Remove temporary test files from root
- Proper archival of resolved issues
- Clean directory structure

## Implementation Plan

### Phase 1: Create Archives
1. Create `lib/archive/` directory
2. Create `docs/resolved-issues/` directory
3. Move old implementations to archive
4. Move resolved docs to proper location

### Phase 2: Remove Duplicates
1. Remove `commands/` directory (empty duplicate)
2. Remove `path/` directory (test artifact)
3. Remove `test_task_tree_fix.py` (temporary test)

### Phase 3: Update References
1. Verify no broken references
2. Update CLAUDE.md if needed
3. Update README.md if needed

### Phase 4: Validation
1. Run full test suite
2. Test `yoyo` command
3. Test all setup scripts
4. Verify TUI launch

## Risks

**Low risk:**
- All removed files are either obsolete or duplicates
- Old implementations archived (not deleted)
- Easy to rollback if needed

**Mitigation:**
- Git commit after each phase
- Keep archives for historical reference
- Thorough testing after cleanup

## Success Criteria

✅ Clean root directory (no test files or temporary docs)
✅ Single command directory (`.claude/commands/`)
✅ Clear lib/ structure (active + archive)
✅ All tests pass
✅ All commands work
✅ No broken references
✅ Improved developer experience
