#!/bin/bash

# Yoyo Dev Launcher v6.0
# Claude Code Native Interface - launches Claude Code directly with GUI
# Legacy TUI available via --legacy-tui flag

set -euo pipefail

# ============================================================================
# Load UI Library
# ============================================================================

SCRIPT_PATH="${BASH_SOURCE[0]}"
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
YOYO_INSTALL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Try to load UI library
if [ -f "$SCRIPT_DIR/ui-library.sh" ]; then
    source "$SCRIPT_DIR/ui-library.sh"
else
    # Fallback colors
    UI_PRIMARY='\033[0;36m'
    UI_SUCCESS='\033[0;32m'
    UI_ERROR='\033[0;31m'
    UI_YELLOW='\033[1;33m'
    UI_DIM='\033[2m'
    UI_RESET='\033[0m'
    ui_success() { echo -e "${UI_SUCCESS}✓${UI_RESET} $1"; }
    ui_error() { echo -e "${UI_ERROR}✗${UI_RESET} $1"; }
    ui_info() { echo -e "${UI_PRIMARY}ℹ${UI_RESET} $1"; }
    ui_warning() { echo -e "${UI_YELLOW}⚠${UI_RESET} $1"; }
fi

# ============================================================================
# Configuration
# ============================================================================

readonly VERSION="6.0.0"
readonly USER_PROJECT_DIR="$(pwd)"

GUI_ENABLED=true
GUI_PORT=5173
LEGACY_TUI=false

# ============================================================================
# Claude Code Detection
# ============================================================================

check_claude_code() {
    if command -v claude &> /dev/null; then
        return 0
    fi
    return 1
}

# ============================================================================
# GUI Functions
# ============================================================================

launch_gui_background() {
    local gui_script="$SCRIPT_DIR/yoyo-gui.sh"

    if [ ! -f "$gui_script" ]; then
        return 1
    fi

    # Launch GUI in background with dev mode
    bash "$gui_script" --dev --background --no-open 2>/dev/null &
    return 0
}

stop_gui() {
    local gui_script="$SCRIPT_DIR/yoyo-gui.sh"
    if [ -f "$gui_script" ]; then
        bash "$gui_script" --stop
    fi
}

check_gui_status() {
    local gui_script="$SCRIPT_DIR/yoyo-gui.sh"
    if [ -f "$gui_script" ]; then
        bash "$gui_script" --status
    fi
}

# ============================================================================
# Legacy TUI Functions
# ============================================================================

check_typescript_tui() {
    if ! command -v node &> /dev/null; then
        return 1
    fi

    if [ ! -f "$YOYO_INSTALL_DIR/src/tui-v4/index.tsx" ]; then
        return 1
    fi

    if [ ! -d "$YOYO_INSTALL_DIR/node_modules" ]; then
        return 1
    fi

    return 0
}

launch_legacy_tui() {
    echo ""
    ui_warning "Legacy TUI mode (deprecated in v6.0)"
    echo ""
    ui_info "Consider using default mode: ${UI_PRIMARY}yoyo${UI_RESET}"
    echo ""

    if ! check_typescript_tui; then
        ui_error "TUI requirements not met"
        exit 1
    fi

    # Launch GUI if enabled
    if [ "$GUI_ENABLED" = true ]; then
        launch_gui_background
    fi

    local tui_cmd=""
    if command -v tsx &> /dev/null; then
        tui_cmd="tsx"
    elif [ -f "$YOYO_INSTALL_DIR/node_modules/.bin/tsx" ]; then
        tui_cmd="$YOYO_INSTALL_DIR/node_modules/.bin/tsx"
    else
        ui_error "tsx not found"
        exit 1
    fi

    cd "$USER_PROJECT_DIR"
    exec $tui_cmd "$YOYO_INSTALL_DIR/src/tui-v4/index.tsx"
}

# ============================================================================
# Claude Code Native Launch
# ============================================================================

launch_claude_code() {
    # Check if Yoyo Dev is installed
    if [ ! -d "./.yoyo-dev" ]; then
        echo ""
        ui_warning "Yoyo Dev not detected in this directory"
        echo ""
        ui_info "Run: ${UI_PRIMARY}~/.yoyo-dev/setup/project.sh --claude-code${UI_RESET}"
        echo ""
        exit 1
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

    # Show launch banner
    echo ""
    echo -e "${UI_PRIMARY}╭──────────────────────────────────────────────────────────────────╮${UI_RESET}"
    echo -e "${UI_PRIMARY}│${UI_RESET}                      ${UI_SUCCESS}YOYO DEV v${VERSION}${UI_RESET}                          ${UI_PRIMARY}│${UI_RESET}"
    echo -e "${UI_PRIMARY}╰──────────────────────────────────────────────────────────────────╯${UI_RESET}"
    echo ""

    echo -e "  ${UI_DIM}Project:${UI_RESET}  $(basename "$USER_PROJECT_DIR")"
    echo -e "  ${UI_DIM}Mode:${UI_RESET}     Claude Code Native"

    # Launch GUI in background if enabled
    if [ "$GUI_ENABLED" = true ]; then
        echo -e "  ${UI_DIM}GUI:${UI_RESET}      Starting on port $GUI_PORT..."
        if launch_gui_background; then
            sleep 1
            echo -e "  ${UI_DIM}GUI:${UI_RESET}      ${UI_SUCCESS}http://localhost:$GUI_PORT${UI_RESET}"
        else
            echo -e "  ${UI_DIM}GUI:${UI_RESET}      ${UI_YELLOW}Not available${UI_RESET}"
        fi
    else
        echo -e "  ${UI_DIM}GUI:${UI_RESET}      Disabled"
    fi

    echo ""
    echo -e "  ${UI_DIM}Commands:${UI_RESET} /status /specs /tasks /fixes"
    echo -e "  ${UI_DIM}Help:${UI_RESET}     /yoyo-help"
    echo ""

    # Change to project directory
    cd "$USER_PROJECT_DIR"

    # Launch Claude Code
    exec claude
}

# ============================================================================
# UI Functions
# ============================================================================

show_version() {
    echo ""
    echo -e "${UI_PRIMARY}Yoyo Dev${UI_RESET} v${VERSION}"
    echo -e "${UI_DIM}Claude Code Native Interface${UI_RESET}"
    echo ""
}

show_help() {
    echo ""
    echo -e "${UI_PRIMARY}╭──────────────────────────────────────────────────────────────────╮${UI_RESET}"
    echo -e "${UI_PRIMARY}│${UI_RESET}                    ${UI_SUCCESS}YOYO DEV HELP${UI_RESET}                              ${UI_PRIMARY}│${UI_RESET}"
    echo -e "${UI_PRIMARY}╰──────────────────────────────────────────────────────────────────╯${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}LAUNCH MODES${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo${UI_RESET}"
    echo -e "    ${UI_DIM}Launch Claude Code + Browser GUI (default)${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --no-gui${UI_RESET}"
    echo -e "    ${UI_DIM}Launch Claude Code without browser GUI${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --gui-only${UI_RESET}"
    echo -e "    ${UI_DIM}Open browser GUI only (no Claude Code)${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --legacy-tui${UI_RESET}"
    echo -e "    ${UI_DIM}Launch legacy TUI interface (deprecated)${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}GUI MANAGEMENT${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --stop-gui${UI_RESET}"
    echo -e "    ${UI_DIM}Stop background GUI server${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --gui-status${UI_RESET}"
    echo -e "    ${UI_DIM}Check if GUI server is running${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}CLAUDE CODE COMMANDS${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "  ${UI_PRIMARY}/status${UI_RESET}          ${UI_DIM}Project dashboard${UI_RESET}"
    echo -e "  ${UI_PRIMARY}/specs${UI_RESET}           ${UI_DIM}List all specifications${UI_RESET}"
    echo -e "  ${UI_PRIMARY}/spec <n>${UI_RESET}        ${UI_DIM}View spec details${UI_RESET}"
    echo -e "  ${UI_PRIMARY}/tasks${UI_RESET}           ${UI_DIM}Show current tasks${UI_RESET}"
    echo -e "  ${UI_PRIMARY}/fixes${UI_RESET}           ${UI_DIM}List bug fixes${UI_RESET}"
    echo -e "  ${UI_PRIMARY}/fix <n>${UI_RESET}         ${UI_DIM}View fix details${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}/create-new${UI_RESET}      ${UI_DIM}Create new feature spec${UI_RESET}"
    echo -e "  ${UI_PRIMARY}/execute-tasks${UI_RESET}   ${UI_DIM}Execute current tasks${UI_RESET}"
    echo -e "  ${UI_PRIMARY}/create-fix${UI_RESET}      ${UI_DIM}Create bug fix workflow${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}INFORMATION${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --version${UI_RESET}   ${UI_DIM}Show version${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo --help${UI_RESET}      ${UI_DIM}Show this help${UI_RESET}"
    echo ""

    echo -e "  ${UI_DIM}Documentation: https://github.com/daverjorge46/yoyo-dev-ai${UI_RESET}"
    echo ""
}

# ============================================================================
# Main Entry Point
# ============================================================================

main() {
    local mode="${1:-launch}"

    case "$mode" in
        --help|-h)
            show_help
            ;;
        --version|-v)
            show_version
            ;;
        --no-gui)
            GUI_ENABLED=false
            launch_claude_code
            ;;
        --gui-only)
            local gui_script="$SCRIPT_DIR/yoyo-gui.sh"
            if [ -f "$gui_script" ]; then
                bash "$gui_script" --dev
            else
                ui_error "GUI launcher not found"
                exit 1
            fi
            ;;
        --legacy-tui|--tui)
            launch_legacy_tui
            ;;
        --stop-gui)
            stop_gui
            ;;
        --gui-status)
            check_gui_status
            ;;
        launch|"")
            # Default: Launch Claude Code with GUI
            launch_claude_code
            ;;
        *)
            ui_error "Unknown option: $mode"
            echo ""
            echo "  Use ${UI_PRIMARY}yoyo --help${UI_RESET} for available options"
            exit 1
            ;;
    esac
}

main "$@"
