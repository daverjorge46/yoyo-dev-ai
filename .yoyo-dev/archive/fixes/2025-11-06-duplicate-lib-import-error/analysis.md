# Problem Analysis

> Fix: duplicate-lib-import-error
> Created: 2025-11-06
> Priority: HIGH

## Problem Description

Users encounter `ModuleNotFoundError: No module named 'lib'` when trying to launch yoyo-dev using the `yoyo` command from terminal or inside IDEs. The TUI fails to start completely, making the system unusable.

## Reproduction Steps

1. Run `yoyo` command from terminal
2. TUI attempts to initialize
3. Import chain: `app.py` → `services/__init__.py` → `layout_persistence.py` → `split_view/__init__.py`
4. Python fails to resolve `from ..split_view.manager import` in `layout_persistence.py:14`
5. Error: `ModuleNotFoundError: No module named 'lib'`

**Expected Behavior**: TUI launches successfully with all services initialized

**Actual Behavior**: TUI crashes with module import errors before the interface loads

## Root Cause

The yoyo-dev repository has a **duplicate `.yoyo-dev/lib/` directory** that shouldn't exist:

1. The yoyo-dev project treats itself as a project with yoyo-dev installed (has its own `.yoyo-dev/` directory)
2. This creates `/home/yoga999/PROJECTS/yoyo-dev/.yoyo-dev/lib/yoyo_tui_v3/` as a duplicate/stale copy
3. The canonical source is at `/home/yoga999/PROJECTS/yoyo-dev/lib/yoyo_tui_v3/`
4. Python's module resolution gets confused between these two locations
5. When `yoyo-tui.py` adds `lib/` to `sys.path`, relative imports in nested modules fail
6. The relative import `from ..split_view.manager import` in `layout_persistence.py:14` cannot resolve correctly

**Affected Files**:
- `.yoyo-dev/lib/` - Duplicate directory causing module resolution conflicts
- `.yoyo-dev/lib/yoyo_tui_v3/services/layout_persistence.py` - Stale copy with outdated imports
- `lib/yoyo_tui_v3/services/layout_persistence.py` - Canonical source file
- `lib/yoyo-tui.py` - Entry point that sets up Python path

## Impact Assessment

- **Severity**: HIGH (system completely unusable)
- **Affected Users**: All users trying to launch yoyo TUI
- **Affected Functionality**: Entire TUI system - cannot start at all
- **Workaround Available**: NO - system is completely broken

## Solution Approach

Remove the duplicate `.yoyo-dev/lib/` directory entirely. This directory should not exist in the yoyo-dev base repository - it's only meant for projects that have yoyo-dev installed.

**Why this happened**: The yoyo-dev repository was treating itself as a "project with yoyo-dev installed" by maintaining its own `.yoyo-dev/` configuration. This is useful for testing but creates the duplicate lib issue.

**Implementation Steps**:
1. Remove the `.yoyo-dev/lib/` directory completely
2. Verify `.gitignore` excludes `.yoyo-dev/lib/` to prevent future duplicates
3. Test that `yoyo` command launches successfully
4. Verify all TUI services initialize without import errors
5. Add documentation to prevent this issue in future

**Testing Strategy**:
- Launch `yoyo` command and verify TUI starts
- Check all services initialize (event bus, cache manager, data manager, etc.)
- Verify split view functionality works
- Test from both terminal and IDE contexts

**Risk Assessment**:
- **Breaking Changes**: NO - removing duplicate fixes the issue
- **Performance Impact**: POSITIVE - eliminates module resolution confusion
- **Side Effects**: None - the duplicate directory should never have existed
