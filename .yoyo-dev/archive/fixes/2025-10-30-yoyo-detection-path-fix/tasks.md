# Tasks: Yoyo Detection Path Fix

**Fix:** 2025-10-30-yoyo-detection-path-fix
**Issue:** Launcher scripts check for wrong directory name causing false "not installed" detection
**Approach:** Test-driven fix with simple path string correction

---

## Task 1: Write Detection Logic Tests

**Dependencies:** None
**Files to Create:**
  - `tests/test_yoyo_detection.sh`
**Files to Modify:** None
**Parallel Safe:** Yes

**Subtasks:**
- [x] 1.1 Create test script with setup/teardown functions
- [x] 1.2 Write test for `.yoyo-dev/` present (should detect as installed)
- [x] 1.3 Write test for old `yoyo-dev/` present (should warn about migration)
- [x] 1.4 Write test for neither present (should show installation instructions)
- [x] 1.5 Write test for consistency across all three launcher scripts
- [x] 1.6 Run initial tests (expect failures - proving tests work)

**Expected Outcome:** Test suite created and failing on current code (proving tests detect the bug)

**Test Validation:**
```bash
bash tests/test_yoyo_detection.sh
# Should show failures for .yoyo-dev/ detection
```

---

## Task 2: Fix yoyo.sh Detection Path

**Dependencies:** Task 1
**Files to Create:** None
**Files to Modify:**
  - `setup/yoyo.sh`
**Parallel Safe:** No (depends on Task 1)

**Subtasks:**
- [x] 2.1 Read `setup/yoyo.sh` to understand context around line 290
- [x] 2.2 Update line 290: Change `./yoyo-dev` to `./.yoyo-dev`
- [x] 2.3 Read context around line 348
- [x] 2.4 Update line 348: Change `./yoyo-dev` to `./.yoyo-dev`
- [x] 2.5 Verify no other occurrences in file need updating
- [x] 2.6 Run test suite to verify yoyo.sh detection now works

**Expected Outcome:** `setup/yoyo.sh` correctly detects `.yoyo-dev/` directory

**Test Validation:**
```bash
bash tests/test_yoyo_detection.sh
# yoyo.sh tests should now pass
```

---

## Task 3: Fix yoyo-tui-launcher.sh Detection Path

**Dependencies:** Task 1
**Files to Create:** None
**Files to Modify:**
  - `setup/yoyo-tui-launcher.sh`
**Parallel Safe:** Yes (can run in parallel with Task 2)

**Subtasks:**
- [x] 3.1 Read `setup/yoyo-tui-launcher.sh` to understand context around line 16
- [x] 3.2 Update line 16: Change `./yoyo-dev` to `./.yoyo-dev`
- [x] 3.3 Verify no other occurrences in file need updating
- [x] 3.4 Run test suite to verify yoyo-tui-launcher.sh detection now works

**Expected Outcome:** `setup/yoyo-tui-launcher.sh` correctly detects `.yoyo-dev/` directory

**Test Validation:**
```bash
bash tests/test_yoyo_detection.sh
# yoyo-tui-launcher.sh tests should now pass
```

---

## Task 4: Fix yoyo-tmux.sh Detection Path

**Dependencies:** Task 1
**Files to Create:** None
**Files to Modify:**
  - `setup/yoyo-tmux.sh`
**Parallel Safe:** Yes (can run in parallel with Tasks 2 and 3)

**Subtasks:**
- [x] 4.1 Read `setup/yoyo-tmux.sh` to understand context around line 51
- [x] 4.2 Update line 51: Change `./yoyo-dev` to `./.yoyo-dev`
- [x] 4.3 Verify no other occurrences in file need updating
- [x] 4.4 Run test suite to verify yoyo-tmux.sh detection now works

**Expected Outcome:** `setup/yoyo-tmux.sh` correctly detects `.yoyo-dev/` directory

**Test Validation:**
```bash
bash tests/test_yoyo_detection.sh
# yoyo-tmux.sh tests should now pass
```

---

## Task 5: Verify All Tests Pass

**Dependencies:** Tasks 2, 3, 4
**Files to Create:** None
**Files to Modify:** None
**Parallel Safe:** No (must run after all fixes complete)

**Subtasks:**
- [x] 5.1 Run full test suite
- [x] 5.2 Verify all detection scenarios pass for all three scripts
- [x] 5.3 Manual test: Create test project with `.yoyo-dev/` and run `yoyo` command
- [x] 5.4 Verify no false negatives ("not installed" when it is installed)
- [x] 5.5 Document any edge cases discovered during testing

**Expected Outcome:** All tests passing, manual verification confirms fix works

**Test Validation:**
```bash
bash tests/test_yoyo_detection.sh
# All tests should pass
# Exit code: 0
```

**Manual Verification:**
```bash
# In a project with .yoyo-dev/ installed
yoyo
# Should launch TUI, not show "not installed" error
```

---

## Execution Notes

**Parallel Execution Opportunity:**
- Task 1 must complete first (creates tests)
- Tasks 2, 3, 4 can run in parallel (independent file modifications)
- Task 5 must run last (verification)

**Execution Groups:**
- Group 0: Task 1 (sequential)
- Group 1: Tasks 2, 3, 4 (parallel)
- Group 2: Task 5 (sequential)

**Expected Time Savings:**
- Sequential: ~25 minutes
- Parallel: ~15 minutes
- **Speedup: 1.7x**

**Risk Assessment:**
- **Risk Level:** Low (simple string replacements)
- **Blast Radius:** Medium (affects all yoyo command users)
- **Rollback:** Simple (revert string changes)
- **Testing:** Comprehensive (automated + manual)

**Success Criteria:**
- [x] All affected files updated
- [x] All tests passing
- [x] Manual verification confirms fix
- [x] No regressions in error messaging
- [x] Consistent detection logic across all launchers
