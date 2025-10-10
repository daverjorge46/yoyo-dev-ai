#!/bin/bash

# Yoyo Dev Update Wrapper
# Global command to update Yoyo Dev in any project directory

set -euo pipefail

# Color codes
readonly CYAN='\033[0;36m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BOLD='\033[1m'
readonly DIM='\033[2m'
readonly RESET='\033[0m'

# Show help
show_help() {
    echo ""
    echo -e "${BOLD}${CYAN}yoyo-update${RESET} - Update Yoyo Dev installation"
    echo ""
    echo -e "${BOLD}Usage:${RESET}"
    echo "  yoyo-update [OPTIONS]"
    echo ""
    echo -e "${BOLD}Description:${RESET}"
    echo "  Updates Yoyo Dev framework files in the current project directory."
    echo "  Must be run from a project directory with Yoyo Dev installed."
    echo ""
    echo -e "${BOLD}Options:${RESET}"
    echo "  --no-overwrite-instructions    Keep existing instruction files"
    echo "  --no-overwrite-standards       Keep existing standards files"
    echo "  --no-overwrite-commands        Keep existing command files"
    echo "  --no-overwrite-agents          Keep existing agent files"
    echo "  --no-overwrite                 Keep all existing files"
    echo "  -h, --help                     Show this help message"
    echo ""
    echo -e "${BOLD}Examples:${RESET}"
    echo "  yoyo-update                              # Update all framework files"
    echo "  yoyo-update --no-overwrite-instructions  # Keep custom instructions"
    echo "  yoyo-update --no-overwrite               # Keep all customizations"
    echo ""
    echo -e "${DIM}By default, framework files are overwritten to get latest improvements.${RESET}"
    echo -e "${DIM}Product docs, specs, fixes, recaps, and patterns are always protected.${RESET}"
    echo ""
}

# Check if we're in a Yoyo Dev project
check_yoyo_project() {
    if [ ! -d "./.yoyo-dev" ]; then
        echo ""
        echo -e "${RED}❌ Error: Not a Yoyo Dev project${RESET}"
        echo ""
        echo "This directory does not have Yoyo Dev installed."
        echo ""
        echo "To install Yoyo Dev in this project:"
        echo "  ~/.yoyo-dev/setup/project.sh --claude-code"
        echo ""
        exit 1
    fi
}

# Main
main() {
    # Show help if requested
    if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
        show_help
        exit 0
    fi

    # Check if we're in a Yoyo Dev project
    check_yoyo_project

    # Call the actual update script with all arguments
    ~/.yoyo-dev/setup/yoyo-update.sh "$@"
}

main "$@"
