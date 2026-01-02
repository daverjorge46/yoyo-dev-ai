# Manual Fix Required: Global Command Symlinks

The automated fix script has been created and tested, but requires sudo permissions to update the global commands in `/usr/local/bin/`.

## Current Status

✅ **Tests created:** `tests/test_symlink_paths.sh` - Confirms broken symlinks
✅ **Fix script created:** `setup/fix-global-symlinks.sh` - Ready to run
⏳ **Waiting for:** Manual execution with sudo permissions

## Quick Fix (Run These Commands)

**Step 1:** Copy the fixed `yoyo.sh` to your base installation:
```bash
cp ~/PROJECTS/yoyo-dev/setup/yoyo.sh ~/yoyo-dev/setup/yoyo.sh
```

**Step 2:** Fix the symlinks:
```bash
sudo ln -sf ~/yoyo-dev/setup/yoyo.sh /usr/local/bin/yoyo
sudo ln -sf ~/yoyo-dev/setup/yoyo-update.sh /usr/local/bin/yoyo-update
```

## Automated Fix Script (Preferred)

Or run the comprehensive fix script:

```bash
~/yoyo-dev/setup/fix-global-symlinks.sh
```

This script will:
1. Show current symlink state (broken)
2. Ask for confirmation
3. Fix both symlinks
4. Verify the fix
5. Show test commands

## Verify the Fix

After running either option, verify with:

```bash
# Run the test suite
~/yoyo-dev/tests/test_symlink_paths.sh

# Or test manually
yoyo --version
yoyo --help
```

## What Was Fixed

**Before (Broken):**
```
/usr/local/bin/yoyo → ~/.yoyo-dev/setup/yoyo-launcher-v2.sh (doesn't exist)
/usr/local/bin/yoyo-update → ~/.yoyo-dev/setup/yoyo-update-wrapper.sh (doesn't exist)
```

**After (Fixed):**
```
/usr/local/bin/yoyo → ~/yoyo-dev/setup/yoyo.sh (exists ✓)
/usr/local/bin/yoyo-update → ~/yoyo-dev/setup/yoyo-update.sh (exists ✓)
```

## Next Steps

Once symlinks are fixed:
1. Run tests to confirm: `~/yoyo-dev/tests/test_symlink_paths.sh`
2. Test yoyo command: `yoyo --version`
3. Continue with Task 2: Fix `setup/project.sh` script
