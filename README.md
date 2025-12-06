# Yoyo Dev v3.1 - AI-Assisted Development Framework

**"Powerful when you need it. Invisible when you don't."**

Production-grade intelligent TUI dashboard for AI-assisted software development with Claude Code.

## What's New in v3.1

**Split View Mode**
- Integrated Claude Code CLI + TUI dashboard in split screen
- 40/60 default split ratio (configurable)
- Independent pane operation with keyboard shortcuts
- Auto-fallback to TUI-only if Claude not installed

**MCP Server Integration**
- 6 MCP servers auto-installed (context7, memory, playwright, containerization, chrome-devtools, shadcn)
- Automatic installation during project setup
- MCP health monitoring in TUI dashboard

**Performance Optimizations**
- 97% faster startup (9ms vs 300ms)
- 94% faster status refresh (3ms vs 50ms)
- Smart caching for frequently-accessed data

**Design System**
- Professional UI consistency
- WCAG AA accessibility compliance
- Design token system
- Automated validation

---

## 📦 Installation

### Quick Install

```bash
# Install in current project
curl -L https://raw.githubusercontent.com/daverjorge46/yoyo-dev-ai/main/setup/project.sh | bash -s -- --no-base --claude-code

# OR if you have a base installation
~/.yoyo-dev/setup/project.sh --claude-code
```

### Installation Options

| Flag | Description |
|------|-------------|
| `--claude-code` | Install Claude Code commands and agents (required) |
| `--cursor` | Also install Cursor IDE rules |
| `--no-base` | Install directly from GitHub (no base installation needed) |
| `--project-type=TYPE` | Use specific project configuration |
| `--overwrite-instructions` | Overwrite existing instruction files |
| `--overwrite-standards` | Overwrite existing standards files |

### Install Global Command

After project installation, install the global `yoyo` command:

```bash
# Install global command (works from any project directory)
bash .yoyo-dev/setup/install-global-command.sh
```

This creates a global `yoyo` command that works from any Yoyo Dev project.

### MCP Server Installation

Yoyo Dev automatically installs 6 MCP servers during setup when Claude Code CLI is detected:

| Server | Purpose |
|--------|---------|
| context7 | Intelligent context management |
| memory | Persistent memory across sessions |
| playwright | Browser automation and testing |
| containerization | Docker and container management |
| chrome-devtools | Chrome DevTools Protocol integration |
| shadcn | shadcn/ui component integration |

**Manual Installation:**

```bash
# Install all MCPs
~/.yoyo-dev/setup/mcp-claude-installer.sh

# Verify installation
cat ~/.claude.json | jq '.projects[].mcpServers | keys'
```

**Requirements:**
- Node.js and npm (for `npx` commands)
- Claude Code CLI installed
- pnpm (required only for shadcn MCP)

---

## Getting Started

### Launch TUI Dashboard

```bash
# Launch production TUI v3.0 with split view (default)
yoyo

# Launch TUI only (no split view)
yoyo --no-split

# Launch with custom split ratio
yoyo --split-ratio 0.5  # 50/50 split

# Start with TUI focused (default is Claude focused)
yoyo --focus tui

# OR from project directory
bash .yoyo-dev/setup/yoyo.sh
```

### Split View Mode (New in v3.1)

**Integrated Claude Code + TUI Dashboard:**

When you run `yoyo`, you get a fully integrated split-screen experience:

```
┌──────────────────────┬─────────────────────────────────┐
│                      │                                 │
│  Claude Code CLI     │    Yoyo TUI Dashboard           │
│  (40% width)         │    (60% width)                  │
│                      │                                 │
│  Interactive AI      │    Real-time task tracking      │
│  Code assistant      │    Progress monitoring          │
│  Context-aware       │    Command suggestions          │
│                      │                                 │
└──────────────────────┴─────────────────────────────────┘
```

**Split View Features:**
- **Integrated experience**: One command, two powerful tools side-by-side
- **Independent operation**: Close either pane without affecting the other
- **Visual indicators**: Active pane highlighted with bright cyan border
- **Persistent layout**: Split ratio saved between sessions
- **Auto-detection**: Gracefully falls back to TUI-only if Claude not installed
- **Real-time sync**: TUI updates automatically when Claude creates/modifies files

**Keyboard Shortcuts (Split View):**
- `Ctrl+B →` - Switch focus between panes
- `Ctrl+B <` - Make left pane larger
- `Ctrl+B >` - Make right pane larger

**Platform Support:**
- **Linux**: Full support (tested on GNOME Terminal, Konsole, Alacritty, Kitty, Terminator)
- **macOS/Windows**: Coming in future release

**Installation Requirements:**
1. Yoyo Dev installed (see Installation section)
2. [Claude Code CLI](https://claude.com/claude-code) installed (optional, will fallback gracefully)

See [Split View Guide](docs/split-view-guide.md) for detailed usage and troubleshooting.

### TUI Features

**3-Panel Intelligent Dashboard:**
- **Left Panel (30%)**: Active Work - Current specs/fixes with progress tracking
- **Center Panel (40%)**: Command Palette - Context-aware command suggestions
- **Right Panel (30%)**: History - Recent actions with success indicators

**Keyboard Shortcuts:**
- `?` - Help and shortcuts
- `/` - Command search
- `r` - Refresh all panels
- `g` - Git menu
- `t` - Focus active work
- `s` - Focus specs/commands
- `h` - Focus history
- `q` - Quit

**Intelligent Features:**
- 🧠 Context-aware command suggestions based on project state
- ⚠️ Proactive error detection with suggested fixes
- 📊 Real-time progress tracking with visual indicators
- 🔌 MCP server health monitoring
- 🎯 One-click command execution (copy to clipboard)

---

## 📚 Core Workflows

### Product Setup

```bash
# New product - set mission & roadmap
/plan-product

# Existing product - analyze and setup
/analyze-product
```

### Feature Development

```bash
# Fast feature creation (spec + tasks)
/create-new "Add user profile" --lite

# Detailed feature with full spec
/create-new "User authentication"

# Execute tasks interactively
/execute-tasks

# Execute specific task
/execute-tasks --task=2

# Execute all tasks (legacy batch mode)
/execute-tasks --all
```

### Bug Fixes

```bash
# Systematic bug fix workflow
/create-fix "Layout broken on mobile"

# Quick fix (skip investigation)
/create-fix "Button not clickable" --quick
```

### Design System (v1.5.0)

```bash
# Initialize design system
/design-init

# Audit design compliance
/design-audit

# Fix design violations
/design-fix --colors --spacing

# Create UI component with strict validation
/design-component "User profile card"
```

### Advanced Orchestration

```bash
# Manual multi-agent task orchestration (power users)
/orchestrate-tasks

# Containerize application
/containerize-application --node
/containerize-application --python --multi-stage
```

### Code Review (Optional)

```bash
# Devil's advocate review
/review --devil "Review authentication flow"

# Security audit
/review --security "Audit payment processing"

# Performance analysis
/review --performance "Analyze dashboard"

# Pre-mortem analysis
/review --premortem "Database migration plan"
```

---

## 🏗️ Project Structure

```
your-project/
├── .yoyo-dev/
│   ├── product/              # Product documentation
│   │   ├── mission.md
│   │   ├── mission-lite.md   # Condensed for AI
│   │   ├── tech-stack.md
│   │   └── roadmap.md
│   │
│   ├── specs/                # Feature specifications
│   │   └── YYYY-MM-DD-feature-name/
│   │       ├── spec.md
│   │       ├── spec-lite.md  # Condensed for AI
│   │       ├── tasks.md      # Task breakdown
│   │       ├── state.json    # Workflow state
│   │       └── sub-specs/    # Technical details
│   │
│   ├── fixes/                # Bug fix documentation
│   │   └── YYYY-MM-DD-fix-name/
│   │       ├── analysis.md
│   │       ├── solution-lite.md
│   │       ├── tasks.md
│   │       └── state.json
│   │
│   ├── recaps/               # Development recaps
│   ├── patterns/             # Saved patterns
│   │
│   ├── instructions/         # AI workflow instructions
│   │   ├── core/             # Core workflows
│   │   └── meta/             # Meta instructions
│   │
│   ├── standards/            # Development standards
│   │   ├── best-practices.md
│   │   ├── tech-stack.md
│   │   ├── personas.md
│   │   ├── design-system.md  # NEW v1.5.0
│   │   └── code-style/
│   │
│   ├── design/               # Design system (v1.5.0)
│   │   ├── tokens.json
│   │   ├── tailwind.config.js
│   │   ├── design-system.md
│   │   └── component-patterns/
│   │
│   └── setup/                # Installation scripts
│
└── .claude/                  # Claude Code configuration
    ├── commands/             # Custom slash commands
    └── agents/               # Specialized agents
```

---

## 🧪 Testing

### TUI v3.0 Test Suite

```bash
# Run all tests
pytest tests/ -v

# Run specific category
pytest tests/widgets/ -v      # Widget tests (209 tests)
pytest tests/screens/ -v      # Screen tests (82 tests)
pytest tests/services/ -v     # Service tests (80 tests)

# Run with coverage
pytest tests/ --cov=lib/yoyo_tui_v3 --cov-report=html

# Quick test (quiet mode)
pytest tests/ -v --tb=no -q
```

**Test Results:**
- ✅ 414 tests passing (94.5% pass rate)
- ⚠️ 24 tests with known mount dependencies (low priority)

### Test Organization

```
tests/
├── widgets/          # UI component tests
├── screens/          # Screen navigation tests
├── services/         # Business logic tests
├── integration/      # Integration tests
└── fixtures/         # Test data
```

---

## 🔧 Configuration

### Split View Configuration

Edit `.yoyo-dev/config.yml` to customize split view behavior:

```yaml
split_view:
  enabled: true                    # Master toggle for split view mode
  ratio: 0.4                       # Split ratio (0.0-1.0): 0.4 = 40% left, 60% right
  active_pane: claude              # Which pane starts with focus: "claude" or "tui"

  # Visual styling
  border_style:
    active: bright_cyan            # Active pane border color
    inactive: dim_white            # Inactive pane border color

  # Keyboard shortcuts
  shortcuts:
    switch_focus: ctrl+b+arrow     # Switch pane focus (Ctrl+B →)
    resize_left: ctrl+b+<          # Make left pane larger (Ctrl+B <)
    resize_right: ctrl+b+>         # Make right pane larger (Ctrl+B >)

  # Claude Code settings
  claude:
    command: claude                # Command to launch Claude Code
    auto_cwd: true                 # Auto-attach to current directory
    fallback_delay: 3              # Seconds to wait before launching TUI only
```

**Configuration Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable split view mode |
| `ratio` | float | `0.4` | Left pane width ratio (0.0-1.0) |
| `active_pane` | string | `"claude"` | Starting focus: "claude" or "tui" |
| `border_style.active` | string | `"bright_cyan"` | Active pane border color |
| `border_style.inactive` | string | `"dim_white"` | Inactive pane border color |
| `claude.command` | string | `"claude"` | Command to launch Claude Code |
| `claude.auto_cwd` | boolean | `true` | Auto-attach to project directory |
| `claude.fallback_delay` | integer | `3` | Wait time before TUI-only fallback |

### Project Type Configuration

Edit `.yoyo-dev/config.yml`:

```yaml
default_project_type: default

project_types:
  default:
    instructions: ~/.yoyo-dev/instructions
    standards: ~/.yoyo-dev/standards

  custom_type:
    instructions: ~/.yoyo-dev/project_types/custom_type/instructions
    standards: ~/.yoyo-dev/project_types/custom_type/standards
```

### Parallel Execution

```yaml
parallel_execution:
  enabled: true              # Auto-analyze task dependencies
  max_concurrency: 5         # Max parallel tasks
  auto_analyze: true         # Automatic dependency detection
  ask_confirmation: true     # Ask before parallel execution
```

### Design System

```yaml
design_system:
  enabled: true                   # Enable design system
  auto_validate: true             # Auto-validate during workflows
  accessibility_level: WCAG-AA    # WCAG-AA or WCAG-AAA
  dark_mode: true                 # Dark mode support required
  strict_mode: false              # Block merge on violations
```

---

## 🚀 Advanced Features

### Parallel Task Execution

Yoyo Dev automatically analyzes task dependencies and executes independent tasks concurrently:

```bash
# Automatic parallel execution (when safe)
/execute-tasks

# Force sequential execution
/execute-tasks --sequential

# Force parallel execution
/execute-tasks --parallel
```

**Performance Gains:**
- 3 independent tasks: 3x faster
- Mixed dependencies: 2x faster on average
- Sequential tasks: No slowdown

### Design System Workflows

**Initialize Design System:**
```bash
/design-init
```

Creates comprehensive design tokens, Tailwind config, and component patterns.

**Audit Compliance:**
```bash
/design-audit                  # Full audit
/design-audit --colors         # Color compliance only
/design-audit --contrast       # Contrast ratios only
```

**Fix Violations:**
```bash
/design-fix                    # Fix all violations
/design-fix --colors           # Fix color violations
/design-fix --spacing          # Fix spacing violations
```

**Create Components:**
```bash
/design-component "Button with variants"
```

Enforces 100% design token compliance, WCAG AA accessibility, and pattern library integration.

### Review Modes (Optional)

Strategic code review when you need extra scrutiny:

```bash
# Devil's advocate - find what will break
/review --devil "Authentication flow"

# Security audit - OWASP Top 10 checks
/review --security "Payment processing"

# Performance analysis - bottlenecks & N+1 queries
/review --performance "Dashboard rendering"

# Production readiness - monitoring, rollbacks, health checks
/review --production "Deployment plan"

# Pre-mortem - why feature will fail before building
/review --premortem "Real-time collaboration feature"
```

---

## 🔄 Updating

### Update Yoyo Dev

```bash
# Update to latest version
bash .yoyo-dev/setup/yoyo-update.sh

# Preserve customizations
bash .yoyo-dev/setup/yoyo-update.sh --no-overwrite-instructions --no-overwrite-standards
```

**Update Flags:**
- `--no-overwrite-instructions` - Keep custom instructions
- `--no-overwrite-standards` - Keep custom standards
- `--no-overwrite-commands` - Keep custom commands
- `--no-overwrite-agents` - Keep custom agents
- `--no-overwrite` - Keep all customizations

**Protected Files** (never overwritten):
- Product docs (`.yoyo-dev/product/`)
- Specs (`.yoyo-dev/specs/`)
- Fixes (`.yoyo-dev/fixes/`)
- Recaps (`.yoyo-dev/recaps/`)
- Patterns (`.yoyo-dev/patterns/`)

---

## 📖 Documentation

### Core Documentation

- **Command Reference**: `.yoyo-dev/COMMAND-REFERENCE.md` - All commands with examples
- **Best Practices**: `.yoyo-dev/standards/best-practices.md` - Development guidelines
- **Tech Stack**: `.yoyo-dev/standards/tech-stack.md` - Technology decisions
- **Design System**: `.yoyo-dev/standards/design-system.md` - Design philosophy
- **Personas**: `.yoyo-dev/standards/personas.md` - Development approaches

### Online Documentation

- **Main Docs**: https://docs.claude.com/en/docs/claude-code
- **GitHub**: https://github.com/daverjorge46/yoyo-dev-ai
- **Issues**: https://github.com/daverjorge46/yoyo-dev-ai/issues

---

## 🎯 Quick Reference

### Essential Commands

```bash
# Setup
/plan-product               # Set mission & roadmap (new)
/analyze-product            # Setup for existing product

# Development
/create-new "feature"       # Fast feature creation
/create-spec "feature"      # Create spec only
/create-tasks               # Create tasks from spec
/create-fix "problem"       # Fix bugs systematically
/execute-tasks              # Build and ship
/orchestrate-tasks          # Manual multi-agent control

# Design
/design-init                # Initialize design system
/design-audit               # Check compliance
/design-fix                 # Fix violations
/design-component "name"    # Create UI component

# Review
/review --devil "scope"     # Devil's advocate
/review --security "scope"  # Security audit

# Utility
/yoyo-help                  # Show help in Claude
/improve-skills             # Optimize agent skills
/containerize-application   # Docker containerization

# TUI
yoyo                        # Launch split view
yoyo --no-split             # TUI only
yoyo --help                 # Show help
```

### Keyboard Shortcuts (TUI)

```
?     Help              r     Refresh
/     Commands          g     Git menu
t     Focus tasks       s     Focus specs
h     Focus history     q     Quit
```

---

## 🏆 Best Practices

### Development Workflow

1. **Plan First**: `/plan-product` or `/analyze-product`
2. **Spec Features**: `/create-new "feature name"`
3. **Execute Tasks**: `/execute-tasks` (interactive by default)
4. **Review Code**: `/review --mode` (when needed)
5. **Track Progress**: Use TUI dashboard (`yoyo`)

### Design System Workflow

1. **Initialize**: `/design-init` at project start
2. **Audit Weekly**: `/design-audit` to catch drift
3. **Fix Violations**: `/design-fix` before releases
4. **Create Components**: `/design-component` for reusable UI

### Code Quality

- Use TDD approach (tests first, then implementation)
- Follow persona-driven development (Frontend, Backend, QA, etc.)
- Keep it simple - fewest lines possible
- DRY - extract repeated logic
- Type safety - no TypeScript errors

---

## 🐛 Troubleshooting

### Split View Issues

**Split view not launching:**
```bash
# Check if Claude Code is installed
which claude

# If not installed, get it here:
# https://claude.com/claude-code

# Or use TUI-only mode
yoyo --no-split
```

**Terminal too small error:**
```bash
# Split view requires minimum 120x30 terminal size
# Resize your terminal window or use TUI-only mode
yoyo --no-split
```

**Pane borders not rendering correctly:**
```bash
# Ensure your terminal supports Unicode box-drawing characters
# Tested terminals: GNOME Terminal, Konsole, Alacritty, Kitty, Terminator

# Check locale settings
locale | grep UTF-8

# If not UTF-8, add to ~/.bashrc:
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
```

**Keyboard shortcuts not working:**
```bash
# Ensure Ctrl+B is not bound by another application
# Try alternative: disable split view and use separate terminals
yoyo --no-split
```

**Split ratio not persisting:**
```bash
# Check config file exists and is writable
ls -la .yoyo-dev/config.yml

# Check config structure
grep -A 20 "split_view:" .yoyo-dev/config.yml

# Reset to defaults if corrupted
rm .yoyo-dev/config.yml
yoyo  # Will regenerate with defaults
```

### TUI Won't Launch

```bash
# Check Python dependencies
python3 -c "import textual; import watchdog; import yaml"

# Reinstall dependencies
pip3 install --user textual watchdog pyyaml

# Test TUI instantiation
python3 -c "
import sys
sys.path.insert(0, 'lib')
from yoyo_tui_v3.app import create_app
app = create_app()
print('✅ TUI OK')
"
```

### Global Command Not Found

```bash
# Reinstall global command
bash .yoyo-dev/setup/install-global-command.sh

# Add to PATH (if needed)
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Tests Failing

```bash
# Run specific test
pytest tests/widgets/test_status_bar.py -v

# Check test environment
pytest --version
python3 --version

# Recreate virtual environment
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install pytest pytest-cov textual watchdog pyyaml
```

---

## 🤝 Contributing

Yoyo Dev is an open-source framework for AI-assisted development. Contributions welcome!

### Development Setup

```bash
# Clone repository
git clone https://github.com/daverjorge46/yoyo-dev-ai.git
cd yoyo-dev-ai

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest tests/ -v
```

### Making Changes

1. Create feature branch
2. Make changes
3. Run tests: `pytest tests/ -v`
4. Update documentation
5. Submit pull request

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

Built with:
- [Claude Code](https://claude.com/claude-code) - AI-assisted development
- [Textual](https://textual.textualize.io/) - TUI framework
- [Rich](https://rich.readthedocs.io/) - Terminal formatting

---

## 📬 Support

- **Issues**: https://github.com/daverjorge46/yoyo-dev-ai/issues
- **Discussions**: https://github.com/daverjorge46/yoyo-dev-ai/discussions
- **Documentation**: https://docs.claude.com/en/docs/claude-code

---

**Version**: 3.1.1
**Last Updated**: 2025-12-06
**Status**: Production Ready
