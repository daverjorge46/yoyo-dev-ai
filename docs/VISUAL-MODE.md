# Yoyo Dev Visual Mode

Yoyo Dev Visual Mode provides a branded, consistent visual experience using tmux, regardless of your terminal emulator's settings.

## Features

✨ **Branded Color Scheme** - Beautiful grey-blue theme with cyan accents
✨ **3-Pane Layout** - Main terminal + Task monitor + File explorer
✨ **Auto Status Monitor** - Top-right pane shows tasks and progress
✨ **Live File Explorer** - Bottom-right pane shows project file tree
✨ **Consistent Experience** - Same look across all terminals
✨ **Enhanced Status Bar** - Project name and Yoyo Dev branding
✨ **Customizable** - Edit colors in `setup/yoyo-tmux.sh`
✨ **Mouse Support** - Click to switch panes, scroll through history
✨ **Full tmux Power** - Split panes, multiple windows, detach/reattach

## Visual Mode Layout

Visual mode provides a **3-pane layout** for maximum productivity:

```
┌─────────────────────┬─────────────────┐
│                     │                 │
│                     │  Task Status    │
│   Claude Code       │  Monitor        │
│   (Main Terminal)   ├─────────────────┤
│                     │                 │
│      50% width      │  File Explorer  │
│                     │                 │
└─────────────────────┴─────────────────┘
```

### Pane 1: Main Terminal (Left, 50%)
- Claude Code interactive session
- Your primary work area
- Full keyboard input

### Pane 2: Task Status Monitor (Top-Right, 25%)

**When you have active tasks:**
- Current task name and progress bar
- Completed vs total tasks count
- Next incomplete subtasks (up to 5)
- Suggested next action

**When starting a new project:**
- Getting started guide
- Quick command reference
- Next roadmap item (if configured)
- Setup instructions

**Auto-refreshes every 5 seconds** to show real-time progress!

### Pane 3: Interactive File Manager (Bottom-Right, 25%)

**Full-featured file browser with:**
- **Navigate files**: Use j/k (vim keys) or arrow keys
- **Preview files**: Automatic file preview while browsing
- **Open files**: Press Enter to view/edit
- **Search files**: / to search, n/N to navigate results
- **Go up/down**: h to go up, l to enter directory
- **Quit**: q to close file manager

**🔒 Security: Restricted to Project Directory**
- File manager is **locked to the current project directory**
- Cannot navigate to parent directories or other parts of filesystem
- Ensures you only browse files within your current project

**Supported file managers** (auto-detected):
1. **ranger** (Recommended) - Python-based, vim-like, file preview
2. **lf** (Lightweight) - Go-based, fast and minimal
3. **nnn** (Ultra-fast) - C-based, powerful filtering
4. **Fallback** - Basic fzf browser if none installed

**First run**: If no file manager installed, you'll see installation options. Choose ranger for best experience.

## Usage

### Launch Visual Mode

```bash
yoyo --visual
```

Or set it as default:

```bash
# Add to your ~/.bashrc or ~/.zshrc
export YOYO_VISUAL_MODE=true

# Now 'yoyo' always launches visual mode
yoyo
```

### Standard Mode

```bash
# If visual mode is default, use standard mode with:
YOYO_VISUAL_MODE=false yoyo
```

## Color Scheme

The default Yoyo Dev visual mode uses:

| Element | Color | Hex Code |
|---------|-------|----------|
| Background | Dark grey-blue | `#2d3748` |
| Foreground | Light grey | `#e2e8f0` |
| Borders | Medium grey | `#4a5568` |
| Accent | Bright cyan | `#63b3ed` |
| Success | Green | `#68d391` |
| Warning | Orange | `#f6ad55` |
| Error | Red | `#fc8181` |

## Copy/Paste Text

Visual mode supports text selection and copying:

### Method 1: Using Shift Key (Recommended)

**Hold `Shift` while selecting text** - This bypasses tmux mouse mode and uses your terminal's native selection:

1. **Hold Shift**
2. **Click and drag** to select text
3. **Release** - Text is automatically copied to clipboard
4. **Paste** with your terminal's paste command (usually `Ctrl+Shift+V` or right-click)

### Method 2: Using Tmux Copy Mode

For advanced users who want to copy text within tmux:

1. Press `Ctrl+B` then `[` to enter copy mode
2. Press `v` to start selection
3. Move cursor with arrow keys to select text
4. Press `y` to copy selection (exits copy mode)
5. Press `Ctrl+B` then `]` to paste within tmux

### Quick Reference

| Action | Method |
|--------|--------|
| **Select text** | `Shift` + Click and drag |
| **Copy selected** | Release mouse (auto-copies) |
| **Paste** | `Ctrl+Shift+V` or right-click |
| **Tmux copy mode** | `Ctrl+B` then `[` |
| **Start selection** | `v` (in copy mode) |
| **Copy selection** | `y` (in copy mode) |
| **Paste tmux buffer** | `Ctrl+B` then `]` |

## Tmux Controls

| Key | Action |
|-----|--------|
| `Ctrl+B` then arrows | Navigate between panes |
| `Ctrl+B` then `z` | Toggle pane full-screen |
| `Ctrl+B` then `x` | Close current pane |
| `Ctrl+B` then `Alt` + arrows | Resize panes |
| `Ctrl+B` then `d` | Detach from session (keeps it running) |
| `Ctrl+B` then `c` | Create new window |
| `Ctrl+B` then `n` | Next window |
| `Ctrl+B` then `p` | Previous window |
| `Ctrl+B` then `%` | Split pane vertically |
| `Ctrl+B` then `"` | Split pane horizontally |
| `Ctrl+B` then `[` | Enter copy mode |
| `Ctrl+B` then `?` | Show all keybindings |

## Customization

### Color Scheme

Edit `~/.yoyo-dev/setup/yoyo-tmux.sh` to customize colors:

```bash
# Change these variables
readonly BG_COLOR="#2d3748"        # Your background color
readonly FG_COLOR="#e2e8f0"        # Your foreground color
readonly ACCENT_COLOR="#63b3ed"    # Your accent color
```

Color picker: https://htmlcolorcodes.com/

### File Manager Settings

**Choose your preferred file manager** (add to `~/.bashrc` or `~/.zshrc`):

```bash
# Set preferred file manager (auto-detects by default)
export YOYO_FILE_MANAGER=ranger  # or: lf, nnn, vifm, broot

# File manager will auto-detect in this order:
# 1. ranger (best for beginners)
# 2. lf (fastest)
# 3. nnn (most powerful)
# 4. fzf fallback (if no manager installed)
```

**Install a file manager**:

```bash
# Recommended: ranger (full-featured, vim-like)
sudo apt install ranger

# Alternative: lf (lightweight, fast)
sudo apt install lf

# Alternative: nnn (ultra-fast, minimal)
sudo apt install nnn
```

### Pane Layout

Edit `~/.yoyo-dev/setup/yoyo-tmux.sh` to adjust pane sizes (line 279-282):

```bash
# Current layout: Main 50% | Status 25% | File Manager 25%
tmux -f "$TMUX_CONFIG" new-session -s "$SESSION_NAME" -n "Yoyo Dev" "$STARTUP_SCRIPT" \; \
    split-window -h -p 50 "$HOME/.yoyo-dev/lib/yoyo-status.sh" \; \
    split-window -v -p 50 "$HOME/.yoyo-dev/lib/file-manager.sh ." \; \
    select-pane -t 0

# To make right side larger (40%): change -p 50 to -p 40
# To swap panes: change order of split-window commands
# To disable file manager: remove the second split-window line
```

## Requirements

- **tmux** (version 2.0+)

### Install tmux

```bash
# Ubuntu/Debian
sudo apt install tmux

# macOS
brew install tmux

# Fedora
sudo dnf install tmux

# Arch Linux
sudo pacman -S tmux
```

## Troubleshooting

### Visual mode doesn't launch

Check if tmux is installed:
```bash
which tmux
```

If not installed, visual mode automatically falls back to standard mode.

### Colors look wrong

Some terminals need true color support. Add to your `~/.bashrc`:

```bash
export TERM=xterm-256color
```

### Session persists after closing

This is normal tmux behavior. To kill all Yoyo Dev sessions:

```bash
tmux kill-server
```

## Advanced: Persistent Session

You can detach from a Yoyo Dev session and reattach later:

```bash
# Launch visual mode
yoyo --visual

# Inside tmux, press: Ctrl+B then d (detach)

# Later, reattach to the session
tmux attach -t yoyo-dev
```

## Why Visual Mode?

**Standard Mode:**
- Uses terminal's default colors
- Different look in each terminal
- Basic appearance

**Visual Mode:**
- Branded Yoyo Dev experience
- Consistent across all terminals
- Professional appearance
- Enhanced status bar
- Full tmux capabilities
- Easy to customize

---

**Default mode:** Standard (backward compatible)
**To make visual mode default:** `export YOYO_VISUAL_MODE=true`
