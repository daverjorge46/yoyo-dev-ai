# Yoyo Dev TUI - Help & Keyboard Shortcuts

## Getting Started

Welcome to the Yoyo Dev TUI! This interactive dashboard helps you manage your AI-assisted development workflow with real-time task tracking, spec management, and git integration.

## Keyboard Shortcuts

### Navigation
- **Ctrl+P** - Open command palette (search and execute Yoyo Dev commands)
- **t** - Focus tasks panel (jump to task list)
- **s** - Focus specs panel (jump to specs/fixes list)
- **?** - Show this help screen
- **q** - Quit the application
- **Esc** - Close dialogs/screens and return to main dashboard

### Actions
- **r** - Refresh all data (tasks, specs, git status)
- **g** - Open git menu (quick git actions: stage, commit, push) [Coming soon]

### Within Widgets
- **↑/↓** - Navigate lists and trees
- **Enter** - Select/expand items
- **Tab** - Move focus between widgets
- **Space** - Toggle checkboxes (where applicable)

## Dashboard Panels

### Sidebar (Left)

**Project Overview**
- Shows project name, mission, tech stack, and current roadmap phase
- Auto-updates when product files change

**Git Status**
- Displays current branch, uncommitted changes, and untracked files
- Updates in real-time with configurable cache (default: 30s)

**Keyboard Shortcuts**
- Quick reference for common shortcuts
- Context-aware (shows relevant shortcuts for current screen)

### Main Content (Right)

**Progress Panel**
- Overview of current task completion status
- Shows percentage complete and task counts

**Task Tree**
- Hierarchical view of current tasks and subtasks
- Shows completion status with checkboxes
- Expandable parent tasks

**Spec List**
- Recent specifications and fixes
- Shows progress and status for each
- Click to view details

## File Watching

The TUI automatically watches your `.yoyo-dev/` directory for changes and refreshes data in real-time:

- **tasks.md** changes trigger task list updates
- **state.json** changes update progress indicators
- **Product files** refresh project overview
- **Debounce**: 1.5s (prevents spam from rapid saves)

You can disable file watching in `~/.yoyo-dev/config/tui-config.yml`:

```yaml
features:
  file_watching: false
```

## Configuration

Customize the TUI by editing `~/.yoyo-dev/config/tui-config.yml`:

### Performance Tuning
```yaml
performance:
  git_cache_ttl: 30.0         # Git status cache lifetime (seconds)
  spec_cache_ttl: 30.0        # Spec list cache lifetime (seconds)
  file_watcher_debounce: 1.5  # Debounce interval (seconds)
  performance_mode: false     # Enable for 2x longer intervals
```

### Layout
```yaml
layout:
  sidebar_width: 30           # Sidebar width in columns
  show_git_panel: true        # Show/hide git status panel
  compact_mode: false         # Compact layout for small terminals
```

### Keyboard Bindings
```yaml
keybindings:
  command_palette: ["ctrl+p"]
  quit: ["q", "ctrl+c"]
  help: ["?"]
  refresh: ["r"]
  git_menu: ["g"]
```

## Tips & Tricks

### Efficient Workflow
1. Press **Ctrl+P** to quickly execute any Yoyo Dev command without leaving the TUI
2. Use **t** and **s** to jump between tasks and specs panels quickly
3. Press **r** to force refresh if data seems stale
4. Keep the TUI open while working - it updates automatically via file watching

### Terminal Size
- **Minimum**: 80x24 (80 columns, 24 rows)
- **Recommended**: 120x40 or larger for best experience
- **Responsive**: Sidebar hides automatically on narrow terminals (<80 cols)

### Git Integration
Press **g** to open the git menu for quick actions:
- View detailed git status
- Stage/unstage individual files
- Commit with message input
- Push/pull with progress indicators
- Switch branches quickly

### Command Palette
Press **Ctrl+P** to access all Yoyo Dev commands:
- `/plan-product` - Set mission & roadmap for new product
- `/create-new` - Create new feature with full spec workflow
- `/execute-tasks` - Build and ship code for a feature
- `/create-fix` - Analyze and fix bugs systematically
- `/review` - Critical code review with specialized modes

Use fuzzy search to find commands quickly (e.g., type "exec" to find "/execute-tasks").

## Troubleshooting

### TUI Not Showing Data
1. Make sure you're in a Yoyo Dev project directory (with `.yoyo-dev/` folder)
2. Check that `tasks.md` exists in your active spec or fix folder
3. Try pressing **r** to force refresh all data

### Git Status Not Updating
1. Git status is cached for 30s by default (configurable)
2. Press **r** to force immediate refresh
3. Check git is installed: `git --version`

### Performance Issues
1. Enable performance mode in config: `performance_mode: true`
2. Increase cache TTLs to reduce file system operations
3. Disable file watching if on slow filesystem: `file_watching: false`

### Widgets Not Displaying
1. Increase terminal size (minimum 80x24 required)
2. Check terminal supports ANSI colors
3. Try resizing terminal window to trigger layout recalculation

## Getting Help

### Documentation
- **Yoyo Dev Docs**: `.yoyo-dev/` folder in your project
- **Command Reference**: Press **Ctrl+P** to see all available commands
- **Keyboard Shortcuts**: Press **?** (you're here!)

### Feedback & Issues
- Report bugs or request features at: [GitHub Issues](https://github.com/anthropics/yoyo-dev/issues)
- Check release notes: `lib/yoyo_tui/CHANGELOG.md`

## About

**Yoyo Dev TUI** v1.0.0
A modern, interactive terminal interface for AI-assisted development with Claude Code.

Built with:
- **Textual** - Python TUI framework
- **Rich** - Terminal formatting
- **Watchdog** - File watching

Press **Esc** or **q** to close this help screen.
