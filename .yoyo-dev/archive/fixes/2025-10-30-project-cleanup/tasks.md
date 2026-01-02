# Project Cleanup Tasks

**Fix:** 2025-10-30-project-cleanup
**Type:** Maintenance
**Status:** Ready for execution

---

## Task 1: Create Archive Directories

**Dependencies:** None
**Files to Create:**
  - lib/archive/README.md
  - docs/resolved-issues/README.md
**Files to Modify:** None
**Parallel Safe:** Yes

**Subtasks:**
- [ ] 1.1 Create `lib/archive/` directory with README explaining purpose
- [ ] 1.2 Create `docs/resolved-issues/` directory with README explaining purpose
- [ ] 1.3 Verify directories created successfully

---

## Task 2: Archive Old TUI Implementations

**Dependencies:** Task 1
**Files to Create:** None
**Files to Modify:**
  - lib/archive/ (add files)
**Parallel Safe:** No (depends on Task 1)

**Subtasks:**
- [ ] 2.1 Move `lib/yoyo-tui.py` to `lib/archive/yoyo-tui-v1.py`
- [ ] 2.2 Move `lib/task-monitor.sh` to `lib/archive/task-monitor.sh`
- [ ] 2.3 Move `lib/task-monitor-tmux.sh` to `lib/archive/task-monitor-tmux.sh`
- [ ] 2.4 Verify files moved successfully
- [ ] 2.5 Update `lib/archive/README.md` with file descriptions

---

## Task 3: Archive Resolved Issue Documentation

**Dependencies:** Task 1
**Files to Create:** None
**Files to Modify:**
  - docs/resolved-issues/ (add file)
**Parallel Safe:** Yes (independent of Task 2)

**Subtasks:**
- [ ] 3.1 Move `TUI-SPLIT-PANE-FIX.md` to `docs/resolved-issues/2025-10-23-tui-split-pane-fix.md`
- [ ] 3.2 Verify file moved successfully
- [ ] 3.3 Update `docs/resolved-issues/README.md` with description

---

## Task 4: Remove Duplicate and Obsolete Files

**Dependencies:** None
**Files to Create:** None
**Files to Modify:** None
**Parallel Safe:** Yes (independent of Tasks 2-3)

**Subtasks:**
- [ ] 4.1 Remove `commands/` directory (empty duplicate)
- [ ] 4.2 Remove `path/` directory (test artifact)
- [ ] 4.3 Remove `test_task_tree_fix.py` (temporary test file)
- [ ] 4.4 Verify removals successful

---

## Task 5: Verify No Broken References

**Dependencies:** Tasks 2, 3, 4
**Files to Create:** None
**Files to Modify:** None
**Parallel Safe:** No (must run after cleanup)

**Subtasks:**
- [ ] 5.1 Search codebase for references to archived files
- [ ] 5.2 Search codebase for references to removed directories
- [ ] 5.3 Verify setup scripts don't reference old files
- [ ] 5.4 Check CLAUDE.md and README.md for outdated references
- [ ] 5.5 Document any issues found

---

## Task 6: Update Documentation

**Dependencies:** Task 5
**Files to Create:** None
**Files to Modify:**
  - CLAUDE.md (if needed)
  - README.md (if needed)
**Parallel Safe:** No (must run after verification)

**Subtasks:**
- [ ] 6.1 Update CLAUDE.md if it references old structure
- [ ] 6.2 Update README.md if it references old files
- [ ] 6.3 Add note about cleanup to changelog/recap
- [ ] 6.4 Commit documentation updates

---

## Task 7: Validation and Testing

**Dependencies:** Tasks 2, 3, 4, 5, 6
**Files to Create:** None
**Files to Modify:** None
**Parallel Safe:** No (final validation)

**Subtasks:**
- [ ] 7.1 Run Python test suite to verify nothing broken
- [ ] 7.2 Test `yoyo` command launches successfully
- [ ] 7.3 Test `yoyo-tui-launcher.sh` works
- [ ] 7.4 Test TUI launches and displays correctly
- [ ] 7.5 Verify all setup scripts execute without errors
- [ ] 7.6 Check directory structure is clean and organized
- [ ] 7.7 Create final validation report

---

## Execution Plan

**Sequential execution recommended:**
1. Task 1 (create directories)
2. Tasks 2, 3, 4 in parallel (archive and remove)
3. Task 5 (verify references)
4. Task 6 (update docs)
5. Task 7 (validate)

**Estimated time:** 15-20 minutes

## Success Criteria

✅ All old implementations archived (not deleted)
✅ Duplicates removed
✅ Clean root directory
✅ No broken references
✅ All tests pass
✅ Commands work correctly
✅ Clear directory structure
