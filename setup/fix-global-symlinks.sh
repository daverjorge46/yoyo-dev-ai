#!/bin/bash

# Yoyo Dev v7.0 - Fix Global Command Symlinks
# Detects install directory and recreates all V7 command symlinks.

set -euo pipefail

readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly DIM='\033[2m'
readonly RESET='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}Yoyo Dev v7.0 - Fix Global Command Symlinks${RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Determine BASE installation
if [ -d "$HOME/.yoyo-dev-base" ]; then
    BASE_DIR="$HOME/.yoyo-dev-base"
elif [ -n "${YOYO_BASE_DIR:-}" ] && [ -d "${YOYO_BASE_DIR}" ]; then
    BASE_DIR="$YOYO_BASE_DIR"
else
    echo -e "${RED}ERROR: Base installation not found at ~/.yoyo-dev-base${RESET}"
    echo "Please install Yoyo Dev first."
    exit 1
fi

echo -e "${CYAN}BASE:${RESET} $BASE_DIR"

# Detect install directory (where existing symlinks live)
INSTALL_DIR=""
for dir in "$HOME/.local/bin" "/usr/local/bin" "$HOME/bin"; do
    if [ -L "$dir/yoyo-update" ] || [ -L "$dir/yoyo" ] || [ -L "$dir/yoyo-dev" ]; then
        INSTALL_DIR="$dir"
        break
    fi
done

# Fallback: use same logic as install-global-command.sh
if [ -z "$INSTALL_DIR" ]; then
    if [ -w "/usr/local/bin" ]; then
        INSTALL_DIR="/usr/local/bin"
    elif [ -d "$HOME/.local/bin" ]; then
        INSTALL_DIR="$HOME/.local/bin"
    else
        mkdir -p "$HOME/.local/bin"
        INSTALL_DIR="$HOME/.local/bin"
    fi
fi

NEED_SUDO=false
if [ "$INSTALL_DIR" = "/usr/local/bin" ] && [ ! -w "/usr/local/bin" ]; then
    NEED_SUDO=true
fi

echo -e "${CYAN}Install dir:${RESET} $INSTALL_DIR"
echo ""

# V7 commands (main)
declare -A COMMANDS=(
    ["yoyo-dev"]="yoyo.sh"
    ["yoyo-ai"]="yoyo-ai.sh"
    ["yoyo-cli"]="yoyo-cli.sh"
    ["yoyo-init"]="init.sh"
    ["yoyo-update"]="yoyo-update.sh"
    ["yoyo-gui"]="yoyo-gui.sh"
    ["yoyo-doctor"]="yoyo-doctor.sh"
)

# Legacy (deprecated)
declare -A LEGACY=(
    ["yoyo"]="yoyo-compat.sh"
)

FIXED=0
SKIPPED=0
FAILED=0

fix_symlink() {
    local cmd="$1"
    local script="$2"
    local target="$BASE_DIR/setup/$script"
    local link="$INSTALL_DIR/$cmd"

    if [ ! -f "$target" ]; then
        echo -e "  ${YELLOW}SKIP${RESET} $cmd ($script not found)"
        SKIPPED=$((SKIPPED + 1))
        return
    fi

    chmod +x "$target" 2>/dev/null || true

    # Check if already correct
    if [ -L "$link" ] && [ "$(readlink "$link")" = "$target" ] && [ -e "$link" ]; then
        echo -e "  ${GREEN}OK${RESET}   $cmd (already correct)"
        return
    fi

    # Create/fix symlink
    if [ "$NEED_SUDO" = true ]; then
        sudo ln -sf "$target" "$link"
    else
        ln -sf "$target" "$link"
    fi

    if [ -L "$link" ] && [ -e "$link" ]; then
        echo -e "  ${GREEN}FIXED${RESET} $cmd -> $target"
        FIXED=$((FIXED + 1))
    else
        echo -e "  ${RED}FAIL${RESET} $cmd"
        FAILED=$((FAILED + 1))
    fi
}

echo -e "${BOLD}Main Commands:${RESET}"
for cmd in yoyo-dev yoyo-ai yoyo-cli yoyo-init yoyo-update yoyo-gui yoyo-doctor; do
    fix_symlink "$cmd" "${COMMANDS[$cmd]}"
done

echo ""
echo -e "${BOLD}Legacy (deprecated):${RESET}"
for cmd in yoyo; do
    fix_symlink "$cmd" "${LEGACY[$cmd]}"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}Done.${RESET} Fixed: $FIXED, Skipped: $SKIPPED"
else
    echo -e "${RED}Done with errors.${RESET} Fixed: $FIXED, Failed: $FAILED"
fi

# PATH check
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo ""
    echo -e "${YELLOW}Add to your shell profile:${RESET}"
    echo -e "  export PATH=\"$INSTALL_DIR:\$PATH\""
fi

echo ""
