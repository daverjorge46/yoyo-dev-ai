# Technical Decisions

This file tracks all significant technical decisions made for this feature, including context, alternatives considered, and rationale.

## 2025-10-29 - Use .yoyo-dev/ for Project Installations

**Context:**

The installation scripts currently create a visible `yoyo-dev/` directory in project roots, which clutters the project directory and doesn't follow standard dotfile conventions. The documentation and global launcher already expect `.yoyo-dev/` (hidden), creating an inconsistency between implementation and documented behavior.

**Options Considered:**

- **Option A: Keep yoyo-dev/ (no dot)** - Maintain current behavior, update documentation to match
  - Pros: No code changes needed, no breaking changes
  - Cons: Non-standard (most tools use dotfiles), clutters project listings, inconsistent with existing docs

- **Option B: Use .yoyo-dev/ (with dot)** - Update scripts to use hidden directory
  - Pros: Standard dotfile convention, cleaner projects, matches documentation, follows industry patterns
  - Cons: Breaking change for existing installations, requires manual migration

- **Option C: Support both directories** - Add logic to detect and work with both
  - Pros: Backward compatible, no user action needed
  - Cons: Increases complexity, maintains legacy behavior indefinitely, confusing for new users

**Decision:** Option B - Use `.yoyo-dev/` (with dot) for all project installations

**Rationale:**

1. **Industry Standard**: Almost all development tools use hidden directories (`.git/`, `.vscode/`, `.claude/`, etc.)
2. **Documentation Alignment**: README.md and CLAUDE.md already reference `.yoyo-dev/` throughout
3. **Global Launcher Alignment**: `yoyo-global-launcher.sh` already looks for `.yoyo-dev/` specifically
4. **Clean Projects**: Hidden directories don't appear in standard `ls` output, keeping project roots clean
5. **Clear Intent**: The dot prefix clearly indicates "tool configuration" vs "project code"
6. **Simple Migration**: Users can easily `mv yoyo-dev .yoyo-dev` if needed

**Implications:**

- New installations will create `.yoyo-dev/` automatically
- Existing installations with `yoyo-dev/` will need manual migration (user responsibility)
- Error handling will detect old directory and provide helpful migration message
- Base installation at `~/yoyo-dev/` (no dot) remains unchanged and correct
- Breaking change documented in implementation notes

---

## 2025-10-29 - Keep Base Installation at ~/yoyo-dev/ (no dot)

**Context:**

Base installation serves as the source of truth for all project installations. It needs to be easily accessible for git operations, updates, and as a reference point for copying files to projects.

**Options Considered:**

- **Option A: Move base to ~/.yoyo-dev/ (hidden)** - Make base installation hidden like projects
  - Pros: Consistency (everything uses dot), hides from home directory
  - Cons: Harder to find, git operations less intuitive, breaks existing base installations

- **Option B: Keep base at ~/yoyo-dev/ (visible)** - Maintain visible base installation
  - Pros: Easy to access, obvious location, git-friendly, established pattern
  - Cons: Inconsistent with project directories (but intentionally so)

**Decision:** Option B - Keep base installation at `~/yoyo-dev/` (visible, no dot)

**Rationale:**

1. **Discoverability**: Base installation should be easy to find in home directory
2. **Git Operations**: Users run `git pull` in base directory frequently - visible is better
3. **Clear Purpose**: Visible directory signals "this is a development tool installation"
4. **Different Role**: Base serves different purpose than project installations
5. **Established Pattern**: Many tools have visible base installs (e.g., `~/go/`, `~/.nvm/` but `nvm/` repos)
6. **No Migration Burden**: Existing base installations don't need to move

**Implications:**

- Base installation remains at `~/yoyo-dev/` (no dot)
- Project installations use `.yoyo-dev/` (with dot)
- Intentional distinction between "source" (base) and "configuration" (project)
- Documentation clearly explains this two-tier structure
- Validation prevents installing project files into base directory

---

## 2025-10-29 - No Automated Migration for Existing Installations

**Context:**

Existing projects may have `yoyo-dev/` (no dot) directories. We need to decide whether to automatically migrate them to `.yoyo-dev/` or require manual migration.

**Options Considered:**

- **Option A: Automatic Migration** - Update script detects old directory and renames it
  - Pros: Seamless for users, no manual steps
  - Cons: Risky (might break workflows), could rename wrong directory, surprising behavior

- **Option B: Manual Migration** - Provide clear instructions, user renames themselves
  - Pros: Safe, predictable, user in control, simple implementation
  - Cons: Requires user action, potential confusion for some users

- **Option C: Hybrid Approach** - Prompt user and offer to migrate with confirmation
  - Pros: Balance between automation and safety
  - Cons: Complex implementation, still requires user interaction, could fail mid-migration

**Decision:** Option B - Manual migration with clear instructions and error messages

**Rationale:**

1. **Safety First**: Automated filesystem operations can be dangerous
2. **Simple Implementation**: Just detect and warn, don't modify
3. **User Control**: Users understand their directory better than script does
4. **Clear Communication**: Helpful error messages guide users exactly what to do
5. **Low Risk**: Simple `mv` command is easy for users to execute
6. **Predictable**: No surprising automated changes to filesystem

**Implications:**

- Installation script checks for old `yoyo-dev/` and provides error with migration instructions
- Update script checks for `.yoyo-dev/` and provides helpful error if missing old directory
- Users with existing installations see clear message: "Please rename yoyo-dev to .yoyo-dev"
- Migration is one simple command: `mv yoyo-dev .yoyo-dev`
- Documentation includes migration guide for existing users

---

## 2025-10-29 - Minimal Changes to Existing Scripts

**Context:**

We could use this opportunity to refactor the installation scripts more broadly, but we need to decide on the scope of changes.

**Options Considered:**

- **Option A: Comprehensive Refactoring** - Rewrite scripts with modern bash practices
  - Pros: Cleaner code, better error handling, more maintainable
  - Cons: High risk, extensive testing needed, out of scope for this fix

- **Option B: Minimal Path Changes** - Only update directory references, minimal other changes
  - Pros: Low risk, focused scope, easy to review, quick to implement
  - Cons: Doesn't improve overall code quality

**Decision:** Option B - Minimal changes to directory paths only

**Rationale:**

1. **Focus**: This spec is about directory names, not script refactoring
2. **Risk Management**: Fewer changes mean fewer potential bugs
3. **Reviewability**: Small changes are easier to review and test
4. **Time Efficiency**: Quick fix that can be implemented and shipped rapidly
5. **Separation of Concerns**: Script quality improvements can be separate spec later

**Implications:**

- Only modify `INSTALL_DIR` variable and directory check conditions
- Don't refactor other aspects of installation scripts
- Keep existing error handling patterns
- Focus testing on directory path correctness
- Future spec can address broader script improvements if needed
