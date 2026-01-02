# Fix: Installation Path Confusion

**Issue:** Global `yoyo` command fails because symlinks point to `~/.yoyo-dev/` (doesn't exist) instead of `~/yoyo-dev/` (actual base installation).

## Root Cause

**Broken symlinks:**
```bash
/usr/local/bin/yoyo -> ~/.yoyo-dev/setup/yoyo-launcher-v2.sh  # ✗ Target doesn't exist
/usr/local/bin/yoyo-update -> ~/.yoyo-dev/setup/yoyo-update-wrapper.sh  # ✗ Target doesn't exist
```

**Actual base installation:**
```bash
~/yoyo-dev/setup/yoyo.sh  # ✓ Exists and works
~/yoyo-dev/setup/yoyo-update.sh  # ✓ Exists and works
```

## Solution

**Standardize on visible base installation:**
- Base installation: `~/yoyo-dev/` (visible)
- Project installations: `.yoyo-dev/` (hidden)

**Fix global symlinks to point to correct paths:**
1. `/usr/local/bin/yoyo` → `~/yoyo-dev/setup/yoyo.sh`
2. `/usr/local/bin/yoyo-update` → `~/yoyo-dev/setup/yoyo-update.sh`

**Update installation scripts:**
- `setup/project.sh` - Fix symlink creation (lines 265-322)
- `setup/yoyo-update.sh` - Fix symlink updates (lines 232-293)
- Remove references to non-existent wrapper scripts

## Files to Modify

1. **Global symlinks** (immediate fix via script)
2. **`setup/project.sh`** - Fix lines 265-322 (symlink creation)
3. **`setup/yoyo-update.sh`** - Fix lines 232-293 (symlink updates)
4. **`setup/install-global-command.sh`** - Review and fix if used

## Quick Manual Fix (Temporary)

```bash
sudo ln -sf ~/yoyo-dev/setup/yoyo.sh /usr/local/bin/yoyo
chmod +x ~/yoyo-dev/setup/yoyo.sh
```
