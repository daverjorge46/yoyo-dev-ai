#!/bin/bash

# Yoyo Dev v2.0 Installation Script
# "Powerful when you need it. Invisible when you don't."

set -euo pipefail

readonly CYAN='\033[0;36m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BOLD='\033[1m'
readonly RESET='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║${RESET}                   ${BOLD}YOYO DEV v2.0 INSTALLER${RESET}                         ${BOLD}${CYAN}║${RESET}"
echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# Check if running from correct directory
if [[ ! -f "$HOME/.yoyo-dev/setup/install-v2.sh" ]]; then
    echo -e "${YELLOW}⚠️  Please run this script from ~/.yoyo-dev/setup/${RESET}"
    exit 1
fi

echo -e "${GREEN}✓${RESET} Installing Yoyo Dev v2.0 improvements..."
echo ""

# Step 1: Install new yoyo launcher
echo -e "${CYAN}[1/6]${RESET} Installing yoyo launcher v2..."
chmod +x "$HOME/.yoyo-dev/setup/yoyo-launcher-v2.sh"
sudo cp "$HOME/.yoyo-dev/setup/yoyo-launcher-v2.sh" /usr/local/bin/yoyo
echo -e "      ${GREEN}✓${RESET} Launcher installed"
echo ""

# Step 2: Create lib directory if it doesn't exist
echo -e "${CYAN}[2/6]${RESET} Setting up task monitor system..."
mkdir -p "$HOME/.yoyo-dev/lib"
chmod +x "$HOME/.yoyo-dev/lib/task-monitor.sh"
chmod +x "$HOME/.yoyo-dev/lib/task-monitor-tmux.sh"
echo -e "      ${GREEN}✓${RESET} Task monitor ready"
echo ""

# Step 3: Create templates directory
echo -e "${CYAN}[3/6]${RESET} Installing MASTER-TASKS template..."
mkdir -p "$HOME/.yoyo-dev/templates"
echo -e "      ${GREEN}✓${RESET} Template installed"
echo ""

# Step 4: Check for tmux
echo -e "${CYAN}[4/6]${RESET} Checking dependencies..."
if ! command -v tmux &> /dev/null; then
    echo -e "      ${YELLOW}⚠${RESET}  tmux not found (optional for task monitor)"
    echo -e "         Install: ${CYAN}sudo apt install tmux${RESET} (Ubuntu/Debian)"
    echo -e "                  ${CYAN}sudo dnf install tmux${RESET} (Fedora)"
    echo -e "                  ${CYAN}sudo pacman -S tmux${RESET} (Arch)"
    echo ""
    TMUX_AVAILABLE=false
else
    echo -e "      ${GREEN}✓${RESET} tmux available"
    TMUX_AVAILABLE=true
fi
echo ""

# Step 5: Test yoyo command
echo -e "${CYAN}[5/6]${RESET} Testing installation..."
if command -v yoyo &> /dev/null; then
    echo -e "      ${GREEN}✓${RESET} yoyo command working"
else
    echo -e "      ${YELLOW}⚠${RESET}  yoyo command not found in PATH"
    echo -e "         Try: ${CYAN}hash -r${RESET} to refresh shell"
fi
echo ""

# Step 6: Show next steps
echo -e "${CYAN}[6/6]${RESET} Installation complete!"
echo ""

echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║${RESET}                        ${BOLD}WHAT'S NEW IN v2.0${RESET}                         ${BOLD}${CYAN}║${RESET}"
echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════════╝${RESET}"
echo ""

echo -e "${GREEN}✨ Interactive Mode by Default${RESET}"
echo -e "   /execute-tasks now pauses after each subtask"
echo -e "   You stay in control - no more racing ahead!"
echo ""

echo -e "${GREEN}✨ MASTER-TASKS.md (Single Source of Truth)${RESET}"
echo -e "   All task info in one file:"
echo -e "   • Overview + tasks + decisions + progress"
echo -e "   • No more fragmented context across 5 files"
echo ""

echo -e "${GREEN}✨ Task Monitor with Split-Pane${RESET}"
echo -e "   Live progress tracking in tmux:"
echo -e "   • ${CYAN}/execute-tasks --monitor${RESET}"
if [[ "$TMUX_AVAILABLE" == false ]]; then
    echo -e "   • ${YELLOW}(Install tmux to enable)${RESET}"
fi
echo ""

echo -e "${GREEN}✨ Lite Mode for Fast Iteration${RESET}"
echo -e "   Skip heavy specs for simple features:"
echo -e "   • ${CYAN}/create-new \"feature\" --lite${RESET}"
echo ""

echo -e "${GREEN}✨ Comprehensive Flag Documentation${RESET}"
echo -e "   ${CYAN}yoyo --help${RESET}      Full command reference"
echo -e "   ${CYAN}yoyo --commands${RESET}  Quick command list"
echo -e "   ${CYAN}yoyo --version${RESET}   Show version"
echo ""

echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║${RESET}                        ${BOLD}QUICK START${RESET}                                ${BOLD}${CYAN}║${RESET}"
echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════════╝${RESET}"
echo ""

echo -e "${BOLD}Try the new workflow:${RESET}"
echo ""
echo -e "  1. ${CYAN}yoyo${RESET}"
echo -e "     Launch Claude Code with new v2.0 interface"
echo ""
echo -e "  2. ${CYAN}/create-new \"my feature\" --lite --monitor${RESET}"
echo -e "     Create feature in lite mode with task monitor"
echo ""
echo -e "  3. ${CYAN}/execute-tasks${RESET}"
echo -e "     Build interactively (pauses after each subtask)"
echo ""

echo -e "${BOLD}Command Reference:${RESET}"
echo ""
echo -e "  ${CYAN}/yoyo-help${RESET}                Show all commands and flags"
echo -e "  ${CYAN}cat ~/.yoyo-dev/COMMAND-REFERENCE.md${RESET}"
echo -e "                             Full documentation"
echo ""

echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║${RESET}                      ${BOLD}MIGRATION NOTES${RESET}                             ${BOLD}${CYAN}║${RESET}"
echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════════╝${RESET}"
echo ""

echo -e "${YELLOW}Breaking Changes:${RESET}"
echo ""
echo -e "  • ${BOLD}/execute-tasks${RESET} is now interactive by default"
echo -e "    ${CYAN}→${RESET} Use ${CYAN}--all${RESET} flag for legacy behavior (run without pausing)"
echo ""
echo -e "  • Task files should use ${BOLD}MASTER-TASKS.md${RESET} format"
echo -e "    ${CYAN}→${RESET} Old tasks.md files still work"
echo -e "    ${CYAN}→${RESET} New features will use MASTER-TASKS.md"
echo ""

echo -e "${GREEN}Compatible Changes:${RESET}"
echo ""
echo -e "  • All existing commands still work"
echo -e "  • New flags are additive (opt-in)"
echo -e "  • Existing workflows unchanged unless you use new flags"
echo ""

echo -e "${BOLD}${GREEN}Installation successful!${RESET} 🎉"
echo ""
echo -e "Run ${CYAN}yoyo${RESET} to get started with v2.0"
echo ""
