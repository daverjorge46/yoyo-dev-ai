# Yoyo Dev v2.0 - Migration Guide

**Upgrading from v1.x to v2.0**

---

## 🎯 TL;DR

```bash
# Install v2.0
~/.yoyo-dev/setup/install-v2.sh

# Start using new interactive mode
yoyo
/create-new "my feature" --lite --monitor
/execute-tasks  # Now interactive by default!
```

**Breaking change:** `/execute-tasks` is now interactive. Use `--all` for old behavior.

---

## 📋 Pre-Migration Checklist

Before upgrading:

- [ ] Backup current `.yoyo-dev/` folder (optional, but safe)
- [ ] Complete any in-progress tasks
- [ ] Commit current work to git
- [ ] Read this guide completely

---

## 🚀 Installation

### Step 1: Run Installer

```bash
~/.yoyo-dev/setup/install-v2.sh
```

This will:
1. Install new `yoyo` launcher
2. Set up task monitor system
3. Create templates directory
4. Check dependencies (tmux)
5. Test installation
6. Show what's new

### Step 2: Install tmux (Optional but Recommended)

For task monitor support:

**Ubuntu/Debian:**
```bash
sudo apt install tmux
```

**Fedora:**
```bash
sudo dnf install tmux
```

**Arch:**
```bash
sudo pacman -S tmux
```

**Why tmux?** Enables split-pane task monitoring - one of the best v2.0 features!

### Step 3: Refresh Shell

```bash
hash -r  # Refresh command cache
```

### Step 4: Verify Installation

```bash
yoyo --version  # Should show v2.0.0
yoyo --help     # Should show new commands
```

---

## 🔄 What Changed

### 1. Interactive Mode is Default

**Old behavior (v1.0):**
```bash
/execute-tasks
# Runs ALL tasks automatically without pausing
```

**New behavior (v2.0):**
```bash
/execute-tasks
# Pauses after each subtask, asks permission
```

**Migration:**

If you want old behavior:
```bash
/execute-tasks --all  # Run without pausing
```

If you want new interactive mode:
```bash
/execute-tasks  # Just use it! (default)
```

---

### 2. New yoyo Launcher

**Old launcher:**
- Basic project info
- Simple command list
- No flags support

**New launcher (v2.0):**
- Enhanced interface with v2.0 branding
- Quick start examples
- Flag documentation
- What's new section
- `--help`, `--version`, `--commands` flags

**Migration:**
- Automatic (installer updates `/usr/local/bin/yoyo`)
- No action needed from you
- Old launcher is replaced

---

### 3. MASTER-TASKS.md Format

**Old format:**
- Multiple files (spec.md, tasks.md, decisions.md, state.json)
- Fragmented context

**New format:**
- Single MASTER-TASKS.md file
- All context in one place

**Migration:**

**For existing features:**
- Old tasks.md still works (fully backwards compatible)
- No need to migrate unless you want to

**For new features:**
- Automatically use MASTER-TASKS.md
- New template applied

**To migrate old tasks (optional):**
1. Copy relevant sections from spec.md, tasks.md, decisions.md
2. Use `.yoyo-dev/templates/MASTER-TASKS.md` as template
3. Fill in sections
4. Delete old files (optional)

---

## 📚 New Features to Try

### 1. Interactive Execution

**Try it:**
```bash
/execute-tasks
```

**After each subtask:**
```
✅ Task 1.1 completed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Changes Made:
  • Created: components/ProfileCard.test.tsx

🧪 Tests: All passing (3/3)

⚠️  Continue to next task? [y/n/skip/quit]
```

**Your options:**
- `y` - Continue to next subtask
- `n` - Stop and fix issues
- `skip` - Skip to next parent task
- `quit` - Stop completely

---

### 2. Task Monitor with Split-Pane

**Try it:**
```bash
/execute-tasks --monitor
```

**What you get:**
- Left pane: Claude Code (your work area)
- Right pane: Live task progress monitor
- Real-time updates every 2 seconds

**Controls:**
- `Ctrl+B` then arrows → Switch panes
- `Ctrl+B` then `z` → Full screen toggle
- `Ctrl+B` then `x` → Close monitor

**Requirements:**
- tmux installed

---

### 3. Lite Mode for Fast Iteration

**Try it:**
```bash
/create-new "Add profile avatar" --lite
```

**What happens:**
- Skips detailed spec.md
- Creates only MASTER-TASKS.md
- 3-5x faster for simple features

**When to use:**
- Simple features (1-3 files)
- Straightforward requirements
- Fast prototyping

**When NOT to use:**
- Complex features (5+ files)
- Architecture decisions needed
- Need detailed documentation

---

### 4. Comprehensive Help System

**Try it:**
```bash
yoyo --help      # Full command reference
yoyo --commands  # Quick list
yoyo --version   # Show version
```

**Also available:**
```bash
cat ~/.yoyo-dev/COMMAND-REFERENCE.md  # Complete docs
```

---

### 5. New Execution Flags

**Try these:**
```bash
/execute-tasks --task=2              # Run Task 2 only (interactive)
/execute-tasks --task=2 --all        # Run Task 2 completely
/execute-tasks --parallel --monitor  # Parallel + monitoring
/execute-tasks --sequential          # Force sequential
```

---

### 6. Feature Creation Flags

**Try these:**
```bash
/create-new "feature" --lite --monitor    # Fast + monitoring
/create-new "feature" --no-questions      # Skip questions
```

---

### 7. Bug Fix Flags

**Try these:**
```bash
/create-fix "typo" --quick              # Skip investigation
/create-fix "complex bug" --monitor     # With monitoring
```

---

## 🛠️ Workflow Changes

### Before v2.0

```bash
# 1. Create feature (full spec always)
/create-new "User profile page"

# 2. Review spec
# (manually read spec.md, spec-lite.md, tasks.md)

# 3. Execute all tasks automatically
/execute-tasks

# 4. Hope nothing broke
# (no way to pause mid-execution)
```

### After v2.0

```bash
# 1. Create feature (lite mode for simple features)
/create-new "User profile page" --lite --monitor

# 2. Review MASTER-TASKS.md
# (single file, easy to scan)

# 3. Execute interactively with monitoring
/execute-tasks --monitor

# 4. Verify each subtask before continuing
# (y/n/skip/quit after each subtask)
```

**Result:**
- Faster iteration
- More control
- Better visibility
- Fewer errors

---

## 🐛 Troubleshooting

### yoyo command not found

**Solution:**
```bash
hash -r  # Refresh shell cache
```

If still not working:
```bash
sudo cp ~/.yoyo-dev/setup/yoyo-launcher-v2.sh /usr/local/bin/yoyo
sudo chmod +x /usr/local/bin/yoyo
```

---

### Task monitor not starting

**Check tmux:**
```bash
command -v tmux
```

**If not installed:**
```bash
sudo apt install tmux  # Ubuntu/Debian
```

**If tmux installed but still not working:**
```bash
# Try manual start
~/.yoyo-dev/lib/task-monitor-tmux.sh split path/to/MASTER-TASKS.md
```

---

### Old behavior of /execute-tasks preferred

**Solution:**
```bash
/execute-tasks --all  # Always use --all flag
```

**Or create alias:**
```bash
# Add to ~/.bashrc or ~/.zshrc
alias execute-tasks-auto='/execute-tasks --all'
```

---

### MASTER-TASKS.md format confusing

**Solution:**

View template:
```bash
cat ~/.yoyo-dev/templates/MASTER-TASKS.md
```

View example:
```bash
# Create a test feature to see the format
/create-new "test feature" --lite
cat .yoyo-dev/specs/*/MASTER-TASKS.md
```

**Or keep using old format:**
- tasks.md still works
- No need to migrate

---

## 📊 Feature Comparison

| Feature | v1.0 | v2.0 |
|---------|------|------|
| Interactive execution | ❌ | ✅ (default) |
| Task monitor | ❌ | ✅ (tmux split) |
| Lite mode | ❌ | ✅ (--lite flag) |
| Single task file | ❌ | ✅ (MASTER-TASKS.md) |
| Flag documentation | Basic | ✅ Comprehensive |
| Help system | ❌ | ✅ (yoyo --help) |
| Task discovery | Manual | ✅ Inline |
| Error handling | Basic | ✅ Interactive |
| Progress tracking | ❌ | ✅ Visual bars |
| Execution control | Run all | ✅ Per-subtask |

---

## 🎓 Learning Path

### Week 1: Try the Basics

**Day 1-2: Interactive Mode**
```bash
/execute-tasks  # Just try it
# Use 'y' to continue after each subtask
```

**Day 3-4: Task Monitor**
```bash
/execute-tasks --monitor
# Watch live progress in split pane
```

**Day 5-7: Lite Mode**
```bash
/create-new "simple feature" --lite
# Experience faster iteration
```

---

### Week 2: Master the Flags

**Day 8-9: Specific Tasks**
```bash
/execute-tasks --task=2
# Execute one task at a time
```

**Day 10-11: Parallel Execution**
```bash
/execute-tasks --parallel --monitor
# See independent tasks run concurrently
```

**Day 12-14: Help System**
```bash
yoyo --help
cat ~/.yoyo-dev/COMMAND-REFERENCE.md
# Learn all flags
```

---

### Week 3: Advanced Workflows

**Day 15-17: Bug Fixes with Monitoring**
```bash
/create-fix "bug description" --monitor
/execute-tasks --monitor
```

**Day 18-20: Design System + Interactive**
```bash
/design-component "Button"
/execute-tasks --design-mode
```

**Day 21: Create Your Own Patterns**
- Combine flags that work for you
- Build muscle memory
- Share patterns with team

---

## 💡 Best Practices

### 1. Start Interactive, Use --all Later

```bash
# First time building a feature
/execute-tasks  # Interactive (verify each step)

# If you need to rebuild later
/execute-tasks --all  # Fast rebuild
```

---

### 2. Use Lite Mode for Simple Features

```bash
# Simple (1-3 files)
/create-new "Add avatar upload" --lite

# Complex (5+ files)
/create-new "Authentication system"  # Full spec
```

---

### 3. Always Use Monitor for Long Tasks

```bash
/execute-tasks --monitor
# See progress even when you look away
```

---

### 4. Combine Flags for Your Workflow

```bash
# Fast feature creation with monitoring
/create-new "feature" --lite --monitor

# Parallel execution with monitoring
/execute-tasks --parallel --monitor

# Quick bug fix
/create-fix "typo" --quick
```

---

## 🚨 Breaking Changes Summary

### High Impact

1. **Interactive mode is default**
   - Impact: `/execute-tasks` behavior changed
   - Fix: Use `--all` for old behavior

### Low Impact

2. **New yoyo launcher**
   - Impact: Different interface
   - Fix: None needed (better UX)

3. **MASTER-TASKS.md format**
   - Impact: New features use new format
   - Fix: None needed (backwards compatible)

---

## ✅ Compatibility Matrix

| Scenario | v2.0 Compatible? | Notes |
|----------|------------------|-------|
| Old tasks.md files | ✅ Yes | Fully supported |
| Old commands | ✅ Yes | All work unchanged |
| Old flags | ✅ Yes | All supported |
| Old workflows | ⚠️ Mostly | /execute-tasks changed |
| Old specs | ✅ Yes | Still readable |

---

## 📞 Support

### Issues?

**Check logs:**
```bash
# Task monitor logs
tail -f /tmp/yoyo-task-monitor.log  # If logging enabled
```

**Test installation:**
```bash
~/.yoyo-dev/setup/install-v2.sh  # Re-run installer
```

**Reset to defaults:**
```bash
# Backup first
cp -r ~/.yoyo-dev ~/.yoyo-dev.backup

# Re-install from GitHub
~/.yoyo-dev/setup/yoyo-update.sh
```

---

## 🎉 You're Ready!

**Quick start:**
```bash
yoyo
/create-new "my first v2 feature" --lite --monitor
/execute-tasks
```

**Explore more:**
```bash
yoyo --help
cat ~/.yoyo-dev/COMMAND-REFERENCE.md
cat ~/.yoyo-dev/CHANGELOG-v2.0.md
```

**Share feedback:**
- GitHub issues
- Community discussions
- Feature requests

---

**Welcome to Yoyo Dev v2.0!** 🚀

*"Powerful when you need it. Invisible when you don't."*
