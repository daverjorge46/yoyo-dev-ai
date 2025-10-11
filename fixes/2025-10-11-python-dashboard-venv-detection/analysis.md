# Problem Analysis

> Fix: python-dashboard-venv-detection
> Created: 2025-10-11
> Priority: HIGH

## Problem Description

After running `yoyo-update` which successfully installs Python dashboard dependencies, the `yoyo` command displays the old bash-based dashboard instead of the new Python Rich dashboard in the right tmux pane. The user receives a success message confirming Python dashboard installation, but when launching `yoyo`, the bash fallback dashboard appears instead.

## Reproduction Steps

1. Run `yoyo-update` command
2. Select option to install Python dashboard dependencies (virtual environment installation)
3. Observe success message: "✅ Python dashboard dependencies already installed"
4. Run `yoyo` command to launch visual mode
5. Observe right tmux pane

**Expected Behavior**: Python Rich dashboard with enhanced formatting, task status tracking, project info, progress bars, recent specifications, and actionable suggestions

**Actual Behavior**: Old bash-based status dashboard (`yoyo-status.sh`) appears instead, with no indication that Python dashboard exists

## Root Cause

The `yoyo-tmux.sh` script checks for Python dependencies in the **system Python interpreter** rather than in the **virtual environment** where they were actually installed.

**Technical Explanation**:

1. During `yoyo-update`, the installer creates a virtual environment at `~/.yoyo-dev/venv/` and installs dependencies (`rich`, `watchdog`, `yaml`) there
2. Installation succeeds and confirmation message is displayed
3. When `yoyo` command runs, it executes `setup/yoyo-tmux.sh`
4. Lines 252-257 perform a dependency check:
   ```bash
   if python3 -c "import rich, watchdog, yaml" &> /dev/null 2>&1; then
       DASHBOARD_CMD="python3 $HOME/.yoyo-dev/lib/yoyo-dashboard.py"
   fi
   ```
5. This check uses the **system Python** (`python3`), not the venv Python
6. System Python doesn't have these packages installed
7. Check fails silently (no error output)
8. Script falls back to bash dashboard: `DASHBOARD_CMD="$HOME/.yoyo-dev/lib/yoyo-status.sh"`
9. Similarly, the tmux refresh keybinding (line 167) has the same issue

**Why This Happens**: There's a disconnect between where dependencies are installed (venv) and where the script looks for them (system Python). The graceful fallback mechanism prevents any error messages, making the issue invisible to users.

**Affected Files**:
- `setup/yoyo-tmux.sh:252-257` - Main dashboard selection logic
- `setup/yoyo-tmux.sh:167` - Tmux refresh keybinding logic

## Impact Assessment

- **Severity**: HIGH
- **Affected Users**: All users who install Python dashboard dependencies via virtual environment (recommended installation method)
- **Affected Functionality**: Python Rich dashboard never launches; users stuck with limited bash dashboard
- **Workaround Available**: YES - Manually install dependencies system-wide with `pip3 install --user rich watchdog pyyaml`, but this defeats the purpose of isolated venv installation and may cause conflicts

## Solution Approach

Modify the dashboard selection logic in `setup/yoyo-tmux.sh` to check for Python dependencies in the virtual environment first, then fall back to system Python if venv doesn't exist.

**Implementation Steps**:

1. **Update main dashboard selection (lines 252-257)**:
   - Check if venv exists: `[ -f "$HOME/.yoyo-dev/venv/bin/python3" ]`
   - Test venv for dependencies first
   - If venv has dependencies, use venv Python to launch dashboard
   - Fall back to system Python check if venv doesn't exist or lacks dependencies
   - Maintain existing bash fallback as last resort

2. **Update tmux refresh keybinding (line 167)**:
   - Apply same venv-first logic to the refresh command
   - Ensure refresh uses same Python interpreter as initial launch

3. **Add validation**:
   - Verify venv path resolution works correctly
   - Test both venv and system Python scenarios
   - Ensure graceful fallback behavior is preserved

**Testing Strategy**:
- Test with venv installation (primary use case)
- Test with system Python installation (backward compatibility)
- Test with no Python dependencies (bash fallback)
- Test tmux refresh keybinding (`Ctrl-R`)
- Verify no error messages on any path

**Risk Assessment**:
- **Breaking Changes**: NO - maintains backward compatibility with system Python installations
- **Performance Impact**: NEUTRAL - adds one additional file existence check
- **Side Effects**: NONE - purely improves dependency detection logic
