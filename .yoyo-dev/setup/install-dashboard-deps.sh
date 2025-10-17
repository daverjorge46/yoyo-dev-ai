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
    echo "Python dashboard requires Python 3.8+. Using Bash fallback dashboard."
    echo ""
    exit 0
fi

python_version=$(python3 --version | grep -oP '\d+\.\d+')
python_major=$(echo "$python_version" | cut -d. -f1)
python_minor=$(echo "$python_version" | cut -d. -f2)

if [ "$python_major" -lt 3 ] || ([ "$python_major" -eq 3 ] && [ "$python_minor" -lt 8 ]); then
    echo -e "${RED}✗ Python version $python_version is too old${RESET}"
    echo ""
    echo "Python 3.8+ required for dashboard. Using Bash fallback dashboard."
    echo ""
    exit 0
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
        echo "Install pip3 manually or use Bash fallback dashboard:"
        echo "  Debian/Ubuntu: sudo apt install python3-pip"
        echo "  RedHat/CentOS: sudo yum install python3-pip"
        echo "  macOS: brew install python3"
        echo ""
        exit 0
    fi
fi

echo -e "${GREEN}✓ pip3 is available${RESET}"
echo ""

# Function to check for PEP 668 externally-managed environment
check_pep668() {
    python_version=$(python3 --version 2>&1 | grep -oP '\d+\.\d+')
    marker_file="/usr/lib/python${python_version}/EXTERNALLY-MANAGED"

    if [ -f "$marker_file" ]; then
        return 0  # PEP 668 detected
    else
        return 1  # No PEP 668
    fi
}

# Function to check TUI dependencies
check_tui_dependencies() {
    local python_exe="$1"
    local missing_deps=()

    # Check for textual
    if ! "$python_exe" -c "import textual" &>/dev/null; then
        missing_deps+=("textual")
    fi

    # Check for watchdog
    if ! "$python_exe" -c "import watchdog" &>/dev/null; then
        missing_deps+=("watchdog")
    fi

    # Check for rich
    if ! "$python_exe" -c "import rich" &>/dev/null; then
        missing_deps+=("rich")
    fi

    # Check for yaml
    if ! "$python_exe" -c "import yaml" &>/dev/null; then
        missing_deps+=("yaml")
    fi

    if [ ${#missing_deps[@]} -eq 0 ]; then
        return 0  # All dependencies present
    else
        return 1  # Missing dependencies
    fi
}

# Function to validate TUI dependencies versions
validate_tui_versions() {
    local python_exe="$1"

    echo -e "${CYAN}Validating TUI dependency versions...${RESET}"

    # Check textual version
    local textual_version=$("$python_exe" -c "import textual; print(textual.__version__)" 2>/dev/null || echo "0.0.0")
    local textual_major=$(echo "$textual_version" | cut -d. -f1)
    local textual_minor=$(echo "$textual_version" | cut -d. -f2)

    if [ "$textual_major" -eq 0 ] && [ "$textual_minor" -lt 83 ]; then
        echo -e "${YELLOW}⚠ textual version $textual_version is older than recommended (>=0.83.0)${RESET}"
        return 1
    fi

    # Check watchdog version
    local watchdog_version=$("$python_exe" -c "import watchdog; print(watchdog.__version__)" 2>/dev/null || echo "0.0.0")
    local watchdog_major=$(echo "$watchdog_version" | cut -d. -f1)

    if [ "$watchdog_major" -lt 4 ]; then
        echo -e "${YELLOW}⚠ watchdog version $watchdog_version is older than recommended (>=4.0.0)${RESET}"
        return 1
    fi

    echo -e "${GREEN}✓ textual ${textual_version}${RESET}"
    echo -e "${GREEN}✓ watchdog ${watchdog_version}${RESET}"

    return 0
}

# Function to install with virtual environment
install_with_venv() {
    echo ""
    echo -e "${CYAN}Creating virtual environment...${RESET}"

    VENV_DIR="$YOYO_DIR/venv"

    # Create venv if it doesn't exist
    if [ ! -d "$VENV_DIR" ]; then
        if python3 -m venv "$VENV_DIR"; then
            echo -e "${GREEN}✓ Virtual environment created at $VENV_DIR${RESET}"
        else
            echo -e "${RED}✗ Failed to create virtual environment${RESET}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ Virtual environment already exists at $VENV_DIR${RESET}"
    fi

    # Activate venv and install requirements
    echo ""
    echo -e "${CYAN}Installing dependencies in virtual environment...${RESET}"

    if "$VENV_DIR/bin/pip" install -r "$YOYO_DIR/requirements.txt"; then
        echo ""
        echo -e "${GREEN}✓ All dependencies installed successfully in venv!${RESET}"
        echo ""

        # Validate TUI dependencies
        validate_tui_versions "$VENV_DIR/bin/python3"

        echo ""
        echo -e "${CYAN}Virtual environment location:${RESET} $VENV_DIR"
        echo -e "${CYAN}Python executable:${RESET} $VENV_DIR/bin/python3"
        return 0
    else
        echo ""
        echo -e "${RED}✗ Failed to install dependencies in venv${RESET}"
        return 1
    fi
}

# Function to install with pipx
install_with_pipx() {
    echo ""
    echo -e "${CYAN}Checking for pipx...${RESET}"

    if ! command -v pipx &> /dev/null; then
        echo -e "${RED}✗ pipx is not installed${RESET}"
        echo ""
        echo "Install pipx first:"
        echo "  sudo apt install pipx    # Debian/Ubuntu"
        echo "  brew install pipx        # macOS"
        return 1
    fi

    echo -e "${GREEN}✓ pipx is available${RESET}"
    echo ""
    echo -e "${CYAN}Installing packages with pipx...${RESET}"

    # Install each package individually with pipx
    packages="rich watchdog pyyaml"
    for pkg in $packages; do
        if pipx install "$pkg" 2>/dev/null || pipx inject rich "$pkg" 2>/dev/null; then
            echo -e "${GREEN}✓ Installed $pkg${RESET}"
        else
            echo -e "${YELLOW}⚠ Could not install $pkg with pipx${RESET}"
        fi
    done

    echo ""
    echo -e "${GREEN}✓ pipx installation complete${RESET}"
    return 0
}

# Function to install with apt packages
install_with_apt() {
    echo ""
    echo -e "${CYAN}Installing system packages with apt...${RESET}"
    echo ""

    packages="python3-rich python3-watchdog python3-yaml python3-textual"

    if command -v apt &> /dev/null; then
        # Note: python3-textual may not be available on all systems
        echo -e "${YELLOW}Note: python3-textual may not be available as a system package${RESET}"
        echo -e "${YELLOW}      If apt fails, consider using virtual environment instead${RESET}"
        echo ""

        if sudo apt install -y $packages; then
            echo ""
            echo -e "${GREEN}✓ All system packages installed successfully!${RESET}"
            echo ""
            validate_tui_versions python3
            return 0
        else
            echo ""
            echo -e "${RED}✗ Failed to install some system packages${RESET}"
            echo -e "${YELLOW}Trying without textual (will use pip for TUI)...${RESET}"

            # Try without textual
            packages_without_textual="python3-rich python3-watchdog python3-yaml"
            if sudo apt install -y $packages_without_textual; then
                echo -e "${GREEN}✓ Base packages installed${RESET}"
                echo -e "${YELLOW}⚠ textual not available via apt${RESET}"
                echo ""
                echo "To enable full TUI functionality, run:"
                echo "  pip3 install textual --user"
                return 1
            else
                echo -e "${RED}✗ Failed to install system packages${RESET}"
                return 1
            fi
        fi
    else
        echo -e "${RED}✗ apt package manager not found${RESET}"
        echo "This method is only available on Debian/Ubuntu systems"
        return 1
    fi
}

# Function to install with --break-system-packages
install_with_break_system() {
    echo ""
    echo -e "${RED}${BOLD}⚠️  WARNING: Override System Protection${RESET}"
    echo ""
    echo "This will force pip to install packages system-wide, potentially"
    echo "causing conflicts with your system's package manager."
    echo ""
    read -p "Are you sure you want to continue? [y/N] " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Installation cancelled${RESET}"
        return 1
    fi

    echo ""
    echo -e "${CYAN}Installing with --break-system-packages...${RESET}"

    if pip3 install -r "$YOYO_DIR/requirements.txt" --break-system-packages; then
        echo ""
        echo -e "${GREEN}✓ Dependencies installed (system protection overridden)${RESET}"
        return 0
    else
        echo ""
        echo -e "${RED}✗ Failed to install dependencies${RESET}"
        return 1
    fi
}

# Function to show installation method menu
show_installation_menu() {
    echo ""
    echo -e "${YELLOW}⚠️  PEP 668 Externally-Managed Environment Detected${RESET}"
    echo ""
    echo "Your system prevents direct pip installations to avoid conflicts."
    echo "Please choose an installation method:"
    echo ""
    echo -e "${CYAN}1)${RESET} ${BOLD}Virtual Environment${RESET} (Recommended)"
    echo "   • Creates isolated Python environment in ~/.yoyo-dev/venv"
    echo "   • Clean, no system conflicts"
    echo ""
    echo -e "${CYAN}2)${RESET} ${BOLD}pipx${RESET} (If available)"
    echo "   • Install packages in isolated environments"
    echo "   • Requires pipx to be installed"
    echo ""
    echo -e "${CYAN}3)${RESET} ${BOLD}System Packages${RESET} (via apt)"
    echo "   • Use Debian/Ubuntu packages"
    echo "   • May be older versions"
    echo ""
    echo -e "${CYAN}4)${RESET} ${BOLD}Override Protection${RESET} (Not recommended)"
    echo "   • Force install with --break-system-packages"
    echo "   • May cause system conflicts"
    echo ""
    echo -e "${CYAN}5)${RESET} ${BOLD}Skip Installation${RESET}"
    echo "   • Use Bash fallback dashboard"
    echo "   • No Python dependencies required"
    echo ""
    read -p "Choose installation method [1-5]: " -n 1 -r
    echo ""
    return 0
}

# Install dependencies
echo -e "${CYAN}3. Installing dashboard dependencies...${RESET}"
echo ""

# Change to yoyo-dev directory
YOYO_DIR="$HOME/.yoyo-dev"
if [ ! -f "$YOYO_DIR/requirements.txt" ]; then
    echo -e "${RED}✗ requirements.txt not found in $YOYO_DIR${RESET}"
    echo ""
    echo "Continuing without Python dashboard (Bash fallback will be used)"
    exit 0
fi

cd "$YOYO_DIR" || exit 0

# Check for PEP 668 and show menu if detected
if check_pep668; then
    show_installation_menu
    INSTALL_METHOD=$REPLY
else
    # No PEP 668, use traditional pip install
    if pip3 install -r requirements.txt --user; then
        echo ""
        echo -e "${GREEN}✓ All dependencies installed successfully!${RESET}"
    else
        echo ""
        echo -e "${RED}✗ Failed to install dependencies${RESET}"
        echo ""
        echo "Continuing without Python dashboard (Bash fallback will be used)"
    fi
    INSTALL_METHOD="none"
fi

# Handle installation method selection
case "$INSTALL_METHOD" in
    1)
        install_with_venv
        ;;
    2)
        install_with_pipx
        ;;
    3)
        install_with_apt
        ;;
    4)
        install_with_break_system
        ;;
    5)
        echo ""
        echo -e "${YELLOW}⏭️  Skipping Python dashboard installation${RESET}"
        echo ""
        echo "The Bash fallback dashboard will be used instead."
        echo "You can install Python dependencies later by running:"
        echo "  ~/.yoyo-dev/setup/install-dashboard-deps.sh"
        ;;
    none)
        # Already handled above
        ;;
esac

echo ""
echo -e "${BOLD}${GREEN}┌────────────────────────────────────────────┐${RESET}"
echo -e "${BOLD}${GREEN}│${RESET}  ✓ ${BOLD}Dashboard Setup Complete${RESET}               ${BOLD}${GREEN}│${RESET}"
echo -e "${BOLD}${GREEN}└────────────────────────────────────────────┘${RESET}"
echo ""

# Final TUI validation
echo -e "${CYAN}Final validation...${RESET}"
if [ -d "$HOME/.yoyo-dev/venv" ]; then
    # Check venv installation
    if check_tui_dependencies "$HOME/.yoyo-dev/venv/bin/python3"; then
        echo -e "${GREEN}✓ All TUI dependencies installed and validated${RESET}"
        echo -e "${GREEN}✓ Virtual environment: $HOME/.yoyo-dev/venv${RESET}"
    else
        echo -e "${YELLOW}⚠ Some TUI dependencies may be missing${RESET}"
        echo -e "${YELLOW}  Dashboard will still work, but TUI mode may be limited${RESET}"
    fi
elif command -v python3 &> /dev/null; then
    # Check system installation
    if check_tui_dependencies python3; then
        echo -e "${GREEN}✓ All TUI dependencies installed and validated${RESET}"
    else
        echo -e "${YELLOW}⚠ Some TUI dependencies may be missing${RESET}"
        echo -e "${YELLOW}  Run: pip3 install -r ~/.yoyo-dev/requirements.txt --user${RESET}"
    fi
fi

echo ""
echo -e "${CYAN}Next steps:${RESET}"
echo "  • Dashboard will be used automatically in visual mode"
echo "  • Run ${GREEN}yoyo${RESET} to launch with the new dashboard"
echo "  • Falls back to Bash version if any issues occur"
echo ""
