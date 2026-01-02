# Technical Specification

This is the technical specification for the spec detailed in @.yoyo-dev/specs/2025-10-29-fix-project-install-directory/spec.md

## Technical Requirements

### 1. project.sh Modifications

**File**: `setup/project.sh`

**Changes Required**:

1. **Line 73**: Update INSTALL_DIR variable
   ```bash
   # CURRENT:
   INSTALL_DIR="./yoyo-dev"

   # REQUIRED:
   INSTALL_DIR="./.yoyo-dev"
   ```

2. **All copy_directory and copy_file calls**: Update destination paths
   - Any reference to `$INSTALL_DIR` will automatically use `./.yoyo-dev`
   - Verify all echo statements show correct path

3. **Directory creation logic**: Ensure mkdir commands use updated INSTALL_DIR
   - Line ~148: `mkdir -p "$INSTALL_DIR/..."`
   - All mkdir operations will automatically use correct path via variable

4. **Success messages**: Update output messages
   - Line ~500+: Installation success messages should reference `.yoyo-dev/`
   - Ensure user-facing output shows correct directory name

5. **Validation logic**: Add check for base installation
   ```bash
   # Ensure we're not installing in home directory
   if [ "$INSTALL_DIR" = "$HOME/yoyo-dev" ] || [ "$INSTALL_DIR" = "$HOME/.yoyo-dev" ]; then
     echo "Error: Cannot run project installation in home directory"
     exit 1
   fi
   ```

### 2. yoyo-update.sh Modifications

**File**: `setup/yoyo-update.sh`

**Changes Required**:

1. **Line 84**: Update installation detection
   ```bash
   # CURRENT:
   if [ ! -d "./yoyo-dev" ]; then

   # REQUIRED:
   if [ ! -d "./.yoyo-dev" ]; then
   ```

2. **All directory checks**: Update all references
   - Line ~332: `if [ -d "./yoyo-dev/lib/yoyo_tui_v3" ]`
   - Line ~531: `if [ -d "./yoyo-dev/lib/yoyo_tui_v3" ]`
   - Replace all `"./yoyo-dev` with `"./.yoyo-dev`

3. **Copy operations**: Update all copy destinations
   - All `copy_file` and `copy_directory` calls using `./yoyo-dev/...`
   - Replace with `./.yoyo-dev/...`

4. **Success messages**: Update output messages
   - All echo statements referencing installation location
   - Ensure consistency with `.yoyo-dev/` throughout

5. **Error messages**: Update error messages
   - Line 85: "Yoyo Dev not found" message should reference `.yoyo-dev/`

### 3. Validation Requirements

**Installation Validation**:
- After installation, verify `.yoyo-dev/` directory exists (not `yoyo-dev/`)
- Verify `.yoyo-dev/` is hidden (ls without -a doesn't show it)
- Verify all subdirectories created correctly under `.yoyo-dev/`

**Update Validation**:
- Verify update script finds existing `.yoyo-dev/` directory
- Verify update doesn't create duplicate `yoyo-dev/` directory
- Verify protected files remain untouched

**Base Installation Validation**:
- Verify `~/yoyo-dev/` (no dot) is never modified
- Verify base installation can still serve as source

### 4. Error Handling

**Installation Script**:
- Check if old `yoyo-dev/` exists, suggest manual migration
  ```bash
  if [ -d "./yoyo-dev" ] && [ ! -d "./.yoyo-dev" ]; then
    echo "Warning: Found old 'yoyo-dev/' directory"
    echo "Please rename it to '.yoyo-dev/' or remove it before installing"
    exit 1
  fi
  ```

**Update Script**:
- Check for `.yoyo-dev/` specifically, provide clear error if not found
- Optionally check for old `yoyo-dev/` and provide migration hint

### 5. Testing Approach

**Manual Testing Required**:
1. Fresh installation in new project directory
   - Verify `.yoyo-dev/` created (hidden)
   - Verify all files copied correctly

2. Update existing `.yoyo-dev/` installation
   - Verify update finds directory
   - Verify files updated correctly

3. Base installation preservation
   - Verify `~/yoyo-dev/` never touched
   - Verify it still works as source

**Test Cases**:
- Test 1: Fresh install creates `.yoyo-dev/`
- Test 2: Update finds `.yoyo-dev/`
- Test 3: Install fails gracefully if old `yoyo-dev/` exists
- Test 4: Base installation unaffected by project operations

### 6. Performance Considerations

**No Performance Impact**:
- Directory name change doesn't affect performance
- All operations remain identical (just different path)
- No additional validation overhead beyond error checking

### 7. Security Considerations

**Improved Security**:
- Hidden `.yoyo-dev/` follows security best practice
- Reduces accidental exposure in project listings
- Consistent with standard tool configuration patterns

### 8. File Locations Summary

**Files to Modify**:
1. `setup/project.sh` - Project installation script
2. `setup/yoyo-update.sh` - Update script

**Files Not Modified** (already correct):
- `setup/yoyo.sh` - Uses project-relative paths
- `setup/yoyo-global-launcher.sh` - Already looks for `.yoyo-dev/`
- `README.md` - Already references `.yoyo-dev/`
- `CLAUDE.md` - Already references `.yoyo-dev/`

### 9. Backward Compatibility

**Breaking Change**:
- New installations will use `.yoyo-dev/`
- Old installations with `yoyo-dev/` won't auto-migrate
- Users must manually rename `yoyo-dev/` to `.yoyo-dev/`

**Migration Path** (not automated):
```bash
# In project root with old installation:
mv yoyo-dev .yoyo-dev
mv .claude .claude-backup
# Re-run installation to fix .claude/ if needed
```

### 10. Implementation Notes

**Order of Operations**:
1. Update `project.sh` first (affects new installations)
2. Update `yoyo-update.sh` second (affects updates)
3. Test both scripts thoroughly
4. Update CLEANUP_SUMMARY.md to document the change

**Grep Commands for Finding References**:
```bash
# Find all yoyo-dev references (no dot) in setup/
grep -n "yoyo-dev" setup/project.sh setup/yoyo-update.sh

# Find all .yoyo-dev references (with dot)
grep -n "\.yoyo-dev" setup/project.sh setup/yoyo-update.sh
```

## External Dependencies

No new external dependencies required. This is a pure path/directory name change within existing installation scripts.
