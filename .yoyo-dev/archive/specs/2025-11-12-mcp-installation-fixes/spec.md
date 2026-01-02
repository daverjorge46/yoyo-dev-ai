# Spec Requirements Document

> Spec: MCP Installation Fixes
> Created: 2025-11-12

## Overview

Fix critical MCP (Model Context Protocol) server installation and configuration issues in yoyo-dev that prevent seamless integration with Claude Code. Resolve incorrect configuration paths, project-context awareness, and legacy naming from agent-os codebase to ensure reliable MCP installation, verification, and updates across all workflows.

## User Stories

### Seamless MCP Installation

As a yoyo-dev user, I want MCP servers to install correctly when I set up a project, so that I can immediately use enhanced Claude Code capabilities without manual troubleshooting.

**Current broken workflow:**
1. User runs `~/.yoyo-dev/setup/project.sh --claude-code`
2. Script prompts to install MCPs
3. MCP installer runs but checks wrong config location (`~/.config/claude/config.json` instead of `~/.claude.json`)
4. Installer creates empty config at wrong location
5. MCPs appear to install but aren't registered correctly
6. Claude Code can't find the MCPs
7. User sees "Failed to reconnect to chrome-devtools" error
8. User must manually debug and reinstall

**Fixed workflow:**
1. User runs project setup
2. Script correctly detects Claude config at `~/.claude.json`
3. Installer checks project-specific MCP configuration
4. MCPs install to the current project context
5. Verification confirms MCPs are registered correctly
6. Claude Code immediately recognizes all MCPs
7. User can start working without manual intervention

### Reliable MCP Updates

As a yoyo-dev user, I want the update script to accurately detect missing or outdated MCPs and install them for my current project, so that I always have the latest MCP capabilities without conflicts between projects.

**Current broken workflow:**
1. User runs `yoyo-update`
2. Script checks for MCPs in wrong config structure
3. Detection fails or returns MCPs from wrong project (`~/.agent-os`, `~/.yoyo-dev`)
4. Update installs MCPs globally or to wrong project
5. User's actual project still missing MCPs
6. Workflows fail silently

**Fixed workflow:**
1. User runs `yoyo-update` from project directory
2. Script correctly reads project-specific MCP configuration
3. Detection accurately identifies missing MCPs for THIS project
4. Prompts user with clear status
5. Installs MCPs specifically for current project
6. Verifies installation success per-project
7. All workflows work correctly

### Clear Legacy Code Cleanup

As a yoyo-dev contributor, I want all references to "agent-os" removed from the codebase, so that the project has a clean identity and no confusing legacy naming.

**Current issues:**
- Variable `BASE_AGENT_OS` appears 123 times across setup scripts
- Creates confusion about project origin
- Makes code harder to understand
- No actual references to `.agent-os` directories (good)

**After cleanup:**
- All variables renamed to `BASE_YOYO_DEV`
- Clear, self-documenting variable names
- No legacy naming confusion
- Professional, polished codebase

## Spec Scope

1. **Claude Config Path Fix** - Update `mcp-claude-installer.sh` to use correct config location (`~/.claude.json` instead of `~/.config/claude/config.json`)

2. **Project-Aware MCP Installation** - Modify all MCP installation scripts to accept and use current project directory context, ensuring MCPs install to the correct project in `~/.claude.json`

3. **Correct MCP Verification Logic** - Rewrite `is_mcp_installed()` and `get_installed_mcps()` functions to read project-specific MCP configuration from correct JSON structure

4. **Variable Renaming** - Rename `BASE_AGENT_OS` to `BASE_YOYO_DEV` across all 123 occurrences in setup scripts

5. **Enhanced Error Reporting** - Add clear error messages when MCP installation fails, including which project, which MCP, and specific failure reason

## Out of Scope

- Adding new MCP servers beyond the existing 6
- Changing MCP server functionality or capabilities
- Creating alternative installation methods (Docker, etc.)
- Supporting MCP installation for non-Claude tools
- Implementing MCP version pinning or rollback

## Expected Deliverable

1. **MCP Installation works correctly** - Running `project.sh --claude-code` successfully installs all 6 MCPs to the current project, verifiable via `/mcp` command in Claude Code showing all servers connected

2. **Update script accurately detects project MCPs** - Running `yoyo-update` from any project correctly identifies which MCPs are missing for THAT specific project and offers to install them

3. **No legacy agent-os references** - Grepping for "agent-os", "agent_os", or "AGENT_OS" returns zero results in production code (tests/docs excluded)
