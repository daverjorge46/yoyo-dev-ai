#!/bin/bash
#
# Yoyo Dev - Unified Dependency Installer
#
# Installs all required dependencies for Dashboard + TUI in one go.
# This combines install-dashboard-deps.sh and install-tui-deps.sh.
#

set -e  # Exit on error

# Trap Ctrl+C (SIGINT) and SIGTERM for clean exit
trap 'echo ""; echo "⚠️  Installation interrupted by user"; exit 130' INT TERM

# Color codes for output
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

echo -e "${CYAN}${BOLD}╔═══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}${BOLD}║${RESET}  📦 Yoyo Dev - Installing All Dependencies              ${CYAN}${BOLD}║${RESET}"
echo -e "${CYAN}${BOLD}╚═══════════════════════════════════════════════════════════╝${RESET}"
echo ""

# Determine which Python/pip to use
YOYO_DEV_HOME="$HOME/yoyo-dev"
VENV_PYTHON="$YOYO_DEV_HOME/venv/bin/python3"
VENV_PIP="$YOYO_DEV_HOME/venv/bin/pip"

if [ -f "$VENV_PYTHON" ]; then
    echo -e "${GREEN}✓${RESET} Found existing venv at ${BOLD}$YOYO_DEV_HOME/venv${RESET}"
    PYTHON="$VENV_PYTHON"
    PIP="$VENV_PIP"
else
    echo -e "${YELLOW}⚠${RESET}  No venv found, creating one..."

    # Check if python3 is available
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}✗${RESET} Error: python3 not found"
        echo -e "  Please install Python 3.11+ first"
        exit 1
    fi

    # Check Python version
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    echo -e "  Using Python: ${BOLD}$PYTHON_VERSION${RESET}"

    # Create venv at ~/yoyo-dev/venv
    echo -e "${CYAN}→${RESET} Creating virtual environment at ${BOLD}$YOYO_DEV_HOME/venv${RESET}..."
    if python3 -m venv "$YOYO_DEV_HOME/venv"; then
        echo -e "${GREEN}  ✓${RESET} Virtual environment created"
        PYTHON="$VENV_PYTHON"
        PIP="$VENV_PIP"

        # Upgrade pip in the new venv
        echo -e "${CYAN}→${RESET} Upgrading pip..."
        "$PIP" install --upgrade pip --quiet --no-input --disable-pip-version-check || true
    else
        echo -e "${RED}✗${RESET} Failed to create virtual environment"
        echo -e "  This is required on PEP 668-protected systems (Ubuntu 23.04+)"
        echo -e "  Please ensure python3-venv is installed:"
        echo -e "    ${BOLD}sudo apt install python3-venv${RESET}"
        exit 1
    fi
fi

echo ""
echo -e "${CYAN}Installing all dependencies...${RESET}"
echo ""

# All required packages (Dashboard + TUI)
PACKAGES=(
    "rich>=13.0.0"           # Dashboard - rich terminal output
    "watchdog>=3.0.0"        # File watching
    "pyyaml>=6.0"            # Config parsing
    "gitpython>=3.1.0"       # Git integration
    "textual>=0.45.0"        # TUI framework
    "pyperclip>=1.8.0"       # Clipboard (for command execution)
)

# Install each package
FAILED_PACKAGES=()
for package in "${PACKAGES[@]}"; do
    package_name=$(echo "$package" | cut -d'>' -f1 | cut -d'=' -f1)
    echo -e "${CYAN}→${RESET} Installing ${BOLD}$package_name${RESET}..."

    # Use timeout to prevent hanging (5 minutes max per package)
    # Add --no-input and --disable-pip-version-check for non-interactive mode
    if timeout 300 $PIP install "$package" --quiet --no-input --disable-pip-version-check; then
        echo -e "${GREEN}  ✓${RESET} $package_name installed"
    else
        exit_code=$?
        if [ $exit_code -eq 124 ]; then
            echo -e "${RED}  ✗${RESET} Timeout installing $package_name (> 5 minutes)"
            echo -e "${YELLOW}     Try manual install: $PIP install $package${RESET}"
        else
            echo -e "${RED}  ✗${RESET} Failed to install $package_name"
        fi
        FAILED_PACKAGES+=("$package_name")
    fi
done

echo ""

# Report results
if [ ${#FAILED_PACKAGES[@]} -eq 0 ]; then
    echo -e "${GREEN}${BOLD}╔═══════════════════════════════════════════════════════════╗${RESET}"
    echo -e "${GREEN}${BOLD}║${RESET}  ✓ All Yoyo Dev Dependencies Installed Successfully!   ${GREEN}${BOLD}║${RESET}"
    echo -e "${GREEN}${BOLD}╚═══════════════════════════════════════════════════════════╝${RESET}"
    echo ""
    echo -e "${GREEN}Dashboard + TUI are ready to use!${RESET}"
    echo ""
else
    echo -e "${YELLOW}${BOLD}╔═══════════════════════════════════════════════════════════╗${RESET}"
    echo -e "${YELLOW}${BOLD}║${RESET}  ⚠ Some Dependencies Failed to Install                  ${YELLOW}${BOLD}║${RESET}"
    echo -e "${YELLOW}${BOLD}╚═══════════════════════════════════════════════════════════╝${RESET}"
    echo ""
    echo -e "${YELLOW}Failed packages:${RESET}"
    for pkg in "${FAILED_PACKAGES[@]}"; do
        echo -e "  • $pkg"
    done
    echo ""
    echo -e "${YELLOW}Dashboard may still work, but some features may be unavailable.${RESET}"
    echo ""
fi

# ============================================
# MCP Installation Integration
# ============================================

echo ""
echo -e "${CYAN}${BOLD}╔═══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}${BOLD}║${RESET}  🔌 MCP Server Installation                              ${CYAN}${BOLD}║${RESET}"
echo -e "${CYAN}${BOLD}╚═══════════════════════════════════════════════════════════╝${RESET}"
echo ""

# Detect script directory (works for both symlinks and direct execution)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_INSTALLER="$SCRIPT_DIR/mcp-claude-installer.sh"

# Check if Claude Code CLI is installed
if command -v claude &> /dev/null; then
    CLAUDE_VERSION=$(claude --version 2>/dev/null | head -1 || echo "unknown")
    echo -e "${GREEN}✓${RESET} Claude Code CLI detected: ${BOLD}$CLAUDE_VERSION${RESET}"
    echo ""

    # Prompt user to install MCPs
    echo -e "${CYAN}MCP servers enhance Claude Code with additional capabilities:${RESET}"
    echo -e "  • ${BOLD}context7${RESET} - DevTools context management"
    echo -e "  • ${BOLD}memory${RESET} - Memory integration"
    echo -e "  • ${BOLD}playwright${RESET} - Browser automation"
    echo -e "  • ${BOLD}containerization${RESET} - Docker/container deployment"
    echo -e "  • ${BOLD}chrome-devtools${RESET} - Chrome DevTools Protocol"
    echo -e "  • ${BOLD}shadcn${RESET} - UI component library"
    echo ""

    # Prompt for installation
    read -p "Install MCP servers now? [Y/n] " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        # User answered yes (or pressed Enter for default)
        echo ""
        if [ -f "$MCP_INSTALLER" ]; then
            bash "$MCP_INSTALLER"
        else
            echo -e "${RED}✗${RESET} MCP installer not found at: $MCP_INSTALLER"
            echo -e "  Please run from the yoyo-dev setup directory"
        fi
    else
        echo -e "${YELLOW}⚠${RESET}  Skipping MCP installation (you can install later)"
        echo -e "  To install MCPs later, run: ${BOLD}$MCP_INSTALLER${RESET}"
        echo ""
    fi
else
    # Claude Code CLI not installed
    echo -e "${YELLOW}⚠${RESET}  Claude Code CLI not detected"
    echo ""
    echo -e "${CYAN}MCP servers require Claude Code CLI to install.${RESET}"
    echo -e "Download from: ${BOLD}https://claude.ai/download${RESET}"
    echo ""
    echo -e "After installing Claude Code, you can install MCPs by running:"
    echo -e "  ${BOLD}$MCP_INSTALLER${RESET}"
    echo ""
fi

# Final summary
echo ""
echo -e "${GREEN}${BOLD}Installation complete!${RESET}"
echo ""
