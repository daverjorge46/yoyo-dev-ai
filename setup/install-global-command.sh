#!/bin/bash

# Yoyo Dev v3.0 - Global Command Installation
# Installs the 'yoyo' command globally so it can be run from any project

set -euo pipefail

# Color codes
readonly CYAN='\033[0;36m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BOLD='\033[1m'
readonly RESET='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}Yoyo Dev v3.0 - Global Command Installation${RESET}"
echo ""

# Determine script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GLOBAL_LAUNCHER="$SCRIPT_DIR/yoyo-global-launcher.sh"

# Check if launcher exists
if [ ! -f "$GLOBAL_LAUNCHER" ]; then
    echo -e "${RED}ERROR: Global launcher not found${RESET}"
    echo ""
    echo "Expected: $GLOBAL_LAUNCHER"
    echo ""
    exit 1
fi

# Make launcher executable
chmod +x "$GLOBAL_LAUNCHER"

# Determine installation location
INSTALL_PATH=""

if [ -w "/usr/local/bin" ]; then
    # User has write access to /usr/local/bin
    INSTALL_PATH="/usr/local/bin/yoyo"
elif [ -d "$HOME/bin" ]; then
    # Use ~/bin if it exists
    INSTALL_PATH="$HOME/bin/yoyo"
elif [ -d "$HOME/.local/bin" ]; then
    # Use ~/.local/bin if it exists
    INSTALL_PATH="$HOME/.local/bin/yoyo"
else
    # Create ~/bin
    mkdir -p "$HOME/bin"
    INSTALL_PATH="$HOME/bin/yoyo"
fi

echo -e "Installing ${CYAN}yoyo${RESET} command to: ${BOLD}$INSTALL_PATH${RESET}"
echo ""

# Remove old symlink if it exists
if [ -L "$INSTALL_PATH" ]; then
    rm "$INSTALL_PATH"
fi

# Create symlink
if ln -s "$GLOBAL_LAUNCHER" "$INSTALL_PATH" 2>/dev/null; then
    echo -e "${GREEN}✅ Installation successful${RESET}"
    echo ""
    echo -e "The ${CYAN}yoyo${RESET} command is now available globally."
    echo ""

    # Check if in PATH
    if [[ ":$PATH:" == *":$HOME/bin:"* ]] || [[ ":$PATH:" == *":$HOME/.local/bin:"* ]] || [[ ":$PATH:" == *":/usr/local/bin:"* ]]; then
        echo -e "${GREEN}✅ Installation directory is in your PATH${RESET}"
        echo ""
        echo "You can now run: ${CYAN}yoyo${RESET}"
    else
        echo -e "${YELLOW}⚠️  Installation directory may not be in your PATH${RESET}"
        echo ""
        echo "Add this to your ~/.bashrc or ~/.zshrc:"
        echo -e "  ${CYAN}export PATH=\"\$HOME/bin:\$PATH\"${RESET}"
        echo ""
        echo "Then reload your shell:"
        echo -e "  ${CYAN}source ~/.bashrc${RESET}  # or source ~/.zshrc"
        echo ""
    fi
else
    # Need sudo
    echo -e "${YELLOW}⚠️  Need elevated permissions for /usr/local/bin${RESET}"
    echo ""
    echo "Running with sudo..."
    echo ""

    if sudo ln -s "$GLOBAL_LAUNCHER" "$INSTALL_PATH"; then
        echo ""
        echo -e "${GREEN}✅ Installation successful${RESET}"
        echo ""
        echo -e "The ${CYAN}yoyo${RESET} command is now available globally."
        echo ""
    else
        echo ""
        echo -e "${RED}ERROR: Installation failed${RESET}"
        echo ""
        echo "Please try manually:"
        echo -e "  ${CYAN}sudo ln -s $GLOBAL_LAUNCHER /usr/local/bin/yoyo${RESET}"
        echo ""
        exit 1
    fi
fi

# Test installation
echo "Testing installation..."
echo ""

if command -v yoyo &> /dev/null; then
    yoyo --version
    echo ""
    echo -e "${GREEN}✅ Command test successful${RESET}"
    echo ""
else
    echo -e "${YELLOW}⚠️  'yoyo' command not found in PATH${RESET}"
    echo ""
    echo "You may need to restart your terminal or reload your shell."
    echo ""
fi

echo "────────────────────────────────────────────────────────────────"
echo ""
echo -e "${BOLD}Usage:${RESET}"
echo -e "  ${GREEN}yoyo${RESET}              Launch TUI dashboard (from any project)"
echo -e "  ${GREEN}yoyo --help${RESET}       Show command reference"
echo -e "  ${GREEN}yoyo --version${RESET}    Show version"
echo ""
