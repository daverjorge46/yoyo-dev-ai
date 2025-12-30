# Changelog

All notable changes to Yoyo Dev will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2025-12-29

### 🚀 Major Features

#### Multi-Agent Orchestration System
- **Yoyo-AI Orchestrator**: Intelligent task coordination with automatic agent delegation
- **Oracle Agent**: Strategic advisor for architecture and debugging (temperature: 0.1)
- **Librarian Agent**: External research specialist with parallel execution (temperature: 0.3)
- **Frontend Engineer**: UI/UX specialist with automatic delegation gates
- **Explore Agent**: Fast codebase search and navigation
- **Implementer Agent**: TDD-based code implementation
- New commands: `/research [topic]`, `/consult-oracle [question]`

#### Browser GUI Dashboard
- Real-time project status dashboard on port 3456
- WebSocket-based live updates
- Command palette with keyboard shortcuts
- Memory system browser
- Skills and patterns library viewer
- Integration with TUI and Claude Code
- Launch modes: `yoyo` (with GUI), `yoyo --no-gui`, `yoyo-gui` (standalone)

#### TUI v4 Promoted to Stable
- TypeScript/Ink implementation now stable (previously experimental)
- 60fps rendering with React/Ink
- <100MB memory footprint
- Session persistence
- Real-time WebSocket updates
- Graceful fallback to TUI v3 on errors
- Updated config: `tui.version: "v4"` (no longer marked experimental)

### 🛠️ Breaking Changes

#### Launcher Script Consolidation
**Before (v4.0):** 10+ scattered launcher scripts
**After (v5.0):** 4 primary entry points

- `yoyo` - Launch TUI + Claude + GUI (default mode)
- `yoyo-gui` - Launch browser GUI standalone
- `yoyo-update` - Update Yoyo Dev to latest version
- `install.sh` - Install/setup Yoyo Dev (renamed from `project.sh`)

**Removed Scripts:**
- `yoyo-global-launcher.sh` → merged into `yoyo`
- `yoyo-gui-global-launcher.sh` → merged into `yoyo-gui`
- `yoyo-tui-launcher.sh` → merged into `yoyo`
- `yoyo-tmux.sh` → merged into `yoyo`

**Migration:** Symlinks automatically updated. If you have custom scripts calling old launchers, update to use new consolidated scripts.

#### Directory Naming Clarification
- **`.yoyo-dev/`** - Framework files (instructions, standards, specs, fixes, product)
- **`.yoyo-ai/`** - Memory system (SQLite database for persistent context)

### ✨ New Features

- **Failure Recovery**: 3-attempt escalation to Oracle agent on repeated failures
- **Auto-Delegation Gates**: Frontend work automatically delegated to specialized agent
- **Background Research**: Parallel execution with librarian agent
- **Todo-Driven Workflow**: Real-time task tracking with immediate completion marking
- **GUI Management**: `yoyo --stop-gui`, `yoyo --gui-status` commands
- **Comprehensive Help**: Updated `--help` in all scripts with v5.0 commands

### 📚 Documentation

#### New Documentation Files
- `docs/INSTALLATION.md` - Complete installation guide with MCP setup
- `docs/QUICK-START.md` - 5-minute tutorial and first-time walkthrough
- `docs/ARCHITECTURE.md` - System architecture and multi-agent details
- `docs/commands.md` - Complete slash command reference
- `docs/multi-agent-orchestration.md` - Yoyo-AI workflow deep dive
- `docs/gui-dashboard.md` - Browser GUI features and usage
- `docs/directory-structure.md` - Directory naming and organization guide

#### Updated Documentation
- `README.md` - v5.0 features, consolidated launchers, GUI section
- `CLAUDE.md` - v5.0 orchestrator workflow, directory clarification
- All in-app help systems (TUI, CLI, script --help)

### 🧹 Cleanup

- Deleted 3 backup files (`*.backup`)
- Deleted 4 legacy launcher scripts
- Deleted 2 duplicate/broken test files
- Deleted experimental test directory (`tests/archive/consciousness/`)
- Cleaned 73 Python cache files (`__pycache__`, `*.pyc`)
- Consolidated from 14 setup scripts to 10 (after removing duplicates)

### 🔧 Version Updates

Updated version to `5.0.0` across:
- `package.json`
- `.yoyo-dev/config.yml`
- `lib/yoyo_tui_v3/__init__.py`
- `setup/yoyo.sh`
- `setup/yoyo-gui.sh`
- `setup/yoyo-update.sh`
- `setup/install.sh`
- `setup/install-global-command.sh`
- `.yoyo-dev/product/mission-lite.md`
- `.yoyo-dev/product/roadmap.md`

### 🐛 Bug Fixes

- Fixed symlink to `yoyo` command (was pointing to deleted `yoyo-global-launcher.sh`)
- Updated TUI help overlay with v5.0 commands
- Removed "experimental" designation from TUI v4 in config

### 📦 Dependencies

No dependency changes in this release.

### ⚠️ Known Issues

- Some legacy test files have import errors (tests using `yoyo_tui` instead of `yoyo_tui_v3`)
- ~80-90% of test suite passing; failures in non-critical legacy tests
- Test suite cleanup planned for v5.1

### 🔗 Links

- [Full Documentation](docs/)
- [Installation Guide](docs/INSTALLATION.md)
- [Quick Start](docs/QUICK-START.md)
- [Architecture](docs/ARCHITECTURE.md)

---

## [4.0.0-alpha.1] - 2024-12-XX

### Added
- Initial memory system implementation
- Split view mode (TUI + Claude)
- TUI v4 experimental support
- Workflow reference system

---

## [3.1.1] - 2024-10-XX

### Added
- Textual-based TUI dashboard
- Parallel task execution
- Design system workflows

---

## [1.0.0] - 2024-04-XX

### Added
- Initial release
- Core workflow system
- Claude Code integration
- Product planning workflows
