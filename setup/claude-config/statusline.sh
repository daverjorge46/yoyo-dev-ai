#!/bin/bash
# Yoyo Dev Status Line for Claude Code
# Displays: git branch | spec name | task progress | MCP count | memory blocks

set -euo pipefail

# Colors (using ANSI escape codes)
ORANGE='\033[0;33m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
DIM='\033[2m'
RESET='\033[0m'

# Get git branch
get_branch() {
    local branch
    branch=$(git branch --show-current 2>/dev/null) || branch=""
    if [[ -z "$branch" ]]; then
        echo "no-git"
    else
        echo "$branch"
    fi
}

# Get active spec name (most recent by directory name)
get_spec() {
    local spec_dir spec_name
    if [[ -d ".yoyo-dev/specs" ]]; then
        spec_dir=$(ls -1d .yoyo-dev/specs/*/ 2>/dev/null | sort -r | head -1)
        if [[ -n "$spec_dir" ]]; then
            spec_name=$(basename "$spec_dir")
            # Remove date prefix (YYYY-MM-DD-)
            spec_name=$(echo "$spec_name" | sed 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')
            echo "$spec_name"
            return
        fi
    fi
    echo "none"
}

# Get task progress from most recent spec
get_tasks() {
    local tasks_file total_items completed_items
    if [[ -d ".yoyo-dev/specs" ]]; then
        tasks_file=$(ls -1t .yoyo-dev/specs/*/tasks.md 2>/dev/null | head -1)
        if [[ -n "$tasks_file" && -f "$tasks_file" ]]; then
            # Count checkbox items (the most reliable indicator)
            # Total items: count all checkbox patterns - [ ] or - [x]
            total_items=$(grep -cE '^\s*-\s*\[[x ]\]' "$tasks_file" 2>/dev/null) || total_items=0

            # Completed items: count checked boxes [x]
            completed_items=$(grep -cE '^\s*-\s*\[x\]' "$tasks_file" 2>/dev/null) || completed_items=0

            # If no checkboxes found, try counting main task headers
            if [[ "$total_items" == "0" ]]; then
                # Format 1: ### N. Title or ### Task N:
                total_items=$(grep -cE '^###\s+[0-9]+\.|^###\s+Task\s+[0-9]+' "$tasks_file" 2>/dev/null) || total_items=0
                # Look for completion markers in headers
                completed_items=$(grep -cE '^###.*✓|^###.*\(completed\)|^###.*\[DONE\]' "$tasks_file" 2>/dev/null) || completed_items=0
            fi

            echo "${completed_items}/${total_items}"
            return
        fi
    fi
    echo "0/0"
}

# Get MCP server count
get_mcp() {
    local count

    # Method 1: Try Docker MCP (requires Docker Desktop with MCP Toolkit)
    if command -v docker &>/dev/null; then
        # Check if docker is running first
        if docker info &>/dev/null; then
            # Try to get MCP server list (docker mcp requires MCP Toolkit enabled)
            # Note: grep -c returns exit 1 when count is 0, so use || assignment
            count=$(docker mcp server ls 2>/dev/null | grep -cE '^[a-z]' 2>/dev/null) || count=0
            if [[ "$count" -gt 0 ]]; then
                echo "$count"
                return
            fi
        fi
    fi

    # Method 2: Check .mcp.json for configured servers
    if [[ -f ".mcp.json" ]]; then
        # Note: grep -c returns exit 1 when count is 0, so use || assignment
        count=$(grep -cE '"[^"]+"\s*:\s*\{' .mcp.json 2>/dev/null) || count=0
        # Subtract 1 for the outer mcpServers object if present
        if grep -qE '"mcpServers"' .mcp.json 2>/dev/null; then
            count=$((count > 0 ? count - 1 : 0))
        fi
        echo "$count"
        return
    fi

    # Method 3: Check claude_desktop_config.json
    local claude_config="$HOME/.config/claude/claude_desktop_config.json"
    if [[ -f "$claude_config" ]]; then
        # Note: grep -c returns exit 1 when count is 0, so use || assignment
        count=$(grep -cE '"[^"]+"\s*:\s*\{.*"command"' "$claude_config" 2>/dev/null) || count=0
        echo "$count"
        return
    fi

    echo "0"
}

# Get memory block count
get_memory() {
    local count db_path
    # Correct path: .yoyo-dev/memory/memory.db (not .yoyo-ai)
    db_path=".yoyo-dev/memory/memory.db"
    if [[ -f "$db_path" ]] && command -v sqlite3 &>/dev/null; then
        count=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM memory_blocks" 2>/dev/null || echo "0")
        echo "$count"
    else
        echo "0"
    fi
}

# Build status line
main() {
    local branch spec tasks mcp memory

    branch=$(get_branch)
    spec=$(get_spec)
    tasks=$(get_tasks)
    mcp=$(get_mcp)
    memory=$(get_memory)

    # Format: [branch] Spec: name | Tasks: X/Y | MCP: N | Mem: M
    printf "${ORANGE}[%s]${RESET} " "$branch"
    printf "${CYAN}%s${RESET} " "$spec"
    printf "${DIM}|${RESET} "
    printf "Tasks: ${GREEN}%s${RESET} " "$tasks"
    printf "${DIM}|${RESET} "
    printf "MCP: %s " "$mcp"
    printf "${DIM}|${RESET} "
    printf "Mem: %s" "$memory"
}

main
