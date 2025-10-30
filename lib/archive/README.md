# Archive Directory

This directory contains **historical implementations** of yoyo-dev components that have been superseded by newer, better implementations.

## Purpose

**Why archive instead of delete?**
- Historical reference for understanding evolution
- Potential code reuse or pattern extraction
- Documentation of what didn't work (learning)
- Safety: can reference if needed

## Archived Files

### yoyo-tui-v1.py
**Original:** `lib/yoyo-tui.py`
**Archived:** 2025-10-30
**Superseded by:** `lib/yoyo_tui_v3/app.py`

**Why replaced:**
- Monolithic architecture (single file)
- Limited extensibility
- Harder to maintain and test
- Replaced with modular yoyo_tui_v3 architecture

**Historical value:**
- Shows original TUI implementation approach
- Contains working Textual patterns
- Reference for migration decisions

### task-monitor.sh
**Original:** `lib/task-monitor.sh`
**Archived:** 2025-10-30
**Superseded by:** `lib/yoyo_tui_v3/`

**Why replaced:**
- Bash-based monitoring (limited features)
- No interactive capabilities
- Replaced with rich Python TUI

**Historical value:**
- Shows early monitoring approach
- Contains bash parsing patterns
- Reference for task detection logic

### task-monitor-tmux.sh
**Original:** `lib/task-monitor-tmux.sh`
**Archived:** 2025-10-30
**Superseded by:** `setup/yoyo-tmux.sh` + `lib/yoyo_tui_v3/`

**Why replaced:**
- Limited tmux integration
- Basic status display only
- Replaced with comprehensive tmux launcher + rich TUI

**Historical value:**
- Shows tmux integration patterns
- Reference for split pane handling

---

**Note:** These files are kept for reference only. Do not use in production. For active implementations, see `lib/yoyo_tui_v3/` and `setup/` directories.
