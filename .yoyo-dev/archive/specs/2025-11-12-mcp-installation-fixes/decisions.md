# Technical Decisions

This file tracks all significant technical decisions made for this feature, including context, alternatives considered, and rationale.

## 2025-11-12 - Use Python for JSON Parsing Instead of jq

**Context:** Need to accurately parse `~/.claude.json` project-specific structure to verify MCP installation. Current bash `grep` approach is fragile and incorrect.

**Options Considered:**
- **Option A:** Install and require `jq` dependency
- **Option B:** Use Python 3 (already required by yoyo-dev)
- **Option C:** Write custom bash JSON parser

**Decision:** Use Python 3 for all JSON parsing operations

**Rationale:**
- Python 3 already required for yoyo-dev TUI dashboard (no new dependency)
- More reliable than bash string manipulation
- Handles complex nested JSON structures correctly
- Cross-platform (works on Linux, macOS, Windows WSL)
- `jq` would be an additional external dependency to install/maintain

**Implications:**
- All `is_mcp_installed()` and `get_installed_mcps()` functions will use Python heredocs
- Simpler error handling with try/except blocks
- Consistent JSON handling across all scripts

---

## 2025-11-12 - Execute MCP Installation from Project Directory

**Context:** MCPs must be installed to specific project contexts in `~/.claude.json`, not globally or to wrong projects.

**Options Considered:**
- **Option A:** Use `--project` flag with `claude mcp add` (if it exists)
- **Option B:** Use `cd $PROJECT_DIR && claude mcp add` to set context
- **Option C:** Manually edit `~/.claude.json` with JSON manipulation

**Decision:** Use `cd $PROJECT_DIR && claude mcp add` pattern

**Rationale:**
- Claude CLI determines project context from current working directory
- No need to parse/modify `~/.claude.json` directly (error-prone)
- Respects Claude's native configuration management
- Works with all 6 MCP installation methods (npx templates, claude mcp add, pnpm dlx)

**Implications:**
- All MCP installation commands must execute from project directory
- Callers must pass `--project-dir=PATH` parameter
- Default to `$(pwd)` if not specified
- Subshell or directory change required for each installation

---

## 2025-11-12 - Rename BASE_AGENT_OS to BASE_YOYO_DEV

**Context:** Legacy variable name `BASE_AGENT_OS` appears 123 times across setup scripts, causing confusion about project identity.

**Options Considered:**
- **Option A:** Keep `BASE_AGENT_OS` for backward compatibility
- **Option B:** Rename to `BASE_YOYO_DEV` everywhere
- **Option C:** Create alias `BASE_YOYO_DEV=BASE_AGENT_OS`

**Decision:** Rename all occurrences to `BASE_YOYO_DEV`

**Rationale:**
- No external API - this is internal variable naming only
- Variables are local to setup scripts, not exposed to users
- Improves code clarity and project identity
- Eliminates confusion about agent-os heritage
- Professional polish for open-source project
- No actual `.agent-os` directory references exist (verified)

**Implications:**
- Update 123 occurrences across `setup/project.sh` and `setup/yoyo-update.sh`
- Use Edit tool with `replace_all: true` for efficiency
- Test files keep original names for historical accuracy
- One-time breaking change for anyone who forked/modified setup scripts

---

## 2025-11-12 - Remove create_claude_config_if_missing() Function

**Context:** Current code tries to create `~/.config/claude/config.json` if missing, but Claude uses `~/.claude.json` instead.

**Options Considered:**
- **Option A:** Update function to create `~/.claude.json` with correct structure
- **Option B:** Remove function entirely, let Claude manage its own config
- **Option C:** Create config only if completely missing

**Decision:** Remove `create_claude_config_if_missing()` function

**Rationale:**
- Claude CLI automatically creates `~/.claude.json` on first use
- We shouldn't interfere with Claude's native config management
- Risk of creating malformed config that Claude rejects
- Simpler code - less can go wrong
- If config doesn't exist, that's a signal Claude CLI isn't set up yet

**Implications:**
- Remove function from `mcp-claude-installer.sh` (lines 104-111)
- Remove call sites in installation flow
- Add validation to check if config exists before reading
- Error messages guide users to install Claude CLI first

---

## 2025-11-12 - Add --project-dir Parameter to MCP Installer

**Context:** Need to pass project context to MCP installation script so MCPs install to correct project.

**Options Considered:**
- **Option A:** Use environment variable `PROJECT_DIR=...`
- **Option B:** Add CLI parameter `--project-dir=PATH`
- **Option C:** Auto-detect from current working directory

**Decision:** Add `--project-dir=PATH` parameter with fallback to `$(pwd)`

**Rationale:**
- Explicit is better than implicit (users can see/override)
- Follows existing pattern (`--skip-if-no-claude`, `--verbose`, etc.)
- Environment variables are harder to debug
- Auto-detection can fail in edge cases (symlinks, nested directories)
- Fallback to `$(pwd)` handles common case automatically

**Implications:**
- Update `mcp-claude-installer.sh` argument parsing
- Update all callers (`install-deps.sh`, `project.sh`, `yoyo-update.sh`)
- Default behavior unchanged for users running from project root
- Advanced users can specify different project directory if needed

---

## 2025-11-12 - Validate Config Structure Before Reading

**Context:** Need to ensure `~/.claude.json` has correct structure before attempting to parse it.

**Options Considered:**
- **Option A:** Assume config is always valid, fail if not
- **Option B:** Validate structure and fix automatically
- **Option C:** Validate structure and warn user to fix

**Decision:** Validate structure, warn user, but don't auto-fix

**Rationale:**
- Claude manages its own config - we shouldn't modify it
- Auto-fixing could break Claude's internal expectations
- Validation catches corruption early before cryptic errors
- Warning gives user actionable information
- Missing keys are OK (Claude adds them), invalid JSON is not

**Implications:**
- Add `validate_claude_config()` function
- Call before reading config in MCP installer
- Exit with error if JSON is malformed
- Warn but continue if structure is incomplete (Claude will fix)
- Better debugging experience for users
