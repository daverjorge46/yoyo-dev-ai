#!/bin/bash

# Yoyo Dev v2.0 CLI Launcher
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

# Yoyo Dev version
readonly VERSION="2.0.0"

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
    echo -e "${BOLD}${CYAN}║${RESET}                     ${BOLD}YOYO DEV v2.0 - COMMAND REFERENCE${RESET}              ${BOLD}${CYAN}║${RESET}"
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
    echo -e "  ${GREEN}yoyo${RESET}                    Launch Claude Code normally"
    echo -e "  ${GREEN}yoyo --help${RESET}             Show this reference"
    echo -e "  ${GREEN}yoyo --version${RESET}          Show version"
    echo -e "  ${GREEN}yoyo --commands${RESET}         List all commands"
    echo -e "  ${GREEN}yoyo --monitor${RESET} ${YELLOW}[task]${RESET}   Start task monitor"
    echo ""
    echo -e "${BOLD}Task Monitor:${RESET}"
    echo ""
    echo -e "  ${DIM}Split pane (tmux):${RESET}"
    echo -e "    ~/.yoyo-dev/lib/task-monitor-tmux.sh split ${YELLOW}path/to/MASTER-TASKS.md${RESET}"
    echo ""
    echo -e "  ${DIM}Controls:${RESET}"
    echo -e "    Ctrl+B then arrows  - Switch panes"
    echo -e "    Ctrl+B then z       - Full screen toggle"
    echo -e "    Ctrl+B then x       - Close monitor pane"
    echo ""
    echo "────────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "${BOLD}Examples:${RESET}"
    echo ""
    echo -e "  ${CYAN}# Simple feature with monitoring${RESET}"
    echo -e "  /create-new \"Add profile avatar\" --lite --monitor"
    echo -e "  /execute-tasks"
    echo ""
    echo -e "  ${CYAN}# Complex feature with parallel execution${RESET}"
    echo -e "  /create-new \"User authentication\""
    echo -e "  /execute-tasks --parallel --monitor"
    echo ""
    echo -e "  ${CYAN}# Fix bug with investigation${RESET}"
    echo -e "  /create-fix \"Layout broken on mobile\" --monitor"
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

    ~/.yoyo-dev/lib/task-monitor-tmux.sh split "$task_file"
}

# Display branded header and launch
launch_claude() {
    # Check if we're in a Yoyo Dev project
    if [ ! -d "./.yoyo-dev" ]; then
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
    echo -e "   • ${GREEN}/create-new${RESET} \"feature name\" ${CYAN}--lite --monitor${RESET}  ${DIM}# Fast feature creation${RESET}"
    echo -e "   • ${GREEN}/create-fix${RESET} \"problem\" ${CYAN}--monitor${RESET}            ${DIM}# Fix bugs systematically${RESET}"
    echo -e "   • ${GREEN}/execute-tasks${RESET}                            ${DIM}# Build (interactive by default)${RESET}"
    echo ""
    echo -e " ${BOLD}New in v2.0:${RESET}"
    echo -e "   ${CYAN}✨${RESET} Interactive mode by default (pause after each subtask)"
    echo -e "   ${CYAN}✨${RESET} MASTER-TASKS.md (single source of truth)"
    echo -e "   ${CYAN}✨${RESET} Task monitor with tmux split-pane"
    echo -e "   ${CYAN}✨${RESET} Lite mode for fast iteration"
    echo -e "   ${CYAN}✨${RESET} Comprehensive flag documentation"
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
        --monitor|-m)
            if [[ -z "${2:-}" ]]; then
                echo ""
                echo -e "${YELLOW}⚠️  Missing task file path${RESET}"
                echo ""
                echo "Usage: yoyo --monitor path/to/MASTER-TASKS.md"
                echo ""
                exit 1
            fi
            start_monitor "$2"
            ;;
        launch|*)
            launch_claude
            ;;
    esac
}

main "$@"
