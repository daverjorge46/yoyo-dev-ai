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
BASE_DIR="$HOME/yoyo-dev"

# Check if base installation exists
if [ ! -d "$BASE_DIR" ]; then
    echo -e "${RED}ERROR: Base installation not found at $BASE_DIR${RESET}"
    echo ""
    echo "Please ensure Yoyo Dev is installed in your home directory."
    exit 1
fi

# Check if yoyo.sh exists
if [ ! -f "$BASE_DIR/setup/yoyo.sh" ]; then
    echo -e "${RED}ERROR: yoyo.sh not found at $BASE_DIR/setup/yoyo.sh${RESET}"
    echo ""
    exit 1
fi

# Check if yoyo-update.sh exists
if [ ! -f "$BASE_DIR/setup/yoyo-update.sh" ]; then
    echo -e "${RED}ERROR: yoyo-update.sh not found at $BASE_DIR/setup/yoyo-update.sh${RESET}"
    echo ""
    exit 1
fi

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
echo "  2. Fix /usr/local/bin/yoyo-update → $BASE_DIR/setup/yoyo-update.sh"
echo ""
read -p "Continue? [Y/n] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ -n $REPLY ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""

# Fix yoyo symlink
echo -e "${CYAN}→${RESET} Fixing yoyo command..."
if sudo ln -sf "$BASE_DIR/setup/yoyo.sh" /usr/local/bin/yoyo; then
    echo -e "  ${GREEN}✓${RESET} Symlink created: /usr/local/bin/yoyo → $BASE_DIR/setup/yoyo.sh"
else
    echo -e "  ${RED}✗${RESET} Failed to create symlink (sudo required)"
    exit 1
fi

# Ensure yoyo.sh is executable
if sudo chmod +x "$BASE_DIR/setup/yoyo.sh"; then
    echo -e "  ${GREEN}✓${RESET} Made executable: $BASE_DIR/setup/yoyo.sh"
else
    echo -e "  ${YELLOW}⚠${RESET}  Could not set executable permission"
fi

echo ""

# Fix yoyo-update symlink
echo -e "${CYAN}→${RESET} Fixing yoyo-update command..."
if sudo ln -sf "$BASE_DIR/setup/yoyo-update.sh" /usr/local/bin/yoyo-update; then
    echo -e "  ${GREEN}✓${RESET} Symlink created: /usr/local/bin/yoyo-update → $BASE_DIR/setup/yoyo-update.sh"
else
    echo -e "  ${RED}✗${RESET} Failed to create symlink (sudo required)"
    exit 1
fi

# Ensure yoyo-update.sh is executable
if sudo chmod +x "$BASE_DIR/setup/yoyo-update.sh"; then
    echo -e "  ${GREEN}✓${RESET} Made executable: $BASE_DIR/setup/yoyo-update.sh"
else
    echo -e "  ${YELLOW}⚠${RESET}  Could not set executable permission"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify fix
echo -e "${BOLD}Verification:${RESET}"
echo ""

YOYO_TARGET=$(readlink -f /usr/local/bin/yoyo)
if [ -f "$YOYO_TARGET" ]; then
    echo -e "  ${GREEN}✓${RESET} yoyo command: $YOYO_TARGET"
else
    echo -e "  ${RED}✗${RESET} yoyo command: Still broken"
    exit 1
fi

UPDATE_TARGET=$(readlink -f /usr/local/bin/yoyo-update)
if [ -f "$UPDATE_TARGET" ]; then
    echo -e "  ${GREEN}✓${RESET} yoyo-update command: $UPDATE_TARGET"
else
    echo -e "  ${RED}✗${RESET} yoyo-update command: Still broken"
    exit 1
fi

echo ""
echo -e "${GREEN}${BOLD}✅ Global commands fixed successfully!${RESET}"
echo ""
echo -e "${CYAN}Test the fix:${RESET}"
echo "  $ yoyo --version"
echo "  $ yoyo --help"
echo ""
