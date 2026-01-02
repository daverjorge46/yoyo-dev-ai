# Problem Analysis

> Fix: venv-broken-shebang
> Created: 2025-11-05
> Priority: HIGH

## Problem Description

The `yoyo-update` command fails when attempting to upgrade Python dependencies in the virtual environment. Users encounter a "required file not found" error when the script tries to execute pip from the venv.

## Reproduction Steps

1. Run `yoyo-update` command
2. Script detects existing venv and attempts to upgrade dependencies
3. Execution of `/home/yoga999/yoyo-dev/venv/bin/pip` fails with error:
   ```
   timeout: failed to run command '/home/yoga999/yoyo-dev/venv/bin/pip': No such file or directory
   ```
4. Manual execution also fails:
   ```
   bash: /home/yoga999/yoyo-dev/venv/bin/pip: cannot execute: required file not found
   ```

**Expected Behavior**: pip should execute successfully and upgrade dependencies

**Actual Behavior**: pip fails because the python interpreter referenced in its shebang doesn't exist

## Root Cause

The virtual environment suffers from **broken shebang paths**. This occurs due to a path mismatch:

1. The pip script has shebang: `#!/home/yoga999/.yoyo-dev/venv/bin/python3`
2. But venv actually exists at: `/home/yoga999/yoyo-dev/venv/`
3. The python interpreter at the shebang path doesn't exist
4. Result: "required file not found" error

**Why This Happens**:
- Virtual environments created with Python's venv module use **hardcoded absolute paths** in all executable scripts
- If the venv is moved or the installation path changes, these shebangs break
- This is likely a migration issue from old `~/.yoyo-dev/` location to `~/yoyo-dev/`

**Technical Details**:
- pip file exists and is executable (`-rwxr-xr-x`)
- pip is a valid Python script with shebang line
- The shebang points to a non-existent python interpreter
- When bash tries to execute pip, the kernel can't find the interpreter

**Affected Files**:
- `setup/yoyo-update.sh:457-470` - Venv validation logic
- `/home/yoga999/yoyo-dev/venv/bin/pip` - Broken shebang
- All other venv executables likely have same issue

## Impact Assessment

- **Severity**: HIGH - Blocks ability to update dependencies
- **Affected Users**: Anyone with mismatched venv paths (migration scenarios, moved installations)
- **Affected Functionality**:
  - Dependency upgrades via yoyo-update
  - Any script that tries to use the venv pip
- **Workaround Available**: YES - Manually recreate the virtual environment

## Solution Approach

Enhance venv validation to detect broken shebangs and automatically recreate corrupted virtual environments.

**Implementation Steps**:

1. **Add shebang validation function** - Extract and validate python interpreter path from pip's shebang
2. **Enhance yoyo-update.sh** - Add broken venv detection before attempting to use pip
3. **Auto-recovery** - If broken venv detected, automatically recreate it using install-deps.sh
4. **User messaging** - Clear feedback about what's happening and why

**Testing Strategy**:
- Test with valid venv (existing good path)
- Test with broken shebang (mismatched path)
- Test with missing venv
- Test auto-recovery flow
- Verify all executables work after recreation

**Risk Assessment**:
- **Breaking Changes**: NO - Only improves existing error handling
- **Performance Impact**: NEUTRAL - Validation adds ~10ms, only runs during updates
- **Side Effects**: POSITIVE - Automatically fixes broken venvs without user intervention
