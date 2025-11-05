#!/bin/bash

# Yoyo Dev v3.0 TUI Launcher
# "Powerful when you need it. Invisible when you don't."
#
# Launches the production-grade Textual TUI dashboard with intelligent features.

set -euo pipefail

# Color codes
readonly CYAN='\033[0;36m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly BOLD='\033[1m'
readonly DIM='\033[2m'
readonly RESET='\033[0m'

# Yoyo Dev version
readonly VERSION="3.0.0"

# Determine script directory (resolve symlinks to get actual script location)
SCRIPT_PATH="${BASH_SOURCE[0]}"
# Resolve symlink if this script is executed via symlink
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# TUI Python script location (project-local)
readonly TUI_SCRIPT="$PROJECT_ROOT/lib/yoyo-tui.py"

# ============================================================================
# Dependency Checking
# ============================================================================

check_python() {
    # Check if Python 3 is available
    if ! command -v python3 &> /dev/null; then
        echo ""
        echo -e "${RED}ERROR: Python 3 is not installed${RESET}"
        echo ""
        echo "Please install Python 3 to use Yoyo Dev TUI:"
        echo "  sudo apt install python3 python3-pip  # Debian/Ubuntu"
        echo "  sudo dnf install python3 python3-pip  # Fedora"
        echo "  brew install python3                  # macOS"
        echo ""
        return 1
    fi
    return 0
}

check_tui_dependencies() {
    # Check if required Python packages are installed
    local missing=()

    # Check textual
    if ! python3 -c "import textual" &> /dev/null; then
        missing+=("textual")
    fi

    # Check watchdog
    if ! python3 -c "import watchdog" &> /dev/null; then
        missing+=("watchdog")
    fi

    # Check yaml
    if ! python3 -c "import yaml" &> /dev/null; then
        missing+=("pyyaml")
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}⚠️  Missing TUI dependencies: ${missing[*]}${RESET}"
        echo ""
        echo "Would you like to install them now? (Y/n)"
        read -r response

        if [[ "$response" =~ ^([yY][eE][sS]|[yY]|)$ ]]; then
            install_tui_dependencies "${missing[@]}"
            return $?
        else
            echo ""
            echo -e "${RED}Cannot launch TUI without dependencies${RESET}"
            echo ""
            echo "Install manually with:"
            echo "  pip3 install ${missing[*]}"
            echo ""
            return 1
        fi
    fi

    return 0
}

install_tui_dependencies() {
    # Install missing TUI dependencies
    local packages=("$@")

    echo ""
    echo -e "${CYAN}Installing TUI dependencies...${RESET}"
    echo ""

    # Try with pip3 first
    if command -v pip3 &> /dev/null; then
        if pip3 install --user "${packages[@]}"; then
            echo ""
            echo -e "${GREEN}✅ Dependencies installed successfully${RESET}"
            echo ""
            return 0
        fi
    fi

    # Fallback to python3 -m pip
    if python3 -m pip install --user "${packages[@]}"; then
        echo ""
        echo -e "${GREEN}✅ Dependencies installed successfully${RESET}"
        echo ""
        return 0
    fi

    # Installation failed
    echo ""
    echo -e "${RED}ERROR: Failed to install dependencies${RESET}"
    echo ""
    echo "Please install manually:"
    echo "  pip3 install ${packages[*]}"
    echo ""
    return 1
}

# ============================================================================
# UI Functions
# ============================================================================

# Show version
show_version() {
    echo ""
    echo -e "${BOLD}${CYAN}Yoyo Dev v${VERSION}${RESET}"
    echo "AI-Assisted Development Framework"
    echo ""
}

# Show comprehensive help with flags
show_help() {
    clear
    echo ""
    echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════════╗${RESET}"
    echo -e "${BOLD}${CYAN}║${RESET}                     ${BOLD}YOYO DEV v3.0 - COMMAND REFERENCE${RESET}              ${BOLD}${CYAN}║${RESET}"
    echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""
    echo -e "${BOLD}Core Workflows:${RESET}"
    echo ""
    echo -e "  ${GREEN}/plan-product${RESET}"
    echo -e "    ${DIM}Set mission & roadmap for new product${RESET}"
    echo ""
    echo -e "  ${GREEN}/analyze-product${RESET}"
    echo -e "    ${DIM}Setup mission & roadmap for existing product${RESET}"
    echo ""
    echo -e "  ${GREEN}/create-new${RESET} ${YELLOW}[feature]${RESET} ${CYAN}[--lite] [--monitor]${RESET}"
    echo -e "    ${DIM}Create feature with spec + tasks (streamlined)${RESET}"
    echo -e "    ${DIM}Flags:${RESET}"
    echo -e "      ${CYAN}--lite${RESET}       Skip detailed spec, fast mode"
    echo -e "      ${CYAN}--monitor${RESET}    Start task monitor in split pane"
    echo ""
    echo -e "  ${GREEN}/create-fix${RESET} ${YELLOW}[problem]${RESET} ${CYAN}[--quick] [--monitor]${RESET}"
    echo -e "    ${DIM}Analyze and fix bugs systematically${RESET}"
    echo -e "    ${DIM}Flags:${RESET}"
    echo -e "      ${CYAN}--quick${RESET}      Skip investigation (obvious problems)"
    echo -e "      ${CYAN}--monitor${RESET}    Start task monitor"
    echo ""
    echo -e "  ${GREEN}/execute-tasks${RESET} ${CYAN}[--all] [--task=N] [--parallel] [--monitor]${RESET}"
    echo -e "    ${DIM}Build and ship code (interactive by default)${RESET}"
    echo -e "    ${DIM}Flags:${RESET}"
    echo -e "      ${CYAN}--all${RESET}        Run without pausing (legacy mode)"
    echo -e "      ${CYAN}--task=N${RESET}     Execute specific task only"
    echo -e "      ${CYAN}--parallel${RESET}   Enable parallel execution"
    echo -e "      ${CYAN}--monitor${RESET}    Start task monitor"
    echo ""
    echo -e "${BOLD}Design System (v1.5.0):${RESET}"
    echo ""
    echo -e "  ${GREEN}/design-init${RESET} ${CYAN}[--analyze] [--minimal]${RESET}"
    echo -e "    ${DIM}Initialize design system${RESET}"
    echo ""
    echo -e "  ${GREEN}/design-audit${RESET} ${CYAN}[--colors] [--spacing] [--contrast]${RESET}"
    echo -e "    ${DIM}Audit design compliance${RESET}"
    echo ""
    echo -e "  ${GREEN}/design-fix${RESET} ${CYAN}[--colors] [--spacing] [--contrast]${RESET}"
    echo -e "    ${DIM}Fix design violations${RESET}"
    echo ""
    echo -e "  ${GREEN}/design-component${RESET} ${YELLOW}[name]${RESET} ${CYAN}[--strict]${RESET}"
    echo -e "    ${DIM}Create UI component with strict validation${RESET}"
    echo ""
    echo -e "${BOLD}Code Review (Optional):${RESET}"
    echo ""
    echo -e "  ${GREEN}/review${RESET} ${YELLOW}[scope]${RESET} ${CYAN}[--devil] [--security] [--performance]${RESET}"
    echo -e "    ${DIM}Critical code review with specialized modes${RESET}"
    echo ""
    echo -e "${BOLD}Yoyo Launcher:${RESET}"
    echo ""
    echo -e "  ${GREEN}yoyo${RESET}                    Launch TUI dashboard (full-screen)"
    echo -e "  ${GREEN}yoyo --help${RESET}             Show this reference"
    echo -e "  ${GREEN}yoyo --version${RESET}          Show version"
    echo -e "  ${GREEN}yoyo --commands${RESET}         List all commands"
    echo ""
    echo -e "  ${DIM}The TUI provides an interactive dashboard with:${RESET}"
    echo -e "    • Real-time task and spec tracking"
    echo -e "    • Live project status updates"
    echo -e "    • One-click command execution"
    echo -e "    • Press ? for help, q to quit"
    echo ""
    echo "────────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "${BOLD}Examples:${RESET}"
    echo ""
    echo -e "  ${CYAN}# Simple feature${RESET}"
    echo -e "  /create-new \"Add profile avatar\" --lite"
    echo -e "  /execute-tasks"
    echo ""
    echo -e "  ${CYAN}# Complex feature with parallel execution${RESET}"
    echo -e "  /create-new \"User authentication\""
    echo -e "  /execute-tasks --parallel"
    echo ""
    echo -e "  ${CYAN}# Fix bug${RESET}"
    echo -e "  /create-fix \"Layout broken on mobile\""
    echo ""
    echo -e "  ${CYAN}# Design system workflow${RESET}"
    echo -e "  /design-init --analyze"
    echo -e "  /design-component \"User profile card\""
    echo ""
    echo "────────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "📖 Full documentation: ${CYAN}.yoyo-dev/COMMAND-REFERENCE.md${RESET}"
    echo ""
    echo -e "${DIM}Yoyo Dev v${VERSION} - \"Powerful when you need it. Invisible when you don't.\"${RESET}"
    echo ""
}

# Show quick command list
show_commands() {
    echo ""
    echo -e "${BOLD}${CYAN}Available Commands:${RESET}"
    echo ""
    echo -e "  ${GREEN}/plan-product${RESET}        - Set mission & roadmap (new product)"
    echo -e "  ${GREEN}/analyze-product${RESET}     - Set mission & roadmap (existing product)"
    echo -e "  ${GREEN}/create-new${RESET}          - Create feature spec + tasks"
    echo -e "  ${GREEN}/create-spec${RESET}         - Create spec only (no tasks)"
    echo -e "  ${GREEN}/create-tasks${RESET}        - Create tasks from spec"
    echo -e "  ${GREEN}/create-fix${RESET}          - Analyze and fix bugs"
    echo -e "  ${GREEN}/execute-tasks${RESET}       - Build and ship code"
    echo -e "  ${GREEN}/review${RESET}              - Critical code review"
    echo ""
    echo -e "${BOLD}${CYAN}Design System:${RESET}"
    echo ""
    echo -e "  ${GREEN}/design-init${RESET}         - Initialize design system"
    echo -e "  ${GREEN}/design-audit${RESET}        - Audit design compliance"
    echo -e "  ${GREEN}/design-fix${RESET}          - Fix design violations"
    echo -e "  ${GREEN}/design-component${RESET}    - Create UI component"
    echo ""
    echo -e "Run ${CYAN}/yoyo-help${RESET} for detailed flag documentation"
    echo ""
}

# Start task monitor
start_monitor() {
    local task_file="$1"

    if [[ ! -f "$task_file" ]]; then
        echo ""
        echo -e "${YELLOW}⚠️  Task file not found: $task_file${RESET}"
        echo ""
        echo "Usage: yoyo --monitor path/to/MASTER-TASKS.md"
        echo ""
        exit 1
    fi

    ~/yoyo-dev/lib/task-monitor-tmux.sh split "$task_file"
}

# Install MCP servers
install_mcps() {
    echo ""
    echo -e "${BOLD}${CYAN}🔌 MCP Server Installation${RESET}"
    echo ""

    # Check if Yoyo Dev is installed
    if [ ! -d "./.yoyo-dev" ]; then
        echo -e "${YELLOW}⚠️  Yoyo Dev not detected in this directory${RESET}"
        echo ""
        echo "Please run this command from a project with Yoyo Dev installed."
        echo ""
        exit 1
    fi

    # Determine which MCP scripts to use (prefer local project copies)
    local MCP_PREREQUISITES=""
    local MCP_INSTALLER=""

    if [ -f "./.yoyo-dev/setup/mcp-prerequisites.sh" ] && [ -f "./.yoyo-dev/setup/mcp-installer.sh" ]; then
        # Use local project copies (installed during project setup)
        MCP_PREREQUISITES="./.yoyo-dev/setup/mcp-prerequisites.sh"
        MCP_INSTALLER="./.yoyo-dev/setup/mcp-installer.sh"
    elif [ -f ~/yoyo-dev/setup/mcp-prerequisites.sh ] && [ -f ~/yoyo-dev/setup/mcp-installer.sh ]; then
        # Fall back to base installation
        MCP_PREREQUISITES=~/yoyo-dev/setup/mcp-prerequisites.sh
        MCP_INSTALLER=~/yoyo-dev/setup/mcp-installer.sh
    else
        echo -e "${RED}ERROR: MCP installation scripts not found${RESET}"
        echo ""
        echo "Please ensure Yoyo Dev is up to date."
        echo "Run: yoyo-update"
        echo ""
        exit 1
    fi

    # Run prerequisite check
    echo "Checking prerequisites..."
    echo ""
    if bash "$MCP_PREREQUISITES"; then
        # Prerequisites met, run installer
        bash "$MCP_INSTALLER" prompt --config ./.yoyo-dev/config.yml

        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ MCP installation complete${RESET}"
            echo ""
        else
            echo ""
            echo -e "${YELLOW}⚠️  MCP installation was cancelled or failed${RESET}"
            echo ""
        fi
    else
        echo ""
        echo -e "${RED}✗ MCP prerequisite check failed${RESET}"
        echo ""
        echo "Please resolve the issues above before installing MCPs."
        echo ""
        exit 1
    fi
}

# Display branded header and launch TUI
launch_tui() {
    # Check if we're in a Yoyo Dev project
    if [ ! -d "./.yoyo-dev" ]; then
        echo ""
        echo -e "${YELLOW}⚠️  Yoyo Dev not detected in this directory${RESET}"
        echo ""
        echo "Would you like to:"
        echo "  1. Install Yoyo Dev in this project"
        echo "  2. Exit"
        echo ""
        read -p "Choice (1/2): " choice

        case $choice in
            1)
                echo ""
                echo "Installing Yoyo Dev..."
                ~/yoyo-dev/setup/project.sh --claude-code
                exit 0
                ;;
            *)
                echo "Exiting..."
                exit 0
                ;;
        esac
    fi

    # Check Python availability
    if ! check_python; then
        exit 1
    fi

    # Check and install TUI dependencies if needed
    if ! check_tui_dependencies; then
        exit 1
    fi

    # Get project info
    local project_name
    local project_path
    project_name=$(basename "$(pwd)")
    project_path=$(pwd)

    # Extract mission and tech stack
    local mission=""
    local tech_stack=""

    if [ -f "./.yoyo-dev/product/mission-lite.md" ]; then
        mission=$(sed -n '/^## Mission/,/^##/p' ./.yoyo-dev/product/mission-lite.md 2>/dev/null | sed '1d;$d' | head -n 1 | sed 's/^[[:space:]]*//' || true)

        if grep -q "## Tech Stack" ./.yoyo-dev/product/mission-lite.md 2>/dev/null; then
            tech_stack=$(sed -n '/^## Tech Stack/,/^##/p' ./.yoyo-dev/product/mission-lite.md 2>/dev/null | grep -v "^##" | tr -d '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/- //g' | tr '\n' ' ' || true)
        fi
    fi

    if [ -z "$tech_stack" ] && [ -f "./.yoyo-dev/product/tech-stack.md" ]; then
        local frontend
        local backend
        frontend=$(grep -iE "^-?\s*\*?\*?Frontend\*?\*?:" ./.yoyo-dev/product/tech-stack.md 2>/dev/null | head -n 1 | sed 's/.*://;s/^[[:space:]]*//;s/[[:space:]]*$//' || true)
        backend=$(grep -iE "^-?\s*\*?\*?Backend\*?\*?:" ./.yoyo-dev/product/tech-stack.md 2>/dev/null | head -n 1 | sed 's/.*://;s/^[[:space:]]*//;s/[[:space:]]*$//' || true)

        if [ -z "$frontend" ] && [ -z "$backend" ]; then
            frontend=$(grep -iE "(React|Next\.js|Vue|Angular|Svelte)" ./.yoyo-dev/product/tech-stack.md 2>/dev/null | head -n 1 | sed 's/^-\s*//;s/^[[:space:]]*//;s/[[:space:]]*$//' | cut -d',' -f1 || true)
            backend=$(grep -iE "(Node|Express|Django|Flask|FastAPI|Convex|Supabase|Firebase)" ./.yoyo-dev/product/tech-stack.md 2>/dev/null | head -n 1 | sed 's/^-\s*//;s/^[[:space:]]*//;s/[[:space:]]*$//' | cut -d',' -f1 || true)
        fi

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
        tech_stack="Not configured yet - run /plan-product or /analyze-product"
    fi

    # Display branded header
    clear
    echo ""
    echo -e " ${CYAN}┌──────────────────────────────────────────────────────────────────────────────────────┐${RESET}"
    echo -e " ${CYAN}│                                                                                      │${RESET}"
    echo -e " ${CYAN}│${RESET} ${BOLD}██╗   ██╗ ██████╗ ██╗   ██╗ ██████╗       ██████╗ ███████╗██╗   ██╗${RESET} ${CYAN}│${RESET}"
    echo -e " ${CYAN}│${RESET} ${BOLD}╚██╗ ██╔╝██╔═══██╗╚██╗ ██╔╝██╔═══██╗      ██╔══██╗██╔════╝██║   ██║${RESET} ${CYAN}│${RESET}"
    echo -e " ${CYAN}│${RESET}  ${BOLD}╚████╔╝ ██║   ██║ ╚████╔╝ ██║   ██║█████╗██║  ██║█████╗  ██║   ██║${RESET} ${CYAN}│${RESET}"
    echo -e " ${CYAN}│${RESET}   ${BOLD}╚██╔╝  ██║   ██║  ╚██╔╝  ██║   ██║╚════╝██║  ██║██╔══╝  ╚██╗ ██╔╝${RESET} ${CYAN}│${RESET}"
    echo -e " ${CYAN}│${RESET}    ${BOLD}██║   ╚██████╔╝   ██║   ╚██████╔╝      ██████╔╝███████╗ ╚████╔╝${RESET}  ${CYAN}│${RESET}"
    echo -e " ${CYAN}│${RESET}    ${BOLD}╚═╝    ╚═════╝    ╚═╝    ╚═════╝       ╚═════╝ ╚══════╝  ╚═══╝${RESET}   ${CYAN}│${RESET}"
    echo -e " ${CYAN}│                                                                                      │${RESET}"
    echo -e " ${CYAN}│${RESET}              ${BOLD}v${VERSION} - AI-Assisted Development Framework${RESET}        ${CYAN}│${RESET}"
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
    echo -e "   • ${GREEN}/create-new${RESET} \"feature name\" ${CYAN}--lite${RESET}  ${DIM}# Fast feature creation${RESET}"
    echo -e "   • ${GREEN}/create-fix${RESET} \"problem\"              ${DIM}# Fix bugs systematically${RESET}"
    echo -e "   • ${GREEN}/execute-tasks${RESET}                  ${DIM}# Build and ship code${RESET}"
    echo ""
    echo -e " ${BOLD}New in v3.0:${RESET}"
    echo -e "   ${CYAN}🚀${RESET} Production-grade intelligent dashboard"
    echo -e "   ${CYAN}🧠${RESET} Context-aware command suggestions"
    echo -e "   ${CYAN}⚠️${RESET}  Proactive error detection"
    echo -e "   ${CYAN}📊${RESET} Real-time progress tracking"
    echo -e "   ${CYAN}🔌${RESET} MCP server monitoring"
    echo ""
    echo " ──────────────────────────────────────────────────────────────────────────────"
    echo ""
    echo -e " ${DIM}Inside TUI:${RESET}"
    echo -e "   • Press ${CYAN}?${RESET} for help and keyboard shortcuts"
    echo -e "   • Press ${CYAN}q${RESET} to quit"
    echo -e "   • Click commands to copy to clipboard"
    echo ""
    echo -e " ${YELLOW}Launching Yoyo Dev TUI...${RESET}"
    echo ""

    # Launch Textual TUI
    exec python3 "$TUI_SCRIPT"
}

# Main
main() {
    local mode="${1:-launch}"

    case "$mode" in
        --help|-h)
            show_help
            ;;
        --version|-v)
            show_version
            ;;
        --commands|-c)
            show_commands
            ;;
        launch|*)
            # Launch Textual TUI
            launch_tui
            ;;
    esac
}

main "$@"
