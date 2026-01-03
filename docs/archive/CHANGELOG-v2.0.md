# Yoyo Dev v2.0 - Changelog

**Release Date:** 2025-10-10
**Theme:** "Powerful when you need it. Invisible when you don't."

---

## 🎯 Inspiration

This release is heavily inspired by [ai-dev-tasks](https://github.com/snarktank/ai-dev-tasks) by @snarktank and [agent-os](https://github.com/buildermethods/agent-os) by @buildermethodstank, which demonstrated that **radical simplicity** and **permission-based execution** create better AI-assisted workflows than automation-first approaches.

**Key insight:** The best workflow is one that gets out of your way while keeping humans in control.

---

## ✨ Major New Features

### 1. Interactive Mode by Default ⭐⭐⭐⭐⭐

**Before (v1.0):**
```bash
/execute-tasks  # Runs ALL tasks automatically
```

**After (v2.0):**
```bash
/execute-tasks  # Pauses after each subtask, asks permission
/execute-tasks --all  # Legacy behavior (opt-in)
```

**Why?**
- Human stays in control
- Early error detection
- No more "AI raced ahead and broke everything"
- Matches ai-dev-tasks permission model

**Options after each subtask:**
- `y` - Continue to next
- `n` - Stop and fix
- `skip` - Skip to next parent task
- `quit` - Stop completely

---

### 2. MASTER-TASKS.md (Single Source of Truth) ⭐⭐⭐⭐⭐

**Before (v1.0):**
```
.yoyo-dev/specs/feature/
├── spec.md
├── spec-lite.md
├── tasks.md
├── decisions.md
└── state.json
```

**After (v2.0):**
```
.yoyo-dev/specs/feature/
└── MASTER-TASKS.md  # Everything in one file
```

**What's included:**
- Feature overview (PRD-style)
- Task breakdown with checkboxes
- Relevant files list
- Technical decisions
- Newly discovered tasks
- Current focus tracker
- Progress summary with visual bar

**Benefits:**
- One file to read (no fragmented context)
- Easy to scan current state
- Progressive checkbox marking
- Inline task discovery

---

### 3. Task Monitor with Tmux Split-Pane ⭐⭐⭐⭐

**New capability:**
```bash
/execute-tasks --monitor
```

**What you get:**
- Live task progress in split pane (right side, 35% width)
- Real-time progress bar
- Current task highlighted
- Recent task history
- Automatic updates every 2 seconds

**Controls:**
- `Ctrl+B` then arrows - Switch panes
- `Ctrl+B` then `z` - Full screen toggle
- `Ctrl+B` then `x` - Close monitor

**Manual usage:**
```bash
~/.yoyo-dev/lib/task-monitor-tmux.sh split path/to/MASTER-TASKS.md
```

**Requirements:**
- tmux (install: `sudo apt install tmux`)
- Optional but highly recommended

---

### 4. Lite Mode for Simple Features ⭐⭐⭐⭐

**New flag:**
```bash
/create-new "Add profile avatar" --lite
```

**What it does:**
- Skips detailed spec.md creation
- Creates only MASTER-TASKS.md
- Faster iteration (2-3x speedup)
- Perfect for simple features (1-3 files)

**When to use:**
- Straightforward requirements
- Small changes
- Fast prototyping

**When to use full mode:**
- Complex features (5+ files)
- Architecture decisions needed
- Multiple sub-specs required

---

### 5. Comprehensive Flag Documentation ⭐⭐⭐⭐

**New commands:**
```bash
yoyo --help         # Full command reference with flags
yoyo --version      # Show version
yoyo --commands     # Quick command list
yoyo --monitor      # Start task monitor
```

**New documentation:**
- `.yoyo-dev/COMMAND-REFERENCE.md` - Complete flag guide
- `.yoyo-dev/standards/interactive-execution.md` - Interaction patterns
- In-command help text for all flags

---

## 🔧 Improvements

### Execution Flags

**New flags for `/execute-tasks`:**
- `--all` - Run without pausing (legacy mode)
- `--task=N` - Execute specific task only
- `--interactive` - Explicit interactive mode (default, not needed)
- `--parallel` - Enable parallel execution
- `--sequential` - Force sequential
- `--monitor` - Start task monitor

**Examples:**
```bash
/execute-tasks --task=2              # Run Task 2 interactively
/execute-tasks --task=2 --all        # Run Task 2 completely
/execute-tasks --parallel --monitor  # Parallel + monitoring
```

### Feature Creation Flags

**New flags for `/create-new`:**
- `--lite` - Lightweight mode (skip heavy spec)
- `--monitor` - Auto-start task monitor
- `--no-questions` - Skip clarifying questions (simple features)

**Examples:**
```bash
/create-new "feature" --lite --monitor
/create-new "simple fix" --no-questions
```

### Fix Creation Flags

**New flags for `/create-fix`:**
- `--quick` - Skip investigation (obvious problems)
- `--monitor` - Auto-start task monitor

**Example:**
```bash
/create-fix "typo in header" --quick
/create-fix "complex bug" --monitor
```

### Yoyo Launcher Improvements

**Enhanced header:**
- Shows Yoyo Dev v2.0 version
- Displays v2.0 mantra
- Lists new features
- Quick start examples
- Flag documentation links

**New capabilities:**
- `yoyo --help` shows full reference
- `yoyo --commands` lists all commands
- `yoyo --monitor` starts task monitor
- Better tech stack detection

---

## 📋 Task Discovery Pattern

**New workflow:**

During task execution, AI can discover new tasks:

```markdown
## 🆕 Newly Discovered Tasks

- [ ] Add image compression before upload
  **Discovered:** During Task 3.2
  **Reason:** Large images causing slow uploads
  **Priority:** Medium
```

**Interactive prompt:**
```
🆕 New task discovered: "Add image compression"

Options:
  1. Add to current sprint (run now)
  2. Defer to later (add to task list)
  3. Skip (don't add)

Choice [1/2/3]:
```

---

## 🎨 Terminal UI Improvements

### Changes Summary Template

After each subtask:
```
✅ Task 1.1 completed - Write tests for ProfileCard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Changes Made:
  • Created: components/ProfileCard.test.tsx (125 lines)
  • Modified: None

🧪 Tests: All passing (3/3)

📊 Progress: 1/12 subtasks complete

⚠️  Continue to next task? [y/n/skip/quit]
```

### Error Handling Template

When subtask fails:
```
❌ Task 1.2 failed - Implement ProfileCard base
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 Error: Type error in ProfileCard.tsx

💡 Suggested Fix:
  Add missing 'name' prop to ProfileCardProps interface

Options:
  1. Retry with fix
  2. Skip this subtask
  3. Stop execution

Choice [1/2/3]:
```

---

## 📚 New Documentation Files

- `COMMAND-REFERENCE.md` - Complete command and flag guide
- `CHANGELOG-v2.0.md` - This file
- `MIGRATION-GUIDE-v2.0.md` - Upgrade instructions
- `standards/interactive-execution.md` - Interactive patterns
- `templates/MASTER-TASKS.md` - Task template
- `lib/task-monitor.sh` - Task monitor core
- `lib/task-monitor-tmux.sh` - Tmux integration
- `setup/yoyo-launcher-v2.sh` - New launcher
- `setup/install-v2.sh` - V2 installer

---

## 🔄 Breaking Changes

### 1. Interactive Mode is Default

**Impact:** `/execute-tasks` now pauses after each subtask

**Migration:**
- If you want old behavior: Use `--all` flag
- If you want interactive: No changes needed (it's default)

**Example:**
```bash
# Old behavior (v1.0)
/execute-tasks

# Same behavior in v2.0
/execute-tasks --all
```

### 2. MASTER-TASKS.md Format

**Impact:** New features use MASTER-TASKS.md instead of tasks.md

**Migration:**
- Existing tasks.md files still work
- New features automatically use MASTER-TASKS.md
- Optional: Migrate old tasks manually

**Backwards compatible:** Yes, old format supported

---

## ✅ Backwards Compatibility

### What Still Works

✅ All existing commands (`/plan-product`, `/create-new`, etc.)
✅ Old tasks.md format
✅ Existing folder structure
✅ All v1.0 workflows
✅ Old flags and options

### What Changed

⚠️ Default behavior of `/execute-tasks` (now interactive)
⚠️ New features create MASTER-TASKS.md (old format optional)
⚠️ New yoyo launcher interface (old one replaced)

### Migration Path

**Option 1: Gradual (Recommended)**
- Keep using v1.0 workflows
- Try new flags when ready
- Use `--all` for old behavior

**Option 2: Full Upgrade**
- Run `~/.yoyo-dev/setup/install-v2.sh`
- Update workflows to use new flags
- Migrate old tasks to MASTER-TASKS.md format

---

## 🚀 Performance Improvements

### Reduced Context Size

**Before (v1.0):**
- AI loads 5 files to understand one feature
- ~10,000 tokens for full context

**After (v2.0):**
- AI loads 1 file (MASTER-TASKS.md)
- ~2,000 tokens for same context
- **80% reduction in context size**

### Faster Iteration with Lite Mode

**Full spec creation:** ~5-10 minutes
**Lite mode:** ~1-2 minutes
**Speedup:** 3-5x faster for simple features

---

## 📊 Metrics

### Lines of Code

- **New code:** ~1,200 lines
- **Modified code:** ~300 lines
- **New files:** 8
- **Modified files:** 2

### Documentation

- **New docs:** ~2,500 lines
- **Examples:** 50+
- **Command reference:** Comprehensive

---

## 🎓 Learning from ai-dev-tasks

### What We Adopted

1. ✅ **Permission-based execution** - Pause after each subtask
2. ✅ **Single source of truth** - MASTER-TASKS.md
3. ✅ **Radical simplicity** - Lite mode option
4. ✅ **Task discovery** - Add tasks inline during execution
5. ✅ **Interactive by default** - Humans stay in control

### What We Kept from Yoyo Dev

1. ✅ **Rich workflows** - Product planning, bug fixes, design system
2. ✅ **Quality standards** - Personas, best practices, code style
3. ✅ **Professional output** - Terminal formatting, progress bars
4. ✅ **Git integration** - Commits, PRs, recaps
5. ✅ **Parallel execution** - For advanced users

### What We Improved

1. ✅ **Task monitoring** - Live split-pane view (better than ai-dev-tasks)
2. ✅ **Flag system** - Comprehensive documentation
3. ✅ **Error handling** - Structured error prompts
4. ✅ **Progress tracking** - Visual progress bars
5. ✅ **Help system** - In-app help with `yoyo --help`

---

## 🙏 Credits

**Inspired by:**
- [ai-dev-tasks](https://github.com/snarktank/ai-dev-tasks) by @snarktank
- Three-file simplicity principle
- Permission-based execution model
- Task-list-as-single-source-of-truth pattern

**Built by:** Yoyo Dev community

---

## 🔮 Future Plans (v2.1+)

Potential future improvements:

1. **Web-based task monitor** - Browser-based dashboard
2. **Task templates** - Pre-built task patterns for common features
3. **Time estimation** - AI-powered time predictions
4. **Voice commands** - "Continue" / "Stop" voice control
5. **Session recording** - Replay execution sessions
6. **Analytics dashboard** - Track velocity, patterns, bottlenecks

---

## 🎯 Philosophy

**v1.0 mantra:** "Systematic AI-assisted development"
**v2.0 mantra:** "Powerful when you need it. Invisible when you don't."

**Core belief:**
- Control > Speed
- Simplicity > Features
- Verification > Automation
- Human-in-loop > Fully autonomous

---

## 📦 Installation

```bash
# Install v2.0 improvements
~/.yoyo-dev/setup/install-v2.sh

# Launch with new interface
yoyo

# Show new help system
yoyo --help
```

---

## 📖 Documentation

- **Command Reference:** `.yoyo-dev/COMMAND-REFERENCE.md`
- **Migration Guide:** `.yoyo-dev/MIGRATION-GUIDE-v2.0.md`
- **Interactive Patterns:** `.yoyo-dev/standards/interactive-execution.md`
- **Main Docs:** `CLAUDE.md` (project root)

---

**Yoyo Dev v2.0** - Bridging the gap between AI power and human control.
