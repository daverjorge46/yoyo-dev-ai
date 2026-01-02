# Fix Analysis: yoyo-update Path Resolution Issues

**Date:** 2025-10-30
**Type:** Bug Fix
**Severity:** High
**Component:** setup/yoyo-update.sh

## Problem Summary

The `yoyo-update` command fails when run from a project directory with two critical errors:

1. **Global symlink update fails** - Cannot update `/usr/local/bin/yoyo-update` symlink
2. **Virtual environment path is wrong** - Script hardcodes `~/yoyo-dev/venv` but venv doesn't exist there

## Error Messages

```
📂 CLI Launcher:
→ Updating global 'yoyo' command (launches TUI)...
⚠️  Cannot update global command (requires write permissions)
   Run manually: sudo ln -sf ~/yoyo-dev/setup/yoyo.sh /usr/local/bin/yoyo
✓ setup/yoyo.sh (TUI launcher) (overwritten)
✓ setup/yoyo-tmux.sh (deprecated) (overwritten)
→ Updating global 'yoyo-update' command...
⚠️  Cannot update global symlink (requires write permissions)
   Run manually: sudo ln -sf ~/yoyo-dev/setup/yoyo-update.sh /usr/local/bin/yoyo-update

Upgrading dependencies in virtual environment...
timeout: failed to run command '/home/yoga999/yoyo-dev/venv/bin/pip': No such file or directory
⚠️  Dependency upgrade timed out or failed
```

## Root Cause Analysis

### Issue 1: Circular Symlink Update Logic

**Location:** `setup/yoyo-update.sh:244-299`

**Problem:**
The script tries to update the global `/usr/local/bin/yoyo-update` symlink while the script itself is running through that symlink. This creates a circular dependency:

1. User runs `yoyo-update` (via symlink `/usr/local/bin/yoyo-update`)
2. Symlink points to `/home/yoga999/yoyo-dev/setup/yoyo-update.sh`
3. Script tries to update the same symlink it's running from
4. Requires sudo permissions but script isn't running as root

**Current code:**
```bash
if [ -L "/usr/local/bin/yoyo-update" ] || [ -f "/usr/local/bin/yoyo-update" ]; then
    echo "  → Updating global 'yoyo-update' command..."
    if [ -w "/usr/local/bin" ]; then
        ln -sf "$HOME/yoyo-dev/setup/yoyo-update.sh" /usr/local/bin/yoyo-update
        echo "  ✓ yoyo-update command updated globally"
    else
        echo "  ⚠️  Cannot update global symlink (requires write permissions)"
        echo "     Run manually: sudo ln -sf ~/yoyo-dev/setup/yoyo-update.sh /usr/local/bin/yoyo-update"
    fi
fi
```

**Why it's problematic:**
- User shouldn't need sudo for routine updates
- Self-updating symlinks is an anti-pattern
- Warning message appears on every update (noise)
- Hardcodes `$HOME/yoyo-dev` instead of using resolved `$BASE_YOYO_DEV`

### Issue 2: Hardcoded Virtual Environment Path

**Location:** `setup/yoyo-update.sh:492-515`

**Problem:**
The script hardcodes the virtual environment path as `$HOME/yoyo-dev/venv` instead of dynamically resolving the base installation directory.

**Current code:**
```bash
if [ -d "$HOME/yoyo-dev/venv" ]; then
    if "$HOME/yoyo-dev/venv/bin/python3" -c "import rich, watchdog, yaml, textual" &> /dev/null 2>&1; then
        DEPS_INSTALLED=true
        TUI_INSTALLED=true
    fi
fi

# Later in dependency upgrade:
if [ -d "$HOME/yoyo-dev/venv" ]; then
    echo "Upgrading dependencies in virtual environment..."
    timeout 300 "$HOME/yoyo-dev/venv/bin/pip" install --upgrade -r "$HOME/yoyo-dev/requirements.txt" --no-input --disable-pip-version-check || {
        echo "⚠️  Dependency upgrade timed out or failed"
        echo "   You can upgrade manually: $HOME/yoyo-dev/venv/bin/pip install --upgrade -r $HOME/yoyo-dev/requirements.txt"
    }
fi
```

**Why it fails:**
- Assumes Yoyo Dev base is always at `~/yoyo-dev`
- Doesn't use the already-resolved `$BASE_YOYO_DEV` variable
- Virtual environment is actually at `/home/yoga999/yoyo-dev/venv` (non-hidden)
- Script is run from project directory but tries to upgrade base installation dependencies
- Inconsistent with how the script resolves other paths (using `$BASE_YOYO_DEV`)

**Investigation results:**
```bash
# Script correctly resolves base path:
BASE_YOYO_DEV=/home/yoga999/PROJECTS/yoyo-dev  # (resolved from symlink)

# But then hardcodes different path for venv:
VENV_PATH="$HOME/yoyo-dev/venv"  # WRONG - inconsistent

# Should use:
VENV_PATH="$BASE_YOYO_DEV/venv"  # CORRECT - consistent with resolved path
```

### Issue 3: Path Resolution Inconsistency

**Comparison of path resolution approaches:**

| Resource | Resolution Method | Example Path |
|----------|------------------|--------------|
| Instructions | `$BASE_YOYO_DEV/instructions` | ✅ Dynamic |
| Standards | `$BASE_YOYO_DEV/standards` | ✅ Dynamic |
| Commands | `$BASE_YOYO_DEV/commands` | ✅ Dynamic |
| Agents | `$BASE_YOYO_DEV/claude-code/agents` | ✅ Dynamic |
| Global symlinks | `$HOME/yoyo-dev/setup/*.sh` | ❌ Hardcoded |
| Virtual env | `$HOME/yoyo-dev/venv` | ❌ Hardcoded |
| Requirements | `$HOME/yoyo-dev/requirements.txt` | ❌ Hardcoded |

The script correctly resolves `$BASE_YOYO_DEV` using symlink resolution (lines 112-118):

```bash
SCRIPT_PATH="${BASH_SOURCE[0]}"
# Resolve symlink if this script is executed via symlink
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
BASE_YOYO_DEV="$(dirname "$SCRIPT_DIR")"
```

But then ignores this resolved path for global symlinks and venv operations.

## Impact Assessment

**Severity: High**

**Affected workflows:**
- ✅ Core update functionality works (instructions, standards, commands, agents)
- ❌ Dependency upgrades fail silently
- ❌ Users see unnecessary permission warnings on every update
- ❌ Manual sudo commands suggested use wrong path

**User experience impact:**
- **Confusion:** Users see permission errors but update appears to succeed
- **Stale dependencies:** Python packages don't get upgraded
- **Security risk:** Users may run suggested sudo commands without understanding why
- **Inconsistency:** Some paths resolved correctly, others hardcoded

## Proposed Solution

### 1. Remove Self-Updating Symlink Logic

**Rationale:**
- Global symlinks should only be created during initial installation
- Updates shouldn't require modifying system-wide files
- Reduces complexity and potential security issues
- Eliminates permission warnings

**Implementation:**
Remove lines 244-299 entirely. Symlink updates belong in installation scripts, not update scripts.

### 2. Use $BASE_YOYO_DEV for All Path References

**Rationale:**
- Script already resolves base path correctly
- Consistent with how other resources are referenced
- Works regardless of where Yoyo Dev is installed
- Respects symlink resolution

**Implementation:**
Replace all instances of:
- `$HOME/yoyo-dev/venv` → `$BASE_YOYO_DEV/venv`
- `$HOME/yoyo-dev/requirements.txt` → `$BASE_YOYO_DEV/requirements.txt`
- `$HOME/yoyo-dev/setup/yoyo.sh` → `$BASE_YOYO_DEV/setup/yoyo.sh`
- `$HOME/yoyo-dev/setup/yoyo-update.sh` → `$BASE_YOYO_DEV/setup/yoyo-update.sh`

### 3. Add Validation for Virtual Environment Path

**Rationale:**
- Fail fast if venv doesn't exist
- Provide actionable error messages
- Skip dependency upgrade gracefully if venv not found

**Implementation:**
```bash
# Check if venv exists before attempting upgrade
if [ -d "$BASE_YOYO_DEV/venv" ]; then
    echo "Upgrading dependencies in virtual environment..."
    # ... upgrade logic
else
    echo "ℹ️  Virtual environment not found at $BASE_YOYO_DEV/venv"
    echo "   Dependencies will be checked on next 'yoyo' launch"
fi
```

## Testing Strategy

### Unit Tests (create test script)

**Test 1: Path Resolution**
- Run yoyo-update from project directory
- Verify `$BASE_YOYO_DEV` resolves to actual installation path
- Verify no hardcoded `$HOME/yoyo-dev` paths are used

**Test 2: Virtual Environment Detection**
- Run with venv present → should upgrade dependencies
- Run with venv missing → should skip gracefully with info message
- Run with venv present but no pip → should fail with actionable error

**Test 3: Symlink Handling**
- Verify script doesn't attempt to modify `/usr/local/bin/yoyo-update`
- Verify no permission warnings appear
- Verify no sudo commands suggested

### Integration Tests

**Test 1: Update from Project Directory**
```bash
cd /path/to/project
yoyo-update
# Expected: Clean update with no warnings, dependencies upgraded
```

**Test 2: Update from Base Installation**
```bash
cd ~/yoyo-dev
./setup/yoyo-update.sh
# Expected: Error message explaining script must run from project
```

**Test 3: Update with Alternative Installation Path**
```bash
# Install Yoyo Dev to /opt/yoyo-dev
cd /path/to/project
yoyo-update
# Expected: Resolves to /opt/yoyo-dev correctly
```

## Success Criteria

1. ✅ No permission warnings during routine updates
2. ✅ Virtual environment dependencies upgrade successfully
3. ✅ All paths resolved using `$BASE_YOYO_DEV` (no hardcoded paths)
4. ✅ Script works regardless of Yoyo Dev installation location
5. ✅ Clear, actionable error messages when venv missing
6. ✅ Backward compatible with existing installations
7. ✅ All existing update functionality preserved

## Rollback Plan

If issues arise:
1. Revert `setup/yoyo-update.sh` to commit `00ae9c7`
2. Document specific failure scenario
3. Re-analyze and adjust solution
4. Release hotfix

## Follow-up Tasks

1. **Audit other scripts** for similar hardcoded path issues:
   - `setup/yoyo.sh`
   - `setup/install-deps.sh`
   - `setup/project.sh`

2. **Document path resolution pattern** in developer guide:
   - Always use `$BASE_YOYO_DEV` for base installation references
   - Never hardcode `$HOME/yoyo-dev`
   - Always resolve symlinks for script location

3. **Add path validation tests** to CI/CD:
   - Detect hardcoded paths in bash scripts
   - Verify all paths use `$BASE_YOYO_DEV` variable
   - Test alternative installation locations

## References

- **Original Issue:** Error messages during yoyo-update execution
- **Affected File:** `setup/yoyo-update.sh`
- **Related Commits:**
  - `00ae9c7` - Previous fix for symlink resolution
  - `f0a0136` - Previous update script improvements

## Notes

This fix maintains backward compatibility while improving robustness. The core update functionality (instructions, standards, commands, agents) already works correctly - we're fixing auxiliary features (symlink updates, dependency upgrades) that were implemented incorrectly.

The removal of self-updating symlink logic is the right architectural decision. Installation concerns should be separated from update concerns.
