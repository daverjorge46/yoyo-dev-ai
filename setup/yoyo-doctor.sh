#!/bin/bash

# Yoyo Dev Doctor v1.0
# Diagnose installation issues and verify system configuration

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

readonly VERSION="7.0.0"
# Resolve script location
SCRIPT_PATH="${BASH_SOURCE[0]}"
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"

# Load shared base detection
source "$SCRIPT_DIR/lib/detect-base.sh"

# Colors
readonly CYAN='\033[0;36m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BOLD='\033[1m'
readonly DIM='\033[2m'
readonly RESET='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# ============================================================================
# Utility Functions
# ============================================================================

check_pass() {
    echo -e "  ${GREEN}✓${RESET} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "  ${RED}✗${RESET} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "  ${YELLOW}⚠${RESET} $1"
    ((WARNINGS++))
}

check_info() {
    echo -e "  ${CYAN}ℹ${RESET} $1"
}

section() {
    echo ""
    echo -e "${BOLD}$1${RESET}"
    echo -e "${DIM}────────────────────────────────────────────────────────────────${RESET}"
}

# detect_base_installation() is provided by setup/lib/detect-base.sh (sourced above)

# ============================================================================
# Parse Arguments
# ============================================================================

VERBOSE=false
FIX_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --fix)
            FIX_MODE=true
            shift
            ;;
        -h|--help)
            cat << EOF

Usage: yoyo-doctor [OPTIONS]

${BOLD}Yoyo Dev Doctor${RESET}

Diagnoses installation issues and verifies system configuration.

${BOLD}Options:${RESET}
  ${CYAN}-v, --verbose${RESET}    Show detailed diagnostic information
  ${CYAN}--fix${RESET}            Attempt to fix common issues
  ${CYAN}-h, --help${RESET}       Show this help message

${BOLD}What it checks:${RESET}
  - BASE installation at ~/.yoyo-dev
  - PROJECT installation in current directory
  - Global commands (yoyo, yoyo-init, etc.)
  - Prerequisites (Docker, Claude Code, Node.js)
  - MCP server configuration
  - Claude Code settings

EOF
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# ============================================================================
# Banner
# ============================================================================

echo ""
echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║${RESET}              ${BOLD}YOYO DEV DOCTOR v${VERSION}${RESET}                           ${BOLD}${CYAN}║${RESET}"
echo -e "${BOLD}${CYAN}║${RESET}              ${DIM}Installation Diagnostic Tool${RESET}                        ${BOLD}${CYAN}║${RESET}"
echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════╝${RESET}"

# ============================================================================
# Check BASE Installation
# ============================================================================

section "BASE Installation"

BASE_FOUND=""
if BASE_FOUND=$(detect_base_installation); then
    check_pass "BASE installation found at: $BASE_FOUND"

    # Check if it's the canonical location
    if [ "$BASE_FOUND" = "$HOME/.yoyo-dev" ]; then
        check_pass "Using canonical location (~/.yoyo-dev)"
    elif [ "$BASE_FOUND" = "$HOME/yoyo-dev" ]; then
        check_warn "Using legacy location (~/yoyo-dev)"
        check_info "Consider moving to ~/.yoyo-dev"
    else
        check_info "Using custom location via YOYO_BASE_DIR"
    fi

    # Check essential directories
    if [ -d "$BASE_FOUND/instructions" ]; then
        check_pass "Instructions directory exists"
    else
        check_fail "Instructions directory missing"
    fi

    if [ -d "$BASE_FOUND/standards" ]; then
        check_pass "Standards directory exists"
    else
        check_fail "Standards directory missing"
    fi

    if [ -d "$BASE_FOUND/setup" ]; then
        check_pass "Setup directory exists"
    else
        check_fail "Setup directory missing"
    fi

    if [ -d "$BASE_FOUND/claude-code" ]; then
        check_pass "Claude-code directory exists"
    else
        check_warn "Claude-code directory missing (may be legacy installation)"
    fi

    # Check for git repository
    if [ -d "$BASE_FOUND/.git" ]; then
        check_pass "Git repository detected (can update via git pull)"
        if [ "$VERBOSE" = true ]; then
            local branch=$(cd "$BASE_FOUND" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
            local commit=$(cd "$BASE_FOUND" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
            check_info "Branch: $branch, Commit: $commit"
        fi
    else
        check_warn "Not a git repository (manual updates only)"
    fi
else
    check_fail "BASE installation not found"
    echo ""
    echo -e "  ${DIM}To install BASE:${RESET}"
    echo -e "    ${CYAN}git clone https://github.com/daverjorge46/yoyo-dev-ai.git ~/.yoyo-dev${RESET}"
    echo -e "    ${CYAN}~/.yoyo-dev/setup/install-global-command.sh${RESET}"
fi

# ============================================================================
# Check PROJECT Installation
# ============================================================================

section "PROJECT Installation (Current Directory)"

PROJECT_DIR=$(pwd)
echo -e "  ${DIM}Directory: $PROJECT_DIR${RESET}"
echo ""

if [ -d ".yoyo-dev" ]; then
    check_pass "PROJECT installation found (.yoyo-dev/)"

    # Check config.yml
    if [ -f ".yoyo-dev/config.yml" ]; then
        check_pass "Configuration file exists"
        if [ "$VERBOSE" = true ]; then
            local version=$(grep 'yoyo_dev_version:' .yoyo-dev/config.yml 2>/dev/null | cut -d: -f2 | tr -d ' "' || echo "unknown")
            check_info "Installed version: $version"
        fi
    else
        check_fail "Configuration file missing"
    fi

    # Check directories
    for dir in instructions standards product specs fixes memory; do
        if [ -d ".yoyo-dev/$dir" ]; then
            [ "$VERBOSE" = true ] && check_pass "$dir/ directory exists"
        else
            check_warn "$dir/ directory missing"
        fi
    done

    # Check .claude directory
    if [ -d ".claude" ]; then
        check_pass ".claude/ directory exists"

        if [ -d ".claude/commands" ]; then
            local cmd_count=$(find .claude/commands -name "*.md" 2>/dev/null | wc -l)
            check_pass "Commands directory ($cmd_count commands)"
        else
            check_warn ".claude/commands/ missing"
        fi

        if [ -d ".claude/agents" ]; then
            local agent_count=$(find .claude/agents -name "*.md" 2>/dev/null | wc -l)
            check_pass "Agents directory ($agent_count agents)"
        else
            check_warn ".claude/agents/ missing"
        fi

        if [ -f ".claude/hooks/orchestrate.cjs" ]; then
            check_pass "Orchestration hook installed"
        else
            check_warn "Orchestration hook missing"
        fi

        if [ -f ".claude/settings.json" ]; then
            check_pass "Settings.json exists"
        else
            check_warn "Settings.json missing (orchestration may not work)"
        fi
    else
        check_warn ".claude/ directory missing (Claude Code integration incomplete)"
    fi

    # Check CLAUDE.md
    if [ -f "CLAUDE.md" ]; then
        check_pass "CLAUDE.md exists"
    else
        check_warn "CLAUDE.md missing (project context may be limited)"
    fi
else
    check_info "No PROJECT installation in current directory"
    echo ""
    echo -e "  ${DIM}To initialize this project:${RESET}"
    echo -e "    ${CYAN}yoyo-init --claude-code${RESET}"
fi

# ============================================================================
# Check Global Commands
# ============================================================================

section "Global Commands"

for cmd in yoyo yoyo-init yoyo-update yoyo-gui yoyo-doctor; do
    if command -v $cmd &> /dev/null; then
        local cmd_path=$(which $cmd)
        check_pass "$cmd available ($cmd_path)"
    else
        check_fail "$cmd not found in PATH"
    fi
done

# Check legacy command
if command -v yoyo-install &> /dev/null; then
    check_info "yoyo-install (legacy alias) available"
fi

# ============================================================================
# Check Prerequisites
# ============================================================================

section "Prerequisites"

# Docker
if command -v docker &> /dev/null; then
    local docker_version=$(docker --version 2>/dev/null | head -1)
    check_pass "Docker installed ($docker_version)"

    if docker info &>/dev/null; then
        check_pass "Docker daemon running"

        # Check MCP Toolkit
        if docker mcp --help &>/dev/null; then
            check_pass "Docker MCP Toolkit enabled"
        else
            check_warn "Docker MCP Toolkit not enabled"
            check_info "Enable in Docker Desktop: Settings > Beta features > MCP Toolkit"
        fi
    else
        check_warn "Docker daemon not running"
    fi
else
    check_fail "Docker not installed"
    check_info "Download: https://www.docker.com/products/docker-desktop/"
fi

# Claude Code
if command -v claude &> /dev/null; then
    local claude_version=$(claude --version 2>/dev/null | head -1 || echo "unknown")
    check_pass "Claude Code CLI installed ($claude_version)"
else
    check_fail "Claude Code CLI not installed"
    check_info "Download: https://claude.ai/download"
fi

# Node.js
if command -v node &> /dev/null; then
    local node_version=$(node --version 2>/dev/null)
    check_pass "Node.js installed ($node_version)"
else
    check_warn "Node.js not installed (GUI dashboard requires it)"
    check_info "Download: https://nodejs.org/"
fi

# Git
if command -v git &> /dev/null; then
    local git_version=$(git --version 2>/dev/null)
    check_pass "Git installed ($git_version)"
else
    check_warn "Git not installed"
fi

# ============================================================================
# Check MCP Configuration
# ============================================================================

section "MCP Configuration"

if [ -f ".mcp.json" ]; then
    check_pass ".mcp.json exists"

    if grep -q "MCP_DOCKER" .mcp.json 2>/dev/null; then
        check_pass "Docker MCP Gateway configured"
    else
        check_warn "Docker MCP Gateway not configured in .mcp.json"
    fi
else
    check_info "No .mcp.json in current directory"
fi

# Check Docker MCP servers
if command -v docker &> /dev/null && docker info &>/dev/null && docker mcp --help &>/dev/null; then
    local server_count=$(docker mcp server ls 2>/dev/null | tail -n +2 | wc -l)
    if [ "$server_count" -gt 0 ]; then
        check_pass "MCP servers enabled ($server_count servers)"
        if [ "$VERBOSE" = true ]; then
            docker mcp server ls 2>/dev/null | tail -n +2 | while read -r line; do
                check_info "$line"
            done
        fi
    else
        check_warn "No MCP servers enabled"
    fi
fi

# ============================================================================
# Summary
# ============================================================================

section "Summary"

echo ""
echo -e "  ${GREEN}Passed:${RESET}   $PASSED"
echo -e "  ${RED}Failed:${RESET}   $FAILED"
echo -e "  ${YELLOW}Warnings:${RESET} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}${BOLD}All critical checks passed!${RESET}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${DIM}Review warnings above for optimal setup.${RESET}"
    fi
else
    echo -e "${RED}${BOLD}Some critical issues found.${RESET}"
    echo -e "${DIM}Fix the failed checks above to ensure proper operation.${RESET}"
fi

echo ""

# ============================================================================
# Quick Fix Suggestions
# ============================================================================

if [ $FAILED -gt 0 ] || [ $WARNINGS -gt 0 ]; then
    section "Quick Fixes"

    if [ -z "$BASE_FOUND" ]; then
        echo -e "  ${CYAN}Install BASE:${RESET}"
        echo -e "    git clone https://github.com/daverjorge46/yoyo-dev-ai.git ~/.yoyo-dev"
        echo -e "    ~/.yoyo-dev/setup/install-global-command.sh"
        echo ""
    fi

    if [ ! -d ".yoyo-dev" ] && [ -n "$BASE_FOUND" ]; then
        echo -e "  ${CYAN}Initialize PROJECT:${RESET}"
        echo -e "    yoyo-init --claude-code"
        echo ""
    fi

    if [ -d ".yoyo-dev" ] && [ ! -f ".claude/settings.json" ]; then
        echo -e "  ${CYAN}Regenerate settings:${RESET}"
        echo -e "    yoyo-update --regenerate-claude"
        echo ""
    fi
fi

exit $FAILED
