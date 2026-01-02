# Tasks: yoyo-update Symlink Resolution Fix

**Fix:** 2025-10-30-yoyo-update-symlink-fix
**Issue:** yoyo-update fails when executed via symlink because it doesn't resolve the symlink path
**Approach:** Apply proven symlink resolution pattern from yoyo.sh

---

## Task 1: Write Symlink Execution Tests

**Dependencies:** None
**Files to Create:**
  - `tests/test_yoyo_update_symlink.sh`
**Files to Modify:** None
**Parallel Safe:** Yes

**Subtasks:**
- [x] 1.1 Create test script with setup/teardown functions
- [x] 1.2 Write test for direct execution (baseline - should work)
- [x] 1.3 Write test for symlink execution (should fail currently, pass after fix)
- [x] 1.4 Write test for SCRIPT_DIR resolution with symlink
- [x] 1.5 Write test for functions.sh sourcing via symlink
- [x] 1.6 Run initial tests (expect symlink tests to fail - proving bug exists)

**Expected Outcome:** Test suite created showing current symlink execution failure

**Test Validation:**
```bash
bash tests/test_yoyo_update_symlink.sh
# Should show failures for symlink execution scenarios
```

---

## Task 2: Fix Symlink Resolution in yoyo-update.sh

**Dependencies:** Task 1
**Files to Create:** None
**Files to Modify:**
  - `setup/yoyo-update.sh`
**Parallel Safe:** No (depends on Task 1)

**Subtasks:**
- [x] 2.1 Read `setup/yoyo-update.sh` to understand context around lines 109-110
- [x] 2.2 Read reference implementation from `setup/yoyo.sh` lines 24-30
- [x] 2.3 Replace lines 109-110 with symlink-resolving code
- [x] 2.4 Verify no other path calculations need updating
- [x] 2.5 Run test suite to verify symlink execution now works

**Expected Outcome:** `setup/yoyo-update.sh` correctly resolves symlinks and finds functions.sh

**Code Change:**

**Before (lines 109-110):**
```bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_YOYO_DEV="$(dirname "$SCRIPT_DIR")"
```

**After (lines 109-113):**
```bash
SCRIPT_PATH="${BASH_SOURCE[0]}"
# Resolve symlink if this script is executed via symlink
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
BASE_YOYO_DEV="$(dirname "$SCRIPT_DIR")"
```

**Test Validation:**
```bash
bash tests/test_yoyo_update_symlink.sh
# yoyo-update.sh symlink tests should now pass
```

---

## Task 3: Verify All Execution Scenarios

**Dependencies:** Task 2
**Files to Create:** None
**Files to Modify:** None
**Parallel Safe:** No (must run after fix applied)

**Subtasks:**
- [x] 3.1 Test direct execution: `./setup/yoyo-update.sh`
- [x] 3.2 Test symlink execution: `/usr/local/bin/yoyo-update` (if symlink exists)
- [x] 3.3 Test from different directory: `cd ~ && /usr/local/bin/yoyo-update`
- [x] 3.4 Verify functions.sh sourcing works in all scenarios
- [x] 3.5 Run full test suite

**Expected Outcome:** All execution methods work correctly

**Test Validation:**
```bash
bash tests/test_yoyo_update_symlink.sh
# All tests should pass
# Exit code: 0
```

**Manual Verification:**
```bash
# If symlink exists at /usr/local/bin/yoyo-update
/usr/local/bin/yoyo-update
# Should NOT error with "functions.sh: No such file or directory"
```

---

## Execution Notes

**Sequential Execution Required:**
- Task 1 creates tests (must run first)
- Task 2 applies fix (depends on tests)
- Task 3 verifies fix (depends on Task 2)

**No Parallel Opportunities:**
All tasks must run sequentially due to dependencies.

**Execution Timeline:**
- Sequential: ~15 minutes
- No parallelization possible

**Risk Assessment:**
- **Risk Level:** Low (proven pattern from yoyo.sh)
- **Blast Radius:** Medium (affects yoyo-update command for all users)
- **Rollback:** Simple (revert 4-line change)
- **Testing:** Comprehensive (automated + manual)

**Success Criteria:**
- [x] Lines 109-113 use symlink resolution pattern
- [x] functions.sh sourced correctly via symlink
- [x] All tests passing
- [x] No regression in direct execution
- [x] Consistent with yoyo.sh implementation
