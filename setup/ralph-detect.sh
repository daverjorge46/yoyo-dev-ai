#!/bin/bash

# Ralph Detection Script
# Checks if Ralph is installed and returns version info

set -euo pipefail

# Output modes
QUIET=false
JSON=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -q|--quiet)
            QUIET=true
            shift
            ;;
        --json)
            JSON=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Check if ralph command exists
check_ralph_installed() {
    if command -v ralph &> /dev/null; then
        return 0
    fi
    return 1
}

# Get Ralph version
get_ralph_version() {
    if check_ralph_installed; then
        # Try to get version from ralph --version or ralph -v
        local version
        version=$(ralph --version 2>/dev/null || ralph -v 2>/dev/null || echo "unknown")
        # Extract version number (e.g., "0.9.0" from "ralph v0.9.0")
        echo "$version" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "unknown"
    else
        echo "not_installed"
    fi
}

# Check Ralph-related commands
check_ralph_commands() {
    local ralph_cmd=false
    local monitor_cmd=false
    local setup_cmd=false

    command -v ralph &> /dev/null && ralph_cmd=true
    command -v ralph-monitor &> /dev/null && monitor_cmd=true
    command -v ralph-setup &> /dev/null && setup_cmd=true

    if [ "$JSON" = true ]; then
        echo "{\"ralph\": $ralph_cmd, \"ralph-monitor\": $monitor_cmd, \"ralph-setup\": $setup_cmd}"
    else
        echo "ralph: $ralph_cmd"
        echo "ralph-monitor: $monitor_cmd"
        echo "ralph-setup: $setup_cmd"
    fi
}

# Check if tmux is available (optional for monitoring)
check_tmux() {
    if command -v tmux &> /dev/null; then
        return 0
    fi
    return 1
}

# Main detection logic
main() {
    local installed=false
    local version="not_installed"
    local tmux_available=false

    if check_ralph_installed; then
        installed=true
        version=$(get_ralph_version)
    fi

    if check_tmux; then
        tmux_available=true
    fi

    if [ "$JSON" = true ]; then
        cat << EOF
{
  "installed": $installed,
  "version": "$version",
  "tmux_available": $tmux_available,
  "commands": $(check_ralph_commands)
}
EOF
    elif [ "$QUIET" = false ]; then
        echo "Ralph Detection Results"
        echo "─────────────────────────"
        echo "Installed: $installed"
        echo "Version: $version"
        echo "tmux available: $tmux_available"
        echo ""
        echo "Commands:"
        check_ralph_commands
    fi

    # Exit code: 0 if installed, 1 if not
    if [ "$installed" = true ]; then
        exit 0
    else
        exit 1
    fi
}

main
