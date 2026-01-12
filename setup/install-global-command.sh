#!/bin/bash

# Yoyo Dev v6.2 - Global Command Installation
# Installs all Yoyo Dev commands globally:
#   - yoyo         : Launch Claude Code + Browser GUI
#   - yoyo-init    : Initialize Yoyo Dev in a project
#   - yoyo-update  : Update Yoyo Dev installation
#   - yoyo-gui     : Browser-based GUI dashboard
#   - yoyo-doctor  : Diagnose installation issues

set -euo pipefail

# Color codes
readonly CYAN='\033[0;36m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BOLD='\033[1m'
readonly DIM='\033[2m'
readonly RESET='\033[0m'

# Version
readonly VERSION="6.2.0"

echo ""
echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║${RESET}          ${BOLD}YOYO DEV v${VERSION} - Global Command Installation${RESET}         ${BOLD}${CYAN}║${RESET}"
echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# Determine script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define commands to install
declare -A COMMANDS=(
    ["yoyo"]="yoyo.sh"
    ["yoyo-cli"]="yoyo-cli.sh"
    ["yoyo-init"]="init.sh"
    ["yoyo-update"]="yoyo-update.sh"
    ["yoyo-gui"]="yoyo-gui.sh"
    ["yoyo-doctor"]="yoyo-doctor.sh"
)

# Legacy alias (kept for backwards compatibility)
declare -A LEGACY_COMMANDS=(
    ["yoyo-install"]="init.sh"
)

# Determine installation directory
INSTALL_DIR=""
NEED_SUDO=false

if [ -w "/usr/local/bin" ]; then
    INSTALL_DIR="/usr/local/bin"
elif [ -d "$HOME/.local/bin" ]; then
    INSTALL_DIR="$HOME/.local/bin"
elif [ -d "$HOME/bin" ]; then
    INSTALL_DIR="$HOME/bin"
else
    # Create ~/.local/bin (XDG standard)
    mkdir -p "$HOME/.local/bin"
    INSTALL_DIR="$HOME/.local/bin"
fi

# Check if we need sudo for /usr/local/bin
if [ "$INSTALL_DIR" = "/usr/local/bin" ] && [ ! -w "/usr/local/bin" ]; then
    NEED_SUDO=true
fi

echo -e "${BOLD}Installation Directory:${RESET} $INSTALL_DIR"
echo ""

# Track installation status
INSTALLED_COUNT=0
FAILED_COUNT=0

# Function to install a command
install_command() {
    local cmd="$1"
    local launcher="$2"
    local launcher_path="$SCRIPT_DIR/$launcher"
    local install_path="$INSTALL_DIR/$cmd"

    echo -ne "  Installing ${CYAN}$cmd${RESET}... "

    # Check if launcher exists
    if [ ! -f "$launcher_path" ]; then
        echo -e "${YELLOW}SKIP${RESET} (script not found)"
        return 1
    fi

    # Make launcher executable
    chmod +x "$launcher_path"

    # Remove old symlink if it exists
    if [ -L "$install_path" ] || [ -f "$install_path" ]; then
        if [ "$NEED_SUDO" = true ]; then
            sudo rm -f "$install_path" 2>/dev/null || true
        else
            rm -f "$install_path" 2>/dev/null || true
        fi
    fi

    # Create symlink
    if [ "$NEED_SUDO" = true ]; then
        if sudo ln -sf "$launcher_path" "$install_path" 2>/dev/null; then
            echo -e "${GREEN}OK${RESET}"
            return 0
        else
            echo -e "${RED}FAILED${RESET} (sudo required)"
            return 1
        fi
    else
        if ln -sf "$launcher_path" "$install_path" 2>/dev/null; then
            echo -e "${GREEN}OK${RESET}"
            return 0
        else
            echo -e "${RED}FAILED${RESET}"
            return 1
        fi
    fi
}

# Install main commands
echo -e "${BOLD}Main Commands:${RESET}"
for cmd in "${!COMMANDS[@]}"; do
    launcher="${COMMANDS[$cmd]}"
    if install_command "$cmd" "$launcher"; then
        INSTALLED_COUNT=$((INSTALLED_COUNT + 1))
    else
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
done

# Install legacy aliases
echo ""
echo -e "${BOLD}Legacy Aliases (backwards compatibility):${RESET}"
for cmd in "${!LEGACY_COMMANDS[@]}"; do
    launcher="${LEGACY_COMMANDS[$cmd]}"
    if install_command "$cmd" "$launcher"; then
        INSTALLED_COUNT=$((INSTALLED_COUNT + 1))
    fi
done

echo ""

# Check PATH
IN_PATH=false
if [[ ":$PATH:" == *":$INSTALL_DIR:"* ]]; then
    IN_PATH=true
fi

# Summary
echo "────────────────────────────────────────────────────────────────"
echo ""

if [ $INSTALLED_COUNT -eq ${#COMMANDS[@]} ]; then
    echo -e "${GREEN}✅ All commands installed successfully${RESET}"
    echo ""
elif [ $INSTALLED_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $INSTALLED_COUNT of ${#COMMANDS[@]} commands installed${RESET}"
    echo ""
else
    echo -e "${RED}❌ Installation failed${RESET}"
    echo ""
    echo "Please try manually with sudo:"
    for cmd in "${!COMMANDS[@]}"; do
        launcher="${COMMANDS[$cmd]}"
        echo -e "  ${CYAN}sudo ln -sf $SCRIPT_DIR/$launcher /usr/local/bin/$cmd${RESET}"
    done
    echo ""
    exit 1
fi

# PATH warning
if [ "$IN_PATH" = false ]; then
    echo -e "${YELLOW}⚠️  $INSTALL_DIR may not be in your PATH${RESET}"
    echo ""
    echo "Add this to your ~/.bashrc or ~/.zshrc:"
    echo -e "  ${CYAN}export PATH=\"$INSTALL_DIR:\$PATH\"${RESET}"
    echo ""
    echo "Then reload your shell:"
    echo -e "  ${CYAN}source ~/.bashrc${RESET}  # or source ~/.zshrc"
    echo ""
fi

# Test commands
echo -e "${BOLD}Testing commands:${RESET}"
echo ""

for cmd in yoyo yoyo-cli yoyo-init yoyo-update yoyo-gui yoyo-doctor; do
    if command -v $cmd &> /dev/null; then
        echo -e "  ${GREEN}✓${RESET} ${CYAN}$cmd${RESET} is available"
    else
        echo -e "  ${YELLOW}?${RESET} ${CYAN}$cmd${RESET} not in PATH (restart terminal)"
    fi
done

echo ""
echo "────────────────────────────────────────────────────────────────"
echo ""
echo -e "${BOLD}Available Commands:${RESET}"
echo ""
echo -e "  ${GREEN}yoyo${RESET}              Launch Wave Terminal with yoyo-dev-ai"
echo -e "  ${GREEN}yoyo --no-wave${RESET}    Launch Claude Code without Wave Terminal"
echo -e "  ${GREEN}yoyo --help${RESET}       Show command reference"
echo ""
echo -e "  ${GREEN}yoyo-cli${RESET}          Launch Claude Code in CLI mode (for Wave widget)"
echo ""
echo -e "  ${GREEN}yoyo-init${RESET}         Initialize Yoyo Dev in current project"
echo -e "  ${GREEN}yoyo-init --install-base${RESET}   Install BASE first, then init"
echo ""
echo -e "  ${GREEN}yoyo-update${RESET}       Update Yoyo Dev in current project"
echo ""
echo -e "  ${GREEN}yoyo-gui${RESET}          Launch browser-based GUI standalone"
echo -e "  ${GREEN}yoyo-gui --dev${RESET}    Development mode with hot reload"
echo ""
echo -e "  ${GREEN}yoyo-doctor${RESET}       Diagnose installation issues"
echo ""
echo -e "${DIM}BASE Installation:${RESET} ~/.yoyo-dev-base"
echo -e "${DIM}Project Installation:${RESET} .yoyo-dev/"
echo ""
echo -e "${DIM}Yoyo Dev v${VERSION} - \"Your AI learns. Your AI remembers. Your AI evolves.\"${RESET}"
echo ""
