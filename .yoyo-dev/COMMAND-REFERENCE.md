# Yoyo Dev v3.1 - Command Reference

**Quick access:** Run `/yoyo-help` in Claude Code or `yoyo --help` in terminal

---

## 🚀 Core Workflows

### `/plan-product`
Set the mission & roadmap for a new product

**Usage:**
```bash
/plan-product
```

**No flags available**

**What it does:**
- Gathers product vision from user
- Creates `.yoyo-dev/product/` documentation
- Generates mission, tech stack, and roadmap files

---

### `/analyze-product`
Set up mission and roadmap for an existing product

**Usage:**
```bash
/analyze-product
```

**No flags available**

**What it does:**
- Analyzes existing codebase structure
- Asks for product vision and goals
- Runs `/plan-product` with discovered context
- Adjusts roadmap to show completed work

---

### `/create-new`
Create a new feature with full spec workflow and task generation (streamlined)

**Usage:**
```bash
/create-new [feature-name]              # Full spec mode (default)
/create-new [feature-name] --lite       # Lightweight mode
/create-new [feature-name] --monitor    # Start with task monitor
```

**Flags:**
- `--lite` - Skip detailed spec creation, generate only MASTER-TASKS.md
- `--monitor` - Automatically start task monitor in tmux split pane
- `--no-questions` - Skip clarifying questions (use only for simple features)

**What it does:**
1. Identifies feature from roadmap or user input
2. Asks clarifying questions (unless `--no-questions`)
3. Creates spec (full or lite mode)
4. Generates task breakdown in MASTER-TASKS.md
5. Prepares for `/execute-tasks`

**When to use `--lite`:**
- Simple features (1-3 files)
- Straightforward requirements
- Fast iteration needed

**When to use full mode:**
- Complex features (5+ files)
- Multiple sub-specs needed
- Architecture decisions required

---

### `/create-spec`
Create a specification for a new feature (detailed spec creation only)

**Usage:**
```bash
/create-spec [feature-name]
/create-spec [feature-name] --no-questions
```

**Flags:**
- `--no-questions` - Skip clarifying questions

**What it does:**
- Creates detailed specification document
- Generates technical sub-specs
- Creates decisions log
- Does NOT create tasks (use `/create-tasks` next)

**Use this when:**
- You want detailed spec without tasks
- Planning phase only
- Need to review spec before task creation

---

### `/create-tasks`
Create tasks from an existing specification

**Usage:**
```bash
/create-tasks [spec-folder]
/create-tasks [spec-folder] --master    # Create MASTER-TASKS.md format
```

**Flags:**
- `--master` - Use unified MASTER-TASKS.md format (recommended)
- `--parallel` - Auto-analyze dependencies for parallel execution

**What it does:**
- Reads specification
- Generates parent tasks (1-5)
- Breaks down into subtasks (up to 8 each)
- Creates MASTER-TASKS.md with full context

---

### `/execute-tasks`
Build and ship code for a new feature

**Usage:**
```bash
/execute-tasks                          # Interactive mode (DEFAULT)
/execute-tasks --all                    # Run all tasks without pausing
/execute-tasks --task=2                 # Run specific task interactively
/execute-tasks --task=2 --all           # Run specific task completely
/execute-tasks --parallel               # Enable parallel execution
/execute-tasks --sequential             # Force sequential execution
/execute-tasks --monitor                # Start with task monitor
```

**Flags:**
- `--all` - Run all tasks without pausing (legacy mode)
- `--task=N` - Execute specific parent task only
- `--interactive` - Pause after each subtask (DEFAULT, explicit flag not needed)
- `--parallel` - Auto-detect and run independent tasks concurrently
- `--sequential` - Force sequential execution even if tasks are independent
- `--monitor` - Launch task monitor in tmux split pane
- `--design-mode` - Enable design system validation
- `--devil` - Apply devil's advocate review mode
- `--security` - Apply security review mode
- `--performance` - Apply performance review mode

**Default behavior (v2.0):**
- Runs interactively (pauses after each subtask)
- Asks permission before continuing
- Shows changes summary after each subtask

**Interactive prompts:**
```
✅ Task 1.1 completed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Changes Made:
  • Created: components/ProfileCard.test.tsx
  • Modified: None

⚠️  Continue to next task? [y/n/skip/quit]
```

**Options:**
- `y` - Continue to next subtask
- `n` - Stop and wait for user fixes
- `skip` - Skip this task, move to next
- `quit` - Stop execution completely

---

### `/create-fix`
Analyze and fix bugs, design issues, or layout problems

**Usage:**
```bash
/create-fix [problem-description]
/create-fix [problem-description] --quick
/create-fix [problem-description] --monitor
```

**Flags:**
- `--quick` - Skip investigation, go straight to fix (use when problem is obvious)
- `--monitor` - Start with task monitor

**What it does:**
1. Gathers problem information
2. Investigates root cause
3. Creates analysis document
4. Generates fix tasks
5. Prepares for `/execute-tasks`

---

### `/orchestrate-tasks`
Manual multi-agent orchestration for complex features

**Usage:**
```bash
/orchestrate-tasks
```

**No flags available**

**What it does:**
- Allows manual control over agent assignment per task group
- Useful when different tasks need specific agents
- Provides explicit execution order control

**Use this when:**
- Different agents needed for different task groups
- Specific standards per task group required
- Manual execution order control needed

**90% of use cases:** Use `/execute-tasks` (automatic mode)
**10% power users:** Use `/orchestrate-tasks` (manual control)

---

## Design System

### `/design-init`
Initialize comprehensive design system

**Usage:**
```bash
/design-init                    # For new project
/design-init --analyze          # Analyze existing project
/design-init --minimal          # Minimal token set
```

**Flags:**
- `--analyze` - Analyze existing codebase first
- `--minimal` - Create minimal design token set
- `--wcag-aaa` - Use WCAG AAA standards (default: WCAG AA)

**What it does:**
- Extracts design patterns (if `--analyze`)
- Gathers design preferences
- Generates design tokens
- Creates Tailwind config
- Builds component pattern library

---

### `/design-audit`
Audit codebase for design consistency violations

**Usage:**
```bash
/design-audit                   # Full audit
/design-audit --colors          # Audit colors only
/design-audit --spacing         # Audit spacing only
/design-audit --contrast        # Audit contrast only
/design-audit --focus           # Audit focus states only
```

**Flags:**
- `--colors` - Check color token compliance only
- `--spacing` - Check spacing scale compliance only
- `--contrast` - Check WCAG contrast ratios only
- `--focus` - Check focus state presence only
- `--critical-only` - Show only critical violations

**Output:**
- Console summary with score
- Detailed report in `.yoyo-dev/design/audits/`

---

### `/design-fix`
Systematically fix design violations

**Usage:**
```bash
/design-fix                     # Fix all violations
/design-fix --colors            # Fix color violations only
/design-fix --spacing           # Fix spacing violations only
/design-fix --contrast          # Fix contrast violations only
/design-fix --focus             # Fix focus state violations only
```

**Flags:**
- Same as `/design-audit`
- `--monitor` - Start with task monitor

**What it does:**
1. Loads latest audit report
2. User selects violations to fix
3. Generates fix tasks
4. Executes fixes with validation
5. Re-runs audit to verify

---

### `/design-component`
Create UI components with enforced design consistency

**Usage:**
```bash
/design-component [component-name]
/design-component [component-name] --pattern=button
```

**Flags:**
- `--pattern=TYPE` - Use existing pattern (button, card, form, navigation, layout)
- `--strict` - Zero violations allowed (blocks merge)

**What it does:**
- Stricter than `/create-new`
- Validates 100% design token compliance
- Requires all variants (sizes, states)
- Ensures WCAG AA compliance
- Adds to pattern library if reusable

---

## 🔍 Code Review (Optional)

### `/yoyo-review`
Critical code review with specialized modes

**Usage:**
```bash
/yoyo-review [scope]                    # General review
/yoyo-review [scope] --devil            # Devil's advocate mode
/yoyo-review [scope] --security         # Security review
/yoyo-review [scope] --performance      # Performance review
/yoyo-review [scope] --production       # Production readiness
/yoyo-review [scope] --premortem        # Pre-mortem analysis
/yoyo-review [scope] --quality          # Code quality review
```

**Flags:**
- `--devil` - Find what will break, challenge assumptions
- `--security` - Audit for vulnerabilities, auth issues
- `--performance` - Check bottlenecks, memory leaks
- `--production` - Verify production readiness
- `--premortem` - Analyze why feature will fail before building
- `--quality` - Check maintainability, test coverage

**Multiple modes:**
```bash
/yoyo-review auth-flow --security --performance
```

**Output:**
- Detailed review report in `.yoyo-dev/reviews/`
- Executive summary with severity counts
- Concrete fix recommendations

---

## Utility Commands

### `/yoyo-help`
Show help and command reference in Claude Code

**Usage:**
```bash
/yoyo-help
```

---

### `/improve-skills`
Optimize agent skills and performance

**Usage:**
```bash
/improve-skills
```

**What it does:**
- Analyzes current agent performance
- Suggests skill optimizations
- Creates optimization reports

---

### `/containerize-application`
Generate Docker configuration for applications

**Usage:**
```bash
/containerize-application --node          # Node.js application
/containerize-application --python        # Python application
/containerize-application --java          # Java application
/containerize-application --go            # Go application
/containerize-application --multi-stage   # Multi-stage build optimization
```

**Flags:**
- `--node` - Node.js application
- `--python` - Python application
- `--java` - Java application
- `--go` - Go application
- `--multi-stage` - Enable multi-stage build for smaller images

**What it does:**
- Analyzes application structure
- Generates optimized Dockerfile
- Creates docker-compose.yml (if applicable)
- Applies security best practices

---

### `yoyo`
Launch Yoyo Dev TUI dashboard

**Usage:**
```bash
yoyo                    # Launch split view (Claude + TUI)
yoyo --no-split         # Launch TUI only
yoyo --split-ratio 0.5  # Custom split ratio
yoyo --focus tui        # Start with TUI focused
yoyo --help             # Show help
yoyo --version          # Show version
```

**Flags:**
- `--no-split` - Launch TUI only (no Claude pane)
- `--split-ratio RATIO` - Custom split ratio (0.0-1.0)
- `--focus PANE` - Start with focus on "claude" or "tui"
- `--help` - Show command reference
- `--version` - Show Yoyo Dev version

**Split View Keyboard Shortcuts:**
- `Ctrl+B` + Arrow keys - Switch pane focus
- `Ctrl+B` + `<` - Make left pane larger
- `Ctrl+B` + `>` - Make right pane larger

---

## TUI Dashboard

### Features

The TUI dashboard provides:
- Real-time task/spec tracking
- Context-aware command suggestions
- Proactive error detection
- MCP server health monitoring

### Keyboard Shortcuts

```
?     Help              r     Refresh
/     Commands          g     Git menu
t     Focus tasks       s     Focus specs
h     Focus history     q     Quit
```

### Split View Mode

When using `yoyo` (default), you get Claude Code + TUI side-by-side:

```
+------------------+-------------------------+
| Claude Code CLI  |  Yoyo TUI Dashboard     |
| (40% width)      |  (60% width)            |
|                  |                         |
| Interactive AI   |  Task tracking          |
| assistant        |  Progress monitoring    |
+------------------+-------------------------+
```

---

## 🏗️ Workflow Examples

### Example 1: Create Simple Feature (Lite Mode)
```bash
/create-new "Add profile avatar" --lite --monitor
/execute-tasks
```

### Example 2: Create Complex Feature (Full Mode)
```bash
/create-new "User authentication system"
# Review spec, make adjustments
/execute-tasks --parallel --monitor
```

### Example 3: Fix Bug with Monitoring
```bash
/create-fix "Profile page layout broken on mobile" --monitor
/execute-tasks
```

### Example 4: Build with Design System
```bash
/design-component "User profile card"
/execute-tasks --design-mode
```

### Example 5: Critical Feature with Review
```bash
/create-new "Payment processing"
/yoyo-review payment-flow --security --production
/execute-tasks --sequential
```

### Example 6: Execute Specific Task Only
```bash
/execute-tasks --task=2                 # Interactive
/execute-tasks --task=2 --all           # Run completely
```

---

## 📋 Flag Quick Reference

### Execution Modes
- `--interactive` - Pause after each subtask (DEFAULT)
- `--all` - Run without pausing
- `--parallel` - Enable parallel execution
- `--sequential` - Force sequential execution

### Feature Creation
- `--lite` - Lightweight spec mode
- `--monitor` - Start task monitor
- `--no-questions` - Skip clarifying questions

### Design System
- `--analyze` - Analyze existing code
- `--minimal` - Minimal token set
- `--wcag-aaa` - Stricter accessibility
- `--strict` - Zero violations allowed

### Review Modes
- `--devil` - Devil's advocate
- `--security` - Security audit
- `--performance` - Performance check
- `--production` - Production readiness
- `--premortem` - Pre-mortem analysis
- `--quality` - Code quality

### Scope Filters (Design)
- `--colors` - Colors only
- `--spacing` - Spacing only
- `--contrast` - Contrast only
- `--focus` - Focus states only
- `--critical-only` - Critical issues only

---

## 💡 Tips

1. **Start with lite mode** for simple features, full mode for complex ones
2. **Use task monitor** for long-running tasks to track progress
3. **Interactive mode is default** - you're always in control
4. **Parallel execution** can save 2-3x time on independent tasks
5. **Review modes are optional** - use strategically when needed
6. **Design system** ensures consistency - use `/design-component` for UI work

---

## 🔗 Quick Links

- **Documentation:** `CLAUDE.md` (project root)
- **Standards:** `.yoyo-dev/standards/`
- **Instructions:** `.yoyo-dev/instructions/core/`
- **GitHub:** [Yoyo Dev Repository](https://github.com/daverjorge46/yoyo-dev-ai)

---

**Yoyo Dev v3.1** - "Powerful when you need it. Invisible when you don't."
