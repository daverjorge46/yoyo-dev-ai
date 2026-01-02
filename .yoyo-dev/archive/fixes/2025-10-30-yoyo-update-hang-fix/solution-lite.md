# Fix: yoyo-update Hangs Indefinitely

**Fix ID:** 2025-10-30-yoyo-update-hang-fix
**Priority:** CRITICAL
**Type:** Bug Fix

---

## Problem

`yoyo-update` command hangs indefinitely and cannot be interrupted with Ctrl+C. Users must manually kill the process.

---

## Root Cause

**Primary:** `pip install` commands lack `--no-input` flag, causing interactive prompts that block execution.

**Secondary:** `sudo ln -sf` commands can prompt for password, causing delays.

---

## Solution Summary

### Fix 1: Make pip Non-Interactive (CRITICAL)
Add `--no-input --disable-pip-version-check` to all pip commands:
- `setup/install-deps.sh:71`
- `setup/yoyo-update.sh:506, 509`

### Fix 2: Remove sudo Prompts (HIGH)
Replace `sudo ln -sf` with permission check + manual fallback instructions.

### Fix 3: Add Signal Trap (MEDIUM)
Add `trap` for Ctrl+C to ensure clean exit.

### Fix 4: Add Timeout (LOW)
Wrap pip operations with `timeout 300` (5 minutes).

---

## Files to Modify

1. `setup/install-deps.sh` - Add non-interactive flags, trap, timeout
2. `setup/yoyo-update.sh` - Add non-interactive flags, fix sudo, trap, timeout

---

## Test Approach

**TDD Strategy:**
1. Write test that runs `yoyo-update` and expects completion < 2 minutes
2. Write test that sends SIGINT (Ctrl+C) and expects clean exit
3. Implement fixes
4. Verify all tests pass

**Test cases:**
- Normal update completes without hanging
- Ctrl+C interrupts cleanly
- Works with and without sudo permissions
- Works with and without venv
- Handles dependency conflicts gracefully

---

## Expected Outcome

✅ No more hanging
✅ Ctrl+C works immediately
✅ Completes in < 2 minutes
✅ No sudo password prompts
✅ Clear error messages when issues occur
