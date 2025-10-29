#!/bin/bash
#
# Yoyo Dev - Unified Dependency Installer
#
# Installs all required dependencies for Dashboard + TUI in one go.
# This combines install-dashboard-deps.sh and install-tui-deps.sh.
#

set -e  # Exit on error

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
    echo -e "${YELLOW}⚠${RESET}  No venv found, using system Python"

    # Check if python3 is available
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}✗${RESET} Error: python3 not found"
        echo -e "  Please install Python 3.11+ first"
        exit 1
    fi

    PYTHON="python3"
    PIP="pip3"

    # Check Python version
    PYTHON_VERSION=$($PYTHON --version 2>&1 | awk '{print $2}')
    echo -e "  Using system Python: ${BOLD}$PYTHON_VERSION${RESET}"
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

    if $PIP install "$package" --quiet; then
        echo -e "${GREEN}  ✓${RESET} $package_name installed"
    else
        echo -e "${RED}  ✗${RESET} Failed to install $package_name"
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
