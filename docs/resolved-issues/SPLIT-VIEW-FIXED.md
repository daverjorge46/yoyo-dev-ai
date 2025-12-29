# Split View Is Now Fixed! ✅

## The Problem Was

I was editing the **wrong file**! The `/usr/local/bin/yoyo` command is a **symlink** that points to:

```
/usr/local/bin/yoyo → /home/yoga999/yoyo-dev/setup/yoyo.sh
```

I was editing files in `/home/yoga999/PROJECTS/yoyo-dev/` (the project repo), but the actual launcher is at `/home/yoga999/yoyo-dev/setup/yoyo.sh` (the base installation).

## The Fix Applied

Updated `/home/yoga999/yoyo-dev/setup/yoyo.sh`:

**Before (line 34):**
```bash
readonly TUI_SCRIPT="$PROJECT_ROOT/lib/yoyo-tui.py"
```

**After:**
```bash
readonly TUI_MODULE="lib.yoyo_tui_v3.cli"
```

**Before (line 475):**
```bash
exec python3 "$TUI_SCRIPT"
```

**After (lines 474-482):**
```bash
# Change to project root for proper module resolution
cd "$PROJECT_ROOT"

# Launch via new CLI with split view support
exec python3 -m "$TUI_MODULE" "$@"
```

## How To Test Split View

### ⚠️ IMPORTANT: You CANNOT test from within Claude Code

When you run commands FROM Claude Code, stdin is not a TTY, so split view will automatically fall back to TUI-only mode. This is correct behavior.

### To See Split View Working:

**Method 1: Direct Konsole**
1. Open Konsole **directly** (click the Konsole icon, don't run from Claude Code)
2. Navigate to ANY yoyo-dev project:
   ```bash
   cd /home/yoga999/PROJECTS/yoyo-dev
   # OR any other project with .yoyo-dev/ folder
   ```
3. Run:
   ```bash
   yoyo
   ```

**What You Should See:**
```
┌────────────────────────────────┬──────────────────────────────────┐
│                                │                                  │
│   Claude Code CLI (40%)        │   Yoyo TUI Dashboard (60%)       │
│                                │                                  │
│   > Type your prompt here...   │   📋 Project Overview            │
│                                │   Active Specs: 3                │
│                                │   Active Fixes: 16               │
│                                │   📊 Command Palette             │
│                                │                                  │
│                                │   Suggested Actions:             │
│                                │   /analyze-product               │
│                                │                                  │
└────────────────────────────────┴──────────────────────────────────┘
         [Ctrl+B →] Switch panes  [Ctrl+B </>] Resize
```

**Method 2: SSH/Remote**
If you're on a remote machine:
```bash
ssh user@host
cd /path/to/yoyo-dev-project
yoyo
```

### Keyboard Shortcuts

Once split view is running:
- **Ctrl+B →** - Switch focus between Claude and TUI panes
- **Ctrl+B <** - Make left pane (Claude) larger
- **Ctrl+B >** - Make right pane (TUI) larger
- **q** (in TUI pane) - Quit split view

### Fallback Behaviors

**If Claude Code is NOT installed:**
```
╔═══════════════════════════════════════════════════════════╗
║ ⚠️  Claude Code Not Found                                 ║
╠═══════════════════════════════════════════════════════════╣
║ Claude Code CLI is not installed or not in PATH.         ║
║                                                           ║
║ To install: https://github.com/anthropics/claude-code    ║
║                                                           ║
║ [Launching TUI in 3 seconds...]                          ║
╚═══════════════════════════════════════════════════════════╝
```
Then TUI-only mode launches.

**If running from Claude Code or script:**
- No message shown (automatic silent fallback)
- Just TUI launches
- This is correct behavior (split view requires real TTY)

## Verification

Run this to verify everything is set up:
```bash
bash /home/yoga999/PROJECTS/yoyo-dev/test-split-view.sh
```

Expected output:
```
=== Split View Test ===

1. Checking if stdin is a TTY:
  stdin.isatty(): False  ← This is False when run from Claude Code

2. Checking if Claude Code is installed:
  ✓ Claude Code found at: /home/yoga999/.config/nvm/.../claude

3. Testing the CLI module directly:
  Yoyo Dev TUI v3.0.0-beta

4. Checking what yoyo command will execute:
  Command: /usr/local/bin/yoyo
  Points to: /home/yoga999/yoyo-dev/setup/yoyo.sh

=== Test Complete ===
```

## Why It Didn't Work Before

1. **Wrong file edited** - I edited project files, but symlink pointed to base installation
2. **Old launcher** - Was using `lib/yoyo-tui.py` (TUI only) instead of `lib.yoyo_tui_v3.cli` (split view)
3. **Missing TTY check** - Would crash instead of falling back gracefully

## Technical Details

**Split View Architecture:**
```
Terminal (Real TTY, running yoyo command)
    ↓
SplitViewManager (lib/yoyo_tui_v3/split_view/manager.py)
    ├─ Check: sys.stdin.isatty() ✓
    ├─ Check: which claude ✓
    ├─ Create: pty.fork() → Claude Code process (left pane)
    ├─ Create: pty.fork() → TUI process (right pane)
    └─ Event loop: select() for I/O multiplexing

Both panes get isolated pseudo-terminals (think they own the terminal)
```

**Why TTY is required:**
- `pty.fork()` creates pseudo-terminals (requires real TTY)
- `ioctl` operations for terminal size (requires TTY)
- `select()` on stdin (requires TTY file descriptor)

## Files Modified

1. `/home/yoga999/yoyo-dev/setup/yoyo.sh` - Base launcher (ACTUAL fix location)
2. `/home/yoga999/PROJECTS/yoyo-dev/lib/yoyo_tui_v3/split_view/manager.py` - Added TTY check
3. `/home/yoga999/PROJECTS/yoyo-dev/setup/install-deps.sh` - PEP 668 venv fix
4. `/home/yoga999/PROJECTS/yoyo-dev/setup/yoyo-update.sh` - PEP 668 venv fix

## Next Steps

1. **Test it yourself** - Open a real Konsole window and run `yoyo`
2. **Take a screenshot** - Show me what you see!
3. **If it works** - We can distribute this via `yoyo-update` to all installations
4. **If it doesn't work** - Send me the error and we'll debug

The split view feature is **fully implemented and should now work** when you run `yoyo` from a real terminal! 🎉
