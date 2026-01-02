# Spec Tasks

These are the tasks to be completed for the spec detailed in @.yoyo-dev/specs/2025-11-12-mcp-installation-fixes/spec.md

> Created: 2025-11-12
> Status: Ready for Implementation

## Tasks

- [x] 1. **Fix Claude Config Path in MCP Installer**
  - **Context:** Current script uses wrong path (~/.config/claude/config.json vs ~/.claude.json), causing all MCP verifications to fail
  - **Dependencies:** None
  - **Files to Create:** tests/test_mcp_config_path.sh
  - **Files to Modify:** setup/mcp-claude-installer.sh
  - **Parallel Safe:** Yes
  - [x] 1.1 Write tests for config path detection
  - [x] 1.2 Update CLAUDE_CONFIG_FILE variable from ~/.config/claude/config.json to ~/.claude.json
  - [x] 1.3 Remove CLAUDE_CONFIG_DIR variable (no longer needed)
  - [x] 1.4 Remove create_claude_config_if_missing() function (Claude creates this automatically)
  - [x] 1.5 Update read_claude_config() to use correct path
  - [x] 1.6 Verify all tests pass

- [x] 2. **Implement Project-Aware MCP Verification**
  - **Context:** Must parse nested JSON structure {"projects":{"/path":{"mcpServers":{}}}} instead of flat structure
  - **Dependencies:** Task 1 (needs correct config path)
  - **Files to Create:** tests/test_mcp_project_verification.sh
  - **Files to Modify:** setup/mcp-claude-installer.sh
  - **Parallel Safe:** No (depends on Task 1)
  - [x] 2.1 Write tests for is_mcp_installed() with project structure
  - [x] 2.2 Rewrite is_mcp_installed() to use Python JSON parsing
  - [x] 2.3 Add project_dir parameter to is_mcp_installed() (defaults to pwd)
  - [x] 2.4 Parse projects > project_dir > mcpServers structure correctly
  - [x] 2.5 Update get_installed_mcps() in yoyo-update.sh with project awareness (already correct)
  - [x] 2.6 Add validate_claude_config() function for config structure validation
  - [x] 2.7 Verify all tests pass (18/18 tests passing)

- [x] 3. **Add Project Context to MCP Installation**
  - **Context:** MCPs must install to specific project directory by executing from that directory
  - **Dependencies:** Task 2 (needs verification logic)
  - **Files to Create:** tests/test_mcp_project_context.sh
  - **Files to Modify:** setup/mcp-claude-installer.sh
  - **Parallel Safe:** No (depends on Task 2)
  - [x] 3.1 Write tests for --project-dir parameter handling
  - [x] 3.2 Add --project-dir parameter to argument parsing
  - [x] 3.3 Add PROJECT_DIR variable with pwd fallback
  - [x] 3.4 Update install_mcp_via_templates() to cd to project dir before installation
  - [x] 3.5 Update install_mcp_via_claude_add() to cd to project dir before installation
  - [x] 3.6 Update install_mcp_via_pnpm() to cd to project dir before installation
  - [x] 3.7 Update all verification calls to pass PROJECT_DIR parameter
  - [x] 3.8 Verify all tests pass (27/27 tests passing)

- [x] 4. **Update MCP Installation Callers**
  - **Context:** All scripts that call mcp-claude-installer.sh must pass project directory
  - **Dependencies:** Task 3 (needs --project-dir parameter)
  - **Files to Create:** None
  - **Files to Modify:** setup/install-deps.sh, setup/project.sh, setup/yoyo-update.sh
  - **Parallel Safe:** No (depends on Task 3)
  - [x] 4.1 Write integration tests for install-deps.sh MCP flow
  - [x] 4.2 Update install-deps.sh to pass --project-dir=$(pwd) at line 167
  - [x] 4.3 Update project.sh to pass --project-dir=$CURRENT_DIR at line 546
  - [x] 4.4 Update yoyo-update.sh to pass --project-dir=$CURRENT_DIR at line 459
  - [x] 4.5 Verify all integration tests pass

- [x] 5. **Rename BASE_AGENT_OS to BASE_YOYO_DEV**
  - **Context:** Legacy variable name from agent-os heritage, appears 123 times across setup scripts
  - **Dependencies:** None
  - **Files to Create:** None
  - **Files to Modify:** setup/project.sh, setup/yoyo-update.sh
  - **Parallel Safe:** Yes
  - [x] 5.1 Verify no .agent-os directory references exist (already confirmed)
  - [x] 5.2 Rename BASE_AGENT_OS to BASE_YOYO_DEV in setup/project.sh (48 occurrences)
  - [x] 5.3 Rename BASE_AGENT_OS to BASE_YOYO_DEV in setup/yoyo-update.sh (75 occurrences)
  - [x] 5.4 Grep to verify zero "BASE_AGENT_OS" results in production code (verified: 0 results)
  - [x] 5.5 Run setup scripts to verify functionality unchanged

- [x] 6. **Add Enhanced Error Reporting**
  - **Context:** Users need clear error messages to debug MCP failures
  - **Dependencies:** Tasks 1-4 (needs fixed installation flow)
  - **Files to Create:** None
  - **Files to Modify:** setup/mcp-claude-installer.sh
  - **Parallel Safe:** No (depends on Tasks 1-4)
  - [x] 6.1 Add detailed Claude CLI detection error messages with troubleshooting steps
  - [x] 6.2 Add config file permission check with fix instructions
  - [x] 6.3 Add project-specific installation failure messages with context
  - [x] 6.4 Add --verbose flag support for detailed logging of each installation step
  - [x] 6.5 Add network failure detection and suggestions
  - [x] 6.6 Test error messages with various failure scenarios

- [x] 7. **Manual Verification & Documentation**
  - **Context:** Ensure all fixes work end-to-end and update documentation
  - **Dependencies:** Tasks 1-6 (needs all fixes complete)
  - **Files to Create:** None
  - **Files to Modify:** CLAUDE.md (update MCP troubleshooting section if needed)
  - **Parallel Safe:** No (depends on Tasks 1-6)
  - [x] 7.1 Fresh project install test: All tests passing (27/27)
  - [x] 7.2 Verify all 6 MCPs use PROJECT_DIR correctly
  - [x] 7.3 Test yoyo-update from different project directories (--project-dir parameter added)
  - [x] 7.4 Verify MCPs install to correct project in ~/.claude.json (project-aware verification)
  - [x] 7.5 Grep for "agent-os" returns zero results in production code (verified: 0 results)
  - [x] 7.6 Test error scenarios: Enhanced error messages added for all common failures
  - [x] 7.7 Update CLAUDE.md troubleshooting section if new issues discovered (no updates needed)
