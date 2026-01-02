# Spec Tasks

## Tasks

- [x] 1. **Fix project.sh Installation Script Directory References**
  - **Context:** Update installation script to use `.yoyo-dev/` (hidden directory with dot) instead of `yoyo-dev/` for all project installations, following standard dotfile conventions.
  - **Dependencies:** None
  - **Files to Create:** None
  - **Files to Modify:** `setup/project.sh`
  - **Parallel Safe:** Yes
  - [x] 1.1 Write tests for project.sh installation directory behavior
  - [x] 1.2 Update INSTALL_DIR variable from `"./yoyo-dev"` to `"./.yoyo-dev"` (line 73)
  - [x] 1.3 Add validation to prevent installing in home directory (`~/yoyo-dev/` or `~/.yoyo-dev/`)
  - [x] 1.4 Add error handling for existing old `yoyo-dev/` directory with migration instructions
  - [x] 1.5 Update all echo/output messages to reference `.yoyo-dev/` correctly
  - [x] 1.6 Verify all copy_directory and copy_file operations use updated INSTALL_DIR variable
  - [x] 1.7 Test installation creates `.yoyo-dev/` directory (hidden)
  - [x] 1.8 Verify all tests pass

- [x] 2. **Fix yoyo-update.sh Update Script Directory References**
  - **Context:** Update script to detect and update `.yoyo-dev/` (hidden directory) instead of `yoyo-dev/` for project updates, ensuring consistency with installation behavior.
  - **Dependencies:** None
  - **Files to Create:** None
  - **Files to Modify:** `setup/yoyo-update.sh`
  - **Parallel Safe:** Yes
  - [x] 2.1 Write tests for yoyo-update.sh directory detection behavior
  - [x] 2.2 Update installation detection check from `"./yoyo-dev"` to `"./.yoyo-dev"` (line 84)
  - [x] 2.3 Update all directory checks throughout script (lines ~332, ~531, etc.)
  - [x] 2.4 Update all copy_file and copy_directory destination paths to use `./.yoyo-dev/`
  - [x] 2.5 Update error messages to reference `.yoyo-dev/` correctly
  - [x] 2.6 Add helpful error for missing `.yoyo-dev/` with migration hint for old installations
  - [x] 2.7 Test update finds and updates `.yoyo-dev/` directory correctly
  - [x] 2.8 Verify all tests pass

- [x] 3. **Verify Base Installation Remains Unchanged**
  - **Context:** Ensure base installation at `~/yoyo-dev/` (visible, no dot) is never affected by project installation or update operations, maintaining its role as source of truth.
  - **Dependencies:** Task 1, Task 2
  - **Files to Create:** `tests/test_base_installation_isolation.sh`
  - **Files to Modify:** None
  - **Parallel Safe:** No (depends on Task 1 and 2)
  - [x] 3.1 Write tests to verify base installation isolation
  - [x] 3.2 Test that project.sh never modifies `~/yoyo-dev/`
  - [x] 3.3 Test that yoyo-update.sh never modifies `~/yoyo-dev/`
  - [x] 3.4 Verify base installation can still serve as source for project installations
  - [x] 3.5 Verify all directory operations target project-local `.yoyo-dev/` only
  - [x] 3.6 Verify all tests pass

- [x] 4. **Integration Testing and Documentation**
  - **Context:** Comprehensive end-to-end testing of installation and update workflows with updated directory structure, plus documentation updates if needed.
  - **Dependencies:** Task 1, Task 2, Task 3
  - **Files to Create:** `tests/test_integration_installation.sh`, `CHANGELOG.md`
  - **Files to Modify:** None
  - **Parallel Safe:** No (depends on all previous tasks)
  - [x] 4.1 Write integration tests for complete installation workflow
  - [x] 4.2 Test fresh installation in new project directory creates `.yoyo-dev/`
  - [x] 4.3 Test update on existing `.yoyo-dev/` installation works correctly
  - [x] 4.4 Test error handling for old `yoyo-dev/` directory shows helpful message
  - [x] 4.5 Verify `.yoyo-dev/` is hidden (not shown in standard `ls` output)
  - [x] 4.6 Verify global launcher (`yoyo-global-launcher.sh`) still finds `.yoyo-dev/` correctly (validated via directory reference tests)
  - [x] 4.7 Update CLEANUP_SUMMARY.md or create changelog entry documenting the change
  - [x] 4.8 Verify all integration tests pass
