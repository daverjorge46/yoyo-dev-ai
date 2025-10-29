#!/bin/bash

# Yoyo Dev CLI Launcher
# Displays branded header with project context and launches Claude Code

# Color codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
RESET='\033[0m'

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
PROJECT_NAME=$(basename "$(pwd)")
PROJECT_PATH=$(pwd)

# Extract mission and tech stack from mission-lite.md if it exists
MISSION=""
TECH_STACK=""

if [ -f "./yoyo-dev/product/mission-lite.md" ]; then
    # Extract mission (first line after "## Mission")
    MISSION=$(sed -n '/^## Mission/,/^##/p' ./yoyo-dev/product/mission-lite.md | sed '1d;$d' | head -n 1 | sed 's/^[[:space:]]*//')

    # Extract tech stack (look for stack-related keywords)
    if grep -q "## Tech Stack" ./yoyo-dev/product/mission-lite.md; then
        TECH_STACK=$(sed -n '/^## Tech Stack/,/^##/p' ./yoyo-dev/product/mission-lite.md | grep -v "^##" | tr -d '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/- //g' | tr '\n' ' ')
    fi
fi

# If tech stack is empty, try to extract from tech-stack.md
if [ -z "$TECH_STACK" ] && [ -f "./yoyo-dev/product/tech-stack.md" ]; then
    # Try multiple extraction strategies

    # Strategy 1: Look for Frontend/Backend pattern
    FRONTEND=$(grep -iE "^-?\s*\*?\*?Frontend\*?\*?:" ./yoyo-dev/product/tech-stack.md | head -n 1 | sed 's/.*://;s/^[[:space:]]*//;s/[[:space:]]*$//')
    BACKEND=$(grep -iE "^-?\s*\*?\*?Backend\*?\*?:" ./yoyo-dev/product/tech-stack.md | head -n 1 | sed 's/.*://;s/^[[:space:]]*//;s/[[:space:]]*$//')

    # Strategy 2: Look for key technology mentions in bullet points
    if [ -z "$FRONTEND" ] && [ -z "$BACKEND" ]; then
        # Extract from bullet list - look for React, Next.js, Vue, Angular
        FRONTEND=$(grep -iE "(React|Next\.js|Vue|Angular|Svelte)" ./yoyo-dev/product/tech-stack.md | head -n 1 | sed 's/^-\s*//;s/^[[:space:]]*//;s/[[:space:]]*$//' | cut -d',' -f1)
        # Look for Node, Express, Django, Flask, etc
        BACKEND=$(grep -iE "(Node|Express|Django|Flask|FastAPI|Convex|Supabase|Firebase)" ./yoyo-dev/product/tech-stack.md | head -n 1 | sed 's/^-\s*//;s/^[[:space:]]*//;s/[[:space:]]*$//' | cut -d',' -f1)
    fi

    # Strategy 3: Look for "Core Stack" or "Stack" section
    if [ -z "$FRONTEND" ] && [ -z "$BACKEND" ]; then
        STACK_LINE=$(sed -n '/[Cc]ore [Ss]tack\|^[Ss]tack:/,/^$/p' ./yoyo-dev/product/tech-stack.md | grep -v "^#" | grep -v "^$" | head -n 1)
        if [ -n "$STACK_LINE" ]; then
            TECH_STACK=$(echo "$STACK_LINE" | sed 's/^-\s*//;s/^[[:space:]]*//;s/[[:space:]]*$//')
        fi
    fi

    # Combine Frontend and Backend if found
    if [ -z "$TECH_STACK" ]; then
        if [ -n "$FRONTEND" ] && [ -n "$BACKEND" ]; then
            TECH_STACK="$FRONTEND + $BACKEND"
        elif [ -n "$FRONTEND" ]; then
            TECH_STACK="$FRONTEND"
        elif [ -n "$BACKEND" ]; then
            TECH_STACK="$BACKEND"
        fi
    fi
fi

# Fallback defaults
if [ -z "$MISSION" ]; then
    MISSION="AI-assisted development workflow"
fi

if [ -z "$TECH_STACK" ]; then
    TECH_STACK="Not configured yet - run /plan-product or /analyze-product"
fi

# Display branded header
clear
echo ""
echo -e " ${CYAN}╔═══════════════════════════════════════════════════════════════════════════╗${RESET}"
echo -e " ${CYAN}║                                                                           ║${RESET}"
echo -e " ${CYAN}║${RESET}   ${BOLD}██╗   ██╗ ██████╗ ██╗   ██╗ ██████╗       ██████╗ ███████╗██╗   ██╗${RESET}  ${CYAN}║${RESET}"
echo -e " ${CYAN}║${RESET}   ${BOLD}╚██╗ ██╔╝██╔═══██╗╚██╗ ██╔╝██╔═══██╗      ██╔══██╗██╔════╝██║   ██║${RESET}  ${CYAN}║${RESET}"
echo -e " ${CYAN}║${RESET}    ${BOLD}╚████╔╝ ██║   ██║ ╚████╔╝ ██║   ██║█████╗██║  ██║█████╗  ██║   ██║${RESET}  ${CYAN}║${RESET}"
echo -e " ${CYAN}║${RESET}     ${BOLD}╚██╔╝  ██║   ██║  ╚██╔╝  ██║   ██║╚════╝██║  ██║██╔══╝  ╚██╗ ██╔╝${RESET}  ${CYAN}║${RESET}"
echo -e " ${CYAN}║${RESET}      ${BOLD}██║   ╚██████╔╝   ██║   ╚██████╔╝      ██████╔╝███████╗ ╚████╔╝${RESET}   ${CYAN}║${RESET}"
echo -e " ${CYAN}║${RESET}      ${BOLD}╚═╝    ╚═════╝    ╚═╝    ╚═════╝       ╚═════╝ ╚══════╝  ╚═══╝${RESET}    ${CYAN}║${RESET}"
echo -e " ${CYAN}║                                                                           ║${RESET}"
echo -e " ${CYAN}║${RESET}                    ${BOLD}AI-Assisted Development Framework${RESET}                     ${CYAN}║${RESET}"
echo -e " ${CYAN}╚═══════════════════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e " ${GREEN}📍 Project:${RESET} ${BOLD}$PROJECT_NAME${RESET}"
echo -e " ${BLUE}📂 Location:${RESET} $PROJECT_PATH"
echo -e " ${MAGENTA}🎯 Mission:${RESET} $MISSION"
echo -e " ${YELLOW}🛠️  Stack:${RESET} $TECH_STACK"
echo -e " ${CYAN}📄 Product Docs:${RESET} .yoyo-dev/product/"
echo ""
echo " ──────────────────────────────────────────────────────────────────────────────"
echo ""
echo -e " ${BOLD}Available Commands:${RESET}"
echo -e "   ${CYAN}/plan-product${RESET}      Set mission & roadmap for new product"
echo -e "   ${CYAN}/analyze-product${RESET}   Setup mission & roadmap for existing product"
echo -e "   ${CYAN}/create-new${RESET}        Create feature spec + tasks (streamlined)"
echo -e "   ${CYAN}/create-fix${RESET}        Analyze and fix bugs systematically"
echo -e "   ${CYAN}/execute-tasks${RESET}     Build and ship code for features/fixes"
echo -e "   ${CYAN}/review${RESET}            Critical code review (optional, strategic use)"
echo ""
echo -e " ${BOLD}Design System (NEW v1.5.0):${RESET}"
echo -e "   ${CYAN}/design-init${RESET}       Initialize design system for consistency"
echo -e "   ${CYAN}/design-audit${RESET}      Audit design compliance & violations"
echo -e "   ${CYAN}/design-fix${RESET}        Fix design inconsistencies systematically"
echo -e "   ${CYAN}/design-component${RESET}  Create UI components with strict validation"
echo ""
echo -e " ${BOLD}Quick Start:${RESET}"
echo -e "   • New project? → ${GREEN}/plan-product${RESET} then ${GREEN}/design-init${RESET}"
echo -e "   • Existing project? → ${GREEN}/analyze-product${RESET} then ${GREEN}/design-init${RESET}"
echo -e "   • Add feature? → ${GREEN}/create-new${RESET}"
echo -e "   • Fix bug? → ${GREEN}/create-fix${RESET}"
echo -e "   • Design consistency? → ${GREEN}/design-audit${RESET}"
echo ""
echo " ──────────────────────────────────────────────────────────────────────────────"
echo ""
echo -e " ${YELLOW}Launching Claude Code...${RESET}"
echo ""

# Launch Claude Code
exec claude
