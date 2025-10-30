# Resolved Issues Archive

This directory contains **detailed documentation of resolved bugs, issues, and fixes** that have been successfully implemented and verified.

## Purpose

**Why archive resolved issues?**
- Historical record of problems and solutions
- Reference for similar future issues
- Learning resource for understanding system evolution
- Documentation of architectural decisions

## Archived Issues

### 2025-10-23-tui-split-pane-fix.md
**Date:** 2025-10-23
**Status:** ✅ RESOLVED
**Type:** Bug fix (UX/Architecture)

**Problem:** TUI appearing then disappearing in tmux split pane
**Root cause:** Textual TUI terminal control conflicting with tmux
**Solution:** Use Rich-based passive dashboard for split panes, Textual TUI for full-screen

**Impact:**
- Improved split pane stability
- Better user experience
- Clear separation of use cases

**Files changed:**
- `setup/yoyo-tmux.sh` - Updated dashboard priority
- `setup/yoyo-tui-launcher.sh` - Created full-screen launcher

---

## File Naming Convention

`YYYY-MM-DD-issue-description.md`

Example: `2025-10-23-tui-split-pane-fix.md`

## What to Archive

✅ **Archive these:**
- Resolved bugs with detailed analysis
- Architecture fixes with implementation details
- Performance improvements with benchmarks
- UX improvements with before/after

❌ **Don't archive:**
- Simple one-line fixes
- Typo corrections
- Minor refactorings
- Issues without analysis

## When to Archive

Archive when:
1. Issue is completely resolved
2. Solution is verified in production
3. No further work needed
4. Documentation is comprehensive

---

**Note:** Active issues belong in `.yoyo-dev/fixes/`. Only move here after complete resolution and verification.
