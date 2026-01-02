# Spec Requirements Document

> Spec: fix-project-install-directory
> Created: 2025-10-29

## Overview

Fix the Yoyo Dev installation scripts to correctly install project files into `.yoyo-dev/` (hidden directory with dot prefix) instead of `yoyo-dev/` (visible directory without dot), ensuring consistency with documentation and dotfile conventions. This ensures that project-level Yoyo Dev installations remain hidden and follow standard tool configuration patterns, while the base installation at `~/yoyo-dev/` remains visible for easy access.

## User Stories

### Developer Installing Yoyo Dev in a Project

As a developer installing Yoyo Dev in my project, I want the installation to create a hidden `.yoyo-dev/` directory, so that my project root stays clean and follows standard dotfile conventions for tool configurations.

**Workflow**:
1. Developer runs installation command in their project root
2. Installation script creates `.yoyo-dev/` directory (hidden)
3. Framework files are copied from `~/yoyo-dev/` base installation
4. Project directory remains uncluttered with visible tool directories
5. Installation completes successfully with correct directory structure

**Problem Solved**: Currently, the installation creates a visible `yoyo-dev/` directory that clutters the project root and doesn't follow standard conventions for hidden tool configurations.

### Developer Updating Yoyo Dev

As a developer updating my Yoyo Dev installation, I want the update script to correctly locate and update the `.yoyo-dev/` directory, so that updates work seamlessly without manual directory intervention.

**Workflow**:
1. Developer runs update command in project with existing `.yoyo-dev/` directory
2. Update script detects the hidden `.yoyo-dev/` directory
3. Framework files are updated from base installation
4. Protected files (specs, fixes, product docs) remain untouched
5. Update completes successfully

**Problem Solved**: Update script currently looks for `yoyo-dev/` instead of `.yoyo-dev/`, causing update failures or requiring manual directory renaming.

### Base Installation User

As a user managing the base Yoyo Dev installation, I want the base installation to remain at `~/yoyo-dev/` (visible, no dot), so that I can easily access, update via git, and use it as the source for project installations.

**Workflow**:
1. User clones or installs base Yoyo Dev to `~/yoyo-dev/`
2. Base installation remains visible in home directory
3. User can run `git pull` to update base installation
4. Projects reference base installation for copying files
5. Clear separation between base (visible) and project (hidden) installations

**Problem Solved**: Ensures base installation remains distinct and accessible while project installations follow dotfile conventions.

## Spec Scope

1. **project.sh Installation Script** - Update all directory references from `yoyo-dev` to `.yoyo-dev` for project installations, ensuring consistent use of hidden directory throughout the installation process.

2. **yoyo-update.sh Update Script** - Update all directory checks and references from `yoyo-dev` to `.yoyo-dev` for detecting and updating project installations.

3. **Directory Validation** - Add validation logic to ensure base installation (`~/yoyo-dev/`) is never affected and remains visible, while project installations always use `.yoyo-dev/` (hidden).

4. **Echo/Output Messages** - Update all user-facing messages in both scripts to reference `.yoyo-dev/` correctly, providing accurate feedback about installation locations.

5. **Backward Compatibility Handling** - Include clear error messages for users with old `yoyo-dev/` installations, guiding them on migration if needed (optional but helpful).

## Out of Scope

- Migration of existing `yoyo-dev/` directories to `.yoyo-dev/` (users handle manually)
- Changes to other scripts (yoyo.sh, yoyo-global-launcher.sh already correct)
- Documentation updates (README.md, CLAUDE.md already reference `.yoyo-dev/` correctly)
- Changes to base installation location (`~/yoyo-dev/` remains unchanged)
- Automated testing infrastructure for installation scripts
- Installation script refactoring beyond directory path fixes

## Expected Deliverable

1. **Correct Project Installation** - Running `project.sh` creates `.yoyo-dev/` (with dot) in project root, not `yoyo-dev/`, verified by checking for hidden directory after installation.

2. **Correct Update Detection** - Running `yoyo-update.sh` correctly detects and updates existing `.yoyo-dev/` directory, verified by successful update on projects with `.yoyo-dev/` directory.

3. **Base Installation Preserved** - Base installation at `~/yoyo-dev/` (no dot) remains unchanged and functional, verified by confirming base directory structure is never modified during project installation or updates.
