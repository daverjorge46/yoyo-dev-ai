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
    local tasks_file completed total
    if [[ -d ".yoyo-dev/specs" ]]; then
        tasks_file=$(ls -1t .yoyo-dev/specs/*/tasks.md 2>/dev/null | head -1)
        if [[ -n "$tasks_file" && -f "$tasks_file" ]]; then
            # Count main tasks (### Task N: headers)
            total=$(grep -cE '^###\s+Task\s+[0-9]+:' "$tasks_file" 2>/dev/null) || total=0

            # Count completed tasks (checked boxes in acceptance criteria)
            completed=$(grep -cE '^\s*-\s*\[x\]' "$tasks_file" 2>/dev/null) || completed=0

            # If no completed checkboxes, check for completion markers
            if [[ "$completed" == "0" ]]; then
                # Look for tasks marked with checkmarks or (completed)
                completed=$(grep -cE '^###\s+Task.*✓|^###\s+Task.*\(completed\)' "$tasks_file" 2>/dev/null) || completed=0
            fi

            echo "${completed}/${total}"
            return
        fi
    fi
    echo "0/0"
}

# Get MCP server count
get_mcp() {
    local count
    if command -v docker &>/dev/null; then
        # Count lines that look like server entries (start with lowercase letter)
        count=$(docker mcp server ls 2>/dev/null | grep -cE '^[a-z]' || echo "0")
        echo "$count"
    else
        echo "0"
    fi
}

# Get memory block count
get_memory() {
    local count db_path
    db_path=".yoyo-ai/memory/memory.db"
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
