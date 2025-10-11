#!/bin/bash

# MCP Installer - Install Model Context Protocol servers
# Supports interactive selection, all MCPs, specific MCPs, or skip installation

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# MCP package mapping
declare -A MCP_PACKAGES=(
    ["context7"]="@context7/mcp-server"
    ["memory"]="@memory/mcp-server"
    ["playwright"]="@playwright/mcp-server"
    ["chrome-devtools"]="@chrome-devtools/mcp-server"
    ["shadcn"]="@shadcn/mcp-server"
    ["containerization"]="@containerization/mcp-server"
)

# MCP descriptions
declare -A MCP_DESCRIPTIONS=(
    ["context7"]="Intelligent context management and codebase understanding"
    ["memory"]="Persistent memory across Claude Code sessions"
    ["playwright"]="Browser automation and web testing"
    ["chrome-devtools"]="Chrome DevTools integration for debugging"
    ["shadcn"]="shadcn/ui component integration"
    ["containerization"]="Docker and container management"
)

# Track installation results
INSTALLED_MCPS=()
FAILED_MCPS=()

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

# Install single MCP
install_mcp() {
    local mcp_name="$1"
    local package="${MCP_PACKAGES[$mcp_name]:-}"

    if [[ -z "$package" ]]; then
        echo -e "${RED}✗${RESET} Unknown MCP: $mcp_name"
        FAILED_MCPS+=("$mcp_name")
        return 1
    fi

    echo -e "${CYAN}Installing $mcp_name${RESET} ($package)..."

    if npm install -g "$package" >/dev/null 2>&1; then
        INSTALLED_MCPS+=("$mcp_name")
        echo -e "${GREEN}✓${RESET} $mcp_name installed successfully"
        return 0
    else
        FAILED_MCPS+=("$mcp_name")
        echo -e "${RED}✗${RESET} $mcp_name installation failed (continuing...)"
        return 1
    fi
}

# Update config.yml with installed MCPs
update_config() {
    local config_file="$1"

    if [[ ! -f "$config_file" ]]; then
        echo -e "${RED}Error: Config file not found: $config_file${RESET}"
        return 1
    fi

    # Append MCP configuration section
    echo "" >> "$config_file"
    echo "# MCP Configuration" >> "$config_file"
    echo "mcp:" >> "$config_file"
    echo "  enabled: true" >> "$config_file"
    echo "  servers:" >> "$config_file"

    if [[ ${#INSTALLED_MCPS[@]} -gt 0 ]]; then
        for mcp in "${INSTALLED_MCPS[@]}"; do
            echo "    $mcp:" >> "$config_file"
            echo "      enabled: true" >> "$config_file"
        done
    fi

    echo -e "${GREEN}✓${RESET} Config updated: $config_file"
}

# Display interactive menu
show_mcp_menu() {
    echo ""
    echo -e "${BOLD}${BLUE}Available MCPs:${RESET}"
    echo ""

    local index=1
    for mcp in "${!MCP_PACKAGES[@]}"; do
        local desc="${MCP_DESCRIPTIONS[$mcp]}"
        echo -e "  ${CYAN}$index.${RESET} ${BOLD}$mcp${RESET} - $desc"
        ((index++))
    done

    echo ""
    echo -e "  ${CYAN}7.${RESET} Install all MCPs"
    echo -e "  ${CYAN}8.${RESET} Skip MCP installation"
    echo ""
}

# Prompt user for selection
prompt_user_selection() {
    show_mcp_menu

    echo -e "${YELLOW}Select MCPs to install (space-separated numbers, e.g., '1 2 3' or '7' for all):${RESET}"
    read -r selection

    # Convert selection to MCP names
    local selected_mcps=()

    for num in $selection; do
        case $num in
            1) selected_mcps+=("context7") ;;
            2) selected_mcps+=("memory") ;;
            3) selected_mcps+=("playwright") ;;
            4) selected_mcps+=("chrome-devtools") ;;
            5) selected_mcps+=("shadcn") ;;
            6) selected_mcps+=("containerization") ;;
            7)
                # Install all
                selected_mcps=("${!MCP_PACKAGES[@]}")
                break
                ;;
            8)
                # Skip
                echo -e "${YELLOW}Skipping MCP installation${RESET}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid selection: $num${RESET}"
                ;;
        esac
    done

    # Return selected MCPs
    echo "${selected_mcps[@]}"
}

# Print installation summary
print_summary() {
    echo ""
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${BOLD}${BLUE}                    Installation Summary${RESET}"
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo ""
    echo -e "  ${GREEN}Installed:${RESET} ${#INSTALLED_MCPS[@]}"
    echo -e "  ${RED}Failed:${RESET}    ${#FAILED_MCPS[@]}"

    if [[ ${#FAILED_MCPS[@]} -gt 0 ]]; then
        echo ""
        echo -e "  ${RED}Failed MCPs:${RESET} ${FAILED_MCPS[*]}"
    fi

    echo ""
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

# ============================================================================
# MAIN LOGIC
# ============================================================================

# Parse arguments
MODE="${1:-prompt}"
shift || true

case "$MODE" in
    "all")
        # Install all MCPs
        echo -e "${BOLD}${BLUE}Installing all MCPs...${RESET}"
        echo ""

        for mcp in "${!MCP_PACKAGES[@]}"; do
            install_mcp "$mcp" || true
        done
        ;;

    "specific")
        # Install specific MCPs
        if [[ $# -eq 0 ]]; then
            echo -e "${YELLOW}No MCPs specified${RESET}"
            print_summary
            exit 0
        fi

        echo -e "${BOLD}${BLUE}Installing selected MCPs...${RESET}"
        echo ""

        for mcp in "$@"; do
            # Skip --config flag
            [[ "$mcp" == "--config" ]] && break
            install_mcp "$mcp" || true
        done
        ;;

    "skip")
        # Skip installation
        echo -e "${YELLOW}Skipping MCP installation${RESET}"
        exit 0
        ;;

    "prompt")
        # Interactive mode - prompt user
        selected=$(prompt_user_selection)

        if [[ -z "$selected" ]]; then
            echo -e "${YELLOW}No MCPs selected${RESET}"
            exit 0
        fi

        echo -e "${BOLD}${BLUE}Installing selected MCPs...${RESET}"
        echo ""

        for mcp in $selected; do
            install_mcp "$mcp" || true
        done
        ;;

    *)
        echo "Usage: mcp-installer.sh [all|specific <names>|skip|prompt]"
        echo ""
        echo "Examples:"
        echo "  mcp-installer.sh all                        # Install all MCPs"
        echo "  mcp-installer.sh specific context7 memory   # Install specific MCPs"
        echo "  mcp-installer.sh skip                       # Skip installation"
        echo "  mcp-installer.sh prompt                     # Interactive mode (default)"
        echo "  mcp-installer.sh all --config config.yml    # Update config after install"
        exit 1
        ;;
esac

# Update config.yml if --config flag provided
CONFIG_FILE=""
for ((i=1; i<=$#; i++)); do
    arg="${!i}"
    if [[ "$arg" == "--config" ]]; then
        next=$((i+1))
        CONFIG_FILE="${!next}"
        break
    fi
done

if [[ -n "$CONFIG_FILE" && ${#INSTALLED_MCPS[@]} -gt 0 ]]; then
    update_config "$CONFIG_FILE"
fi

# Print summary
print_summary

exit 0
