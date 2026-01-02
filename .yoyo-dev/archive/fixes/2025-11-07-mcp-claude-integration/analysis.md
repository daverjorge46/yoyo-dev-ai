# Problem Analysis

> Fix: mcp-claude-integration
> Created: 2025-11-07
> Priority: CRITICAL

## Problem Description

Yoyo-dev's MCP server installation is broken and cannot install MCP servers. The current implementation attempts to install fake npm packages that don't exist on the npm registry, when it should be using Claude Code's native MCP installation system.

Users encounter Docker requirement errors during installation, but Docker is not actually needed for MCP installation when using Claude Code's native installation methods.

## Reproduction Steps

1. Run `~/.yoyo-dev/setup/install-deps.sh` or similar installation script
2. Installation attempts to run `npm install -g @context7/mcp-server` and similar commands
3. Installation fails because these packages don't exist
4. User sees errors about Docker requirements (misleading)

**Expected Behavior**: MCPs should be installed using Claude Code's native commands:
- `npx claude-code-templates@latest --mcp=<template> --yes`
- `claude mcp add <name> <command>`

**Actual Behavior**: Installation fails trying to install non-existent npm packages globally.

## Root Cause

**Technical Explanation**: The MCP installation subsystem was designed with a fundamental architectural misunderstanding. It assumes MCPs are standalone npm packages that can be installed globally (`npm install -g @context7/mcp-server`), when in reality:

1. Claude Code MCPs are installed through the `claude-code-templates` tool or `claude mcp add` command
2. These commands modify Claude's config at `~/.config/claude/config.json`
3. The template/package names are different (e.g., `devtools/context7` not `@context7/mcp-server`)
4. Docker is not required for MCP installation - it's only needed if the containerization MCP needs to generate Docker files

**Affected Files**:
- `setup/mcp-installer.sh:18-25` - Defines fake package names
- `setup/mcp-installer.sh:58` - Uses wrong `npm install -g` command
- `setup/mcp-prerequisites.sh:302-312` - Unnecessary Docker check misleads users
- `setup/mcp-config-template.yml:1-709` - Entire config template based on wrong approach
- `setup/install-deps.sh` - Missing integration with Claude Code MCP installation
- `setup/yoyo-update.sh` - No MCP update logic
- `lib/yoyo_tui_v3/services/mcp_monitor.py` - Monitors wrong process patterns

## Impact Assessment

- **Severity**: CRITICAL
- **Affected Users**: All users installing or updating yoyo-dev
- **Affected Functionality**:
  - Base installation fails to install MCPs
  - Updates cannot verify or update MCPs
  - TUI cannot properly monitor MCP status
  - Users cannot use MCP-dependent features (context7, memory, playwright, etc.)
- **Workaround Available**: NO - Manual MCP installation possible but not documented

## Solution Approach

Replace the entire MCP installation subsystem with Claude Code native commands.

**Implementation Steps**:
1. Create new `setup/mcp-claude-installer.sh` that uses Claude Code commands
2. Replace fake npm packages with real Claude Code template names
3. Remove Docker prerequisite check for MCP installation
4. Integrate MCP installation into `setup/install-deps.sh`
5. Add MCP verification and update logic to `setup/yoyo-update.sh`
6. Update MCP monitor to detect Claude-installed MCPs
7. Remove or repurpose `setup/mcp-config-template.yml`
8. Update documentation

**Testing Strategy**:
- Test installation on clean system without Claude Code (should show warning and skip)
- Test installation with Claude Code installed (should install all MCPs)
- Test yoyo-update detects missing MCPs and installs them
- Test yoyo-update detects outdated MCPs and updates them
- Test without Docker installed (should work fine)
- Verify TUI can monitor Claude-installed MCPs

**Risk Assessment**:
- **Breaking Changes**: YES - Complete rewrite of MCP installation system
- **Performance Impact**: POSITIVE - Native Claude Code integration is faster
- **Side Effects**: Existing users with manually installed MCPs may need to reinstall using new system
