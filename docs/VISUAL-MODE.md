# Yoyo Dev Visual Mode

Yoyo Dev Visual Mode provides a branded, consistent visual experience using tmux, regardless of your terminal emulator's settings.

## Features

✨ **Branded Color Scheme** - Beautiful grey-blue theme with cyan accents
✨ **Consistent Experience** - Same look across all terminals
✨ **Enhanced Status Bar** - Project name and Yoyo Dev branding
✨ **Customizable** - Edit colors in `setup/yoyo-tmux.sh`
✨ **Mouse Support** - Click to switch panes, scroll through history
✨ **Full tmux Power** - Split panes, multiple windows, detach/reattach

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

## Tmux Controls

| Key | Action |
|-----|--------|
| `Ctrl+B` then `d` | Detach from session (keeps it running) |
| `Ctrl+B` then `x` | Close current pane |
| `Ctrl+B` then `c` | Create new window |
| `Ctrl+B` then `n` | Next window |
| `Ctrl+B` then `p` | Previous window |
| `Ctrl+B` then `%` | Split pane vertically |
| `Ctrl+B` then `"` | Split pane horizontally |
| `Ctrl+B` then arrows | Navigate between panes |
| `Ctrl+B` then `z` | Toggle pane full-screen |
| `Ctrl+B` then `?` | Show all keybindings |

## Customization

Edit `~/.yoyo-dev/setup/yoyo-tmux.sh` to customize colors:

```bash
# Change these variables
readonly BG_COLOR="#2d3748"        # Your background color
readonly FG_COLOR="#e2e8f0"        # Your foreground color
readonly ACCENT_COLOR="#63b3ed"    # Your accent color
```

Color picker: https://htmlcolorcodes.com/

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
