#!/bin/bash

# Install Yoyo Dev Claude Code Configuration
# Installs: status line, settings, output style

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
YOYO_INSTALL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
DIM='\033[2m'
RESET='\033[0m'

# ============================================================================
# Helper Functions
# ============================================================================

info() { echo -e "${CYAN}ℹ${RESET} $1"; }
success() { echo -e "${GREEN}✓${RESET} $1"; }
warning() { echo -e "${YELLOW}⚠${RESET} $1"; }
error() { echo -e "${RED}✗${RESET} $1"; }

# ============================================================================
# Installation Functions
# ============================================================================

install_statusline() {
    local src="$SCRIPT_DIR/claude-config/statusline.sh"
    local dest="$CLAUDE_DIR/yoyo-statusline.sh"

    if [ ! -f "$src" ]; then
        error "Status line source not found: $src"
        return 1
    fi

    mkdir -p "$CLAUDE_DIR"
    cp "$src" "$dest"
    chmod +x "$dest"
    success "Installed status line: $dest"
}

install_output_style() {
    local src="$YOYO_INSTALL_DIR/.claude/output-styles/yoyo.md"
    local dest_dir="$CLAUDE_DIR/output-styles"
    local dest="$dest_dir/yoyo.md"

    if [ ! -f "$src" ]; then
        # Try project .claude directory
        src="$SCRIPT_DIR/../.claude/output-styles/yoyo.md"
    fi

    if [ ! -f "$src" ]; then
        warning "Output style source not found - skipping"
        return 0
    fi

    mkdir -p "$dest_dir"
    cp "$src" "$dest"
    success "Installed output style: $dest"
}

merge_settings() {
    local src="$SCRIPT_DIR/claude-config/settings.json"
    local dest="$CLAUDE_DIR/settings.json"

    if [ ! -f "$src" ]; then
        error "Settings source not found: $src"
        return 1
    fi

    mkdir -p "$CLAUDE_DIR"

    if [ -f "$dest" ]; then
        # Backup existing settings
        cp "$dest" "$dest.backup.$(date +%Y%m%d%H%M%S)"
        info "Backed up existing settings"

        # Merge settings using jq if available
        if command -v jq &> /dev/null; then
            # Merge: existing values take precedence except for new keys
            jq -s '.[0] * .[1]' "$dest.backup."* "$src" > "$dest" 2>/dev/null || {
                # If merge fails, just copy the new settings
                cp "$src" "$dest"
            }
            success "Merged settings: $dest"
        else
            warning "jq not installed - replacing settings (backup saved)"
            cp "$src" "$dest"
            success "Installed settings: $dest"
        fi
    else
        cp "$src" "$dest"
        success "Installed settings: $dest"
    fi
}

install_project_commands() {
    local project_dir="${1:-.}"
    local src_dir="$YOYO_INSTALL_DIR/.claude/commands"
    local dest_dir="$project_dir/.claude/commands"

    # Resolve to absolute paths for comparison
    src_dir="$(cd "$src_dir" 2>/dev/null && pwd)" || src_dir=""
    dest_dir="$(mkdir -p "$dest_dir" && cd "$dest_dir" && pwd)"

    if [ -z "$src_dir" ]; then
        # Try alternative location
        src_dir="$(cd "$SCRIPT_DIR/../.claude/commands" 2>/dev/null && pwd)" || src_dir=""
    fi

    if [ -z "$src_dir" ]; then
        warning "Commands source directory not found - skipping"
        return 0
    fi

    # Skip if source and destination are the same (running in yoyo-dev itself)
    if [ "$src_dir" = "$dest_dir" ]; then
        info "Project commands already in place (same directory)"
        return 0
    fi

    # Copy all command files
    for cmd in "$src_dir"/*.md; do
        if [ -f "$cmd" ]; then
            local filename=$(basename "$cmd")
            cp "$cmd" "$dest_dir/$filename"
            success "Installed command: /$(basename "$filename" .md)"
        fi
    done
}

# ============================================================================
# Main
# ============================================================================

main() {
    echo ""
    echo -e "${CYAN}╭────────────────────────────────────────────────────────────╮${RESET}"
    echo -e "${CYAN}│${RESET}       ${GREEN}YOYO DEV CLAUDE CODE CONFIGURATION${RESET}                 ${CYAN}│${RESET}"
    echo -e "${CYAN}╰────────────────────────────────────────────────────────────╯${RESET}"
    echo ""

    local project_dir="${1:-.}"

    info "Installing to: $CLAUDE_DIR"
    echo ""

    # Install global components
    install_statusline
    install_output_style
    merge_settings

    echo ""

    # Install project-level commands if in a project
    if [ -d "$project_dir/.yoyo-dev" ]; then
        info "Installing project commands..."
        install_project_commands "$project_dir"
    else
        info "No .yoyo-dev directory found - skipping project commands"
        echo -e "  ${DIM}Run in a Yoyo Dev project to install /status, /specs, etc.${RESET}"
    fi

    echo ""
    echo -e "${GREEN}╭────────────────────────────────────────────────────────────╮${RESET}"
    echo -e "${GREEN}│${RESET}                   ${GREEN}INSTALLATION COMPLETE${RESET}                   ${GREEN}│${RESET}"
    echo -e "${GREEN}╰────────────────────────────────────────────────────────────╯${RESET}"
    echo ""

    echo -e "  ${DIM}Installed:${RESET}"
    echo -e "    • Status line: ~/.claude/yoyo-statusline.sh"
    echo -e "    • Output style: ~/.claude/output-styles/yoyo.md"
    echo -e "    • Settings: ~/.claude/settings.json"
    if [ -d "$project_dir/.claude/commands" ]; then
        echo -e "    • Commands: .claude/commands/"
    fi
    echo ""

    echo -e "  ${DIM}Next steps:${RESET}"
    echo -e "    1. Run ${CYAN}yoyo${RESET} to launch Claude Code"
    echo -e "    2. Try ${CYAN}/status${RESET} to see project dashboard"
    echo -e "    3. Try ${CYAN}/specs${RESET} to list specifications"
    echo ""
}

main "$@"
