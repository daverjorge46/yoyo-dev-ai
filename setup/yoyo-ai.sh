#!/bin/bash

# Yoyo AI Launcher v1.0
# OpenClaw Personal AI Assistant - branded wrapper
# Subcommands: --start, --stop, --update, --status, --doctor, --channels, --help

set -euo pipefail

# ============================================================================
# Load UI Library
# ============================================================================

SCRIPT_PATH="${BASH_SOURCE[0]}"
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"

# Source shared functions
if [ -f "$SCRIPT_DIR/functions.sh" ]; then
    source "$SCRIPT_DIR/functions.sh"
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
    ui_success() { echo -e "${UI_SUCCESS}✓${UI_RESET} $1"; }
    ui_error() { echo -e "${UI_ERROR}✗${UI_RESET} $1"; }
    ui_info() { echo -e "${UI_PRIMARY}ℹ${UI_RESET} $1"; }
    ui_warning() { echo -e "${UI_WARNING}⚠${UI_RESET} $1"; }
    ui_yoyo_ai_banner() {
        echo ""
        echo -e "${UI_MAUVE}YOYO AI${UI_RESET} ${1:-v1.0.0}"
        echo ""
    }
    ui_yoyo_ai_status_panel() { :; }
fi

# ============================================================================
# Configuration
# ============================================================================

readonly VERSION="1.0.0"
readonly OPENCLAW_PORT="${OPENCLAW_PORT:-18789}"
readonly OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG:-$HOME/.openclaw/openclaw.json}"
readonly OPENCLAW_TOKEN_FILE="$HOME/.openclaw/.gateway-token"
readonly OPENCLAW_ONBOARD_MARKER="$HOME/.openclaw/.yoyo-onboarded"

# ============================================================================
# Node.js Validation
# ============================================================================

check_prerequisites() {
    local node_version
    if ! node_version=$(check_node_version 22 2>/dev/null); then
        if [ "$node_version" = "not_installed" ]; then
            ui_error "Node.js is not installed"
            echo ""
            echo "  OpenClaw requires Node.js >= 22"
            echo ""
            echo -e "  Install via: ${UI_PRIMARY}https://nodejs.org/${UI_RESET}"
            echo -e "  Or with nvm: ${UI_PRIMARY}nvm install 22${UI_RESET}"
            echo ""
            return 1
        else
            ui_error "Node.js version $node_version is too old (need >= 22)"
            echo ""
            echo -e "  Upgrade via: ${UI_PRIMARY}nvm install 22${UI_RESET}"
            echo ""
            return 1
        fi
    fi
    return 0
}

# ============================================================================
# OpenClaw Detection
# ============================================================================

is_openclaw_installed() {
    command -v openclaw &>/dev/null
}

get_openclaw_version() {
    if is_openclaw_installed; then
        openclaw --version 2>/dev/null || echo "unknown"
    else
        echo "not installed"
    fi
}

# ============================================================================
# Daemon Management
# ============================================================================

get_daemon_pid() {
    # Try to find openclaw daemon process
    pgrep -f "openclaw.*daemon" 2>/dev/null | head -1 || echo ""
}

is_daemon_running() {
    local pid
    pid=$(get_daemon_pid)
    [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

is_gateway_installed() {
    # Check if gateway service is installed (systemd user service exists)
    systemctl --user is-enabled openclaw-gateway.service &>/dev/null 2>&1
}

is_gateway_running() {
    # Check if gateway port is listening
    ss -tlnH "sport = :${OPENCLAW_PORT}" 2>/dev/null | grep -q "${OPENCLAW_PORT}" 2>/dev/null || \
        systemctl --user is-active openclaw-gateway.service &>/dev/null 2>&1
}

ensure_gateway_token() {
    ensure_openclaw_token
    patch_openclaw_systemd_service
}

ensure_gateway_mode() {
    set_openclaw_gateway_mode
}

ensure_initialized() {
    # Step 1: Ensure OpenClaw is installed
    if ! is_openclaw_installed; then
        ui_info "Installing OpenClaw..."
        npm install -g openclaw@latest 2>&1 | tail -1 || {
            ui_error "Failed to install OpenClaw"
            return 1
        }
        ui_success "OpenClaw installed"
        echo ""
    fi

    # Step 2: Run onboarding if yoyo-ai has never been onboarded
    if ! is_yoyo_onboarded; then
        # Back up any existing config from external/old installation
        if [ -f "$OPENCLAW_CONFIG_PATH" ]; then
            ui_info "Found existing OpenClaw config — backing up before onboarding..."
            backup_openclaw_config
        fi

        ui_info "Running OpenClaw onboarding..."
        ensure_openclaw_token
        run_openclaw_onboard
        ui_success "OpenClaw onboarded"
        echo ""
    else
        # Already onboarded — just ensure token, mode, and service
        ensure_gateway_mode
        ensure_gateway_token

        if ! is_gateway_installed; then
            ui_info "Installing gateway service..."
            openclaw gateway install 2>&1 || {
                ui_warning "Gateway service installation failed — will run gateway directly"
                return 0
            }
            ui_success "Gateway service installed"
            echo ""
        fi
    fi

    return 0
}

daemon_start() {
    if is_gateway_running; then
        ui_success "Gateway is already running on port ${OPENCLAW_PORT}"
        return 0
    fi

    if ! is_openclaw_installed; then
        ui_error "OpenClaw is not installed"
        echo ""
        echo -e "  Install with: ${UI_PRIMARY}npm install -g openclaw@latest${UI_RESET}"
        echo ""
        return 1
    fi

    # Ensure token is loaded
    ensure_gateway_token

    ui_info "Starting OpenClaw gateway..."

    # Try systemd service first
    if is_gateway_installed; then
        systemctl --user start openclaw-gateway.service 2>&1 || true
        sleep 1
        if is_gateway_running; then
            ui_success "Gateway started on port ${OPENCLAW_PORT}"
            show_openclaw_dashboard_info
            return 0
        fi
    fi

    # Fallback: start gateway directly in background
    openclaw gateway --port "$OPENCLAW_PORT" &>/dev/null &
    disown
    sleep 6

    if is_gateway_running; then
        ui_success "Gateway started on port ${OPENCLAW_PORT}"
        show_openclaw_dashboard_info
    else
        ui_warning "Gateway may not have started correctly"
        echo -e "  Try manually: ${UI_PRIMARY}openclaw gateway --port ${OPENCLAW_PORT}${UI_RESET}"
        echo -e "  Or diagnose:  ${UI_PRIMARY}yoyo-ai --doctor${UI_RESET}"
    fi
}

daemon_stop() {
    if ! is_gateway_running && ! is_daemon_running; then
        ui_info "Gateway is not running"
        return 0
    fi

    ui_info "Stopping OpenClaw gateway..."

    # Try systemd service first
    if is_gateway_installed; then
        systemctl --user stop openclaw-gateway.service 2>&1 || true
    fi

    # Also try killing any direct gateway process
    pkill -f "openclaw.*gateway" 2>/dev/null || true

    # Fallback: kill by PID
    local pid
    pid=$(get_daemon_pid)
    if [ -n "$pid" ]; then
        kill "$pid" 2>/dev/null || true
    fi

    ui_success "Gateway stopped"
}

# ============================================================================
# Commands
# ============================================================================

cmd_start() {
    if ! check_prerequisites; then
        exit 1
    fi

    ui_yoyo_ai_banner "v${VERSION}"

    ensure_initialized || exit 1

    daemon_start
}

cmd_stop() {
    ui_yoyo_ai_banner "v${VERSION}"
    daemon_stop
}

cmd_status() {
    ui_yoyo_ai_banner "v${VERSION}"

    local status="stopped"
    local pid=""

    if is_daemon_running; then
        status="running"
        pid=$(get_daemon_pid)
    fi

    ui_yoyo_ai_status_panel "$status" "$OPENCLAW_PORT" "$pid"

    # Show OpenClaw version
    echo -e "  ${UI_DIM}OpenClaw:${UI_RESET}  $(get_openclaw_version)"

    # Show Node.js version
    local node_ver
    node_ver=$(node --version 2>/dev/null || echo "not found")
    echo -e "  ${UI_DIM}Node.js:${UI_RESET}   ${node_ver}"

    # Show config path
    if [ -f "$OPENCLAW_CONFIG_PATH" ]; then
        echo -e "  ${UI_DIM}Config:${UI_RESET}    ${OPENCLAW_CONFIG_PATH}"
    else
        echo -e "  ${UI_DIM}Config:${UI_RESET}    ${UI_WARNING}not found${UI_RESET}"
    fi
    echo ""

    # If stopped, offer to start
    if [ "$status" = "stopped" ] && is_openclaw_installed; then
        echo -e "  ${UI_DIM}Start with:${UI_RESET} ${UI_PRIMARY}yoyo-ai --start${UI_RESET}"
        echo ""
    fi
}

cmd_update() {
    ui_yoyo_ai_banner "v${VERSION}"

    if ! check_prerequisites; then
        exit 1
    fi

    if ! is_openclaw_installed; then
        ui_error "OpenClaw is not installed"
        echo ""
        echo -e "  Install first: ${UI_PRIMARY}yoyo-ai --start${UI_RESET}"
        echo ""
        exit 1
    fi

    local current_version
    current_version=$(get_openclaw_version)
    ui_info "Current version: ${current_version}"
    ui_info "Updating OpenClaw..."

    npm update -g openclaw@latest || {
        ui_error "Update failed"
        exit 1
    }

    local new_version
    new_version=$(get_openclaw_version)
    ui_success "OpenClaw updated to ${new_version}"

    # Restart daemon if it was running
    if is_daemon_running; then
        echo ""
        ui_info "Restarting daemon..."
        daemon_stop
        sleep 1
        daemon_start
    fi
}

cmd_doctor() {
    ui_yoyo_ai_banner "v${VERSION}"

    echo -e "  ${UI_BOLD}Yoyo AI Diagnostics${UI_RESET}"
    echo ""

    # Check Node.js
    echo -n "  Node.js >= 22:      "
    local node_ver
    if node_ver=$(check_node_version 22 2>/dev/null); then
        echo -e "${UI_SUCCESS}✓${UI_RESET} v${node_ver}"
    else
        if [ "$node_ver" = "not_installed" ]; then
            echo -e "${UI_ERROR}✗${UI_RESET} not installed"
        else
            echo -e "${UI_ERROR}✗${UI_RESET} v${node_ver} (need >= 22)"
        fi
    fi

    # Check npm
    echo -n "  npm:                "
    if command -v npm &>/dev/null; then
        echo -e "${UI_SUCCESS}✓${UI_RESET} $(npm --version 2>/dev/null)"
    else
        echo -e "${UI_ERROR}✗${UI_RESET} not found"
    fi

    # Check OpenClaw
    echo -n "  OpenClaw:           "
    if is_openclaw_installed; then
        echo -e "${UI_SUCCESS}✓${UI_RESET} $(get_openclaw_version)"
    else
        echo -e "${UI_ERROR}✗${UI_RESET} not installed"
    fi

    # Check daemon
    echo -n "  Daemon:             "
    if is_daemon_running; then
        echo -e "${UI_SUCCESS}✓${UI_RESET} running (PID: $(get_daemon_pid))"
    else
        echo -e "${UI_WARNING}○${UI_RESET} stopped"
    fi

    # Check config
    echo -n "  Config:             "
    if [ -f "$OPENCLAW_CONFIG_PATH" ]; then
        echo -e "${UI_SUCCESS}✓${UI_RESET} ${OPENCLAW_CONFIG_PATH}"
    else
        echo -e "${UI_WARNING}○${UI_RESET} not found"
    fi

    echo ""
}

cmd_channels() {
    if ! is_openclaw_installed; then
        ui_error "OpenClaw is not installed"
        exit 1
    fi

    openclaw channels "$@"
}

show_help() {
    ui_yoyo_ai_banner "v${VERSION}"

    echo -e "  ${UI_BOLD}USAGE${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo-ai${UI_RESET}                ${UI_DIM}Show status (start if stopped)${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai --start${UI_RESET}        ${UI_DIM}Start the AI daemon${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai --stop${UI_RESET}         ${UI_DIM}Stop the AI daemon${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai --status${UI_RESET}       ${UI_DIM}Show daemon status${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai --update${UI_RESET}       ${UI_DIM}Update OpenClaw to latest${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai --doctor${UI_RESET}       ${UI_DIM}Run diagnostics${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai --channels${UI_RESET}     ${UI_DIM}Manage messaging channels${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai --help${UI_RESET}         ${UI_DIM}Show this help${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai --version${UI_RESET}      ${UI_DIM}Show version${UI_RESET}"
    echo ""

    echo -e "  ${UI_BOLD}ABOUT${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "  Yoyo AI is your personal AI assistant powered by OpenClaw."
    echo -e "  It runs as a background daemon and provides messaging, skills,"
    echo -e "  and integrations across your development workflow."
    echo ""
    echo -e "  ${UI_DIM}Part of the yoyo-dev-ai platform.${UI_RESET}"
    echo -e "  ${UI_DIM}Dev environment: ${UI_PRIMARY}yoyo-dev --help${UI_RESET}"
    echo ""
}

show_version() {
    echo ""
    echo -e "${UI_MAUVE}Yoyo AI${UI_RESET} v${VERSION}"
    echo -e "${UI_DIM}Personal AI Assistant (OpenClaw)${UI_RESET}"
    echo ""
}

# ============================================================================
# Main Entry Point
# ============================================================================

main() {
    # No arguments: ensure initialized, start if stopped, show status
    if [ $# -eq 0 ]; then
        if ! check_prerequisites; then
            exit 1
        fi

        ui_yoyo_ai_banner "v${VERSION}"

        ensure_initialized || true

        if ! is_gateway_running; then
            daemon_start
        fi

        # Show status
        local status="stopped"
        local pid=""
        if is_gateway_running; then
            status="running"
            pid=$(get_daemon_pid)
        fi
        ui_yoyo_ai_status_panel "$status" "$OPENCLAW_PORT" "$pid"

        echo -e "  ${UI_DIM}OpenClaw:${UI_RESET}  $(get_openclaw_version)"
        local node_ver
        node_ver=$(node --version 2>/dev/null || echo "not found")
        echo -e "  ${UI_DIM}Node.js:${UI_RESET}   ${node_ver}"
        if [ -f "$OPENCLAW_CONFIG_PATH" ]; then
            echo -e "  ${UI_DIM}Config:${UI_RESET}    ${OPENCLAW_CONFIG_PATH}"
        else
            echo -e "  ${UI_DIM}Config:${UI_RESET}    ${UI_WARNING}not found${UI_RESET}"
        fi
        echo ""
        exit 0
    fi

    case "${1:-}" in
        --start|-s)
            shift
            cmd_start "$@"
            ;;
        --stop)
            cmd_stop
            ;;
        --status)
            cmd_status
            ;;
        --update|-u)
            cmd_update
            ;;
        --doctor|-d)
            cmd_doctor
            ;;
        --channels)
            shift
            cmd_channels "$@"
            ;;
        --help|-h)
            show_help
            ;;
        --version|-v)
            show_version
            ;;
        *)
            ui_error "Unknown option: $1"
            echo ""
            echo -e "  Use ${UI_PRIMARY}yoyo-ai --help${UI_RESET} for available options"
            exit 1
            ;;
    esac
}

main "$@"
