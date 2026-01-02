# Tasks: Fix yoyo-update Hang Issue

**Fix:** 2025-10-30-yoyo-update-hang-fix
**Created:** 2025-10-30
**Status:** Ready for execution

---

## Task Breakdown

This fix follows a **Test-Driven Development (TDD)** approach where we write tests first, then implement fixes, then verify tests pass.

---

## Task 1: Write Tests for Non-Interactive Execution

**Dependencies:** None
**Files to Create:**
  - tests/test_yoyo_update_noninteractive.sh
**Files to Modify:** None
**Parallel Safe:** Yes
**Estimated Time:** 15 minutes

### Subtasks

- [x] 1.1 Create test script `tests/test_yoyo_update_noninteractive.sh`
  - Test that yoyo-update completes within 120 seconds
  - Test that Ctrl+C (SIGINT) interrupts cleanly
  - Test that script exits with proper status codes
  - Test with and without venv
  - Test sudo operations don't block

- [x] 1.2 Create test helper functions
  - `test_update_completes()` - Runs update, expects success in < 120s
  - `test_ctrl_c_interrupt()` - Sends SIGINT after 2s, expects clean exit
  - `test_no_sudo_prompt()` - Verifies no interactive sudo prompts
  - `test_pip_noninteractive()` - Verifies pip doesn't block

- [x] 1.3 Run tests to confirm they fail (TDD red phase)
  - Execute test suite
  - Verify failures match expected issues (hanging, ctrl+c not working)
  - Document baseline test results

---

## Task 2: Fix install-deps.sh - Add Non-Interactive Flags

**Dependencies:** Task 1 (tests must exist first)
**Files to Create:** None
**Files to Modify:**
  - setup/install-deps.sh
**Parallel Safe:** No (depends on Task 1)
**Estimated Time:** 20 minutes

### Subtasks

- [x] 2.1 Add signal trap for Ctrl+C
  - Add `trap 'echo ""; echo "⚠️  Installation interrupted"; exit 130' INT TERM` at top of script
  - Test that trap works correctly

- [x] 2.2 Update pip install commands (line 71)
  - Change: `$PIP install "$package" --quiet`
  - To: `$PIP install "$package" --quiet --no-input --disable-pip-version-check`
  - Add timeout wrapper: `timeout 300 $PIP install ...`
  - Add error handling for timeout case

- [x] 2.3 Add timeout error handling
  - If pip times out, show clear message
  - Provide manual installation instructions
  - Don't fail entire script (allow continuation)

- [x] 2.4 Test the changes
  - Run `tests/test_yoyo_update_noninteractive.sh`
  - Verify pip operations don't hang
  - Verify Ctrl+C works during pip install
  - Verify timeout protection works

---

## Task 3: Fix yoyo-update.sh - Add Non-Interactive Flags

**Dependencies:** Task 2 (install-deps.sh must be fixed first since yoyo-update.sh calls it)
**Files to Create:** None
**Files to Modify:**
  - setup/yoyo-update.sh
**Parallel Safe:** No (depends on Task 2)
**Estimated Time:** 25 minutes

### Subtasks

- [x] 3.1 Add signal trap for Ctrl+C
  - Add `trap 'echo ""; echo "⚠️  Update interrupted"; exit 130' INT TERM` after line 6
  - Test that trap works correctly

- [x] 3.2 Update pip install commands (lines 506, 509)
  - Line 506: `"$HOME/yoyo-dev/venv/bin/pip" install --upgrade -r "$HOME/yoyo-dev/requirements.txt"`
  - Add: `--no-input --disable-pip-version-check`
  - Wrap with timeout: `timeout 300 ...`
  - Same for line 509 (system pip case)

- [x] 3.3 Replace sudo prompts with permission checks
  - Lines 243, 251, 278, 286 - All `sudo ln -sf` commands
  - Replace with permission check + fallback message
  - Example pattern:
    ```bash
    if [ -w "/usr/local/bin" ]; then
        ln -sf "$HOME/yoyo-dev/setup/yoyo.sh" /usr/local/bin/yoyo
        echo "  ✓ yoyo command updated"
    else
        echo "  ⚠️  Cannot update global command (requires permissions)"
        echo "     Run manually: sudo ln -sf ~/yoyo-dev/setup/yoyo.sh /usr/local/bin/yoyo"
    fi
    ```

- [x] 3.4 Test the changes
  - Run `tests/test_yoyo_update_noninteractive.sh`
  - Verify update completes in < 120 seconds
  - Verify Ctrl+C works throughout script
  - Verify no sudo prompts appear
  - Test both with and without write permissions to /usr/local/bin

---

## Task 4: Integration Testing and Verification

**Dependencies:** Tasks 1, 2, 3 (all fixes must be complete)
**Files to Create:**
  - tests/test_yoyo_update_integration.sh
**Files to Modify:** None
**Parallel Safe:** No (depends on all previous tasks)
**Estimated Time:** 20 minutes

### Subtasks

- [x] 4.1 Create comprehensive integration test suite
  - Test complete update flow end-to-end
  - Test in fresh project directory
  - Test with existing .yoyo-dev installation
  - Test with various Python environments (venv, system, no pip)

- [x] 4.2 Run all test suites
  - Execute `tests/test_yoyo_update_noninteractive.sh`
  - Execute `tests/test_yoyo_update_integration.sh`
  - Verify all tests pass (TDD green phase)
  - Document test results

- [x] 4.3 Manual verification testing
  - Test real yoyo-update command in actual project
  - Test Ctrl+C interruption during dependency install
  - Test behavior with slow network (simulate with network throttling)
  - Test with conflicting package versions

- [x] 4.4 Performance verification
  - Measure update completion time (should be < 2 minutes)
  - Verify no degradation from original (non-hanging) performance
  - Check memory usage during update

---

## Task 5: Update Documentation and Create PR

**Dependencies:** Task 4 (all tests must pass)
**Files to Create:** None
**Files to Modify:**
  - CHANGELOG.md (if exists)
  - .yoyo-dev/fixes/2025-10-30-yoyo-update-hang-fix/state.json
**Parallel Safe:** No (depends on Task 4)
**Estimated Time:** 15 minutes

### Subtasks

- [x] 5.1 Update CHANGELOG.md
  - Add entry for bug fix
  - Document changes to yoyo-update behavior
  - Note breaking changes (if any)

- [x] 5.2 Update state.json
  - Mark fix as completed
  - Add PR URL once created
  - Document test results

- [x] 5.3 Create git commit
  - Stage all modified files
  - Write clear commit message
  - Reference fix ID in commit

- [x] 5.4 Create pull request
  - Push branch to remote
  - Create PR with detailed description
  - Link to fix analysis document
  - Add labels: bug, critical, high-priority

- [x] 5.5 Final verification
  - Verify all tests pass in CI
  - Check for any linting issues
  - Verify no files were accidentally modified

---

## Summary

**Total Tasks:** 5 parent tasks, 20 subtasks
**Estimated Time:** 95 minutes (~1.5 hours)
**Parallel Opportunities:** None (sequential due to dependencies)

**Critical Path:**
1. Write tests (Task 1)
2. Fix install-deps.sh (Task 2)
3. Fix yoyo-update.sh (Task 3)
4. Verify fixes (Task 4)
5. Create PR (Task 5)

**Success Criteria:**
- ✅ All tests pass
- ✅ yoyo-update completes in < 2 minutes
- ✅ Ctrl+C works immediately
- ✅ No sudo prompts
- ✅ No hanging on pip operations
