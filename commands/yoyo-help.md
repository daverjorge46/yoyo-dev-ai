# Yoyo Dev Command Reference

Display comprehensive help for all Yoyo Dev commands and flags.

## Instructions

Show the complete Yoyo Dev v2.0 command reference with all available commands, flags, and usage examples.

```
╔════════════════════════════════════════════════════════════════════╗
║                  YOYO DEV v2.0 - COMMAND REFERENCE                 ║
╚════════════════════════════════════════════════════════════════════╝

🎯 PRODUCT SETUP
─────────────────────────────────────────────────────────────────────

  /plan-product
    Set mission & roadmap for a new product
    → Creates .yoyo-dev/product/ with mission, roadmap, tech stack

  /analyze-product
    Set up mission & roadmap for existing product
    → Analyzes codebase and creates product documentation

📦 FEATURE DEVELOPMENT
─────────────────────────────────────────────────────────────────────

  /create-new [feature] [--lite] [--monitor]
    Create feature with spec + tasks (streamlined workflow)

    Flags:
      --lite       Skip detailed spec, fast iteration mode
      --monitor    Start task monitor in split pane

    Example:
      /create-new "User profile page" --lite --monitor

  /create-spec [feature]
    Create detailed specification only (no tasks)
    → For when you need comprehensive planning first

  /create-tasks
    Create task breakdown from existing spec
    → Run after /create-spec completes

  /execute-tasks [--all] [--task=N] [--parallel] [--monitor]
    Build and ship code (interactive by default in v2.0)

    Flags:
      --all        Run without pausing (legacy mode)
      --task=N     Execute specific task only (e.g., --task=2)
      --parallel   Enable parallel task execution
      --monitor    Start task monitor

    Examples:
      /execute-tasks                    # Interactive mode
      /execute-tasks --task=3           # Run task 3 only
      /execute-tasks --parallel         # Parallel execution
      /execute-tasks --all --monitor    # Legacy mode with monitor

🐛 BUG FIXES & ISSUES
─────────────────────────────────────────────────────────────────────

  /create-fix [problem] [--quick] [--monitor]
    Analyze and fix bugs, design issues, layout problems

    Flags:
      --quick      Skip investigation (for obvious problems)
      --monitor    Start task monitor

    Examples:
      /create-fix "Login button not working" --monitor
      /create-fix "Mobile layout broken" --quick

🎨 DESIGN SYSTEM (v1.5.0)
─────────────────────────────────────────────────────────────────────

  /design-init [--analyze] [--minimal]
    Initialize comprehensive design system

    Flags:
      --analyze    Extract from existing codebase
      --minimal    Minimal design system setup

    → Creates .yoyo-dev/design/ with tokens, patterns, Tailwind config

  /design-audit [--colors] [--spacing] [--contrast] [--focus]
    Audit codebase for design consistency violations

    Flags:
      --colors     Audit color usage only
      --spacing    Audit spacing values only
      --contrast   Audit color contrast (WCAG AA)
      --focus      Audit focus states only

    → Generates report: .yoyo-dev/design/audits/YYYY-MM-DD-audit.md

  /design-fix [--colors] [--spacing] [--contrast] [--focus]
    Systematically fix design violations from audit

    Example:
      /design-audit
      /design-fix --colors --contrast

  /design-component [name] [--strict]
    Create UI component with strict design validation

    Flag:
      --strict     Zero violations allowed (block on any issue)

    Example:
      /design-component "User profile card"

🔍 CODE REVIEW (Optional)
─────────────────────────────────────────────────────────────────────

  /review [scope] [--devil] [--security] [--performance] [--production]
    Critical code review with specialized modes

    Modes:
      --devil        Devil's advocate (find what breaks)
      --security     Security vulnerabilities, auth issues
      --performance  Bottlenecks, memory leaks, N+1 queries
      --production   Production readiness, error handling
      --premortem    Pre-mortem analysis before building
      --quality      Code quality, maintainability

    Examples:
      /review "authentication flow" --security
      /review --devil --performance
      /review "API endpoints" --production

📊 TASK MONITORING
─────────────────────────────────────────────────────────────────────

  Manual monitor launch:
    ~/.yoyo-dev/lib/task-monitor-tmux.sh split path/to/MASTER-TASKS.md

  From terminal:
    yoyo --monitor path/to/MASTER-TASKS.md

  tmux Controls:
    Ctrl+B then arrows      Switch panes
    Ctrl+B then z           Full screen toggle
    Ctrl+B then x           Close monitor pane

🔧 YOYO LAUNCHER FLAGS
─────────────────────────────────────────────────────────────────────

  yoyo                  Launch Claude Code with Yoyo Dev interface
  yoyo --help           Show this command reference
  yoyo --version        Show Yoyo Dev version
  yoyo --commands       List all available commands
  yoyo --monitor [task] Start task monitor

📝 WORKFLOW EXAMPLES
─────────────────────────────────────────────────────────────────────

  Simple Feature (Fast):
    /create-new "Add profile avatar" --lite --monitor
    /execute-tasks

  Complex Feature (With Planning):
    /create-new "User authentication"
    /execute-tasks --parallel --monitor

  Bug Fix:
    /create-fix "Layout broken on mobile" --monitor
    /execute-tasks

  Design System Workflow:
    /design-init --analyze
    /design-audit
    /design-fix --colors --contrast
    /design-component "User profile card"

  Code Review Before Shipping:
    /review "payment processing" --security --production

🆕 NEW IN V2.0
─────────────────────────────────────────────────────────────────────

  ✨ Interactive mode by default (pause after each subtask)
  ✨ MASTER-TASKS.md (single source of truth for all tasks)
  ✨ Task monitor with tmux split-pane
  ✨ Lite mode for fast iteration (--lite flag)
  ✨ Comprehensive flag documentation
  ✨ Better error handling and graceful failures

📚 DOCUMENTATION
─────────────────────────────────────────────────────────────────────

  Full Documentation:
    .yoyo-dev/COMMAND-REFERENCE.md       Complete reference
    .yoyo-dev/CLAUDE.md                  Project context & architecture
    ~/.yoyo-dev/standards/               Development standards
    .yoyo-dev/instructions/              Workflow instructions

  Product Documentation:
    .yoyo-dev/product/mission-lite.md    Product vision & context
    .yoyo-dev/product/roadmap.md         Development roadmap
    .yoyo-dev/product/tech-stack.md      Technical architecture

────────────────────────────────────────────────────────────────────

💡 Tips:
  • Use --lite for quick iterations
  • Use --monitor to watch task progress in real-time
  • Use --parallel for independent tasks (2-3x speedup)
  • Interactive mode is default (pause after each subtask)
  • Use /review modes strategically, not by default

────────────────────────────────────────────────────────────────────

Yoyo Dev v2.0 - "Powerful when you need it. Invisible when you don't."
```

Display this complete reference and exit.
