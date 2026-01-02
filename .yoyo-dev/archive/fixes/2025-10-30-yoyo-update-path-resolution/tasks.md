# Tasks: yoyo-update Path Resolution Fix

**Fix:** 2025-10-30-yoyo-update-path-resolution
**Created:** 2025-10-30
**Status:** Ready for execution

## Task Overview

This fix addresses three critical issues in `setup/yoyo-update.sh`:
1. Circular symlink update logic causing permission warnings
2. Hardcoded virtual environment paths failing to resolve correctly
3. Path resolution inconsistency (using `$BASE_YOYO_DEV` for some paths, hardcoded `$HOME/yoyo-dev` for others)

## Parent Tasks

### Task 1: Create Test Suite for Path Resolution

**Dependencies:** None
**Files to Create:**
  - tests/test_yoyo_update_paths.sh
**Files to Modify:** None
**Parallel Safe:** Yes

**Subtasks:**
- [x] 1.1 Write test for $BASE_YOYO_DEV resolution from symlinked execution
- [x] 1.2 Write test for venv path detection with existing venv
- [x] 1.3 Write test for venv path detection with missing venv
- [x] 1.4 Write test for requirements.txt path resolution
- [x] 1.5 Write test to ensure no hardcoded $HOME/yoyo-dev paths exist
- [x] 1.6 Write test for graceful handling when pip missing from venv
- [x] 1.7 Run test suite and verify all tests fail (pre-fix baseline)

**Success Criteria:**
- All 6 test scenarios written and documented
- Tests fail appropriately before fix (demonstrating issues exist)
- Test output clearly identifies what's broken

---

### Task 2: Remove Circular Symlink Update Logic

**Dependencies:** Task 1
**Files to Create:** None
**Files to Modify:**
  - setup/yoyo-update.sh
**Parallel Safe:** No (depends on Task 1)

**Subtasks:**
- [x] 2.1 Write integration test for update without symlink modification
- [x] 2.2 Remove symlink self-update section (lines 240-304)
- [x] 2.3 Add simplified project-only launcher update section
- [x] 2.4 Verify update completes without permission warnings
- [x] 2.5 Test that global symlinks remain unchanged after update
- [x] 2.6 Run test suite and verify symlink-related tests pass

**Success Criteria:**
- Lines 240-304 removed cleanly
- New simplified section copies launcher scripts to project only
- No attempts to modify `/usr/local/bin/yoyo` or `/usr/local/bin/yoyo-update`
- No permission warnings during update
- Tests pass

---

### Task 3: Replace Hardcoded Paths with $BASE_YOYO_DEV

**Dependencies:** Task 2
**Files to Create:** None
**Files to Modify:**
  - setup/yoyo-update.sh
**Parallel Safe:** No (depends on Task 2)

**Subtasks:**
- [x] 3.1 Write test for venv path resolution using $BASE_YOYO_DEV
- [x] 3.2 Replace `$HOME/yoyo-dev/venv` with `$BASE_YOYO_DEV/venv` (line 492)
- [x] 3.3 Replace `$HOME/yoyo-dev/requirements.txt` with `$BASE_YOYO_DEV/requirements.txt` (lines 513, 519)
- [x] 3.4 Update dependency check logic to use $BASE_YOYO_DEV (line 493)
- [x] 3.5 Update pip upgrade command to use $BASE_YOYO_DEV (line 513)
- [x] 3.6 Update error messages to use $BASE_YOYO_DEV (lines 515, 521)
- [x] 3.7 Run test suite and verify path resolution tests pass

**Success Criteria:**
- Zero instances of hardcoded `$HOME/yoyo-dev/venv` remain
- Zero instances of hardcoded `$HOME/yoyo-dev/requirements.txt` remain
- All paths resolved using `$BASE_YOYO_DEV` variable
- Tests pass for path resolution

---

### Task 4: Add Virtual Environment Validation and Error Handling

**Dependencies:** Task 3
**Files to Create:** None
**Files to Modify:**
  - setup/yoyo-update.sh
**Parallel Safe:** No (depends on Task 3)

**Subtasks:**
- [x] 4.1 Write test for venv exists but pip missing scenario
- [x] 4.2 Write test for requirements.txt missing scenario
- [x] 4.3 Add pip existence check before upgrade attempt (after line 512)
- [x] 4.4 Add actionable error message if pip missing from venv
- [x] 4.5 Add requirements.txt existence check for pip3 fallback
- [x] 4.6 Add info message if no pip installation found
- [x] 4.7 Run test suite and verify error handling tests pass

**Success Criteria:**
- Script checks if `$BASE_YOYO_DEV/venv/bin/pip` exists before use
- Clear error message if venv exists but pip missing
- Graceful skip with info message if requirements.txt missing
- Info message if no pip found (not an error)
- Tests pass for all error scenarios

---

### Task 5: Integration Testing and Validation

**Dependencies:** Task 4
**Files to Create:**
  - tests/test_yoyo_update_integration.sh
**Files to Modify:** None
**Parallel Safe:** No (depends on Task 4)

**Subtasks:**
- [x] 5.1 Write integration test: update from project directory
- [x] 5.2 Write integration test: verify dependency upgrade in venv
- [x] 5.3 Write integration test: verify clean output (no warnings)
- [x] 5.4 Write integration test: verify global symlinks unchanged
- [x] 5.5 Write integration test: verify all framework files updated
- [x] 5.6 Run full integration test suite
- [x] 5.7 Verify all tests pass

**Success Criteria:**
- All integration tests pass
- Update runs cleanly from project directory
- Dependencies upgraded successfully in venv
- No permission warnings or errors
- Global symlinks remain unchanged
- All framework files updated correctly

---

## Execution Notes

### Testing Approach (TDD)

1. **Task 1:** Write all unit tests first (they should fail)
2. **Tasks 2-4:** Fix implementation, verify tests pass after each task
3. **Task 5:** Integration testing to verify end-to-end functionality

### Expected Test Results

**Before fixes:**
- Test 1.1-1.7: ❌ All fail (demonstrates bugs exist)

**After Task 2:**
- Test 2.1-2.6: ✅ Pass (symlink logic removed)
- Test 1.5: ❌ Still fails (hardcoded paths remain)

**After Task 3:**
- Test 3.1-3.7: ✅ Pass (paths use $BASE_YOYO_DEV)
- Test 1.5: ✅ Pass (no hardcoded paths)

**After Task 4:**
- Test 4.1-4.7: ✅ Pass (error handling complete)

**After Task 5:**
- Test 5.1-5.7: ✅ All pass (full integration)

### Manual Testing Checklist

After all tasks complete:

- [ ] Run `yoyo-update` from project directory → clean output, no warnings
- [ ] Verify dependencies upgraded: `$BASE_YOYO_DEV/venv/bin/pip list | grep -E "rich|textual"`
- [ ] Check symlinks unchanged: `ls -la /usr/local/bin/yoyo*`
- [ ] Test with missing venv: `mv $BASE_YOYO_DEV/venv $BASE_YOYO_DEV/venv.bak && yoyo-update`
- [ ] Verify graceful skip message shown
- [ ] Restore venv: `mv $BASE_YOYO_DEV/venv.bak $BASE_YOYO_DEV/venv`

### Rollback Procedure

If critical issues discovered:
```bash
git checkout HEAD~1 setup/yoyo-update.sh
git checkout HEAD~1 tests/test_yoyo_update_*.sh
```

### Performance Impact

- Expected: None (same operations, cleaner code)
- Actual: Will measure during integration testing

## Notes

- All changes are backward compatible
- No breaking changes to existing functionality
- Follows bash best practices (quote variables, check existence)
- Improves maintainability and debuggability
