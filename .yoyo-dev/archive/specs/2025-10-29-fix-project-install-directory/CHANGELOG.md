# Changelog: Fix Project Install Directory

## Date: 2025-10-29

## Summary

Fixed Yoyo Dev installation scripts to correctly use `.yoyo-dev/` (hidden directory with dot prefix) for project installations instead of `yoyo-dev/` (visible directory), ensuring consistency with dotfile conventions and documentation.

## Changes

### 1. Installation Script (`setup/project.sh`)

**Changed:**
- Line 73: Updated `INSTALL_DIR` from `"./yoyo-dev"` to `"./.yoyo-dev"`
- Replaced 59 hardcoded `"./yoyo-dev"` references with `"$INSTALL_DIR"` variable
- Added home directory validation (lines 75-83) to prevent installing in `~/` (protects base installation)
- Added migration instructions for existing `yoyo-dev/` installations (lines 85-96)
- Updated all echo/output messages to reference `.yoyo-dev/` correctly
- Fixed incomplete documentation URL (line 647)

**Impact:**
- ✅ Project installations now create `.yoyo-dev/` (hidden, following dotfile convention)
- ✅ Cannot accidentally install in home directory (would conflict with base installation)
- ✅ Clear migration path for users with old installations
- ✅ All file operations use consistent directory variable

### 2. Update Script (`setup/yoyo-update.sh`)

**Changed:**
- Line 84: Updated installation detection from `"./yoyo-dev"` to `"./.yoyo-dev"`
- Replaced 41 hardcoded `"./yoyo-dev"` references with `"./.yoyo-dev"`
- Added migration hint for old installations (lines 88-96)
- Updated all copy_file, copy_directory, and rsync operations to target `./.yoyo-dev/`
- Kept one intentional check for old directory (migration detection)

**Impact:**
- ✅ Update script correctly detects `.yoyo-dev/` installations
- ✅ Provides helpful migration instructions for old installations
- ✅ All update operations target correct hidden directory

### 3. Base Installation Protection

**Verification:**
- ✅ Base installation at `~/yoyo-dev/` (visible, no dot) is never modified
- ✅ Project scripts only write to `./.yoyo-dev/` (project-local hidden directory)
- ✅ BASE_YOYO_DEV variable used as read-only source
- ✅ No operations write to `$HOME/yoyo-dev/`

## Testing

### Test Coverage

Created comprehensive test suites:

1. **`tests/test_project_install_directory.sh`** (8 tests)
   - ✅ INSTALL_DIR variable correctness
   - ✅ No hardcoded paths
   - ✅ All operations use $INSTALL_DIR
   - ✅ Home directory validation exists
   - ✅ Migration instructions present
   - ✅ Output messages reference correct directory
   - ✅ Confirmation messages correct
   - ✅ Documentation URL complete

2. **`tests/test_update_directory.sh`** (8 tests)
   - ✅ Installation detection checks `./.yoyo-dev`
   - ✅ Minimal references to old directory (1 expected)
   - ✅ All copy operations use `./.yoyo-dev/`
   - ✅ Error messages reference correct directory
   - ✅ Migration hint present
   - ✅ TUI library check uses correct path
   - ✅ Rsync operations use correct path
   - ✅ Success messages reference correct directory

3. **`tests/test_base_installation_isolation.sh`** (8 tests)
   - ✅ Home directory validation prevents base modification
   - ✅ BASE_YOYO_DEV variable used for base
   - ✅ project.sh only writes to $INSTALL_DIR
   - ✅ yoyo-update.sh only updates `./.yoyo-dev/`
   - ✅ BASE_YOYO_DEV used as source only
   - ✅ No hardcoded `~/yoyo-dev/` writes in project.sh
   - ✅ No hardcoded `~/yoyo-dev/` writes in yoyo-update.sh
   - ✅ Scripts treat `~/yoyo-dev/` as read-only source

4. **`tests/test_integration_installation.sh`** (10 tests)
   - ✅ `.yoyo-dev/` is hidden (not shown in standard `ls`)
   - ✅ `.yoyo-dev/` shown with `ls -a`
   - ✅ Installation references correct directory
   - ✅ Update script detects correct directory
   - ✅ Migration instructions present in both scripts
   - ✅ Home directory protection exists
   - ✅ All operations use consistent references
   - ✅ Base installation never modified

**Total:** 34 tests, all passing ✅

## Directory Structure

### Before (Incorrect)

```
project-root/
├── yoyo-dev/              ← WRONG: Visible directory (no dot)
│   ├── instructions/
│   ├── standards/
│   └── ...
└── src/
```

### After (Correct)

```
project-root/
├── .yoyo-dev/             ← CORRECT: Hidden directory (with dot)
│   ├── instructions/
│   ├── standards/
│   └── ...
└── src/
```

### Base Installation (Unchanged)

```
~/
└── yoyo-dev/              ← Correct: Visible, easy access (base installation)
    ├── instructions/
    ├── standards/
    ├── setup/
    └── ...
```

## Migration Guide

For users with existing `yoyo-dev/` installations:

```bash
# In your project directory
mv yoyo-dev .yoyo-dev

# Then run update script
~/.yoyo-dev/setup/yoyo-update.sh
```

The scripts will automatically detect old installations and provide migration instructions.

## Benefits

1. **Follows Conventions**: `.yoyo-dev/` follows standard dotfile conventions for tool configurations
2. **Cleaner Projects**: Hidden directory keeps project root cleaner in file listings
3. **Clear Separation**: Visible `~/yoyo-dev/` (base) vs hidden `./.yoyo-dev/` (project) makes purpose clear
4. **Protected Base**: Base installation can never be accidentally modified by project operations
5. **Easy Migration**: Clear instructions for existing installations

## Files Modified

- `setup/project.sh` - Installation script
- `setup/yoyo-update.sh` - Update script
- `tests/test_project_install_directory.sh` - New test file
- `tests/test_update_directory.sh` - New test file
- `tests/test_base_installation_isolation.sh` - New test file
- `tests/test_integration_installation.sh` - New test file

## Backward Compatibility

- ✅ Scripts detect old `yoyo-dev/` installations
- ✅ Provide clear migration instructions
- ✅ Base installation at `~/yoyo-dev/` unchanged
- ✅ No automatic migration (manual for safety)
- ✅ All existing workflows continue to work after migration

## Related Files

- Spec: `.yoyo-dev/specs/2025-10-29-fix-project-install-directory/spec.md`
- Tasks: `.yoyo-dev/specs/2025-10-29-fix-project-install-directory/tasks.md`
- State: `.yoyo-dev/specs/2025-10-29-fix-project-install-directory/state.json`
