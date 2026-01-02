# Tasks: Fix Installation Path Confusion

**Fix:** installation-path-confusion
**Created:** 2025-10-29
**Priority:** High

---

## Task 1: Fix Global Command Symlinks (Immediate Fix)

**Dependencies:** None
**Parallel Safe:** Yes

Fix the broken symlinks in `/usr/local/bin/` to point to the correct base installation path.

**Subtasks:**
- [x] 1.1 Write test to verify current symlinks are broken (point to non-existent paths)
- [x] 1.2 Create script to fix global symlinks (`setup/fix-global-symlinks.sh`)
- [ ] 1.3 Update `/usr/local/bin/yoyo` to point to `~/yoyo-dev/setup/yoyo.sh` **(MANUAL - see MANUAL_FIX_REQUIRED.md)**
- [ ] 1.4 Update `/usr/local/bin/yoyo-update` to point to `~/yoyo-dev/setup/yoyo-update.sh` **(MANUAL - see MANUAL_FIX_REQUIRED.md)**
- [ ] 1.5 Verify symlinks point to existing files **(MANUAL)**
- [ ] 1.6 Test `yoyo` command launches TUI successfully **(MANUAL)**
- [ ] 1.7 Test `yoyo-update` command works **(MANUAL)**
- [ ] 1.8 Run all tests and verify they pass **(MANUAL)**

**Expected Outcome:**
- `yoyo` command works from any directory
- `yoyo-update` command works
- Symlinks point to `~/yoyo-dev/setup/` (not `~/.yoyo-dev/setup/`)

---

## Task 2: Fix `setup/project.sh` Symlink Creation

**Dependencies:** Task 1 (for testing)
**Parallel Safe:** No (modifies same installation script)

Update the project installation script to create correct symlinks during new installations.

**Subtasks:**
- [x] 2.1 Write test for project.sh symlink creation logic (tests/test_symlink_paths.sh)
- [x] 2.2 Review lines 265-322 in `setup/project.sh` (yoyo command installation)
- [x] 2.3 Fix symlink target to use `$HOME/yoyo-dev/setup/yoyo.sh` (not `.yoyo-dev`) - Already correct
- [x] 2.4 Remove references to non-existent `yoyo-launcher-v2.sh` - N/A (didn't exist in project.sh)
- [x] 2.5 Fix yoyo-update symlink target to use correct path - Fixed line 287-296
- [ ] 2.6 Test fresh project installation in /tmp directory **(TODO)**
- [ ] 2.7 Verify created symlinks point to correct locations **(TODO)**
- [ ] 2.8 Run all tests and verify they pass **(TODO)**

**Code Changes:**
```bash
# OLD (lines ~278-283):
if sudo ln -sf "$HOME/yoyo-dev/setup/yoyo.sh" /usr/local/bin/yoyo 2>/dev/null; then
    echo "  ✓ yoyo command installed globally"
else
    # ... error handling references wrong path
fi

# NEW: Should already be correct, but verify references and error messages
# are consistent with ~/yoyo-dev/ (not ~/.yoyo-dev/)
```

**Expected Outcome:**
- Fresh project installations create correct symlinks
- Error messages reference correct paths
- No references to non-existent wrapper scripts

---

## Task 3: Fix `setup/yoyo-update.sh` Symlink Updates

**Dependencies:** Task 2 (for consistency)
**Parallel Safe:** No (modifies same installation script)

Update the yoyo-update script to maintain correct symlinks during updates.

**Subtasks:**
- [x] 3.1 Write test for yoyo-update.sh symlink update logic (tests/test_symlink_paths.sh)
- [x] 3.2 Review lines 232-293 in `setup/yoyo-update.sh`
- [x] 3.3 Fix symlink updates to use `$HOME/yoyo-dev/setup/yoyo.sh` - Fixed line 234
- [x] 3.4 Remove references to non-existent `yoyo-launcher-v2.sh` - Fixed line 234-292
- [x] 3.5 Remove references to non-existent `yoyo-update-wrapper.sh` - Fixed line 270-287
- [x] 3.6 Ensure both yoyo and yoyo-update symlinks are updated correctly - Fixed
- [ ] 3.7 Test update process on current project **(TODO)**
- [ ] 3.8 Run all tests and verify they pass **(TODO)**

**Code Changes:**
```bash
# OLD (line ~238):
if sudo cp "$BASE_YOYO_DEV/setup/yoyo-launcher-v2.sh" /usr/local/bin/yoyo 2>/dev/null

# NEW:
if sudo ln -sf "$HOME/yoyo-dev/setup/yoyo.sh" /usr/local/bin/yoyo 2>/dev/null
```

**Expected Outcome:**
- Updates maintain correct symlink paths
- No copying files when symlinks work better
- Consistent with project.sh approach

---

## Task 4: Review and Cleanup Redundant Scripts

**Dependencies:** Tasks 1-3 (core fix complete)
**Parallel Safe:** Yes

Review purpose of multiple launcher scripts and consolidate if redundant.

**Subtasks:**
- [ ] 4.1 Review `setup/yoyo-global-launcher.sh` - determine purpose or remove
- [ ] 4.2 Review `setup/yoyo-tui-launcher.sh` - determine purpose or remove
- [ ] 4.3 Confirm `setup/yoyo.sh` is the canonical launcher
- [ ] 4.4 Remove dead references to `yoyo-launcher-v2.sh` and `yoyo-update-wrapper.sh`
- [ ] 4.5 Update any documentation referencing removed scripts
- [ ] 4.6 Search codebase for any remaining broken path references
- [ ] 4.7 Create migration notes if needed
- [ ] 4.8 Run all tests and verify they pass

**Expected Outcome:**
- Single source of truth for launcher script
- No confusing duplicate scripts
- Clean, maintainable codebase

---

## Task 5: Update Documentation

**Dependencies:** Tasks 1-4 (all fixes complete)
**Parallel Safe:** Yes

Ensure all documentation consistently shows correct paths.

**Subtasks:**
- [ ] 5.1 Review README.md for path references
- [ ] 5.2 Review CLAUDE.md for path references
- [ ] 5.3 Review setup scripts' help text and comments
- [ ] 5.4 Update any inconsistent path references
- [ ] 5.5 Add troubleshooting section for path issues
- [ ] 5.6 Document the path convention clearly (base vs project)
- [ ] 5.7 Review and commit documentation changes
- [ ] 5.8 Verify documentation is accurate

**Expected Outcome:**
- Documentation clearly shows `~/yoyo-dev/` for base installation
- Users understand path conventions
- Troubleshooting guide helps prevent confusion

---

## Task 6: Comprehensive Testing

**Dependencies:** All previous tasks
**Parallel Safe:** No (must run after all fixes)

Comprehensive end-to-end testing of all installation scenarios.

**Subtasks:**
- [ ] 6.1 Test: Fresh base installation
- [ ] 6.2 Test: Fresh project installation with --claude-code
- [ ] 6.3 Test: yoyo command from any directory
- [ ] 6.4 Test: yoyo-update in existing project
- [ ] 6.5 Test: Multiple projects can use same base installation
- [ ] 6.6 Test: Symlinks survive system restarts
- [ ] 6.7 Test: Error messages are helpful if paths missing
- [ ] 6.8 All automated tests pass

**Test Scenarios:**
```bash
# Scenario 1: Base installation check
$ ls -la ~/yoyo-dev/
$ ls -la /usr/local/bin/yoyo

# Scenario 2: Fresh project
$ mkdir /tmp/test-project && cd /tmp/test-project
$ ~/yoyo-dev/setup/project.sh --claude-code
$ yoyo  # Should work

# Scenario 3: Update existing project
$ cd /home/yoga999/PROJECTS/yoyo-dev
$ yoyo-update  # Should work

# Scenario 4: Multi-project support
$ cd /tmp/project-a && yoyo  # Works
$ cd /tmp/project-b && yoyo  # Also works
```

**Expected Outcome:**
- All scenarios pass
- No path-related errors
- Confident in fix completeness

---

## Post-Completion Checklist

- [ ] All task subtasks completed and marked with [x]
- [ ] Global symlinks point to correct paths
- [ ] Installation scripts create correct symlinks
- [ ] Update scripts maintain correct symlinks
- [ ] Documentation is consistent and accurate
- [ ] All tests pass
- [ ] `yoyo` command works from anywhere
- [ ] `yoyo-update` command works
- [ ] No references to non-existent paths remain
- [ ] Git commit created with clear message
- [ ] PR created (if needed)

---

## Notes

**Immediate Manual Fix (For Testing):**
```bash
sudo ln -sf ~/yoyo-dev/setup/yoyo.sh /usr/local/bin/yoyo
chmod +x ~/yoyo-dev/setup/yoyo.sh
```

**Path Convention (Final Decision):**
- ✅ Base installation: `~/yoyo-dev/` (visible, source of truth)
- ✅ Project installations: `<project>/.yoyo-dev/` (hidden, project-specific)
- ✅ Global commands: Symlinks to `~/yoyo-dev/setup/`

**Test-Driven Approach:**
Each subtask follows TDD:
1. Write test that fails (proves bug exists)
2. Implement fix
3. Verify test passes
4. Run full test suite
