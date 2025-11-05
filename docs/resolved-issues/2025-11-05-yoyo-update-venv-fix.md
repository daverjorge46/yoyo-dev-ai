# Fix: yoyo-update Command Broken venv Handling

**Date**: November 5, 2025  
**Issue**: `yoyo-update` command fails when virtual environment directory exists but pip executable is missing  
**Status**: ✅ Resolved

## Problem

When running `yoyo-update`, users encountered this error:

```
✅ Python dashboard and TUI dependencies already installed

📋 Updated requirements.txt with latest dependency versions
📦 Auto-installing Python dependencies...

Upgrading dependencies in virtual environment...
timeout: failed to run command '/home/yoga999/yoyo-dev/venv/bin/pip': No such file or directory
⚠️  Dependency upgrade timed out or failed
   You can upgrade manually: /home/yoga999/yoyo-dev/venv/bin/pip install --upgrade -r /home/yoga999/yoyo-dev/requirements.txt
✓ Dependencies upgraded
```

## Root Cause

The `yoyo-update.sh` script checked if the venv directory exists (`[ -d "$BASE_AGENT_OS/venv" ]`) but didn't verify that the pip executable actually exists inside it. This caused the script to attempt running a non-existent pip command when the venv was in a broken or incomplete state.

## Solution

Modified `setup/yoyo-update.sh` (lines 378-395) to:

1. **Check both directory and pip executable**: Changed from checking only the directory to checking both:
   ```bash
   # Before:
   if [ -d "$BASE_AGENT_OS/venv" ]; then
       if [ -f "$BASE_AGENT_OS/venv/bin/pip" ]; then
   
   # After:
   if [ -d "$BASE_AGENT_OS/venv" ] && [ -f "$BASE_AGENT_OS/venv/bin/pip" ]; then
   ```

2. **Added broken venv detection**: Added explicit handling for when venv exists but pip is missing:
   ```bash
   elif [ -d "$BASE_AGENT_OS/venv" ] && [ ! -f "$BASE_AGENT_OS/venv/bin/pip" ]; then
       echo "⚠️  Virtual environment exists but pip not found"
       echo "   Reinstalling dependencies..."
       if [ -f "$BASE_AGENT_OS/setup/install-deps.sh" ]; then
           bash "$BASE_AGENT_OS/setup/install-deps.sh"
       else
           echo "   Run manually: $BASE_AGENT_OS/setup/install-deps.sh"
       fi
   ```

3. **Graceful fallback**: If venv is broken, the script now automatically attempts to reinstall dependencies using `install-deps.sh`

## Testing

Created test script `tests/test_yoyo_update_venv_fix.sh` to verify the logic handles all scenarios:
- ✅ venv exists with pip → upgrade dependencies
- ✅ venv exists without pip → reinstall dependencies
- ✅ no venv → use system pip3
- ✅ no pip available → skip gracefully

## Impact

- Users will no longer see cryptic "No such file or directory" errors
- Broken venv states are automatically detected and fixed
- Clear messaging guides users on what's happening
- Automatic recovery without manual intervention

## Files Modified

- `setup/yoyo-update.sh` - Fixed venv detection logic
- `tests/test_yoyo_update_venv_fix.sh` - Added test coverage

## Prevention

The fix ensures robust checking of prerequisites before attempting to use them, following the principle of "verify before execute" for all external dependencies.
