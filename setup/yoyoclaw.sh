#!/bin/bash

# YoyoClaw CLI v1.0
# Standalone command wrapping the local YoyoClaw (OpenClaw) fork
# Full pass-through to node openclaw.mjs with branded help

set -euo pipefail

# ============================================================================
# Path Resolution
# ============================================================================

SCRIPT_PATH="${BASH_SOURCE[0]}"
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"

# ============================================================================
# Load Libraries
# ============================================================================

# Source shared functions (required for _resolve_yoyo_claw_bin)
if [ -f "$SCRIPT_DIR/functions.sh" ]; then
    source "$SCRIPT_DIR/functions.sh"
else
    echo "ERROR: functions.sh not found in $SCRIPT_DIR" >&2
    exit 1
fi

# Try to load UI library
if [ -f "$SCRIPT_DIR/ui-library.sh" ]; then
    source "$SCRIPT_DIR/ui-library.sh"
else
    # Fallback colors
    UI_PRIMARY='\033[0;36m'
    UI_SUCCESS='\033[0;32m'
    UI_ERROR='\033[0;31m'
    UI_WARNING='\033[1;33m'
    UI_MAUVE='\033[0;35m'
    UI_DIM='\033[2m'
    UI_BOLD='\033[1m'
    UI_RESET='\033[0m'
    ui_error() { echo -e "${UI_ERROR}✗${UI_RESET} $1"; }
    ui_info() { echo -e "${UI_PRIMARY}ℹ${UI_RESET} $1"; }
fi

# ============================================================================
# Configuration
# ============================================================================

readonly YOYOCLAW_VERSION="1.0.0"

# ============================================================================
# Environment Validation
# ============================================================================

validate_environment() {
    # Check Node.js
    if ! command -v node &>/dev/null; then
        ui_error "Node.js is not installed"
        echo ""
        echo "  YoyoClaw requires Node.js >= 22"
        echo -e "  Install via: ${UI_PRIMARY}https://nodejs.org/${UI_RESET}"
        echo -e "  Or with nvm: ${UI_PRIMARY}nvm install 22${UI_RESET}"
        echo ""
        exit 1
    fi

    # Check yoyo-claw binary
    if ! _resolve_yoyo_claw_bin &>/dev/null; then
        ui_error "YoyoClaw binary not found"
        echo ""
        echo "  Expected: yoyo-claw/openclaw.mjs relative to framework root"
        echo ""
        echo "  Try building YoyoClaw:"
        echo -e "  ${UI_PRIMARY}cd yoyo-claw && pnpm install --frozen-lockfile && pnpm build${UI_RESET}"
        echo ""
        exit 1
    fi
}

# ============================================================================
# Version Display
# ============================================================================

show_version() {
    local claw_dir
    local openclaw_version="unknown"
    if claw_dir="$(_resolve_yoyo_claw_dir 2>/dev/null)"; then
        if [ -f "$claw_dir/package.json" ]; then
            openclaw_version="$(node -e "console.log(require('$claw_dir/package.json').version)" 2>/dev/null || echo "unknown")"
        fi
    fi
    echo "YoyoClaw CLI v${YOYOCLAW_VERSION} (OpenClaw ${openclaw_version})"
}

# ============================================================================
# Help Display
# ============================================================================

show_help() {
    echo ""
    echo -e "${UI_MAUVE}${UI_BOLD}YoyoClaw CLI${UI_RESET} v${YOYOCLAW_VERSION}"
    echo ""
    echo -e "${UI_BOLD}Usage:${UI_RESET} yoyoclaw <command> [options]"
    echo ""
    echo -e "${UI_BOLD}Common Commands:${UI_RESET}"
    echo -e "  ${UI_PRIMARY}gateway start|stop|status${UI_RESET}   Manage the gateway service"
    echo -e "  ${UI_PRIMARY}doctor${UI_RESET}                      Health checks + quick fixes"
    echo -e "  ${UI_PRIMARY}tui${UI_RESET}                         Interactive terminal UI"
    echo -e "  ${UI_PRIMARY}update${UI_RESET}                      Update YoyoClaw"
    echo -e "  ${UI_PRIMARY}config get|set${UI_RESET}              Configuration management"
    echo -e "  ${UI_PRIMARY}channels list|status${UI_RESET}        Channel management"
    echo -e "  ${UI_PRIMARY}models list|set${UI_RESET}             Model configuration"
    echo -e "  ${UI_PRIMARY}sessions${UI_RESET}                    Session management"
    echo -e "  ${UI_PRIMARY}status${UI_RESET}                      Channel health overview"
    echo -e "  ${UI_PRIMARY}logs${UI_RESET}                        Gateway logs"
    echo -e "  ${UI_PRIMARY}dashboard${UI_RESET}                   Open the Control UI"
    echo -e "  ${UI_PRIMARY}onboard${UI_RESET}                     Interactive setup wizard"
    echo -e "  ${UI_PRIMARY}configure${UI_RESET}                   Configure credentials & defaults"
    echo ""
    echo -e "${UI_BOLD}Agent & Memory:${UI_RESET}"
    echo -e "  ${UI_PRIMARY}agent${UI_RESET}                       Single agent interaction"
    echo -e "  ${UI_PRIMARY}agents${UI_RESET}                      Manage isolated agents"
    echo -e "  ${UI_PRIMARY}memory search|status${UI_RESET}        Memory management"
    echo ""
    echo -e "${UI_BOLD}Advanced:${UI_RESET}"
    echo -e "  ${UI_PRIMARY}message send|read${UI_RESET}           Messaging commands"
    echo -e "  ${UI_PRIMARY}browser start|stop${UI_RESET}          Browser automation"
    echo -e "  ${UI_PRIMARY}skills list|info${UI_RESET}            Skills management"
    echo -e "  ${UI_PRIMARY}plugins list|install${UI_RESET}        Plugin management"
    echo -e "  ${UI_PRIMARY}nodes list|status${UI_RESET}           Paired device management"
    echo ""
    echo -e "${UI_DIM}All OpenClaw commands are supported via pass-through.${UI_RESET}"
    echo -e "${UI_DIM}Run 'yoyoclaw <command> --help' for details on any command.${UI_RESET}"
    echo ""
}

# ============================================================================
# Main
# ============================================================================

# Handle no arguments
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

# Handle top-level flags before validation
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --version|-V)
        show_version
        exit 0
        ;;
esac

# Validate environment before executing any command
validate_environment

# Pass-through: forward all arguments to node openclaw.mjs
bin="$(_resolve_yoyo_claw_bin)"
exec node "$bin" "$@"
