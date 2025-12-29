# Yoyo Dev Cleanup & Documentation Plan

**Version:** v3.1.1 → v5.0.0
**Date:** 2025-12-29
**Purpose:** Systematic cleanup and documentation overhaul

---

## Executive Summary

This document outlines the comprehensive cleanup and documentation updates for Yoyo Dev as it transitions to v5.0 with multi-agent orchestration.

---

## 1. Code Cleanup Tasks

### 1.1 Files to Archive (Move to `lib/archive/`)

**Already Archived (Keep):**
- ✓ `lib/archive/task-monitor.sh` - Old task monitoring script
- ✓ `lib/archive/task-monitor-tmux.sh` - Old tmux-based monitoring
- ✓ `lib/archive/yoyo-tui-v1.py` - First TUI version

**To Review for Removal:**
```
root/
├── verify_data_manager.py          # Temporary verification script
├── verify_parsers.py                # Temporary verification script
├── test-split-view.sh               # Moved to tests/
├── SPLIT-VIEW-FIXED.md              # Move to docs/resolved-issues/
└── =1.8.2                           # Junk file (remove)
```

### 1.2 Test Files to Clean Up

**Experimental Tests (Move to `tests/archive/`):**
```
tests/consciousness/
├── test_collaborative_language.py
├── test_consciousness_checks.py
├── test_identity_framework.py
├── test_meta_cognitive_logging.py
├── test_reflective_reasoning.py
└── test_session_continuity.py
```
**Reason:** Consciousness framework was specced but not fully implemented.

**Duplicate/Old Tests (Review):**
```
tests/
├── test_command_executor.py                    # Check if still used
├── test_command_executor_clipboard.py          # Duplicate?
├── test_command_executor_clipboard_simple.py   # Duplicate?
└── manual_test_history_display.py              # Archive to tests/manual/
```

### 1.3 Documentation to Organize

**Current State:**
```
docs/
├── resolved-issues/
└── (need more organization)
```

**Proposed Structure:**
```
docs/
├── installation/
│   ├── quick-start.md
│   ├── mcp-setup.md
│   ├── global-command.md
│   └── troubleshooting.md
├── features/
│   ├── tui-dashboard.md
│   ├── split-view.md
│   ├── memory-system.md
│   ├── skills-system.md
│   └── gui-dashboard.md
├── architecture/
│   ├── overview.md
│   ├── multi-agent-system.md
│   └── technology-stack.md
├── development/
│   ├── contributing.md
│   ├── testing.md
│   └── release-process.md
└── resolved-issues/
    └── (existing files)
```

### 1.4 Duplicate Setup Scripts

**Current:**
```
setup/                           # Main installation scripts
.yoyo-dev/setup/                 # Duplicate framework scripts
```

**Action:** Consolidate - `.yoyo-dev/setup/` is the framework template that gets copied during installation. Keep both but ensure they're in sync.

---

## 2. Documentation Updates Required

### 2.1 README.md Updates

**Current Version Reference:** v3.1
**Update To:** v5.0

**Required Changes:**
1. Update version number and "What's New" section
2. Add multi-agent orchestration features
3. Update MCP server list (remove outdated servers)
4. Add Yoyo-AI orchestrator documentation
5. Update installation instructions
6. Add v5.0 features:
   - Background task system
   - Agent delegation
   - Todo-driven workflow
   - Failure recovery with Oracle
   - Frontend delegation gate

### 2.2 CLAUDE.md Updates

**Current State:** Comprehensive but lacks v5.0 features

**Required Additions:**
1. Multi-Agent Orchestration section
2. Yoyo-AI system overview
3. Background tasks documentation
4. New commands: `/research`, `/consult-oracle`
5. Agent system (Oracle, Librarian, Explore, Frontend-Engineer, Document-Writer)
6. Todo-driven workflow details
7. Failure recovery protocol

### 2.3 New Documentation Needed

**Create:**
```
docs/installation/
├── quick-start.md               # 5-minute setup guide
├── mcp-docker-setup.md          # Docker MCP Gateway detailed guide
├── global-command-install.md    # Global yoyo command installation
└── troubleshooting.md           # Common issues and solutions

docs/features/
├── yoyo-ai-orchestrator.md      # Complete Yoyo-AI guide
├── multi-agent-system.md        # Agent roles and delegation
├── background-tasks.md          # Parallel execution guide
├── todo-workflow.md             # Todo-driven development
├── memory-system.md             # Memory system complete guide
└── skills-system.md             # Skills system guide

docs/commands/
├── core-commands.md             # /plan-product, /create-new, /execute-tasks
├── research-oracle.md           # /research, /consult-oracle
├── spec-management.md           # /create-spec, /create-tasks
└── debugging.md                 # /create-fix workflows

docs/architecture/
├── v5-overview.md               # v5.0 architecture
├── agent-registry.md            # Agent configuration
└── tool-system.md               # call_agent, background_task, etc.
```

---

## 3. Help Files and Menus

### 3.1 TUI Help Screen Updates

**Current:** Basic help screen
**Update:** Comprehensive help with:
- Keyboard shortcuts reference
- Command list
- Navigation guide
- Split view controls
- Quick tips

**File:** `lib/yoyo_tui_v3/screens/help_screen.py`

### 3.2 Command Reference

**Current:** `COMMAND-REFERENCE.md` (may be outdated)
**Update:** Complete command reference with v5.0 commands

**New File:** `docs/COMMAND-REFERENCE.md`
**Include:**
- All slash commands
- Flags and options
- Examples
- Integration notes

### 3.3 CLI Help Output

**Current:** Basic `yoyo --help`
**Update:** Comprehensive help with all options

**File:** `src/cli/index.ts`

---

## 4. Feature Documentation Status

### 4.1 Documented Features ✓

- [x] TUI Dashboard v3
- [x] Split View Mode
- [x] Memory System (basic)
- [x] Skills System (basic)
- [x] MCP Integration (Docker Gateway)
- [x] Installation process

### 4.2 Underdocumented Features ⚠

- [ ] Yoyo-AI Orchestrator
- [ ] Multi-agent system
- [ ] Background tasks
- [ ] Todo-driven workflow
- [ ] Failure recovery
- [ ] Frontend delegation
- [ ] GUI Dashboard (web interface)
- [ ] Agent registry configuration

### 4.3 Missing Documentation ✗

- [ ] Complete MCP server setup guide
- [ ] Troubleshooting guide
- [ ] Development/contributing guide
- [ ] Architecture diagrams
- [ ] API reference
- [ ] Performance optimization guide

---

## 5. Version Migration Guide

### 5.1 v4.0 → v5.0 Migration

**Create:** `docs/MIGRATION-v5.md`

**Contents:**
1. What's new in v5.0
2. Breaking changes
3. Migration checklist
4. Configuration updates
5. Rollback procedure

### 5.2 Deprecated Features

**Document in migration guide:**
- Legacy orchestrator (still available via `--orchestrator legacy`)
- Old command flags (if any)
- Deprecated configuration options

---

## 6. Configuration Documentation

### 6.1 config.yml Reference

**Current:** Inline comments
**Create:** `docs/configuration.md`

**Include:**
- All configuration options
- Default values
- Examples
- Best practices

### 6.2 Agent Configuration

**Create:** `docs/agents/configuration.md`

**Include:**
- Agent registry structure
- Temperature settings
- Tool restrictions
- Custom agent creation

---

## 7. Implementation Plan

### Phase 1: Immediate Cleanup (1-2 hours)
1. Remove junk files (`=1.8.2`)
2. Archive verification scripts
3. Move old test files to `tests/archive/`
4. Organize `docs/` directory structure

### Phase 2: Documentation Updates (3-4 hours)
1. Update README.md to v5.0
2. Update CLAUDE.md with v5.0 features
3. Create quick-start guide
4. Create troubleshooting guide

### Phase 3: New Documentation (4-6 hours)
1. Create feature documentation
2. Create command reference
3. Create architecture docs
4. Create migration guide

### Phase 4: Polish (2-3 hours)
1. Update all help screens
2. Add examples everywhere
3. Cross-reference between docs
4. Proofread all documentation

### Total Estimated Time: 10-15 hours

---

## 8. Success Criteria

**Documentation is complete when:**
- [ ] New user can install and start using Yoyo Dev in <10 minutes
- [ ] All v5.0 features are documented
- [ ] All commands have examples
- [ ] Troubleshooting guide covers common issues
- [ ] No outdated references in documentation
- [ ] All help screens are current
- [ ] Configuration is fully documented

**Code is clean when:**
- [ ] No junk files in root
- [ ] Old/experimental code is archived, not deleted
- [ ] Tests are organized and labeled
- [ ] No duplicate scripts
- [ ] Clear separation between framework and project code

---

## 9. Maintenance Plan

**Post-Cleanup:**
1. Add documentation update checklist to release process
2. Review and update docs quarterly
3. Keep changelog updated
4. Archive old versions properly
5. Maintain migration guides

---

**Status:** Ready for Execution
**Priority:** High (Required for v5.0 release)
**Owner:** Development Team
