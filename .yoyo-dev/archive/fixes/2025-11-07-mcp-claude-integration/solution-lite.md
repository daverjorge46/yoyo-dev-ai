# Fix Summary (Lite)

**Problem**: MCP installation tries to install non-existent npm packages instead of using Claude Code's native MCP installation commands.

**Root Cause**: Architectural misunderstanding - MCPs are installed via `claude-code-templates` and `claude mcp add`, not `npm install -g`.

**Solution**: Replace entire MCP installation subsystem with Claude Code native commands (`npx claude-code-templates --mcp=...`, `claude mcp add ...`).

**Files to Modify**:
- `setup/mcp-installer.sh` - Rewrite to use Claude Code commands
- `setup/mcp-prerequisites.sh` - Remove Docker requirement
- `setup/install-deps.sh` - Integrate new MCP installer
- `setup/yoyo-update.sh` - Add MCP update logic
- `lib/yoyo_tui_v3/services/mcp_monitor.py` - Update process detection
- `setup/mcp-config-template.yml` - Remove or repurpose
