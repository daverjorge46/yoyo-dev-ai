# Spec Summary (Lite)

Fix critical MCP server installation failures caused by incorrect Claude config paths (`~/.config/claude/config.json` vs `~/.claude.json`), missing project-context awareness, and legacy agent-os variable naming. Update all MCP scripts to use correct config location, install MCPs to specific project contexts, verify installation accurately, and rename `BASE_AGENT_OS` to `BASE_YOYO_DEV` throughout codebase.
