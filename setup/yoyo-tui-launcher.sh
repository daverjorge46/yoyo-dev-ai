#!/bin/bash

# Yoyo Dev TUI Launcher
# Launch full-screen interactive Textual TUI for Yoyo Dev monitoring
# Use this for rich interactive experience with file watching, navigation, etc.

set -euo pipefail

# Color codes
readonly CYAN='\033[0;36m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly RESET='\033[0m'

# Check if we're in a Yoyo Dev project
if [ ! -d "./.yoyo-dev" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Yoyo Dev not detected in this directory${RESET}"
    echo ""
    echo "Please run this command from a Yoyo Dev project directory."
    echo ""
    exit 1
fi

# Determine Python command
PYTHON_CMD=""

# Check venv first
if [ -f "$HOME/.yoyo-dev/venv/bin/python3" ]; then
    if "$HOME/.yoyo-dev/venv/bin/python3" -c "import textual, watchdog, yaml" &> /dev/null 2>&1; then
        PYTHON_CMD="$HOME/.yoyo-dev/venv/bin/python3"
    fi
elif command -v python3 &> /dev/null; then
    if python3 -c "import textual, watchdog, yaml" &> /dev/null 2>&1; then
        PYTHON_CMD="python3"
    fi
fi

# Check if dependencies are available
if [ -z "$PYTHON_CMD" ]; then
    echo ""
    echo -e "${RED}❌ Missing required dependencies: textual, watchdog, pyyaml${RESET}"
    echo ""
    echo "Install with:"
    echo "  ~/.yoyo-dev/setup/install-deps.sh"
    echo ""
    exit 1
fi

# Launch TUI
echo ""
echo -e "${CYAN}🚀 Launching Yoyo Dev TUI...${RESET}"
echo ""

exec "$PYTHON_CMD" "$HOME/.yoyo-dev/lib/yoyo-tui.py"
