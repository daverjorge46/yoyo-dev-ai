# Fix Summary (Lite)

**Problem**: Python dashboard pane crashes immediately after yoyo-update, leaving only left pane visible

**Root Cause**: Tmux keybinding in yoyo-tmux.sh references old filename `dashboard-python.py` instead of new filename `yoyo-dashboard.py`

**Solution**: Update line 167 in yoyo-tmux.sh to use correct filename `yoyo-dashboard.py`

**Files to Modify**:
- ~/.yoyo-dev/setup/yoyo-tmux.sh - Fix hardcoded filename in tmux keybinding
