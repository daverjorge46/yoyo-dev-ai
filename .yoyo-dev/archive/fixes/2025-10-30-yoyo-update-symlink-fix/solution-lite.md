# Fix: yoyo-update Symlink Resolution Failure

**Issue:** `yoyo-update` fails when executed via symlink with "functions.sh: No such file or directory"

**Root Cause:** Script doesn't resolve symlinks before calculating SCRIPT_DIR, causing it to look for functions.sh in the wrong location.

## The Problem

**Lines 109-110 in `setup/yoyo-update.sh`:**
```bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_YOYO_DEV="$(dirname "$SCRIPT_DIR")"
```

When executed via `/usr/local/bin/yoyo-update` symlink:
- `$0` = `/usr/local/bin/yoyo-update` (symlink, not target)
- `SCRIPT_DIR` = `/usr/local/bin/`
- Tries to source `/usr/local/bin/functions.sh` ❌

## The Solution

Replace with symlink-resolving pattern from `yoyo.sh`:

```bash
SCRIPT_PATH="${BASH_SOURCE[0]}"
# Resolve symlink if this script is executed via symlink
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
BASE_YOYO_DEV="$(dirname "$SCRIPT_DIR")"
```

## Why It Works

1. Uses `${BASH_SOURCE[0]}` instead of `$0`
2. Checks if path is symlink with `[ -L ]`
3. Resolves to real path with `readlink -f`
4. Calculates directory from resolved path
5. Result: `SCRIPT_DIR` = `/home/yoga999/yoyo-dev/setup/` ✅

## Tasks

1. Write tests for symlink execution scenarios
2. Update lines 109-110 with symlink resolution code
3. Verify functions.sh sourcing works via symlink
4. Test all execution methods (direct, symlink, different dirs)
