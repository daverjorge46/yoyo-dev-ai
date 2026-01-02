# Yoyo Dev Script Documentation

## Path Convention (FINAL)

**Base Installation:** `~/yoyo-dev/` (visible directory in home)
**Project Installations:** `<project>/.yoyo-dev/` (hidden directory in project)
**Global Commands:** Symlinks in `/usr/local/bin/` pointing to `~/yoyo-dev/setup/`

## Launcher Scripts

### Primary Scripts (In Use)

**`setup/yoyo.sh`** - **CANONICAL TUI LAUNCHER**
- Full-featured TUI launcher with branded header
- 20KB, ~495 lines
- Handles dependency checking and installation
- Parses project context from `.yoyo-dev/product/` files
- Shows beautiful ASCII art header before launching TUI
- **This is the script that `/usr/local/bin/yoyo` should point to**

**`setup/yoyo-update.sh`** - **UPDATE SCRIPT**
- Updates Yoyo Dev installations in projects
- Preserves product docs, specs, fixes, recaps, patterns
- Creates correct symlinks to `~/yoyo-dev/setup/`
- **This is the script that `/usr/local/bin/yoyo-update` should point to**

**`setup/yoyo-tmux.sh`** - **TMUX LAUNCHER (DEPRECATED)**
- Legacy tmux-based visual mode
- Kept for backward compatibility
- 13KB, ~430 lines
- Not actively used in v3.0+

### Alternative Scripts (Not Used Globally)

**`setup/yoyo-global-launcher.sh`** - **ALTERNATIVE APPROACH**
- Global launcher that finds project root
- 3.9KB, ~130 lines
- Searches for `.yoyo-dev/` directory walking up from pwd
- Could be used as alternative to `yoyo.sh`
- **Currently not used** - `yoyo.sh` is preferred

**`setup/yoyo-tui-launcher.sh`** - **MINIMAL TUI LAUNCHER**
- Lightweight TUI launcher (1.5KB, ~70 lines)
- Minimal dependency checking
- No branded header
- **Currently not used** - `yoyo.sh` provides better UX

### Non-Existent Scripts (Referenced in Error)

**`setup/yoyo-launcher-v2.sh`** - ❌ **DOES NOT EXIST**
- Referenced in old versions of scripts
- Never created or was deleted
- All references have been removed in this fix

**`setup/yoyo-update-wrapper.sh`** - ❌ **DOES NOT EXIST**
- Referenced in old versions of scripts
- Never created or was deleted
- All references have been removed in this fix
- Use `setup/yoyo-update.sh` directly instead

## Installation Scripts

**`setup/project.sh`** - **PROJECT INSTALLER**
- Installs Yoyo Dev in a project directory
- Creates `.yoyo-dev/` structure
- Copies instructions, standards, commands, agents
- Creates global symlinks pointing to `~/yoyo-dev/setup/`
- **Fixed in this PR:** Now creates correct symlinks

**`setup/install-global-command.sh`** - **GLOBAL COMMAND INSTALLER**
- Separate script for installing global commands
- 3.9KB
- Can be used independently
- Should create symlinks to `~/yoyo-dev/setup/yoyo.sh` and `yoyo-update.sh`

## Fix Summary

### What Was Broken

Global commands pointed to non-existent paths:
```bash
/usr/local/bin/yoyo → ~/.yoyo-dev/setup/yoyo-launcher-v2.sh  # ✗ Broken
/usr/local/bin/yoyo-update → ~/.yoyo-dev/setup/yoyo-update-wrapper.sh  # ✗ Broken
```

### What Was Fixed

1. **Created fix script:** `setup/fix-global-symlinks.sh`
2. **Created test script:** `tests/test_symlink_paths.sh`
3. **Fixed `setup/project.sh`:**
   - Line 287: Changed `yoyo-update-wrapper.sh` → `yoyo-update.sh`
   - Line 292: Changed symlink target to correct path
   - Line 296: Updated error message with correct path
4. **Fixed `setup/yoyo-update.sh`:**
   - Line 234: Changed `yoyo-launcher-v2.sh` → `yoyo.sh`
   - Lines 238-250: Changed from `cp` to `ln -sf` (symlink instead of copy)
   - Lines 270-287: Changed `yoyo-update-wrapper.sh` → `yoyo-update.sh`
   - Line 290: Updated warning message

### Correct Symlinks

```bash
/usr/local/bin/yoyo → ~/yoyo-dev/setup/yoyo.sh  # ✓ Correct
/usr/local/bin/yoyo-update → ~/yoyo-dev/setup/yoyo-update.sh  # ✓ Correct
```

## Usage

### Creating Global Commands

**Automatic (during project installation):**
```bash
~/yoyo-dev/setup/project.sh --claude-code
```

**Manual (fix existing installation):**
```bash
~/yoyo-dev/setup/fix-global-symlinks.sh
# OR
sudo ln -sf ~/yoyo-dev/setup/yoyo.sh /usr/local/bin/yoyo
sudo ln -sf ~/yoyo-dev/setup/yoyo-update.sh /usr/local/bin/yoyo-update
```

### Testing

```bash
# Run comprehensive test suite
~/yoyo-dev/tests/test_symlink_paths.sh

# Test commands work
yoyo --version
yoyo --help
yoyo-update --help
```

## Future Considerations

### Cleanup Candidates

**Consider consolidating/removing:**
- `setup/yoyo-global-launcher.sh` - Similar to `yoyo.sh`, may be redundant
- `setup/yoyo-tui-launcher.sh` - Minimal version, `yoyo.sh` provides better UX
- `setup/yoyo-tmux.sh` - Deprecated, kept for backward compat only

**Keep as canonical:**
- `setup/yoyo.sh` - Primary TUI launcher ✅
- `setup/yoyo-update.sh` - Update script ✅
- `setup/project.sh` - Project installer ✅

### Path Convention Rationale

**Why `~/yoyo-dev/` (visible)?**
- Users may want to inspect/modify base installation
- Clear separation: `~/yoyo-dev/` = base, `.yoyo-dev/` = project
- Aligns with documentation
- Easier to troubleshoot

**Why `.yoyo-dev/` for projects (hidden)?**
- Reduces clutter in project root
- Clearly marks as internal/framework directory
- Convention for hidden config directories
- Matches `.git/`, `.vscode/`, etc.
