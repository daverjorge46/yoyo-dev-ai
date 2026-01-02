# Technical Specification

This is the technical specification for the spec detailed in @.yoyo-dev/specs/2025-11-12-mcp-installation-fixes/spec.md

## Technical Requirements

### 1. Claude Config Path Correction

**File:** `setup/mcp-claude-installer.sh`

**Current (WRONG):**
```bash
CLAUDE_CONFIG_DIR="${HOME}/.config/claude"
CLAUDE_CONFIG_FILE="${CLAUDE_CONFIG_DIR}/config.json"
```

**Fixed (CORRECT):**
```bash
CLAUDE_CONFIG_FILE="${HOME}/.claude.json"
```

**Changes Required:**
- Update all config path variables (lines 22-24)
- Remove `create_claude_config_if_missing()` function - Claude creates this file automatically
- Update `read_claude_config()` to read from correct location
- Update `is_mcp_installed()` to check correct config file

---

### 2. Project-Aware MCP Installation

**Affected Files:**
- `setup/mcp-claude-installer.sh`
- `setup/install-deps.sh`
- `setup/project.sh`
- `setup/yoyo-update.sh`

**Required Changes:**

Add `--project-dir` parameter to `mcp-claude-installer.sh`:
```bash
# New parameter
PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"

# Accept via CLI flag
--project-dir=PATH    Set project directory for MCP installation
```

Update all `claude mcp add` commands to include project context:
```bash
# Before
claude mcp add "$mcp_name" "$mcp_command"

# After
cd "$PROJECT_DIR" && claude mcp add "$mcp_name" "$mcp_command"
```

Update `npx claude-code-templates` commands similarly:
```bash
# Execute from project directory
cd "$PROJECT_DIR" && npx claude-code-templates@latest --mcp="$template_path" --yes
```

---

### 3. Correct MCP Verification Logic

**File:** `setup/mcp-claude-installer.sh`, `setup/yoyo-update.sh`

**Current (WRONG) - Checks flat structure:**
```bash
is_mcp_installed() {
    local mcp_name="$1"
    if grep -q "\"$mcp_name\"" "$CLAUDE_CONFIG_FILE" 2>/dev/null; then
        return 0
    fi
    return 1
}
```

**Fixed (CORRECT) - Checks project-specific structure:**
```bash
is_mcp_installed() {
    local mcp_name="$1"
    local project_dir="${2:-$(pwd)}"

    if [ ! -f "$CLAUDE_CONFIG_FILE" ]; then
        return 1
    fi

    # Use Python to parse JSON correctly
    python3 << EOF
import json
import sys

try:
    with open("$CLAUDE_CONFIG_FILE", "r") as f:
        data = json.load(f)

    projects = data.get("projects", {})
    project_data = projects.get("$project_dir", {})
    mcp_servers = project_data.get("mcpServers", {})

    if "$mcp_name" in mcp_servers:
        sys.exit(0)
    else:
        sys.exit(1)
except Exception:
    sys.exit(1)
EOF

    return $?
}
```

Update `get_installed_mcps()` in `yoyo-update.sh` similarly.

---

### 4. Variable Renaming

**Scope:** All setup scripts (123 occurrences)

**Rename:**
```bash
BASE_AGENT_OS  →  BASE_YOYO_DEV
```

**Files to update:**
- `setup/project.sh` (47 occurrences)
- `setup/yoyo-update.sh` (76 occurrences)

**Method:**
```bash
# Use Edit tool with replace_all: true
old_string: BASE_AGENT_OS
new_string: BASE_YOYO_DEV
replace_all: true
```

**Exception:** Test files in `tests/` directory should keep current names to maintain test validity and history.

---

### 5. Enhanced Error Reporting

Add detailed error messages for common failure modes:

**Connection failures:**
```bash
if ! claude --version &> /dev/null 2>&1; then
    print_error "Claude Code CLI not responding"
    echo "  → Possible causes:"
    echo "    1. Claude not installed: https://claude.ai/download"
    echo "    2. Claude not in PATH: Add to ~/.bashrc or ~/.zshrc"
    echo "    3. Claude running but hung: Kill process and restart"
    return 1
fi
```

**Config write failures:**
```bash
if ! [ -w "$CLAUDE_CONFIG_FILE" ]; then
    print_error "Cannot write to Claude config file"
    echo "  → File: $CLAUDE_CONFIG_FILE"
    echo "  → Permissions: $(ls -l "$CLAUDE_CONFIG_FILE")"
    echo "  → Fix: chmod 600 $CLAUDE_CONFIG_FILE"
    return 1
fi
```

**Project-specific MCP failures:**
```bash
print_error "$mcp_name installation failed for project: $PROJECT_DIR"
echo "  → Check Claude Code is running"
echo "  → Check network connection for npm packages"
echo "  → Run with --verbose for detailed logs"
```

---

### 6. Configuration Structure Validation

Add validation to ensure `~/.claude.json` has correct structure:

```bash
validate_claude_config() {
    local config_file="$1"

    if [ ! -f "$config_file" ]; then
        return 0  # File doesn't exist, Claude will create it
    fi

    # Validate JSON structure
    python3 << EOF
import json
import sys

try:
    with open("$config_file", "r") as f:
        data = json.load(f)

    # Check for projects key
    if "projects" not in data:
        print("WARNING: Claude config missing 'projects' key")
        print("This will be created automatically by Claude")
        sys.exit(0)

    sys.exit(0)
except json.JSONDecodeError as e:
    print(f"ERROR: Invalid JSON in Claude config: {e}")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: Cannot read Claude config: {e}")
    sys.exit(1)
EOF

    return $?
}
```

---

### 7. Installation Flow Updates

Update calling scripts to pass project context:

**`setup/install-deps.sh`:**
```bash
# Line ~167
if [ -f "$MCP_INSTALLER" ]; then
    bash "$MCP_INSTALLER" --project-dir="$(pwd)"
else
    echo -e "${RED}✗${RESET} MCP installer not found"
fi
```

**`setup/project.sh`:**
```bash
# Line ~544
if bash "$MCP_PREREQUISITES"; then
    bash "$MCP_INSTALLER" --project-dir="$CURRENT_DIR"
else
    echo "⚠️  MCP prerequisite check failed"
fi
```

**`setup/yoyo-update.sh`:**
```bash
# Line ~459
if bash "$mcp_installer" --non-interactive --project-dir="$CURRENT_DIR"; then
    echo "✅ MCP servers installed successfully"
else
    echo "⚠️  Some MCPs may have failed"
fi
```

---

## External Dependencies

No new external dependencies required. All fixes use existing tools:
- Python 3 (already required for yoyo-dev)
- Bash (existing)
- Claude Code CLI (already required for MCPs)
- npm/npx (already required for MCPs)
- pnpm (already optional for shadcn MCP)

---

## Testing Requirements

### Unit Tests
1. Test `is_mcp_installed()` with correct config structure
2. Test `get_installed_mcps()` with multiple projects
3. Test `validate_claude_config()` with valid/invalid JSON

### Integration Tests
1. Fresh project install with MCPs
2. Update existing project with missing MCPs
3. Multiple projects with different MCP configurations
4. MCP installation failure handling

### Manual Verification
1. Run `project.sh --claude-code` in new project
2. Check `/mcp` command in Claude Code shows all 6 servers
3. Run `yoyo-update` from different project directories
4. Verify MCPs install to correct project in `~/.claude.json`
5. Grep for "agent-os" returns zero results in production code
