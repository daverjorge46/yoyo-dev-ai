#!/bin/bash

# Yoyo Dev - Fix Global Command Symlinks
# This script fixes the broken symlinks in /usr/local/bin/
# that point to non-existent paths.

set -euo pipefail

# Color codes
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly RESET='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}🔧 Fixing Yoyo Dev Global Command Symlinks${RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Determine base installation directory
# Check in order: standard location, environment variable, legacy location
if [ -d "$HOME/.yoyo-dev-base" ]; then
    BASE_DIR="$HOME/.yoyo-dev-base"
elif [ -n "$YOYO_BASE_DIR" ] && [ -d "$YOYO_BASE_DIR" ]; then
    BASE_DIR="$YOYO_BASE_DIR"
elif [ -d "$HOME/yoyo-dev" ]; then
    BASE_DIR="$HOME/yoyo-dev"
else
    echo -e "${RED}ERROR: Base installation not found${RESET}"
    echo ""
    echo "Checked locations:"
    echo "  - $HOME/.yoyo-dev-base (standard)"
    echo "  - \$YOYO_BASE_DIR environment variable"
    echo "  - $HOME/yoyo-dev (legacy)"
    echo ""
    echo "Please install Yoyo Dev first or set YOYO_BASE_DIR."
    exit 1
fi

# Check required scripts exist
for script in yoyo.sh yoyo-cli.sh yoyo-update.sh; do
    if [ ! -f "$BASE_DIR/setup/$script" ]; then
        echo -e "${YELLOW}WARNING: $script not found at $BASE_DIR/setup/$script${RESET}"
    fi
done

echo -e "${CYAN}📍 Base installation:${RESET} $BASE_DIR"
echo ""

# Check current symlink state
echo -e "${BOLD}Current Symlink State:${RESET}"
echo ""

if [ -L "/usr/local/bin/yoyo" ]; then
    CURRENT_YOYO_TARGET=$(readlink -f /usr/local/bin/yoyo 2>/dev/null || echo "broken")
    CURRENT_YOYO_LINK=$(readlink /usr/local/bin/yoyo)
    echo -e "  ${YELLOW}yoyo:${RESET}"
    echo -e "    Link: $CURRENT_YOYO_LINK"
    if [ -f "$CURRENT_YOYO_TARGET" ]; then
        echo -e "    Status: ${GREEN}✓ Valid${RESET}"
    else
        echo -e "    Status: ${RED}✗ Broken (target doesn't exist)${RESET}"
    fi
elif [ -f "/usr/local/bin/yoyo" ]; then
    echo -e "  ${YELLOW}yoyo:${RESET} Regular file (not a symlink)"
else
    echo -e "  ${YELLOW}yoyo:${RESET} ${RED}Not found${RESET}"
fi

echo ""

if [ -L "/usr/local/bin/yoyo-update" ]; then
    CURRENT_UPDATE_TARGET=$(readlink -f /usr/local/bin/yoyo-update 2>/dev/null || echo "broken")
    CURRENT_UPDATE_LINK=$(readlink /usr/local/bin/yoyo-update)
    echo -e "  ${YELLOW}yoyo-update:${RESET}"
    echo -e "    Link: $CURRENT_UPDATE_LINK"
    if [ -f "$CURRENT_UPDATE_TARGET" ]; then
        echo -e "    Status: ${GREEN}✓ Valid${RESET}"
    else
        echo -e "    Status: ${RED}✗ Broken (target doesn't exist)${RESET}"
    fi
elif [ -f "/usr/local/bin/yoyo-update" ]; then
    echo -e "  ${YELLOW}yoyo-update:${RESET} Regular file (not a symlink)"
else
    echo -e "  ${YELLOW}yoyo-update:${RESET} ${RED}Not found${RESET}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Ask for confirmation
echo -e "${BOLD}This will:${RESET}"
echo "  1. Fix /usr/local/bin/yoyo → $BASE_DIR/setup/yoyo.sh"
echo "  2. Fix /usr/local/bin/yoyo-cli → $BASE_DIR/setup/yoyo-cli.sh"
echo "  3. Fix /usr/local/bin/yoyo-update → $BASE_DIR/setup/yoyo-update.sh"
echo ""
read -p "Continue? [Y/n] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ -n $REPLY ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""

# Function to fix a symlink
fix_symlink() {
    local cmd="$1"
    local script="$2"
    local script_path="$BASE_DIR/setup/$script"

    echo -e "${CYAN}→${RESET} Fixing $cmd command..."

    if [ ! -f "$script_path" ]; then
        echo -e "  ${YELLOW}⚠${RESET}  Script not found: $script_path (skipping)"
        return 1
    fi

    if sudo ln -sf "$script_path" "/usr/local/bin/$cmd"; then
        echo -e "  ${GREEN}✓${RESET} Symlink created: /usr/local/bin/$cmd → $script_path"
    else
        echo -e "  ${RED}✗${RESET} Failed to create symlink (sudo required)"
        return 1
    fi

    if sudo chmod +x "$script_path"; then
        echo -e "  ${GREEN}✓${RESET} Made executable: $script_path"
    else
        echo -e "  ${YELLOW}⚠${RESET}  Could not set executable permission"
    fi

    echo ""
    return 0
}

# Fix all symlinks
fix_symlink "yoyo" "yoyo.sh"
fix_symlink "yoyo-cli" "yoyo-cli.sh"
fix_symlink "yoyo-update" "yoyo-update.sh"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify fix
echo -e "${BOLD}Verification:${RESET}"
echo ""

verify_symlink() {
    local cmd="$1"
    local target
    if [ -L "/usr/local/bin/$cmd" ]; then
        target=$(readlink -f "/usr/local/bin/$cmd" 2>/dev/null || echo "broken")
        if [ -f "$target" ]; then
            echo -e "  ${GREEN}✓${RESET} $cmd command: $target"
            return 0
        fi
    fi
    echo -e "  ${YELLOW}⚠${RESET} $cmd command: Not available or broken"
    return 1
}

verify_symlink "yoyo"
verify_symlink "yoyo-cli"
verify_symlink "yoyo-update"

echo ""
echo -e "${GREEN}${BOLD}✅ Global commands fixed successfully!${RESET}"
echo ""
echo -e "${CYAN}Test the fix:${RESET}"
echo "  $ yoyo --version"
echo "  $ yoyo-cli --help"
echo "  $ yoyo --help"
echo ""
