# Fix Summary (Lite)

**Problem**: Python dashboard doesn't launch after successful venv installation; bash dashboard appears instead

**Root Cause**: `yoyo-tmux.sh` checks system Python for dependencies, but they're installed in `~/.yoyo-dev/venv/`

**Solution**: Modify dashboard selection logic to check venv Python first, then fall back to system Python

**Files to Modify**:
- `setup/yoyo-tmux.sh` - Update dependency check (lines 252-257 and line 167)
