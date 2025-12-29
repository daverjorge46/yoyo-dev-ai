# Yoyo Dev Setup Scripts

This directory contains the installation, update, and launcher scripts for Yoyo Dev.

## Scripts Overview

### Core Scripts

- **`ui-library.sh`** - Shared UI component library
  - Catppuccin Mocha color palette
  - Box drawing characters
  - Reusable UI functions (headers, sections, progress bars, etc.)
  - Used by all other setup scripts

- **`project.sh`** - Project installation script
  - Interactive configuration menu
  - TUI version selection (v3 or v4)
  - IDE integration setup (Claude Code, Cursor)
  - MCP server auto-install
  - Beautiful progress indicators

- **`yoyo-update.sh`** - Update script
  - Automatic backup creation
  - Clear update plan display
  - Framework file updates (instructions, standards, commands, agents)
  - TUI v4 dependency updates
  - MCP server verification

- **`yoyo.sh`** - Launcher script
  - Auto-detects TUI version from config
  - Launches TypeScript TUI v4 or Python TUI v3
  - Graceful fallback on errors
  - Comprehensive help menu

### Supporting Scripts

- **`docker-mcp-setup.sh`** - Docker MCP Gateway setup
- **`yoyo-gui.sh`** - Browser GUI launcher

## Usage

### Installing Yoyo Dev in a Project

```bash
# From base installation (typical)
~/.yoyo-dev/setup/project.sh --claude-code

# With TUI v4 enabled
~/.yoyo-dev/setup/project.sh --claude-code --tui-v4

# Non-interactive mode
~/.yoyo-dev/setup/project.sh --claude-code --tui-v4 --non-interactive
```

### Updating Yoyo Dev

```bash
# Update with all defaults
~/.yoyo-dev/setup/yoyo-update.sh

# Preserve customizations
~/.yoyo-dev/setup/yoyo-update.sh --no-overwrite

# Skip MCP verification
~/.yoyo-dev/setup/yoyo-update.sh --skip-mcp-check
```

### Launching Yoyo Dev

```bash
# Auto-detect TUI version from config
yoyo

# Force TUI v4
yoyo --tui-v4

# Force TUI v3
yoyo --py

# Show help
yoyo --help
```

## Design Principles

All scripts follow these design principles:

1. **Beautiful UI** - Catppuccin Mocha theme, box drawing characters, consistent formatting
2. **Clear Defaults** - Recommended options marked and pre-selected
3. **Progressive Disclosure** - Simple defaults, advanced options available
4. **Informative Feedback** - Progress indicators, completion screens, next steps
5. **Error Handling** - Graceful fallbacks, helpful error messages
6. **TUI v4 First** - Modern TypeScript/Ink TUI prominently featured

## TUI v4 Integration

All scripts have been redesigned to reflect the new TUI v4:

- **Color Palette** - Matches Catppuccin Mocha theme from TUI v4
- **Box Drawing** - Uses same Unicode characters as TUI v4
- **Icons** - Consistent symbol usage (✓ ✗ ⚠ ℹ 🚀 etc.)
- **Layout** - Similar visual hierarchy and spacing
- **Auto-Detection** - Scripts detect TUI version from `.yoyo-dev/config.yml`

## Migration from v1 Scripts

Old scripts have been backed up:
- `project-v1.sh.backup`
- `yoyo-update-v1.sh.backup`
- `yoyo-v1.sh.backup`

To restore old versions:
```bash
mv setup/project.sh setup/project-v2.sh
mv setup/project-v1.sh.backup setup/project.sh
```

## Development

### Testing Scripts

```bash
# Syntax check
bash -n setup/project.sh

# Test UI library
cd setup && bash -c 'source ui-library.sh && ui_success "Test passed"'

# Dry run installation (requires project context)
cd /path/to/test-project
~/.yoyo-dev/setup/project.sh --help
```

### Modifying UI Components

Edit `ui-library.sh` and test with:
```bash
source setup/ui-library.sh
ui_box_header "TEST HEADER" 70 "$UI_PRIMARY"
ui_section "Test Section" "$ICON_ROCKET"
ui_kv "Key" "Value"
```

## Troubleshooting

### "ui_* function not found" errors

Ensure `ui-library.sh` is in the same directory and sourced:
```bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/ui-library.sh"
```

### Colors not displaying

Check terminal supports 24-bit color:
```bash
echo -e "\033[38;2;137;180;250mBlue Text\033[0m"
```

### Box characters not displaying

Ensure terminal uses Unicode font (e.g., Nerd Font, FiraCode, Cascadia Code).

## Version History

- **v2.0** (2025-12-29) - Complete redesign for TUI v4
  - New UI library with Catppuccin Mocha theme
  - Interactive configuration menus
  - TUI v4 auto-detection and fallback
  - Beautiful progress indicators and completion screens

- **v1.x** - Original scripts with basic functionality
