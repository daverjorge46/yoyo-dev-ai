# Yoyo Dev v3.0 - Project Structure

Clean, organized project structure for the production-grade TUI dashboard.

## Root Directory

```
yoyo-dev/
├── lib/                          # Core application code
│   ├── yoyo_tui_v3/              # ✅ TUI v3.0 (ACTIVE)
│   │   ├── app.py                # Main application
│   │   ├── config.py             # Configuration
│   │   ├── models.py             # Data models
│   │   ├── widgets/              # UI widgets (7 widgets)
│   │   ├── screens/              # Screen views (4 screens)
│   │   ├── services/             # Business logic (6 services)
│   │   ├── parsers/              # Data parsers (5 parsers)
│   │   └── utils/                # Utilities
│   │
│   ├── yoyo-tui.py               # ✅ Entry point (ACTIVE)
│   └── [legacy scripts]          # Legacy monitoring scripts (for reference)
│
├── setup/                         # ✅ Installation & Launch (ACTIVE)
│   ├── yoyo.sh                   # Main TUI launcher
│   ├── yoyo-global-launcher.sh   # Global command wrapper
│   ├── install-global-command.sh # Global command installation
│   ├── project.sh                # Project setup
│   ├── yoyo-update.sh            # Update script
│   ├── yoyo-tmux.sh              # Tmux integration
│   ├── yoyo-tui-launcher.sh      # Alternative launcher
│   ├── install-deps.sh           # Dependency installation
│   ├── install-dashboard-deps.sh # Dashboard dependencies
│   ├── install-tui-deps.sh       # TUI dependencies
│   ├── mcp-installer.sh          # MCP installer
│   ├── mcp-prerequisites.sh      # MCP prerequisites
│   ├── functions.sh              # Shared functions
│   └── parse-utils.sh            # Parsing utilities
│
├── tests/                         # ✅ Test Suite (ACTIVE - 414 passing)
│   ├── widgets/                  # Widget tests (209 tests)
│   │   ├── test_status_bar.py
│   │   ├── test_project_overview.py
│   │   ├── test_active_work_panel.py
│   │   ├── test_command_palette.py
│   │   ├── test_history_panel.py
│   │   ├── test_execution_monitor.py
│   │   └── test_keyboard_shortcuts.py
│   │
│   ├── screens/                  # Screen tests (82 tests)
│   │   ├── test_main_dashboard.py
│   │   ├── test_spec_detail_screen.py
│   │   ├── test_task_detail_screen.py
│   │   └── test_history_detail_screen.py
│   │
│   ├── services/                 # Service tests (80 tests)
│   │   ├── test_command_suggester.py
│   │   ├── test_error_detector.py
│   │   ├── test_mcp_monitor.py
│   │   └── test_refresh_service.py
│   │
│   ├── integration/              # Integration tests
│   ├── manual/                   # Manual testing scripts
│   ├── fixtures/                 # Test data
│   ├── unit/                     # Additional unit tests
│   └── README.md                 # ✅ Test documentation
│
├── .yoyo-dev-archive/            # 📦 Archived TUI v2 (PRESERVED)
│   └── lib/yoyo_tui_v2_backup/   # Old TUI v2 codebase
│
├── .cleanup-archive/             # 📦 Cleanup Archive (2025-10-29)
│   ├── old-scripts/              # 7 obsolete scripts
│   ├── old-tests/                # 50 old test files
│   │   ├── tui-v2/               # TUI v2 tests
│   │   └── shell-tests/          # Old launcher tests
│   └── CLEANUP_SUMMARY.md        # Cleanup documentation
│
├── .claude/                       # Claude Code configuration
├── commands/                      # Custom slash commands
├── workflows/                     # Development workflows
├── recaps/                        # Development recaps
│
├── venv/                          # Python virtual environment
├── PROJECT_STRUCTURE.md           # This file
└── README.md                      # Main project README
```

## Active Components

### TUI v3.0 Application (`lib/yoyo_tui_v3/`)

**Core Application:**
- `app.py` - Main Textual application
- `config.py` - Configuration management
- `models.py` - Data models (Spec, Task, HistoryEntry, etc.)

**Widgets** (7 components):
1. `StatusBar` - Git status, activity indicator
2. `ProjectOverview` - Project info, MCP status
3. `ActiveWorkPanel` - Current work display
4. `CommandPalettePanel` - Command suggestions
5. `HistoryPanel` - Recent actions
6. `ExecutionMonitor` - Real-time progress
7. `KeyboardShortcuts` - Shortcut footer

**Screens** (4 views):
1. `MainDashboard` - 3-panel main view
2. `SpecDetailScreen` - Spec details
3. `TaskDetailScreen` - Task details
4. `HistoryDetailScreen` - History entry details

**Services** (6 intelligent services):
1. `DataManager` - Data orchestration
2. `EventBus` - Event system
3. `IntelligentCommandSuggester` - Context-aware suggestions
4. `ErrorDetector` - Proactive error detection
5. `MCPServerMonitor` - MCP health monitoring
6. `RefreshService` - Auto-refresh coordination

**Parsers** (5 parsers):
1. `SpecParser` - Spec file parsing
2. `FixParser` - Fix file parsing
3. `TaskParser` - Task parsing
4. `StateParser` - State.json parsing
5. `RecapParser` - Recap parsing

### Setup Scripts (`setup/`)

**Launchers:**
- `yoyo.sh` - Main TUI launcher (project-local)
- `yoyo-global-launcher.sh` - Global command wrapper
- `yoyo-tmux.sh` - Tmux integration
- `yoyo-tui-launcher.sh` - Alternative launcher

**Installation:**
- `install-global-command.sh` - Install global `yoyo` command
- `install-deps.sh` - Install all dependencies
- `install-dashboard-deps.sh` - Dashboard-specific deps
- `install-tui-deps.sh` - TUI-specific deps

**MCP Integration:**
- `mcp-installer.sh` - MCP server installation
- `mcp-prerequisites.sh` - MCP prerequisites check

**Project Management:**
- `project.sh` - Project setup
- `yoyo-update.sh` - Update Yoyo Dev

**Utilities:**
- `functions.sh` - Shared bash functions
- `parse-utils.sh` - File parsing utilities

### Test Suite (`tests/`)

**Organization:**
- `widgets/` - 209 widget tests
- `screens/` - 82 screen tests
- `services/` - 80 service tests
- `integration/` - Integration tests
- `manual/` - Manual testing
- `fixtures/` - Test data
- `README.md` - Comprehensive test documentation

**Test Results:**
- ✅ 414 tests passing (94.5%)
- ⚠️ 24 tests with known mount dependencies
- 🎯 Full coverage of critical paths

## Archived Components

### TUI v2 Archive (`.yoyo-dev-archive/`)

**Contents:**
- Complete TUI v2 codebase
- 38 Python files
- Preserved for reference

**Status:** Not active, safe to delete after verification period

### Cleanup Archive (`.cleanup-archive/`)

**Contents:**
- 7 obsolete shell scripts
- 50 old test files
- TUI v2 tests
- Old launcher tests

**Status:** Safe to delete after 30-day verification period

## File Count Summary

| Category | Active | Archived |
|----------|--------|----------|
| Shell Scripts | 14 | 7 |
| Python Tests | 28 | 50 |
| TUI Code Files | ~50 (v3) | ~38 (v2) |
| Total Tests Passing | 414 | N/A |

## Dependencies

### Python (TUI v3)
- `textual` - TUI framework
- `watchdog` - File watching
- `pyyaml` - YAML parsing
- `pytest` - Testing
- `pytest-cov` - Coverage

### System
- Python 3.11+
- Bash 4.0+
- Git

## Installation Paths

### Global Command
```bash
# Installed via: bash setup/install-global-command.sh
/usr/local/bin/yoyo -> setup/yoyo-global-launcher.sh
# OR
~/bin/yoyo -> setup/yoyo-global-launcher.sh
# OR
~/.local/bin/yoyo -> setup/yoyo-global-launcher.sh
```

### Virtual Environment
```bash
venv/  # Project-local Python environment
```

## Usage

### Launch TUI
```bash
# From project directory
bash setup/yoyo.sh

# OR if global command installed
yoyo
```

### Run Tests
```bash
# All tests
pytest tests/ -v

# Specific category
pytest tests/widgets/ -v
pytest tests/screens/ -v
pytest tests/services/ -v
```

### Update Yoyo Dev
```bash
bash setup/yoyo-update.sh
```

## Development Workflow

1. **Start TUI**: `yoyo` or `bash setup/yoyo.sh`
2. **Run Tests**: `pytest tests/ -v`
3. **Make Changes**: Edit files in `lib/yoyo_tui_v3/`
4. **Test Changes**: `pytest tests/ -v`
5. **Update**: `bash setup/yoyo-update.sh`

## Maintenance

### Regular Tasks
- Run tests: `pytest tests/ -v`
- Check TUI: `python3 lib/yoyo-tui.py`
- Update deps: `pip install -U textual watchdog pyyaml`

### Optional Cleanup (After Verification Period)
```bash
# Remove old TUI v2 archive (after 30 days)
rm -rf .yoyo-dev-archive/

# Remove cleanup archive (after 30 days)
rm -rf .cleanup-archive/
```

## Documentation

- `README.md` - Main project documentation
- `tests/README.md` - Test suite documentation
- `PROJECT_STRUCTURE.md` - This file
- `.cleanup-archive/CLEANUP_SUMMARY.md` - Cleanup documentation

---

**Version**: 3.0.0
**Last Updated**: 2025-10-29
**Status**: ✅ Clean, organized, and verified
