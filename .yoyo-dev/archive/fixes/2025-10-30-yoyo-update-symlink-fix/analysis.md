# Fix Analysis: yoyo-update Symlink Resolution Failure

**Fix ID:** 2025-10-30-yoyo-update-symlink-fix
**Created:** 2025-10-30
**Issue Type:** Bug - Script Path Resolution
**Severity:** High
**Priority:** Critical

## Problem Summary

The `yoyo-update` command fails when executed via its symlink at `/usr/local/bin/yoyo-update` with the error:
```
/usr/local/bin/functions.sh: No such file or directory
```

This prevents users from updating Yoyo Dev installations, breaking a core workflow.

## Root Cause Analysis

### The Issue

**Line 121 in `setup/yoyo-update.sh`:**
```bash
source "$SCRIPT_DIR/functions.sh"
```

**Lines 109-110 calculate SCRIPT_DIR:**
```bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_YOYO_DEV="$(dirname "$SCRIPT_DIR")"
```

### Why It Fails

1. **Symlink Setup:**
   - `/usr/local/bin/yoyo-update` → `/home/yoga999/yoyo-dev/setup/yoyo-update.sh`

2. **When executed via symlink:**
   - `$0` = `/usr/local/bin/yoyo-update` (the symlink path, not the target)
   - `dirname "$0"` = `/usr/local/bin/`
   - `SCRIPT_DIR` = `/usr/local/bin/`

3. **Sourcing fails:**
   - Tries to source `/usr/local/bin/functions.sh`
   - File doesn't exist (actual file is at `/home/yoga999/yoyo-dev/setup/functions.sh`)
   - Script exits with error

### The Pattern That Works

**In `setup/yoyo.sh` (lines 24-30)** - RESOLVES SYMLINKS CORRECTLY:
```bash
SCRIPT_PATH="${BASH_SOURCE[0]}"
# Resolve symlink if this script is executed via symlink
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
```

This pattern:
1. Uses `${BASH_SOURCE[0]}` to get the actual script path
2. Checks if it's a symlink with `[ -L "$SCRIPT_PATH" ]`
3. Resolves symlink to real path with `readlink -f`
4. Then calculates directory from the resolved path

### Comparison

| Script | Resolves Symlinks? | Works via Symlink? |
|--------|-------------------|-------------------|
| `yoyo.sh` | ✅ Yes (lines 24-30) | ✅ Yes |
| `yoyo-update.sh` | ❌ No (lines 109-110) | ❌ No |

## Affected Files

**Primary:**
- `setup/yoyo-update.sh` (lines 109-110) - Needs symlink resolution

**Dependencies:**
- `setup/functions.sh` - File being sourced (exists, just can't be found)
- `/usr/local/bin/yoyo-update` - Symlink that triggers the bug

## Evidence

### Actual File Locations
```
✓ /home/yoga999/PROJECTS/yoyo-dev/setup/yoyo-update.sh (source)
✓ /home/yoga999/PROJECTS/yoyo-dev/setup/functions.sh (source)
✓ /home/yoga999/yoyo-dev/setup/yoyo-update.sh (base install)
✓ /home/yoga999/yoyo-dev/setup/functions.sh (base install)
✓ /usr/local/bin/yoyo-update (symlink) → /home/yoga999/yoyo-dev/setup/yoyo-update.sh
✗ /usr/local/bin/functions.sh (doesn't exist - shouldn't need to!)
```

### Error Message
```
📍 Updating Yoyo Dev in project: bank-statement-app
✓ Using Yoyo Dev base installation at /usr/local
/usr/local/bin/yoyo-update: line 121: /usr/local/bin/functions.sh: No such file or directory
```

## Solution Approach

### Fix Strategy

Replace lines 109-110 in `setup/yoyo-update.sh` with the proven symlink-resolution pattern from `yoyo.sh`.

### Implementation Plan

**Current code (lines 109-110):**
```bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_YOYO_DEV="$(dirname "$SCRIPT_DIR")"
```

**Fixed code:**
```bash
SCRIPT_PATH="${BASH_SOURCE[0]}"
# Resolve symlink if this script is executed via symlink
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
BASE_YOYO_DEV="$(dirname "$SCRIPT_DIR")"
```

### Why This Works

1. **`${BASH_SOURCE[0]}`** - Gets the actual script path (better than `$0` for sourced scripts)
2. **`[ -L "$SCRIPT_PATH" ]`** - Checks if path is a symlink
3. **`readlink -f`** - Resolves symlink to absolute real path
4. **`dirname "$SCRIPT_PATH"`** - Now uses the resolved path, not the symlink
5. **Result:** `SCRIPT_DIR` points to actual location (`/home/yoga999/yoyo-dev/setup/`)

### Testing Strategy

**Test scenarios:**
1. ✅ Direct execution: `./setup/yoyo-update.sh` (should work before and after)
2. ✅ Via symlink: `/usr/local/bin/yoyo-update` (currently fails, should work after fix)
3. ✅ From different directory: `cd ~ && yoyo-update` (should work)
4. ✅ Verify functions.sh is sourced correctly in all cases

## Technical Details

### Bash Path Resolution Differences

**`$0` behavior:**
- When script executed directly: `/path/to/script.sh`
- When script executed via symlink: `/path/to/symlink` (❌ not what we want)

**`${BASH_SOURCE[0]}` behavior:**
- When script executed directly: `/path/to/script.sh`
- When script executed via symlink: `/path/to/symlink` (same as `$0`)
- **BUT** can be tested with `[ -L ]` and resolved with `readlink -f`

**`readlink -f` behavior:**
- Resolves ALL symlinks in path (including intermediate directories)
- Returns absolute canonicalized path
- Works reliably across different working directories

### Impact Analysis

**Users Affected:**
- ✅ All users with base Yoyo Dev installation at `/usr/local`
- ✅ All users with system-wide installation via global symlinks
- ❌ Users calling script directly (already works)

**Workflows Affected:**
- ❌ `yoyo-update` command (BROKEN)
- ✅ Direct `./setup/yoyo-update.sh` (works)
- ✅ `yoyo` command (works - already has fix)

## Success Criteria

- [ ] `yoyo-update.sh` resolves symlinks before calculating SCRIPT_DIR
- [ ] `functions.sh` is successfully sourced when called via symlink
- [ ] `yoyo-update` command works from any directory
- [ ] No regression in direct execution behavior
- [ ] Consistent with `yoyo.sh` implementation pattern

## Risk Assessment

**Risk Level:** Low
- Simple 4-line code addition
- Proven pattern already used in `yoyo.sh`
- No logic changes, just path resolution
- Easy to test and verify

**Impact:** High (when deployed)
- Fixes critical command for all users
- Enables update workflow
- Improves user experience significantly

**Backward Compatibility:** ✅ Full
- Direct execution still works
- Symlink execution now works
- No breaking changes

## Related Issues

**Previous Similar Fix:**
- 2025-10-30-yoyo-detection-path-fix - Fixed similar path issues in launcher scripts
- Pattern: Scripts need to check for `.yoyo-dev` not `yoyo-dev`

**Related Code:**
- `setup/yoyo.sh` lines 24-30 - Reference implementation (correct pattern)
- `setup/yoyo-update.sh` lines 109-110 - Needs fix
- `setup/yoyo-update.sh` line 121 - Where sourcing happens

## Timeline

- **Analysis:** 2025-10-30 ✅
- **Implementation:** TBD
- **Testing:** TBD
- **Deployment:** TBD

## Next Steps

1. Write test suite to verify current failure and future success
2. Apply symlink resolution fix to lines 109-110
3. Test all execution scenarios
4. Verify functions.sh sourcing works correctly
5. Commit and deploy fix
