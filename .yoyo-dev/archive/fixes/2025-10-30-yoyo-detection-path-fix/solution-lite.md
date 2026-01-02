# Fix: Yoyo Detection Path Mismatch

**Issue:** `yoyo` command reports "not installed" despite `.yoyo-dev/` directory existing

**Root Cause:** Launcher scripts check for wrong directory name (`./yoyo-dev` instead of `./.yoyo-dev`)

## Affected Files

1. `setup/yoyo.sh` (lines 290, 348)
2. `setup/yoyo-tui-launcher.sh` (line 16)
3. `setup/yoyo-tmux.sh` (line 51)

## Fix

Change all detection checks from:
```bash
[ ! -d "./yoyo-dev" ]
```

To:
```bash
[ ! -d "./.yoyo-dev" ]
```

## Why

Yoyo Dev migrated from `yoyo-dev/` to `.yoyo-dev/` (hidden directory), but launcher scripts weren't updated to match.

## Tasks

1. Write tests for detection logic (all scenarios)
2. Update `setup/yoyo.sh` (2 locations)
3. Update `setup/yoyo-tui-launcher.sh` (1 location)
4. Update `setup/yoyo-tmux.sh` (1 location)
5. Verify all tests pass
