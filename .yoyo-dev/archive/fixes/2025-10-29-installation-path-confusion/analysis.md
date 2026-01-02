# Fix Analysis: Installation Path Confusion

**Date:** 2025-10-29
**Fix Name:** installation-path-confusion
**Issue Type:** Configuration Error
**Priority:** High
**Status:** Analysis Complete

---

## Problem Summary

The Yoyo Dev installation has conflicting path expectations causing the `yoyo` command to fail. The error occurs because:

1. **Base installation exists at:** `~/yoyo-dev/` (non-hidden directory)
2. **Global command expects:** `~/.yoyo-dev/` (hidden directory)
3. **Result:** Command not found error when running `yoyo`

---

## Root Cause Analysis

### Current State (Broken)

```bash
# Base installation location
~/yoyo-dev/                    # ✓ EXISTS (visible directory)

# Global command symlinks
/usr/local/bin/yoyo -> ~/.yoyo-dev/setup/yoyo-launcher-v2.sh  # ✗ BROKEN (target doesn't exist)
/usr/local/bin/yoyo-update -> ~/.yoyo-dev/setup/yoyo-update-wrapper.sh  # ✗ BROKEN (target doesn't exist)

# What actually exists
~/yoyo-dev/setup/yoyo.sh                   # ✓ EXISTS
~/yoyo-dev/setup/yoyo-update.sh            # ✓ EXISTS

# What's missing
~/.yoyo-dev/                               # ✗ DOESN'T EXIST
~/.yoyo-dev/setup/yoyo-launcher-v2.sh      # ✗ DOESN'T EXIST
~/.yoyo-dev/setup/yoyo-update-wrapper.sh   # ✗ DOESN'TEXIST
```

### Path Convention Inconsistency

The codebase uses **two different path conventions**:

**Convention 1: Visible `~/yoyo-dev/` (Base Installation)**
- Used by: Base installation scripts
- Location: `~/yoyo-dev/`
- Purpose: Source for all Yoyo Dev files
- Status: ✓ Correctly implemented

**Convention 2: Hidden `~/.yoyo-dev/` (Project Installation)**
- Used by: Project-local installations
- Location: `<project>/.yoyo-dev/`
- Purpose: Project-specific Yoyo Dev files
- Status: ✓ Correctly implemented for projects

**The Problem:** Global commands (`/usr/local/bin/yoyo`) point to `~/.yoyo-dev/` (hidden) but the base installation is at `~/yoyo-dev/` (visible).

---

## Investigation Evidence

### 1. Base Installation Directory Structure
```bash
~/yoyo-dev/
├── setup/
│   ├── yoyo.sh                    # ✓ TUI launcher script (exists)
│   ├── yoyo-update.sh             # ✓ Update script (exists)
│   ├── project.sh                 # ✓ Project installer (exists)
│   ├── yoyo-global-launcher.sh    # ? Unknown purpose
│   ├── yoyo-tui-launcher.sh       # ? Duplicate launcher?
│   └── install-global-command.sh  # ? Separate installer?
├── lib/
├── instructions/
├── standards/
└── ...
```

### 2. Global Command Symlinks (Broken)
```bash
$ ls -la /usr/local/bin/ | grep yoyo
lrwxrwxrwx  1 root root  49 Oct 10 14:03 yoyo -> /home/yoga999/.yoyo-dev/setup/yoyo-launcher-v2.sh
lrwxrwxrwx  1 root root  52 Oct 27 10:58 yoyo-update -> /home/yoga999/.yoyo-dev/setup/yoyo-update-wrapper.sh
```

**Problem:** Both symlinks point to `~/.yoyo-dev/` which doesn't exist.

### 3. Installation Script Behavior

**`setup/project.sh` (line 278):**
```bash
if sudo ln -sf "$HOME/yoyo-dev/setup/yoyo.sh" /usr/local/bin/yoyo 2>/dev/null; then
    echo "  ✓ yoyo command installed globally"
```

**Expected:** Should create symlink to `~/yoyo-dev/setup/yoyo.sh`
**Actual:** Creates symlink to `~/.yoyo-dev/setup/yoyo-launcher-v2.sh` (doesn't exist)

This indicates the symlink creation is being overridden elsewhere or the script's intention differs from execution.

### 4. Update Script Behavior

**`setup/yoyo-update.sh` (line 238):**
```bash
if sudo cp "$BASE_YOYO_DEV/setup/yoyo-launcher-v2.sh" /usr/local/bin/yoyo 2>/dev/null
```

References `yoyo-launcher-v2.sh` which doesn't exist in the base installation.

---

## Design Decisions to Make

### Option 1: Keep Visible Base (Recommended)
**Base Installation:** `~/yoyo-dev/` (visible)
**Global Commands:** Point directly to `~/yoyo-dev/setup/`
**Reasoning:**
- ✅ Base installation is meant to be visible (user may want to inspect/modify)
- ✅ Minimal changes required
- ✅ Aligns with documentation that shows `~/yoyo-dev/`
- ✅ Clear separation: `~/yoyo-dev/` = base, `.yoyo-dev/` = project-local

**Changes needed:**
1. Fix global symlinks to point to `~/yoyo-dev/setup/yoyo.sh`
2. Remove references to non-existent `.yoyo-dev/` in home directory
3. Ensure all scripts use `~/yoyo-dev/` consistently for base installation

### Option 2: Move to Hidden Base
**Base Installation:** `~/.yoyo-dev/` (hidden)
**Global Commands:** Keep as-is
**Reasoning:**
- ❌ Breaking change (requires moving existing installations)
- ❌ Hidden directory makes troubleshooting harder
- ❌ Inconsistent with documentation
- ⚠️ May confuse users expecting visible directory

**Not recommended.**

### Option 3: Dual Support
Support both `~/yoyo-dev/` and `~/.yoyo-dev/` with detection logic.
**Reasoning:**
- ❌ Adds complexity
- ❌ Doesn't solve the confusion
- ❌ Two sources of truth

**Not recommended.**

---

## Recommended Solution: Option 1

### Fix Strategy

**1. Standardize Base Installation Path**
- Base installation: `~/yoyo-dev/` (visible, non-hidden)
- Project installations: `<project>/.yoyo-dev/` (hidden)
- Clear separation and no confusion

**2. Fix Global Command Symlinks**
- `/usr/local/bin/yoyo` → `~/yoyo-dev/setup/yoyo.sh`
- `/usr/local/bin/yoyo-update` → `~/yoyo-dev/setup/yoyo-update-wrapper.sh` (or direct to `yoyo-update.sh`)

**3. Consolidate Launcher Scripts**
Current situation:
- `setup/yoyo.sh` - Main TUI launcher (20KB, comprehensive)
- `setup/yoyo-global-launcher.sh` - Purpose unclear (3.9KB)
- `setup/yoyo-tui-launcher.sh` - Purpose unclear (1.4KB)
- `setup/yoyo-launcher-v2.sh` - Referenced but doesn't exist

**Decision:** Use `setup/yoyo.sh` as the single launcher script.

**4. Fix Installation Scripts**
Update `project.sh` and `yoyo-update.sh` to:
- Create correct symlinks pointing to `~/yoyo-dev/`
- Remove references to non-existent wrapper scripts
- Use `yoyo.sh` directly for the global command

---

## Files Affected

### Must Fix (Core Issue)
1. **`/usr/local/bin/yoyo`** - Broken symlink, must repoint to `~/yoyo-dev/setup/yoyo.sh`
2. **`/usr/local/bin/yoyo-update`** - Broken symlink, must repoint correctly
3. **`setup/project.sh`** (lines 265-322) - Fix symlink creation logic
4. **`setup/yoyo-update.sh`** (lines 232-293) - Fix symlink update logic

### Should Review (Cleanup)
5. **`setup/yoyo-global-launcher.sh`** - Determine purpose or remove
6. **`setup/yoyo-tui-launcher.sh`** - Determine purpose or remove
7. **Documentation** - Update any references to paths

### Won't Touch (Working Correctly)
- Project-local `.yoyo-dev/` installations work fine
- Base directory structure `~/yoyo-dev/` is correct
- TUI launcher script `setup/yoyo.sh` works correctly

---

## Testing Plan

### Pre-Fix Validation (Confirms Problem)
```bash
# Should fail (current state)
$ yoyo
# Expected: "Command 'yoyo' not found" or broken symlink error

# Should show broken symlinks
$ ls -la /usr/local/bin/ | grep yoyo
# Expected: Points to non-existent ~/.yoyo-dev/
```

### Post-Fix Validation (Confirms Solution)
```bash
# 1. Check symlinks point to correct location
$ ls -la /usr/local/bin/yoyo
# Expected: -> /home/yoga999/yoyo-dev/setup/yoyo.sh

$ ls -la /usr/local/bin/yoyo-update
# Expected: -> /home/yoga999/yoyo-dev/setup/yoyo-update.sh (or wrapper if kept)

# 2. Verify target files exist
$ ls -la ~/yoyo-dev/setup/yoyo.sh
$ ls -la ~/yoyo-dev/setup/yoyo-update.sh

# 3. Test yoyo command launches TUI
$ yoyo
# Expected: Shows branded header and launches TUI dashboard

# 4. Test yoyo-update works
$ cd /home/yoga999/PROJECTS/yoyo-dev
$ yoyo-update
# Expected: Updates project installation successfully

# 5. Verify new project installations work
$ cd /tmp/test-project
$ ~/yoyo-dev/setup/project.sh --claude-code
$ yoyo
# Expected: Installs correctly and yoyo command works
```

---

## Success Criteria

- [x] **Root cause identified:** Path mismatch between base installation and global commands
- [x] **Solution designed:** Standardize on `~/yoyo-dev/` for base installation
- [ ] **Symlinks fixed:** Global commands point to existing files
- [ ] **Scripts updated:** `project.sh` and `yoyo-update.sh` create correct symlinks
- [ ] **All tests pass:** Commands work in all contexts
- [ ] **Documentation updated:** Paths are consistent across docs

---

## Implementation Notes

### Backward Compatibility
- Users with existing `~/yoyo-dev/` installations: ✅ No changes needed (just fix symlinks)
- Users with `.yoyo-dev/` in home (none expected): Migration not needed

### Migration Path (If Needed)
If any users somehow have `~/.yoyo-dev/` as base installation:
```bash
# Detect and migrate
if [ -d ~/.yoyo-dev ] && [ ! -d ~/yoyo-dev ]; then
    mv ~/.yoyo-dev ~/yoyo-dev
fi
```

### Immediate Fix (Temporary Workaround)
Users can fix manually right now:
```bash
sudo ln -sf ~/yoyo-dev/setup/yoyo.sh /usr/local/bin/yoyo
chmod +x ~/yoyo-dev/setup/yoyo.sh
```

---

## Related Issues

- **Documentation clarity:** Ensure README and docs consistently show `~/yoyo-dev/`
- **Script naming:** Too many launcher scripts with unclear purposes
- **Error messages:** Should be clearer about path expectations when command fails

---

## Next Steps

1. ✅ **Analysis complete** - Root cause and solution documented
2. 🔄 **Create task breakdown** - TDD-based fix implementation
3. ⏳ **Execute fix** - Update scripts and symlinks
4. ⏳ **Test thoroughly** - Validate all scenarios
5. ⏳ **Update docs** - Ensure consistency
