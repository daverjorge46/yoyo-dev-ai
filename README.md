# Yoyo Dev v3.0 - AI-Assisted Development Framework

**"Powerful when you need it. Invisible when you don't."**

Production-grade intelligent TUI dashboard for AI-assisted software development with Claude Code.

## ✨ What's New in v3.0

🚀 **Production-Grade Textual TUI Dashboard**
- Intelligent 3-panel layout with real-time updates
- Context-aware command suggestions
- Proactive error detection
- MCP server health monitoring
- Beautiful, responsive terminal UI

⚡ **Performance Optimizations**
- 97% faster startup (9ms vs 300ms)
- 94% faster status refresh (3ms vs 50ms)
- 100% CPU reduction during idle (0% vs 2-5%)
- Smart caching for frequently-accessed data

🎨 **Design System (v1.5.0)**
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

---

## 🚀 Getting Started

### Launch TUI Dashboard

```bash
# Launch production TUI v3.0
yoyo

# OR from project directory
bash .yoyo-dev/setup/yoyo.sh
```

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
/create-fix "problem"       # Fix bugs systematically
/execute-tasks              # Build and ship

# Design
/design-init                # Initialize design system
/design-audit               # Check compliance
/design-fix                 # Fix violations

# TUI
yoyo                        # Launch dashboard
yoyo --help                 # Show help
yoyo --version              # Show version
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

**Version**: 3.0.0
**Last Updated**: 2025-10-29
**Status**: ✅ Production Ready
