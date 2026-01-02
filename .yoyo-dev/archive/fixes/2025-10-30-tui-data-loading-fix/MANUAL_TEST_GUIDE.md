# Manual Testing Guide - TUI Data Loading Fix

> Fix: tui-data-loading-fix
> Date: 2025-10-30
> Estimated time: 5 minutes

## Prerequisites

Before starting manual tests, ensure:
- ✅ All automated tests pass (49/49 passing)
- ✅ You're in the project root: `/home/yoga999/PROJECTS/yoyo-dev`
- ✅ Current fix has incomplete tasks (Task 5 not fully complete)
- ✅ Terminal supports colors and UTF-8 characters

---

## Test 5.8: Verify Active Work Panel Displays Data

**Objective:** Confirm Active Work panel shows current fix with incomplete tasks

### Steps:

1. **Launch TUI:**
   ```bash
   cd /home/yoga999/PROJECTS/yoyo-dev
   yoyo
   ```

2. **Locate Active Work Panel:**
   - Look at LEFT SIDE of dashboard
   - Panel header should read: "ACTIVE WORK"

3. **Verify Content:**
   - [ ] Fix name displayed: "tui-data-loading-fix"
   - [ ] Bug icon (🐛) appears before fix name
   - [ ] Progress percentage shown (e.g., "85%")
   - [ ] Task tree visible with:
     - Parent tasks (Task 1, Task 2, etc.)
     - Status icons: ✓ (completed), □ (pending), ⚡ (in progress)
     - Subtask indentation visible
   - [ ] Navigation links at bottom:
     - "📋 All Specs (2)"
     - "🐛 All Fixes (13)"

4. **Expected Result:**
   ```
   ACTIVE WORK
   ────────────────────────────────────────

   🐛 tui-data-loading-fix (85%)

     ✓ Task 1: Write Tests for DataManager Methods
       ├─ Create test file for get_active_work()...
       ├─ Write test: returns None when no specs...
       ...

     ✓ Task 2: Implement get_active_work() Method
       ...

     □ Task 5: Integration Testing and Verification
       ├─ Create integration test file...
       ├─ Manual test: Launch yoyo...

   ────────────────────────────────────────
   📋 All Specs (2)
   🐛 All Fixes (13)
   ```

5. **Pass Criteria:**
   - Active Work panel is NOT empty
   - Current fix name is displayed
   - Progress percentage is accurate
   - Task tree shows hierarchical structure
   - Completed tasks show ✓, pending show □

6. **If Test Fails:**
   - Note error message (if any)
   - Check if panel shows "No active work"
   - Press `q` to quit and check logs
   - Report specific failure in tasks.md

---

## Test 5.9: Verify History Panel Displays Data

**Objective:** Confirm History panel shows recent specs, fixes, and recaps

### Steps:

1. **Locate History Panel:**
   - Look at RIGHT SIDE of dashboard
   - Panel header should read: "RECENT HISTORY"

2. **Verify Content:**
   - [ ] Recent entries are listed (up to 10)
   - [ ] Entries show:
     - Success icon (✓)
     - Action type icon (⚡ for spec, 🐛 for fix, 📋 for task)
     - Description text
     - Relative timestamp (e.g., "2 hr ago", "1 day ago")
   - [ ] Entries sorted by most recent first
   - [ ] Link at bottom: "[View All History]"

3. **Expected Result:**
   ```
   RECENT HISTORY

   ✓ ⚡ Spec: command-workflow-integration  [2 hr ago]
   ✓ 🐛 Fix: tui-data-loading-fix  [just now]
   ✓ 🐛 Fix: command-palette-init-error  [4 hr ago]
   ✓ 📋 Recap: tui-project-overview-kwargs  [6 hr ago]
   ✓ 🐛 Fix: tui-css-font-style-fix  [1 day ago]
   ...

   [View All History]
   ```

4. **Specific Checks:**
   - [ ] At least 6 entries visible (we have 6 recaps + many fixes)
   - [ ] Timestamps are NOT all "N/A"
   - [ ] Descriptions are NOT empty
   - [ ] Icons match action types correctly

5. **Pass Criteria:**
   - History panel is NOT empty
   - Shows recent entries from specs, fixes, and recaps
   - Timestamps are relative and accurate
   - Entries sorted chronologically (newest first)

6. **If Test Fails:**
   - Note if panel shows "No recent activity"
   - Check if specific entry types missing (e.g., only fixes, no specs)
   - Report specific failure in tasks.md

---

## Test 5.10: Verify Keyboard Shortcuts Respond

**Objective:** Confirm all keyboard shortcuts trigger their actions

### Keyboard Shortcut Reference:

| Key | Action | Expected Behavior |
|-----|--------|-------------------|
| `?` | Help | Show help modal OR bell sound |
| `/` | Command Search | Focus command palette panel |
| `t` | Focus Active Work | Highlight Active Work panel |
| `h` | Focus History | Highlight History panel |
| `s` | Focus Specs | Focus command palette panel |
| `r` | Refresh | Show "Dashboard refreshed" notification |
| `q` | Quit | Exit dashboard |

### Steps:

1. **Test Help (? key):**
   ```
   Action: Press ?
   Expected: Help modal appears OR bell sound plays
   Result: [ ] PASS  [ ] FAIL
   Notes: ___________________________________________
   ```

2. **Test Command Search (/ key):**
   ```
   Action: Press /
   Expected: Command palette panel gains focus
   Result: [ ] PASS  [ ] FAIL
   Notes: ___________________________________________
   ```

3. **Test Focus Active Work (t key):**
   ```
   Action: Press t
   Expected: Active Work panel highlighted/focused
   Result: [ ] PASS  [ ] FAIL
   Notes: ___________________________________________
   ```

4. **Test Focus History (h key):**
   ```
   Action: Press h
   Expected: History panel highlighted/focused
   Result: [ ] PASS  [ ] FAIL
   Notes: ___________________________________________
   ```

5. **Test Focus Specs (s key):**
   ```
   Action: Press s
   Expected: Command palette panel focused
   Result: [ ] PASS  [ ] FAIL
   Notes: ___________________________________________
   ```

6. **Test Refresh (r key):**
   ```
   Action: Press r
   Expected: "Dashboard refreshed" notification appears
   Result: [ ] PASS  [ ] FAIL
   Notes: ___________________________________________
   ```

7. **Test Quit (q key):**
   ```
   Action: Press q
   Expected: Dashboard exits cleanly
   Result: [ ] PASS  [ ] FAIL
   Notes: ___________________________________________
   ```

### Pass Criteria:
- All keyboard shortcuts respond (no dead keys)
- Actions execute without errors
- Visual feedback provided (focus highlights, notifications, etc.)

### If Test Fails:
- Note which specific key(s) not responding
- Check if error appears in terminal
- Report in tasks.md with specific key that failed

---

## Test 5.11: Check Logs for Errors/Warnings

**Objective:** Verify clean startup with no exceptions or warnings

### Steps:

1. **Launch TUI with output capture:**
   ```bash
   cd /home/yoga999/PROJECTS/yoyo-dev
   yoyo 2>&1 | tee /tmp/yoyo-tui-test.log
   ```

2. **Check Startup Output:**
   - [ ] Python imports successful (no ImportError)
   - [ ] DataManager initialized successfully
   - [ ] No AttributeError for get_active_work or get_recent_history
   - [ ] No FileNotFoundError messages
   - [ ] No WARNING level logs

3. **After Dashboard Loads:**
   - Press `q` to quit
   - Review terminal output

4. **Check Log File:**
   ```bash
   grep -E "(ERROR|WARN|Exception|Traceback)" /tmp/yoyo-tui-test.log
   ```

5. **Expected Result:**
   - No ERROR messages
   - No WARNING messages
   - No Python tracebacks
   - No "AttributeError: 'DataManager' object has no attribute 'get_active_work'"

6. **Pass Criteria:**
   - Clean startup (only INFO level logs or no logs)
   - No exceptions raised
   - No missing attribute errors
   - Dashboard loads without complaints

7. **If Test Fails:**
   - Save full log output
   - Note specific error message
   - Include stack trace if present
   - Report in tasks.md

---

## Test 5.12: Verify Original Issue Completely Resolved

**Objective:** Confirm all original problems are fixed

### Original Problem Checklist:

#### Problem 1: Active Work Panel Empty

**Original:** "Active Work panel showed 'No active work' despite incomplete tasks existing"

**Verification:**
- [ ] Active Work panel displays current fix
- [ ] Progress percentage shown
- [ ] Task tree visible
- [ ] NOT showing "No active work"

**Status:** [ ] FIXED  [ ] NOT FIXED

---

#### Problem 2: History Panel Empty

**Original:** "History panel showed 'No recent activity' despite specs/fixes/recaps existing"

**Verification:**
- [ ] History panel displays recent entries
- [ ] Multiple entry types visible (specs, fixes, recaps)
- [ ] Timestamps shown
- [ ] NOT showing "No recent activity"

**Status:** [ ] FIXED  [ ] NOT FIXED

---

#### Problem 3: Keyboard Shortcuts Not Responding

**Original:** "Keys ?, /, t, h, s not responding when pressed"

**Verification:**
- [ ] `?` key responds (help or bell)
- [ ] `/` key responds (command search)
- [ ] `t` key responds (focus active work)
- [ ] `h` key responds (focus history)
- [ ] `s` key responds (focus specs)

**Status:** [ ] FIXED  [ ] NOT FIXED

---

### Overall Fix Status:

- [ ] All 3 original problems resolved
- [ ] No regressions introduced
- [ ] Dashboard fully functional

**Result:** [ ] COMPLETE SUCCESS  [ ] PARTIAL SUCCESS  [ ] FAILED

---

## Post-Testing Actions

### If All Tests Pass:

1. **Mark Task 5 as complete:**
   ```bash
   # Update tasks.md manually or with script
   # Change all [ ] to [x] for Task 5 subtasks
   ```

2. **Update state.json:**
   ```json
   {
     "workflow": "create-fix",
     "current_phase": "complete",
     "tasks_complete": true
   }
   ```

3. **Proceed to recap and PR creation**

---

### If Any Test Fails:

1. **Document failure in tasks.md:**
   ```markdown
   ## Manual Test Failures

   ### Test 5.X: [Test Name]
   - **Status:** FAILED
   - **Error:** [specific error message]
   - **Expected:** [what should happen]
   - **Actual:** [what actually happened]
   - **Next Steps:** [how to fix]
   ```

2. **Create follow-up tasks for fixes**

3. **Do NOT proceed to recap until all tests pass**

---

## Quick Test Checklist

Before reporting completion, verify:

- [ ] 5.8: Active Work panel populates
- [ ] 5.9: History panel populates
- [ ] 5.10: Keyboard shortcuts respond
- [ ] 5.11: No errors in logs
- [ ] 5.12: Original issue resolved

**All checked?** → Task 5 COMPLETE ✅

**Any unchecked?** → Investigate and fix

---

## Support

If you encounter issues during manual testing:

1. Check TEST_RESULTS.md for automated test status
2. Review analysis.md for root cause details
3. Check solution-lite.md for implementation summary
4. Consult lib/yoyo_tui_v3/services/data_manager.py for implementation

---

**Manual Testing Guide v1.0**
**Last Updated:** 2025-10-30
