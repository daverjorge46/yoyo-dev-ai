# Fix Analysis: yoyo-update Command Hangs Indefinitely

**Date:** 2025-10-30
**Priority:** HIGH
**Type:** Bug Fix
**Severity:** Critical - Blocks updates, cannot be interrupted with Ctrl+C

---

## Problem Statement

The `yoyo-update` command hangs indefinitely during execution and cannot be interrupted with Ctrl+C. Users are forced to manually kill the process from another terminal.

**Symptoms:**
- Command hangs after displaying "Installing/updating Yoyo Dev dependencies automatically..."
- Ctrl+C does not terminate the process
- No error messages displayed
- Process must be killed manually

**User Impact:**
- Cannot update Yoyo Dev installations
- Frustrating user experience
- Requires technical knowledge to recover

---

## Root Cause Analysis

### Primary Cause: Interactive pip Install Prompts

**Location:** `setup/yoyo-update.sh:506-510` and `setup/install-deps.sh:71`

The script calls `pip install` without non-interactive flags, which can prompt for user confirmation in scenarios like:
- Package upgrades with breaking changes
- Building packages from source
- Dependency conflicts requiring user choice

**Problematic code:**
```bash
# yoyo-update.sh line 506
"$HOME/yoyo-dev/venv/bin/pip" install --upgrade -r "$HOME/yoyo-dev/requirements.txt"

# install-deps.sh line 71
$PIP install "$package" --quiet
```

**Why Ctrl+C fails:**
- Script uses `set -e` (exit on error)
- pip's interactive prompt doesn't trigger an error
- Prompt waits for stdin input that never arrives
- Ctrl+C signal may be caught/ignored by pip's signal handler

### Secondary Cause: sudo Password Prompts

**Location:** `setup/yoyo-update.sh:243, 251, 278, 286`

Multiple `sudo ln -sf` commands can prompt for password:
```bash
sudo ln -sf "$HOME/yoyo-dev/setup/yoyo.sh" /usr/local/bin/yoyo 2>/dev/null
```

While these redirect stderr, password prompt timeouts can still cause delays.

### Contributing Factor: Missing Non-Interactive Flags

pip commands lack proper non-interactive configuration:
- No `--no-input` flag
- No `--yes` or `-y` flag
- `--quiet` alone doesn't prevent prompts
- Missing `--disable-pip-version-check`

---

## Solution Approach

### Fix Strategy: Make All Commands Non-Interactive

**Goals:**
1. Prevent all interactive prompts during update
2. Make Ctrl+C work reliably
3. Provide clear progress feedback
4. Handle errors gracefully

**Implementation:**

### 1. Fix pip Commands (Priority: CRITICAL)

**Add non-interactive flags to all pip calls:**
```bash
# Old (blocking):
pip install --upgrade -r requirements.txt

# New (non-blocking):
pip install --upgrade -r requirements.txt --no-input --disable-pip-version-check
```

**Files to modify:**
- `setup/install-deps.sh` - Line 71
- `setup/yoyo-update.sh` - Lines 506, 509

**Flags explanation:**
- `--no-input`: Never prompt, use defaults
- `--disable-pip-version-check`: Skip pip version check (reduces hang risk)
- Keep `--quiet` for cleaner output

### 2. Fix sudo Commands (Priority: HIGH)

**Replace sudo with permission check + manual instructions:**
```bash
# Old (can prompt):
sudo ln -sf "$HOME/yoyo-dev/setup/yoyo.sh" /usr/local/bin/yoyo 2>/dev/null

# New (non-blocking):
if [ -w "/usr/local/bin" ]; then
    ln -sf "$HOME/yoyo-dev/setup/yoyo.sh" /usr/local/bin/yoyo
    echo "  ✓ yoyo command updated globally"
else
    echo "  ⚠️  Cannot update global command (requires permissions)"
    echo "     Run manually: sudo ln -sf ~/yoyo-dev/setup/yoyo.sh /usr/local/bin/yoyo"
fi
```

**Alternative approach:** Try without sudo first, fall back to message.

### 3. Add Timeout Protection (Priority: MEDIUM)

**Wrap long-running commands with timeout:**
```bash
# Add timeout to pip operations
timeout 300 pip install --upgrade -r requirements.txt --no-input --disable-pip-version-check || {
    echo "⚠️  Dependency installation timed out after 5 minutes"
    echo "    You can install manually: pip install -r ~/yoyo-dev/requirements.txt"
}
```

### 4. Improve Signal Handling (Priority: LOW)

**Add trap for Ctrl+C:**
```bash
# At top of script
trap 'echo ""; echo "⚠️  Update interrupted by user"; exit 130' INT TERM
```

This ensures Ctrl+C is properly handled even if child processes ignore it.

---

## Test Plan

### Test Cases

**Test 1: Normal update (clean environment)**
```bash
cd /path/to/project
yoyo-update
# Expected: Completes without hanging
```

**Test 2: Update with Ctrl+C interrupt**
```bash
cd /path/to/project
yoyo-update
# Press Ctrl+C during dependency installation
# Expected: Exits cleanly with message
```

**Test 3: Update without sudo permissions**
```bash
# Remove sudo permissions temporarily
cd /path/to/project
yoyo-update
# Expected: Shows manual instruction, continues with rest of update
```

**Test 4: Update with existing venv**
```bash
# Ensure ~/yoyo-dev/venv exists
cd /path/to/project
yoyo-update
# Expected: Uses venv, completes without hanging
```

**Test 5: Update with dependency conflicts**
```bash
# Install conflicting package version
pip install textual==0.40.0  # Old version
cd /path/to/project
yoyo-update
# Expected: Upgrades automatically, no prompt
```

### Acceptance Criteria

✅ Update completes in < 2 minutes (normal case)
✅ Ctrl+C interrupts update immediately
✅ No hanging on pip operations
✅ No sudo password prompts
✅ Clear progress messages throughout
✅ Graceful error handling
✅ Manual fallback instructions when needed

---

## Files to Modify

1. **`setup/install-deps.sh`**
   - Add `--no-input --disable-pip-version-check` to pip calls
   - Add timeout wrapper
   - Add signal trap

2. **`setup/yoyo-update.sh`**
   - Add `--no-input --disable-pip-version-check` to pip calls
   - Replace sudo with permission check
   - Add timeout wrapper
   - Add signal trap

---

## Risks & Mitigations

**Risk 1: Breaking existing installations**
- **Mitigation:** Test with multiple Python versions (3.11, 3.12, 3.13)
- **Mitigation:** Keep backup of old script during rollout

**Risk 2: Timeout too short for slow networks**
- **Mitigation:** Use 5-minute timeout (generous for typical installs)
- **Mitigation:** Show progress during installation

**Risk 3: Missing dependencies due to --no-input**
- **Mitigation:** pip will use safe defaults (upgrade to latest compatible)
- **Mitigation:** Log any skipped upgrades

---

## Success Metrics

**Before fix:**
- 100% of users report hanging
- 0% successful Ctrl+C interrupts
- Requires manual process kill

**After fix:**
- 0% hangs reported
- 100% Ctrl+C success rate
- < 2 minute completion time

---

## Related Files

- `setup/yoyo-update.sh` - Main update script
- `setup/install-deps.sh` - Dependency installer
- `setup/functions.sh` - Shared functions
- `requirements.txt` - Python dependencies

---

## Notes

- The `set -e` flag is appropriate and should be kept
- Consider adding `set -u` to catch undefined variables
- The dependency auto-install feature (lines 469-537) is valuable, just needs non-interactive mode
- sudo commands for global symlinks are optional features, not critical path
