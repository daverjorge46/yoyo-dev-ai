#!/bin/bash
# Yoyo Dev CLI Launcher
# Launches yoyo-dev-ai framework with Claude Code in terminal (no Wave)
# This is the CLI-only version for use in Wave Terminal widgets or standalone

set -euo pipefail

# ============================================================================
# Script Location Detection
# ============================================================================

SCRIPT_PATH="${BASH_SOURCE[0]}"
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"

# ============================================================================
# Load Dependencies
# ============================================================================

# Load UI library
if [ -f "$SCRIPT_DIR/ui-library.sh" ]; then
    source "$SCRIPT_DIR/ui-library.sh"
else
    # Fallback colors
    UI_PRIMARY='\033[0;36m'
    UI_SUCCESS='\033[0;32m'
    UI_ERROR='\033[0;31m'
    UI_WARNING='\033[1;33m'
    UI_DIM='\033[2m'
    UI_BOLD='\033[1m'
    UI_RESET='\033[0m'
    UI_YELLOW='\033[1;33m'
    ICON_SUCCESS='[OK]'
    ICON_ERROR='[ERR]'
    ICON_WARNING='[WARN]'
    ICON_INFO='[INFO]'
    ui_success() { echo -e "${UI_SUCCESS}${ICON_SUCCESS}${UI_RESET} $1"; }
    ui_error() { echo -e "${UI_ERROR}${ICON_ERROR}${UI_RESET} $1"; }
    ui_info() { echo -e "${UI_PRIMARY}${ICON_INFO}${UI_RESET} $1"; }
    ui_warning() { echo -e "${UI_WARNING}${ICON_WARNING}${UI_RESET} $1"; }
fi

# ============================================================================
# Configuration
# ============================================================================

VERSION="6.2.0"
GUI_PORT="${YOYO_GUI_PORT:-5173}"
GUI_ENABLED="${YOYO_GUI_ENABLED:-true}"
BANNER_ENABLED="${YOYO_BANNER_ENABLED:-true}"
ORCHESTRATION_ENABLED="${YOYO_ORCHESTRATION:-true}"
# Use YOYO_PROJECT_DIR if set (from Wave environment), otherwise use current directory
USER_PROJECT_DIR="${YOYO_PROJECT_DIR:-$PWD}"

# ============================================================================
# Utility Functions
# ============================================================================

is_interactive_terminal() {
    [ -t 0 ] && [ -t 1 ]
}

clear_terminal() {
    if is_interactive_terminal; then
        clear 2>/dev/null || true
    fi
}

check_claude_code() {
    command -v claude &>/dev/null
}

get_network_ip() {
    # Get primary network IP
    if command -v hostname &>/dev/null; then
        hostname -I 2>/dev/null | awk '{print $1}' || true
    fi
}

detect_base_installation() {
    local base_dir="${YOYO_DEV_DIR:-$HOME/.yoyo-dev-base}"
    if [ -d "$base_dir" ]; then
        echo "$base_dir"
        return 0
    fi
    return 1
}

# ============================================================================
# GUI Launch
# ============================================================================

launch_gui_background() {
    local base_dir
    if ! base_dir=$(detect_base_installation); then
        return 1
    fi

    local gui_script="$base_dir/setup/yoyo-gui.sh"
    if [ -f "$gui_script" ]; then
        bash "$gui_script" --background &>/dev/null &
        return 0
    fi
    return 1
}

# ============================================================================
# Main Launch Function
# ============================================================================

launch_yoyo_cli() {
    # Change to project directory if YOYO_PROJECT_DIR is set (from Wave environment)
    if [ -n "$YOYO_PROJECT_DIR" ] && [ -d "$YOYO_PROJECT_DIR" ]; then
        cd "$YOYO_PROJECT_DIR" || true
    fi

    # Check if Yoyo Dev is installed in this project
    if [ ! -d "./.yoyo-dev" ]; then
        echo ""
        ui_warning "Yoyo Dev not detected in this directory"
        echo ""
        echo -e "  Would you like to initialize Yoyo Dev in this project?"
        echo ""
        echo -e "    ${UI_PRIMARY}1.${UI_RESET} Initialize Yoyo Dev (recommended)"
        echo -e "    ${UI_PRIMARY}2.${UI_RESET} Exit"
        echo ""
        echo -n "  Choice [1]: "
        read -r install_choice
        install_choice="${install_choice:-1}"

        if [ "$install_choice" = "1" ]; then
            echo ""
            ui_info "Starting initialization..."
            echo ""

            # Detect BASE installation
            local base_dir
            if base_dir=$(detect_base_installation); then
                local init_script="$base_dir/setup/init.sh"
                if [ -f "$init_script" ]; then
                    exec bash "$init_script" --claude-code
                fi
                # Fallback to install.sh
                local install_script="$base_dir/setup/install.sh"
                if [ -f "$install_script" ]; then
                    exec bash "$install_script" --claude-code
                fi
            fi

            # BASE not found
            ui_error "BASE installation not found"
            echo ""
            echo "  Yoyo Dev BASE should be installed at ~/.yoyo-dev-base"
            echo ""
            exit 1
        else
            echo ""
            ui_info "Initialization cancelled"
            exit 0
        fi
    fi

    # Check Claude Code is installed
    if ! check_claude_code; then
        echo ""
        ui_error "Claude Code CLI not found"
        echo ""
        echo "  Install from: ${UI_PRIMARY}https://claude.ai/download${UI_RESET}"
        echo ""
        exit 1
    fi

    # Clear terminal before launch
    clear_terminal

    # Show branded ASCII art banner (if enabled and terminal is interactive)
    if [ "$BANNER_ENABLED" = true ] && is_interactive_terminal; then
        if type ui_yoyo_banner &>/dev/null; then
            ui_yoyo_banner "v${VERSION}"
        else
            echo ""
            echo -e "${UI_PRIMARY}╭──────────────────────────────────────────────────────────────────╮${UI_RESET}"
            echo -e "${UI_PRIMARY}│${UI_RESET}                                                                  ${UI_PRIMARY}│${UI_RESET}"
            echo -e "${UI_PRIMARY}│${UI_RESET}   ${UI_BOLD}YOYO DEV AI${UI_RESET}                                               ${UI_PRIMARY}│${UI_RESET}"
            echo -e "${UI_PRIMARY}│${UI_RESET}   ${UI_DIM}AI-Powered Development Framework${UI_RESET}                          ${UI_PRIMARY}│${UI_RESET}"
            echo -e "${UI_PRIMARY}│${UI_RESET}                                                                  ${UI_PRIMARY}│${UI_RESET}"
            echo -e "${UI_PRIMARY}╰──────────────────────────────────────────────────────────────────╯${UI_RESET}"
            echo ""
        fi

        # Show project dashboard if available
        if [ -d "./.yoyo-dev" ] && type ui_project_dashboard &>/dev/null; then
            ui_project_dashboard ".yoyo-dev"
        fi
    fi

    echo -e "  ${UI_DIM}Project:${UI_RESET}  $(basename "$USER_PROJECT_DIR")"
    echo -e "  ${UI_DIM}Mode:${UI_RESET}     CLI (Claude Code)"

    # Launch GUI in background if enabled
    if [ "$GUI_ENABLED" = true ]; then
        echo -e "  ${UI_DIM}GUI:${UI_RESET}      Starting on port $GUI_PORT..."
        if launch_gui_background; then
            sleep 1
            local network_ip
            network_ip=$(get_network_ip)
            echo -e "  ${UI_DIM}GUI:${UI_RESET}      ${UI_SUCCESS}http://localhost:$GUI_PORT${UI_RESET}"
            if [ -n "$network_ip" ]; then
                echo -e "  ${UI_DIM}Network:${UI_RESET}  ${UI_SUCCESS}http://${network_ip}:$GUI_PORT${UI_RESET}"
            fi
        else
            echo -e "  ${UI_DIM}GUI:${UI_RESET}      ${UI_YELLOW}Not available${UI_RESET}"
        fi
    else
        echo -e "  ${UI_DIM}GUI:${UI_RESET}      Disabled"
    fi

    echo ""
    echo -e "  ${UI_DIM}Commands:${UI_RESET} /yoyo-status /specs /tasks /fixes"
    echo -e "  ${UI_DIM}Help:${UI_RESET}     /yoyo-help"

    # Show orchestration status
    if [ "$ORCHESTRATION_ENABLED" = true ]; then
        echo -e "  ${UI_DIM}Orchestration:${UI_RESET} ${UI_SUCCESS}Global Mode (v6.1)${UI_RESET}"
    else
        echo -e "  ${UI_DIM}Orchestration:${UI_RESET} ${UI_YELLOW}Disabled${UI_RESET}"
    fi
    echo ""

    # Set orchestration environment variable
    if [ "$ORCHESTRATION_ENABLED" = false ]; then
        export YOYO_ORCHESTRATION=false
    fi

    # Launch Claude Code
    exec claude
}

# ============================================================================
# Entry Point
# ============================================================================

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-gui)
            GUI_ENABLED=false
            shift
            ;;
        --no-banner)
            BANNER_ENABLED=false
            shift
            ;;
        --no-orchestration)
            ORCHESTRATION_ENABLED=false
            shift
            ;;
        --help|-h)
            echo ""
            echo "Yoyo Dev CLI - Launch yoyo-dev-ai framework with Claude Code"
            echo ""
            echo "Usage: yoyo-cli [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --no-gui            Disable GUI server"
            echo "  --no-banner         Disable startup banner"
            echo "  --no-orchestration  Disable agent orchestration"
            echo "  --help, -h          Show this help"
            echo ""
            exit 0
            ;;
        *)
            # Ignore unknown arguments
            shift
            ;;
    esac
done

# Run main function
launch_yoyo_cli
