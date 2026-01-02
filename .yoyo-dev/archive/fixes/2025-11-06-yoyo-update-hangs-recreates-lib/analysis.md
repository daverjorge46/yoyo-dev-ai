# Problem Analysis

> Fix: yoyo-update-hangs-recreates-lib
> Created: 2025-11-06
> Priority: HIGH

## Problem Description

The `yoyo-update` script has two critical issues:

1. **Script hangs after completion**: The script completes all updates successfully but never exits, requiring users to manually kill the process
2. **Recreates duplicate `.yoyo-dev/lib/` directory**: The update script copies the TUI library to `.yoyo-dev/lib/yoyo_tui_v3/`, recreating the exact duplicate directory issue that was just fixed in the previous commit

## Reproduction Steps

1. Run `yoyo-update` from within the yoyo-dev base repository
2. Observe that all updates complete successfully
3. Script prints final success messages but never exits
4. User must press Ctrl+C to terminate
5. Check directory: `ls .yoyo-dev/lib/` shows the duplicate directory has been recreated

**Expected Behavior**:
- Script completes updates and exits cleanly
- No `.yoyo-dev/lib/` directory should exist in base yoyo-dev repository

**Actual Behavior**:
- Script hangs indefinitely after printing final messages
- Creates `.yoyo-dev/lib/yoyo_tui_v3/` with 108+ files, recreating the duplicate lib problem

## Root Cause

### Issue #1: Script Hanging

**Location**: `setup/yoyo-update.sh:481-486`

```bash
timeout 300 "$BASE_YOYO_DEV/venv/bin/pip" install --upgrade -r "$BASE_YOYO_DEV/requirements.txt" --no-input --disable-pip-version-check || {
    echo "⚠️  Dependency upgrade timed out or failed"
    ...
}
```

**Why it hangs**:
1. The `timeout` command spawns pip as a subprocess
2. Pip may spawn additional background processes for compilation
3. When the script reaches the end (line 598), Bash waits for all child processes to complete
4. Some pip background processes don't terminate properly
5. Script never reaches end-of-file, hanging indefinitely
6. No explicit `exit 0` at end to force termination

### Issue #2: Duplicate `.yoyo-dev/lib/` Recreation

**Location 1**: `setup/yoyo-update.sh:282-285`
```bash
# Update yoyo_tui_v3 (modern TUI implementation)
if [ -d "$BASE_YOYO_DEV/lib/yoyo_tui_v3" ]; then
    echo "  📦 Updating yoyo_tui_v3..."
    mkdir -p "./.yoyo-dev/lib/yoyo_tui_v3"
    cp -r "$BASE_YOYO_DEV/lib/yoyo_tui_v3"/* "./.yoyo-dev/lib/yoyo_tui_v3/"
fi
```

**Location 2**: `setup/yoyo-update.sh:299-333`
```bash
# Update TUI v3.0 library if it exists
if [ -d "$BASE_YOYO_DEV/lib/yoyo_tui_v3" ]; then
    echo ""
    echo "  📂 TUI v3.0 Library:"
    if [ -d "./.yoyo-dev/lib/yoyo_tui_v3" ]; then
        # Preserve venv but update TUI code
        echo "  → Updating TUI v3.0 library (preserving venv)..."

        # Copy TUI library files (excluding venv and __pycache__)
        rsync -a --exclude='venv' --exclude='__pycache__' --exclude='*.pyc' \
            "$BASE_YOYO_DEV/lib/yoyo_tui_v3/" "./.yoyo-dev/lib/yoyo_tui_v3/"
    else
        # First time TUI v3.0 installation
        echo "  → Installing TUI v3.0 library..."
        mkdir -p "./.yoyo-dev/lib"
        cp -r "$BASE_YOYO_DEV/lib/yoyo_tui_v3" "./.yoyo-dev/lib/"
        echo "  ✓ TUI v3.0 library installed"
    fi
fi
```

**Why this is wrong**:
1. The yoyo-dev **base repository** should NEVER have a `.yoyo-dev/` directory with duplicate lib files
2. Projects that install yoyo-dev should use the TUI from the base installation at `$BASE_YOYO_DEV/lib/yoyo_tui_v3/`
3. Copying creates duplicate files that cause Python module resolution conflicts
4. This directly contradicts the previous fix (commit 94a8b43) where we excluded `.yoyo-dev/lib/` from git
5. The `.yoyo-dev/lib/` pattern is only valid in **project installations**, not in the base repository

**Affected Files**:
- `setup/yoyo-update.sh:481-486` - Background pip timeout causing hang
- `setup/yoyo-update.sh:282-285` - Old v2 TUI copy logic
- `setup/yoyo-update.sh:299-333` - TUI v3.0 update logic creating duplicate
- `setup/yoyo-update.sh:598` - Missing explicit exit statement

## Impact Assessment

- **Severity**: HIGH
  - Issue #1: Users must manually kill the process, causing confusion
  - Issue #2: Recreates the critical duplicate lib bug we just fixed
- **Affected Users**: All users running `yoyo-update` on base yoyo-dev installation
- **Affected Functionality**:
  - Update workflow broken (hangs)
  - TUI functionality broken again after update (duplicate lib)
- **Workaround Available**:
  - Issue #1: Manually kill process with Ctrl+C (works but confusing)
  - Issue #2: Manually delete `.yoyo-dev/lib/` after update

## Solution Approach

### Fix #1: Prevent Script Hanging

1. Add explicit `exit 0` at end of script (line 598)
2. Ensure pip timeout properly terminates all child processes
3. Use `wait` command before exit to clean up any remaining processes

### Fix #2: Remove `.yoyo-dev/lib/` Copy Operations

1. **Remove lines 282-285**: Old v2 TUI copy logic - completely unnecessary
2. **Remove lines 299-333**: TUI v3.0 update logic - projects should use base installation
3. **Add safety check**: Detect if running in base yoyo-dev repo and skip lib operations entirely
4. **Update logic**: Projects should reference `$BASE_YOYO_DEV/lib/yoyo_tui_v3/` directly or use symlinks

**Implementation Steps**:
1. Remove all code that creates `.yoyo-dev/lib/` directory
2. Add check: `if [ "$CURRENT_DIR" = "$BASE_YOYO_DEV" ]; then skip_lib_copy=true; fi`
3. Add explicit `exit 0` at script end
4. Test update script in both base repo and project installations
5. Verify no `.yoyo-dev/lib/` is created in base repo
6. Verify update completes and exits cleanly

**Testing Strategy**:
- Run yoyo-update in base yoyo-dev repository
- Verify script exits cleanly without hanging
- Verify no `.yoyo-dev/lib/` directory is created
- Run yoyo-update in a project with yoyo-dev installed
- Verify TUI still works correctly (references base installation)
- Time the script execution to ensure no delays

**Risk Assessment**:
- **Breaking Changes**: NO - removing duplicate is the correct behavior
- **Performance Impact**: POSITIVE - eliminates unnecessary file copying
- **Side Effects**: Projects may need to reference base TUI location directly (good change)
