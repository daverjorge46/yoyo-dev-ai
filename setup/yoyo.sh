#!/bin/bash

# Yoyo Dev Launcher v2
# Beautiful, intuitive launcher with TUI v4 support

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
    UI_RESET='\033[0m'
    ui_success() { echo -e "${UI_SUCCESS}✓${UI_RESET} $1"; }
    ui_error() { echo -e "${UI_ERROR}✗${UI_RESET} $1"; }
    ui_info() { echo -e "${UI_PRIMARY}ℹ${UI_RESET} $1"; }
fi

# ============================================================================
# Configuration
# ============================================================================

readonly VERSION="5.0.0"
readonly USER_PROJECT_DIR="$(pwd)"

GUI_ENABLED=true
GUI_PORT=5173
GUI_DEV_MODE=true

# ============================================================================
# TUI v4 (TypeScript) Requirements Check
# ============================================================================

# Check if TypeScript TUI can be launched
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

# Launch TypeScript TUI v4
launch_typescript_tui() {
    echo ""
    ui_box_header "LAUNCHING TUI v4 (TypeScript/Ink)" 70 "$UI_SUCCESS"
    echo ""

    ui_info "Starting modern TUI interface..."
    echo ""

    cd "$USER_PROJECT_DIR"

    local tui_cmd=""

    if command -v tsx &> /dev/null; then
        tui_cmd="tsx"
    elif [ -f "$YOYO_INSTALL_DIR/node_modules/.bin/tsx" ]; then
        tui_cmd="$YOYO_INSTALL_DIR/node_modules/.bin/tsx"
    else
        ui_error "tsx not found"
        echo ""
        echo "  Install with: ${UI_PRIMARY}npm install -g tsx${UI_RESET}"
        echo "  Or run: ${UI_PRIMARY}cd $YOYO_INSTALL_DIR && npm install${UI_RESET}"
        echo ""
        exit 1
    fi

    $tui_cmd "$YOYO_INSTALL_DIR/src/tui-v4/index.tsx"
    local exit_code=$?

    if [ $exit_code -ne 0 ]; then
        echo ""
        ui_warning "TUI v4 exited with error code $exit_code"
        echo "  See .yoyo-dev/tui-errors.log for details"
        echo ""
        sleep 1
        return 1
    fi

    return 0
}

# ============================================================================
# UI Functions
# ============================================================================

show_version() {
    echo ""
    ui_banner "$VERSION"
    ui_tui_badge
    echo ""
}

show_help() {
    ui_clear_screen "$VERSION"
    ui_box_header "YOYO DEV COMMAND REFERENCE" 70 "$UI_PRIMARY"

    # TUI Launch Options
    ui_section "TUI Launch Options" "$ICON_ROCKET"

    echo -e "  ${UI_SUCCESS}yoyo${UI_RESET}"
    echo -e "    ${UI_DIM}Launch TUI + Claude + Browser GUI (default)${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}yoyo --no-gui${UI_RESET}"
    echo -e "    ${UI_DIM}Launch TUI + Claude without browser GUI${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}yoyo --no-split${UI_RESET}"
    echo -e "    ${UI_DIM}Launch TUI only (no Claude, no GUI)${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}yoyo --tui-v4${UI_RESET}"
    echo -e "    ${UI_DIM}Force launch TUI v4 (TypeScript/Ink)${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}yoyo --py${UI_RESET}"
    echo -e "    ${UI_DIM}Force launch TUI v3 (Python/Textual)${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}yoyo --stop-gui${UI_RESET}"
    echo -e "    ${UI_DIM}Stop background GUI server${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}yoyo --gui-status${UI_RESET}"
    echo -e "    ${UI_DIM}Check if GUI server is running${UI_RESET}"
    echo ""

    # Configuration
    ui_section "Configuration" "$ICON_WRENCH"

    echo -e "  ${UI_INFO}Config file:${UI_RESET} ${UI_DIM}.yoyo-dev/config.yml${UI_RESET}"
    echo -e "  ${UI_INFO}TUI version:${UI_RESET} ${UI_DIM}Set 'tui.version' to 'v3' or 'v4'${UI_RESET}"
    echo ""

    # Core Workflows
    ui_section "Core Workflows" "$ICON_PACKAGE"

    echo -e "  ${UI_SUCCESS}/plan-product${UI_RESET}"
    echo -e "    ${UI_DIM}Set mission & roadmap for new product${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}/create-new${UI_RESET} ${UI_YELLOW}[feature]${UI_RESET}"
    echo -e "    ${UI_DIM}Create feature with spec + tasks${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}/execute-tasks${UI_RESET}"
    echo -e "    ${UI_DIM}Build and ship code with multi-agent orchestration${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}/research${UI_RESET} ${UI_YELLOW}[topic]${UI_RESET}"
    echo -e "    ${UI_DIM}Background research with librarian agent (v5.0)${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}/consult-oracle${UI_RESET} ${UI_YELLOW}[question]${UI_RESET}"
    echo -e "    ${UI_DIM}Strategic guidance from Oracle agent (v5.0)${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}/create-fix${UI_RESET} ${UI_YELLOW}[problem]${UI_RESET}"
    echo -e "    ${UI_DIM}Analyze and fix bugs systematically${UI_RESET}"
    echo ""

    # TUI Features
    ui_section "TUI Features (TypeScript/Ink)" "$ICON_SPARKLES"

    echo -e "  ${UI_SUCCESS}${ICON_CHECK}${UI_RESET} ${UI_DIM}60fps rendering with React/Ink${UI_RESET}"
    echo -e "  ${UI_SUCCESS}${ICON_CHECK}${UI_RESET} ${UI_DIM}<100MB memory footprint${UI_RESET}"
    echo -e "  ${UI_SUCCESS}${ICON_CHECK}${UI_RESET} ${UI_DIM}Session persistence (saves your state)${UI_RESET}"
    echo -e "  ${UI_SUCCESS}${ICON_CHECK}${UI_RESET} ${UI_DIM}Real-time WebSocket updates${UI_RESET}"
    echo ""

    # Keyboard Shortcuts
    ui_section "Keyboard Shortcuts (in TUI)" "$ICON_INFO"

    echo -e "  ${UI_PRIMARY}?${UI_RESET}          ${UI_DIM}Show help overlay${UI_RESET}"
    echo -e "  ${UI_PRIMARY}q${UI_RESET}          ${UI_DIM}Quit application${UI_RESET}"
    echo -e "  ${UI_PRIMARY}r${UI_RESET}          ${UI_DIM}Refresh data${UI_RESET}"
    echo -e "  ${UI_PRIMARY}/${UI_RESET}          ${UI_DIM}Open command palette${UI_RESET}"
    echo -e "  ${UI_PRIMARY}h/l${UI_RESET}        ${UI_DIM}Switch between panels${UI_RESET}"
    echo -e "  ${UI_PRIMARY}j/k${UI_RESET}        ${UI_DIM}Navigate up/down${UI_RESET}"
    echo ""

    # Examples
    ui_section "Examples" "$ICON_ARROW"

    echo -e "  ${UI_PRIMARY}\$${UI_RESET} yoyo"
    echo -e "    ${UI_DIM}Launch full interface (TUI + Claude + GUI)${UI_RESET}"
    echo ""

    echo -e "  ${UI_PRIMARY}\$${UI_RESET} yoyo --tui-only"
    echo -e "    ${UI_DIM}Launch TUI without GUI${UI_RESET}"
    echo ""

    echo -e "  ${UI_PRIMARY}\$${UI_RESET} yoyo --help"
    echo -e "    ${UI_DIM}Show this help message${UI_RESET}"
    echo ""

    echo -e "${UI_DIM}For more info: https://github.com/daverjorge46/yoyo-dev-ai${UI_RESET}"
    echo ""
}

# ============================================================================
# Project Detection
# ============================================================================

check_yoyo_installed_or_install() {
    if [ -d "./.yoyo-dev" ]; then
        return 0
    fi

    echo ""
    ui_warning "Yoyo Dev not detected in this directory"
    echo ""

    if ui_ask "Would you like to install Yoyo Dev in this project?" "y"; then
        echo ""
        if [ -f "$YOYO_INSTALL_DIR/setup/project.sh" ]; then
            bash "$YOYO_INSTALL_DIR/setup/project.sh" --claude-code
        else
            ui_error "Installation script not found"
            echo ""
            echo "  Download from: https://github.com/daverjorge46/yoyo-dev-ai"
            exit 1
        fi
    else
        echo ""
        ui_info "Installation cancelled"
        echo ""
        exit 0
    fi
}

# ============================================================================
# Main Launch Logic
# ============================================================================

launch_tui() {
    check_yoyo_installed_or_install

    # Show launch banner
    echo ""
    ui_box_header "YOYO DEV LAUNCHER" 70 "$UI_PRIMARY"
    echo ""

    ui_kv "Project" "$(basename "$USER_PROJECT_DIR")"
    ui_kv "TUI Version" "v4 (TypeScript/Ink)"
    ui_kv "Config" ".yoyo-dev/config.yml"
    echo ""

    # Check TUI v4 requirements
    if ! check_typescript_tui; then
        ui_error "TUI v4 requirements not met"
        echo ""
        echo "  ${UI_DIM}Missing requirements:${UI_RESET}"

        if ! command -v node &> /dev/null; then
            echo "    ${UI_ERROR}✗${UI_RESET} Node.js not installed"
            echo "       ${UI_DIM}Install from: https://nodejs.org/${UI_RESET}"
        fi

        if [ ! -d "$YOYO_INSTALL_DIR/node_modules" ]; then
            echo "    ${UI_ERROR}✗${UI_RESET} Dependencies not installed"
            echo "       ${UI_DIM}Run: cd $YOYO_INSTALL_DIR && npm install${UI_RESET}"
        fi

        if [ ! -f "$YOYO_INSTALL_DIR/src/tui-v4/index.tsx" ]; then
            echo "    ${UI_ERROR}✗${UI_RESET} TUI v4 source files missing"
        fi

        echo ""
        exit 1
    fi

    # Launch TUI v4
    launch_typescript_tui
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
        --tui|--tui-only)
            GUI_ENABLED=false
            launch_tui
            ;;
        --no-split|--no-gui)
            GUI_ENABLED=false
            launch_tui
            ;;
        launch|"")
            # Default: check config and launch appropriate TUI
            launch_tui
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
