# Solution: yoyo-update Path Resolution Fix

**Fix:** 2025-10-30-yoyo-update-path-resolution
**Component:** setup/yoyo-update.sh

## Problems

1. **Circular symlink update** - Script tries to update `/usr/local/bin/yoyo-update` while running through that symlink, requires sudo, creates noise
2. **Hardcoded venv path** - Uses `$HOME/yoyo-dev/venv` instead of resolved `$BASE_YOYO_DEV/venv`, fails to find virtual environment
3. **Path inconsistency** - Core paths use `$BASE_YOYO_DEV` (correct), but symlinks and venv use hardcoded `$HOME/yoyo-dev` (wrong)

## Root Causes

### Issue 1: Unnecessary Self-Update Logic
- Lines 244-299 attempt to update global symlinks during routine updates
- Anti-pattern: update scripts shouldn't modify system-wide files
- Causes permission warnings and user confusion
- Symlink creation belongs in installation, not updates

### Issue 2: Hardcoded Virtual Environment Path
- Lines 492-515 hardcode `$HOME/yoyo-dev/venv`
- Inconsistent with script's own path resolution (line 118: `BASE_YOYO_DEV`)
- Breaks when Yoyo Dev installed at different location
- Virtual environment path resolution ignores resolved base path

### Issue 3: Path Resolution Pattern Violation
- Script correctly resolves `$BASE_YOYO_DEV` from symlinks (lines 112-118)
- But then ignores this variable for venv and global symlinks
- Should use `$BASE_YOYO_DEV` consistently throughout

## Solution Summary

### 1. Remove Self-Updating Symlink Logic (Lines 244-299)
- Delete entire section attempting to update `/usr/local/bin/yoyo` and `/usr/local/bin/yoyo-update`
- Symlinks created once during installation, never modified by updates
- Eliminates permission warnings and sudo requirements
- Simplifies update script

### 2. Replace All Hardcoded Paths with $BASE_YOYO_DEV
- `$HOME/yoyo-dev/venv` → `$BASE_YOYO_DEV/venv`
- `$HOME/yoyo-dev/requirements.txt` → `$BASE_YOYO_DEV/requirements.txt`
- `~/yoyo-dev/setup/yoyo.sh` → `$BASE_YOYO_DEV/setup/yoyo.sh`
- `~/yoyo-dev/setup/yoyo-update.sh` → `$BASE_YOYO_DEV/setup/yoyo-update.sh`

### 3. Add Virtual Environment Validation
- Check if `$BASE_YOYO_DEV/venv` exists before upgrade attempt
- Skip gracefully with info message if venv not found
- Provide actionable error if venv exists but pip missing

## Changes Required

### File: setup/yoyo-update.sh

**Change 1: Remove lines 240-304 (symlink self-update section)**
```bash
# DELETE THIS ENTIRE SECTION:
    # Update yoyo command launcher
    echo ""
    echo "  📂 CLI Launcher:"
    if [ -f "$BASE_YOYO_DEV/setup/yoyo.sh" ]; then
        # Update global yoyo command if it exists
        if [ -L "/usr/local/bin/yoyo" ] || [ -f "/usr/local/bin/yoyo" ]; then
            echo "  → Updating global 'yoyo' command (launches TUI)..."
            # ... (lines 244-262)
        fi
        # ... (rest of symlink update logic)
    fi
```

**Change 2: Update launcher files in project only (simplified version)**
```bash
# NEW SIMPLIFIED VERSION (replaces deleted section):
    # Update launcher scripts in project
    echo ""
    echo "  📂 CLI Launcher:"
    mkdir -p "./.yoyo-dev/setup"

    if [ -f "$BASE_YOYO_DEV/setup/yoyo.sh" ]; then
        copy_file "$BASE_YOYO_DEV/setup/yoyo.sh" \
            "./.yoyo-dev/setup/yoyo.sh" \
            "true" \
            "setup/yoyo.sh (TUI launcher)"
        chmod +x "./.yoyo-dev/setup/yoyo.sh"
    fi

    if [ -f "$BASE_YOYO_DEV/setup/yoyo-tmux.sh" ]; then
        copy_file "$BASE_YOYO_DEV/setup/yoyo-tmux.sh" \
            "./.yoyo-dev/setup/yoyo-tmux.sh" \
            "true" \
            "setup/yoyo-tmux.sh (deprecated)"
        chmod +x "./.yoyo-dev/setup/yoyo-tmux.sh"
    fi
```

**Change 3: Fix venv path in dependency check (line 492)**
```bash
# BEFORE:
if [ -d "$HOME/yoyo-dev/venv" ]; then
    if "$HOME/yoyo-dev/venv/bin/python3" -c "import rich, watchdog, yaml, textual" &> /dev/null 2>&1; then

# AFTER:
if [ -d "$BASE_YOYO_DEV/venv" ]; then
    if "$BASE_YOYO_DEV/venv/bin/python3" -c "import rich, watchdog, yaml, textual" &> /dev/null 2>&1; then
```

**Change 4: Fix venv path in upgrade section (lines 511-523)**
```bash
# BEFORE:
if [ -d "$HOME/yoyo-dev/venv" ]; then
    echo "Upgrading dependencies in virtual environment..."
    timeout 300 "$HOME/yoyo-dev/venv/bin/pip" install --upgrade -r "$HOME/yoyo-dev/requirements.txt" --no-input --disable-pip-version-check || {
        echo "⚠️  Dependency upgrade timed out or failed"
        echo "   You can upgrade manually: $HOME/yoyo-dev/venv/bin/pip install --upgrade -r $HOME/yoyo-dev/requirements.txt"
    }
elif command -v pip3 &> /dev/null; then
    echo "Upgrading dependencies..."
    timeout 300 pip3 install --upgrade -r "$HOME/yoyo-dev/requirements.txt" --user --no-input --disable-pip-version-check || {
        echo "⚠️  Dependency upgrade timed out or failed"
        echo "   You can upgrade manually: pip3 install --upgrade -r $HOME/yoyo-dev/requirements.txt --user"
    }
fi

# AFTER:
if [ -d "$BASE_YOYO_DEV/venv" ]; then
    echo "Upgrading dependencies in virtual environment..."
    if [ -f "$BASE_YOYO_DEV/venv/bin/pip" ]; then
        timeout 300 "$BASE_YOYO_DEV/venv/bin/pip" install --upgrade -r "$BASE_YOYO_DEV/requirements.txt" --no-input --disable-pip-version-check || {
            echo "⚠️  Dependency upgrade timed out or failed"
            echo "   You can upgrade manually: $BASE_YOYO_DEV/venv/bin/pip install --upgrade -r $BASE_YOYO_DEV/requirements.txt"
        }
    else
        echo "⚠️  Virtual environment exists but pip not found"
        echo "   Reinstall dependencies: $BASE_YOYO_DEV/setup/install-deps.sh"
    fi
elif command -v pip3 &> /dev/null; then
    echo "Upgrading dependencies..."
    if [ -f "$BASE_YOYO_DEV/requirements.txt" ]; then
        timeout 300 pip3 install --upgrade -r "$BASE_YOYO_DEV/requirements.txt" --user --no-input --disable-pip-version-check || {
            echo "⚠️  Dependency upgrade timed out or failed"
            echo "   You can upgrade manually: pip3 install --upgrade -r $BASE_YOYO_DEV/requirements.txt --user"
        }
    else
        echo "ℹ️  requirements.txt not found at $BASE_YOYO_DEV/requirements.txt"
    fi
else
    echo "ℹ️  No pip installation found, skipping dependency upgrade"
fi
```

## Expected Outcomes

1. ✅ No permission warnings during updates
2. ✅ Virtual environment dependencies upgrade successfully
3. ✅ Works with Yoyo Dev installed anywhere (not just `~/yoyo-dev`)
4. ✅ Clean, noise-free update output
5. ✅ Actionable error messages if issues occur
6. ✅ All existing update functionality preserved

## Testing Checklist

- [ ] Run yoyo-update from project directory → clean update, no warnings
- [ ] Verify dependencies upgraded in `$BASE_YOYO_DEV/venv`
- [ ] Test with venv missing → graceful skip with info message
- [ ] Test with alternative Yoyo Dev installation path
- [ ] Verify global symlinks unchanged after update
- [ ] Verify all framework files updated correctly

## Implementation Notes

- TDD approach: Write tests first, then implement fixes
- Preserve all existing functionality
- Backward compatible with current installations
- Follow bash best practices (quote variables, check file existence)
