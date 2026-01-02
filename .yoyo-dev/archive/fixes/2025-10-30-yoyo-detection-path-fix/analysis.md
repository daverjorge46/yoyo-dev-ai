# Fix Analysis: Yoyo Detection Path Mismatch

**Fix ID:** 2025-10-30-yoyo-detection-path-fix
**Created:** 2025-10-30
**Issue Type:** Bug - Installation Detection Failure
**Severity:** High
**Priority:** Critical

## Problem Summary

The `yoyo` command incorrectly reports "Yoyo Dev not detected" in projects where `.yoyo-dev/` directory exists, preventing users from launching the TUI dashboard.

## Root Cause Analysis

### The Issue

Multiple launcher scripts check for the **wrong directory name** when detecting yoyo-dev installation:

**Incorrect checks:**
```bash
[ ! -d "./yoyo-dev" ]   # Looking for non-hidden directory
```

**Should be:**
```bash
[ ! -d "./.yoyo-dev" ]  # Looking for hidden directory
```

### Why This Happens

1. Yoyo Dev migrated from `yoyo-dev/` (non-hidden) to `.yoyo-dev/` (hidden) directory format
2. The `project.sh` installer was updated to use `.yoyo-dev/`
3. The launcher scripts (`yoyo.sh`, `yoyo-tui-launcher.sh`, `yoyo-tmux.sh`) were **not updated** to match
4. Detection logic still checks for old `./yoyo-dev` path
5. Users see false negatives: "not installed" when it actually is installed

### Evidence

**Correct pattern from `project.sh` (line 73):**
```bash
INSTALL_DIR="./.yoyo-dev"  # Correct: hidden directory
```

**Incorrect patterns in launcher scripts:**

1. **`setup/yoyo.sh`** (lines 290, 348):
   ```bash
   if [ ! -d "./yoyo-dev" ]; then
       echo "Yoyo Dev not detected in this project"
   ```

2. **`setup/yoyo-tui-launcher.sh`** (line 16):
   ```bash
   if [ ! -d "./yoyo-dev" ]; then
       echo "Error: Yoyo Dev is not installed"
   ```

3. **`setup/yoyo-tmux.sh`** (line 51):
   ```bash
   if [ ! -d "./yoyo-dev" ]; then
       echo "⚠️  Yoyo Dev not detected"
   ```

**Correct pattern from `yoyo-global-launcher.sh` (line 99+):**
```bash
find_project_root() {
    if [ -d "$current_dir/.yoyo-dev" ]; then  # Correct: checks for hidden directory
        echo "$current_dir"
        return 0
    fi
}
```

## Affected Files

| File | Lines | Issue |
|------|-------|-------|
| `setup/yoyo.sh` | 290, 348 | Wrong path check: `./yoyo-dev` → `./.yoyo-dev` |
| `setup/yoyo-tui-launcher.sh` | 16 | Wrong path check: `./yoyo-dev` → `./.yoyo-dev` |
| `setup/yoyo-tmux.sh` | 51 | Wrong path check: `./yoyo-dev` → `./.yoyo-dev` |

## Solution Approach

### Fix Strategy

**Simple path correction:** Update all three launcher scripts to check for `./.yoyo-dev` instead of `./yoyo-dev`.

### Implementation Plan

1. **Write tests** to verify detection logic:
   - Test with `.yoyo-dev/` present (should detect as installed)
   - Test with `yoyo-dev/` present (old format, should warn)
   - Test with neither present (should show installation instructions)

2. **Update `setup/yoyo.sh`**:
   - Line 290: Change check to `./.yoyo-dev`
   - Line 348: Change check to `./.yoyo-dev`
   - Preserve all error messages and logic flow

3. **Update `setup/yoyo-tui-launcher.sh`**:
   - Line 16: Change check to `./.yoyo-dev`
   - Preserve all error messages and logic flow

4. **Update `setup/yoyo-tmux.sh`**:
   - Line 51: Change check to `./.yoyo-dev`
   - Preserve all error messages and logic flow

5. **Verify tests pass** after changes

### Testing Strategy

**Test scenarios:**
1. ✅ Project with `.yoyo-dev/` → Detected as installed
2. ⚠️  Project with old `yoyo-dev/` → Show migration warning
3. ❌ Project without either → Show installation instructions
4. ✅ All launcher scripts use consistent detection logic

### Success Criteria

- [ ] All three launcher scripts check for `./.yoyo-dev`
- [ ] Detection works correctly in projects with `.yoyo-dev/` installed
- [ ] Tests pass for all detection scenarios
- [ ] No regressions in error messaging
- [ ] Consistent detection logic across all launchers

## Technical Details

### File Change Summary

**`setup/yoyo.sh`:**
```diff
# Line 290
-if [ ! -d "./yoyo-dev" ]; then
+if [ ! -d "./.yoyo-dev" ]; then

# Line 348
-if [ ! -d "./yoyo-dev" ]; then
+if [ ! -d "./.yoyo-dev" ]; then
```

**`setup/yoyo-tui-launcher.sh`:**
```diff
# Line 16
-if [ ! -d "./yoyo-dev" ]; then
+if [ ! -d "./.yoyo-dev" ]; then
```

**`setup/yoyo-tmux.sh`:**
```diff
# Line 51
-if [ ! -d "./yoyo-dev" ]; then
+if [ ! -d "./.yoyo-dev" ]; then
```

### Backward Compatibility

**Migration path:** The `project.sh` script already handles migration from old format:
```bash
# Lines 85-92 in project.sh
if [ -d "$INSTALL_DIR" ] && [ ! -d "./.yoyo-dev" ]; then
    echo "⚠️  Warning: Found old 'yoyo-dev/' directory"
    echo "Yoyo Dev now uses '.yoyo-dev/' (hidden directory)"
fi
```

This means:
- ✅ Users with old `yoyo-dev/` get clear migration instructions
- ✅ New installations use `.yoyo-dev/` automatically
- ✅ Detection logic will match actual installation format

### Risk Assessment

**Risk Level:** Low
- Changes are isolated to path string literals
- No logic changes required
- Easy to rollback if issues arise
- Well-tested migration path already exists

**Impact:** High
- Fixes critical user-facing bug
- Improves developer experience
- Aligns all scripts with current installation format

## Next Steps

1. Create test suite for detection logic
2. Implement path corrections in all three files
3. Run tests to verify detection works correctly
4. Manual testing with actual `.yoyo-dev/` installation
5. Commit changes with descriptive message
6. Update changelog/documentation if needed

## Related Files

- `setup/project.sh` - Contains correct `.yoyo-dev` pattern (reference implementation)
- `setup/yoyo-global-launcher.sh` - Contains correct detection logic (lines 99+)
- `setup/yoyo.sh` - Requires fix (lines 290, 348)
- `setup/yoyo-tui-launcher.sh` - Requires fix (line 16)
- `setup/yoyo-tmux.sh` - Requires fix (line 51)

## Timeline

- **Analysis:** 2025-10-30 ✅
- **Implementation:** TBD
- **Testing:** TBD
- **Deployment:** TBD
