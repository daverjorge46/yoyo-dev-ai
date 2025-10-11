#!/bin/bash

# Yoyo Dev Dashboard Dependency Installer
# Installs Python dependencies for yoyo-dashboard.py

set -uo pipefail

# Color codes
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly RESET='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}┌────────────────────────────────────────────┐${RESET}"
echo -e "${BOLD}${CYAN}│${RESET}  🐍 ${BOLD}Yoyo Dev Dashboard Dependencies${RESET}    ${BOLD}${CYAN}│${RESET}"
echo -e "${BOLD}${CYAN}└────────────────────────────────────────────┘${RESET}"
echo ""

# Check Python version
echo -e "${CYAN}1. Checking Python version...${RESET}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python 3 is not installed${RESET}"
    echo ""
    echo "Please install Python 3.8 or higher first."
    exit 1
fi

python_version=$(python3 --version | grep -oP '\d+\.\d+')
python_major=$(echo "$python_version" | cut -d. -f1)
python_minor=$(echo "$python_version" | cut -d. -f2)

if [ "$python_major" -lt 3 ] || ([ "$python_major" -eq 3 ] && [ "$python_minor" -lt 8 ]); then
    echo -e "${RED}✗ Python version $python_version is too old${RESET}"
    echo ""
    echo "Python 3.8 or higher is required."
    exit 1
fi

echo -e "${GREEN}✓ Python $python_version detected${RESET}"
echo ""

# Check pip
echo -e "${CYAN}2. Checking pip installation...${RESET}"
if ! command -v pip3 &> /dev/null; then
    echo -e "${YELLOW}⚠ pip3 not found, attempting to install...${RESET}"

    # Try to install pip
    if command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y python3-pip
    elif command -v yum &> /dev/null; then
        sudo yum install -y python3-pip
    elif command -v brew &> /dev/null; then
        brew install python3
    else
        echo -e "${RED}✗ Could not install pip automatically${RESET}"
        echo ""
        echo "Please install pip3 manually:"
        echo "  Debian/Ubuntu: sudo apt install python3-pip"
        echo "  RedHat/CentOS: sudo yum install python3-pip"
        echo "  macOS: brew install python3"
        exit 1
    fi
fi

echo -e "${GREEN}✓ pip3 is available${RESET}"
echo ""

# Install dependencies
echo -e "${CYAN}3. Installing dashboard dependencies...${RESET}"
echo ""

# Change to yoyo-dev directory
YOYO_DIR="$HOME/.yoyo-dev"
if [ ! -f "$YOYO_DIR/requirements.txt" ]; then
    echo -e "${RED}✗ requirements.txt not found in $YOYO_DIR${RESET}"
    exit 1
fi

cd "$YOYO_DIR" || exit 1

# Install dependencies
if pip3 install -r requirements.txt --user; then
    echo ""
    echo -e "${GREEN}✓ All dependencies installed successfully!${RESET}"
else
    echo ""
    echo -e "${RED}✗ Failed to install dependencies${RESET}"
    echo ""
    echo "Try installing manually:"
    echo "  pip3 install rich watchdog pyyaml"
    exit 1
fi

echo ""
echo -e "${BOLD}${GREEN}┌────────────────────────────────────────────┐${RESET}"
echo -e "${BOLD}${GREEN}│${RESET}  ✓ ${BOLD}Dashboard Dependencies Installed${RESET}     ${BOLD}${GREEN}│${RESET}"
echo -e "${BOLD}${GREEN}└────────────────────────────────────────────┘${RESET}"
echo ""
echo -e "${CYAN}Next steps:${RESET}"
echo "  • Dashboard will be used automatically in visual mode"
echo "  • Run ${GREEN}yoyo${RESET} to launch with the new dashboard"
echo "  • Falls back to Bash version if any issues occur"
echo ""
