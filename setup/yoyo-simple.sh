#!/bin/bash

# Yoyo Dev Simple Launcher (No tmux/split - just Claude Code)
# "Powerful when you need it. Invisible when you don't."

set -euo pipefail

# Color codes
readonly CYAN='\033[0;36m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly BOLD='\033[1m'
readonly DIM='\033[2m'
readonly RESET='\033[0m'

VERSION="2.2.0"

# Check if we're in a Yoyo Dev project
if [ ! -d "./yoyo-dev" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Yoyo Dev not detected in this directory${RESET}"
    echo ""
    echo "Would you like to:"
    echo "  1. Install Yoyo Dev in this project"
    echo "  2. Launch Claude Code anyway"
    echo "  3. Exit"
    echo ""
    read -p "Choice (1/2/3): " choice

    case $choice in
        1)
            echo ""
            echo "Installing Yoyo Dev..."
            ~/.yoyo-dev/setup/project.sh --claude-code
            exit 0
            ;;
        2)
            echo ""
            echo "Launching Claude Code..."
            exec claude
            ;;
        *)
            echo "Exiting..."
            exit 0
            ;;
    esac
fi

# Get project info
project_name=$(basename "$(pwd)")
project_path=$(pwd)

# Extract mission and tech stack
mission=""
tech_stack=""

if [ -f "./yoyo-dev/product/mission-lite.md" ]; then
    mission=$(sed -n '/^## Mission/,/^##/p' ./yoyo-dev/product/mission-lite.md 2>/dev/null | sed '1d;$d' | head -n 1 | sed 's/^[[:space:]]*//' || true)
fi

if [ -z "$tech_stack" ] && [ -f "./yoyo-dev/product/tech-stack.md" ]; then
    frontend=$(grep -iE "^-?\s*\*?\*?Frontend\*?\*?:" ./yoyo-dev/product/tech-stack.md 2>/dev/null | head -n 1 | sed 's/.*://;s/^[[:space:]]*//;s/[[:space:]]*$//' || true)
    backend=$(grep -iE "^-?\s*\*?\*?Backend\*?\*?:" ./yoyo-dev/product/tech-stack.md 2>/dev/null | head -n 1 | sed 's/.*://;s/^[[:space:]]*//;s/[[:space:]]*$//' || true)

    if [ -n "$frontend" ] && [ -n "$backend" ]; then
        tech_stack="$frontend + $backend"
    elif [ -n "$frontend" ]; then
        tech_stack="$frontend"
    elif [ -n "$backend" ]; then
        tech_stack="$backend"
    fi
fi

# Fallback defaults
if [ -z "$mission" ]; then
    mission="AI-assisted development workflow"
fi

if [ -z "$tech_stack" ]; then
    tech_stack="Not configured yet"
fi

# Display branded header
clear
echo ""
echo -e " ${CYAN}┌───────────────────────────────────────────────────────────────────────┐${RESET}"
echo -e " ${CYAN}│                                                                       │${RESET}"
echo -e " ${CYAN}│${RESET} ${BOLD}██╗   ██╗ ██████╗ ██╗   ██╗ ██████╗       ██████╗ ███████╗██╗   ██╗${RESET} ${CYAN}│${RESET}"
echo -e " ${CYAN}│${RESET} ${BOLD}╚██╗ ██╔╝██╔═══██╗╚██╗ ██╔╝██╔═══██╗      ██╔══██╗██╔════╝██║   ██║${RESET} ${CYAN}│${RESET}"
echo -e " ${CYAN}│${RESET}  ${BOLD}╚████╔╝ ██║   ██║ ╚████╔╝ ██║   ██║█████╗██║  ██║█████╗  ██║   ██║${RESET} ${CYAN}│${RESET}"
echo -e " ${CYAN}│${RESET}   ${BOLD}╚██╔╝  ██║   ██║  ╚██╔╝  ██║   ██║╚════╝██║  ██║██╔══╝  ╚██╗ ██╔╝${RESET} ${CYAN}│${RESET}"
echo -e " ${CYAN}│${RESET}    ${BOLD}██║   ╚██████╔╝   ██║   ╚██████╔╝      ██████╔╝███████╗ ╚████╔╝${RESET}  ${CYAN}│${RESET}"
echo -e " ${CYAN}│${RESET}    ${BOLD}╚═╝    ╚═════╝    ╚═╝    ╚═════╝       ╚═════╝ ╚══════╝  ╚═══╝${RESET}   ${CYAN}│${RESET}"
echo -e " ${CYAN}│                                                                       │${RESET}"
echo -e " ${CYAN}│${RESET}              ${BOLD}v${VERSION} - AI-Assisted Development Framework${RESET}           ${CYAN}│${RESET}"
echo -e " ${CYAN}│${RESET}          ${DIM}\"Powerful when you need it. Invisible when you don't.\"${RESET}  ${CYAN}│${RESET}"
echo -e " ${CYAN}└───────────────────────────────────────────────────────────────────────┘${RESET}"
echo ""
echo -e " ${GREEN}📍 Project:${RESET} ${BOLD}$project_name${RESET}"
echo -e " ${BLUE}📂 Location:${RESET} $project_path"
echo -e " ${MAGENTA}🎯 Mission:${RESET} $mission"
echo -e " ${YELLOW}🛠️  Stack:${RESET} $tech_stack"
echo ""
echo " ──────────────────────────────────────────────────────────────────────────────"
echo ""
echo -e " ${BOLD}Quick Start:${RESET}"
echo -e "   • ${GREEN}/create-new${RESET} \"feature name\" ${CYAN}--lite${RESET}       ${DIM}# Fast feature creation${RESET}"
echo -e "   • ${GREEN}/create-fix${RESET} \"problem\"                      ${DIM}# Fix bugs systematically${RESET}"
echo -e "   • ${GREEN}/execute-tasks${RESET}                            ${DIM}# Build (interactive)${RESET}"
echo ""
echo -e " ${BOLD}TUI Dashboard:${RESET}"
echo -e "   • Run ${CYAN}yoyo-tui${RESET} in a separate terminal for real-time status monitoring"
echo -e "   • The TUI shows specs, fixes, tasks, and auto-updates on file changes"
echo ""
echo " ──────────────────────────────────────────────────────────────────────────────"
echo ""
echo -e " ${DIM}Run ${CYAN}/yoyo-help${RESET}${DIM} for complete command reference${RESET}"
echo -e " ${DIM}Docs: ${CYAN}.yoyo-dev/COMMAND-REFERENCE.md${RESET}"
echo ""
echo -e " ${YELLOW}Launching Claude Code...${RESET}"
echo ""

# Launch Claude Code
exec claude
