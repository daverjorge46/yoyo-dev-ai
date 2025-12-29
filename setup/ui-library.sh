#!/bin/bash

# Yoyo Dev UI Library
# Shared UI components and functions for installation, update, and startup scripts

# ============================================================================
# Color Palette - Catppuccin Mocha (matching TUI v4)
# ============================================================================

# Base colors
export UI_ROSEWATER='\033[38;2;245;224;220m'
export UI_FLAMINGO='\033[38;2;242;205;205m'
export UI_PINK='\033[38;2;245;194;231m'
export UI_MAUVE='\033[38;2;203;166;247m'
export UI_RED='\033[38;2;243;139;168m'
export UI_MAROON='\033[38;2;235;160;172m'
export UI_PEACH='\033[38;2;250;179;135m'
export UI_YELLOW='\033[38;2;249;226;175m'
export UI_GREEN='\033[38;2;166;227;161m'
export UI_TEAL='\033[38;2;148;226;213m'
export UI_SKY='\033[38;2;137;220;235m'
export UI_SAPPHIRE='\033[38;2;116;199;236m'
export UI_BLUE='\033[38;2;137;180;250m'
export UI_LAVENDER='\033[38;2;180;190;254m'

# Text colors
export UI_TEXT='\033[38;2;205;214;244m'
export UI_SUBTEXT1='\033[38;2;186;194;222m'
export UI_SUBTEXT0='\033[38;2;166;173;200m'

# Surface colors
export UI_OVERLAY2='\033[38;2;147;153;178m'
export UI_OVERLAY1='\033[38;2;127;132;156m'
export UI_OVERLAY0='\033[38;2;108;112;134m'
export UI_SURFACE2='\033[38;2;88;91;112m'
export UI_SURFACE1='\033[38;2;69;71;90m'
export UI_SURFACE0='\033[38;2;49;50;68m'

# Base colors
export UI_BASE='\033[38;2;30;30;46m'
export UI_MANTLE='\033[38;2;24;24;37m'
export UI_CRUST='\033[38;2;17;17;27m'

# Standard colors (backwards compatible)
export UI_BOLD='\033[1m'
export UI_DIM='\033[2m'
export UI_ITALIC='\033[3m'
export UI_UNDERLINE='\033[4m'
export UI_RESET='\033[0m'

# Semantic colors
export UI_PRIMARY="$UI_BLUE"
export UI_SUCCESS="$UI_GREEN"
export UI_WARNING="$UI_YELLOW"
export UI_ERROR="$UI_RED"
export UI_INFO="$UI_SAPPHIRE"
export UI_ACCENT="$UI_MAUVE"

# ============================================================================
# Box Drawing Characters
# ============================================================================

export BOX_TL='╭'  # Top-left corner
export BOX_TR='╮'  # Top-right corner
export BOX_BL='╰'  # Bottom-left corner
export BOX_BR='╯'  # Bottom-right corner
export BOX_H='─'   # Horizontal line
export BOX_V='│'   # Vertical line
export BOX_VR='├'  # Vertical-right junction
export BOX_VL='┤'  # Vertical-left junction
export BOX_HU='┴'  # Horizontal-up junction
export BOX_HD='┬'  # Horizontal-down junction
export BOX_CROSS='┼' # Cross junction

# Double-line box characters
export BOX_DBL_TL='╔'
export BOX_DBL_TR='╗'
export BOX_DBL_BL='╚'
export BOX_DBL_BR='╝'
export BOX_DBL_H='═'
export BOX_DBL_V='║'

# ============================================================================
# Icons and Symbols
# ============================================================================

export ICON_SUCCESS='✓'
export ICON_ERROR='✗'
export ICON_WARNING='⚠'
export ICON_INFO='ℹ'
export ICON_PENDING='○'
export ICON_RUNNING='⏳'
export ICON_ROCKET='🚀'
export ICON_PACKAGE='📦'
export ICON_FOLDER='📁'
export ICON_FILE='📄'
export ICON_WRENCH='🔧'
export ICON_SPARKLES='✨'
export ICON_ARROW='→'
export ICON_CHECK='☑'
export ICON_UNCHECK='☐'
export ICON_STAR='★'
export ICON_CIRCLE='◉'

# ============================================================================
# UI Components
# ============================================================================

# Print a horizontal line
ui_line() {
    local width=${1:-70}
    local char=${2:-$BOX_H}
    local color=${3:-$UI_OVERLAY0}

    printf "${color}"
    printf "%${width}s" | tr ' ' "$char"
    printf "${UI_RESET}\n"
}

# Print a box header
ui_box_header() {
    local title="$1"
    local width=${2:-70}
    local color=${3:-$UI_PRIMARY}

    local padding=$(( (width - ${#title} - 2) / 2 ))
    local right_padding=$(( width - ${#title} - padding - 2 ))

    echo ""
    printf "${color}${BOX_DBL_TL}"
    printf "%${width}s" | tr ' ' "$BOX_DBL_H"
    printf "${BOX_DBL_TR}${UI_RESET}\n"

    printf "${color}${BOX_DBL_V}${UI_RESET}"
    printf "%${padding}s" ""
    printf "${UI_BOLD}${color}%s${UI_RESET}" "$title"
    printf "%${right_padding}s" ""
    printf "${color}${BOX_DBL_V}${UI_RESET}\n"

    printf "${color}${BOX_DBL_BL}"
    printf "%${width}s" | tr ' ' "$BOX_DBL_H"
    printf "${BOX_DBL_BR}${UI_RESET}\n"
    echo ""
}

# Print a section header
ui_section() {
    local title="$1"
    local icon="${2:-}"

    echo ""
    if [ -n "$icon" ]; then
        echo -e "${UI_ACCENT}${BOX_TL}${BOX_H}${BOX_H} ${UI_BOLD}${icon} ${title}${UI_RESET}"
    else
        echo -e "${UI_ACCENT}${BOX_TL}${BOX_H}${BOX_H} ${UI_BOLD}${title}${UI_RESET}"
    fi
    echo ""
}

# Print a success message
ui_success() {
    local message="$1"
    echo -e "${UI_SUCCESS}${ICON_SUCCESS}${UI_RESET} ${message}"
}

# Print an error message
ui_error() {
    local message="$1"
    echo -e "${UI_ERROR}${ICON_ERROR}${UI_RESET} ${message}"
}

# Print a warning message
ui_warning() {
    local message="$1"
    echo -e "${UI_WARNING}${ICON_WARNING}${UI_RESET}  ${message}"
}

# Print an info message
ui_info() {
    local message="$1"
    echo -e "${UI_INFO}${ICON_INFO}${UI_RESET}  ${message}"
}

# Print a step message
ui_step() {
    local step_num="$1"
    local total_steps="$2"
    local message="$3"

    echo -e "${UI_ACCENT}[${step_num}/${total_steps}]${UI_RESET} ${message}"
}

# Print a progress indicator
ui_progress() {
    local current="$1"
    local total="$2"
    local width=30

    local filled=$(( current * width / total ))
    local empty=$(( width - filled ))

    printf "${UI_PRIMARY}["
    printf "%${filled}s" | tr ' ' '█'
    printf "${UI_OVERLAY0}"
    printf "%${empty}s" | tr ' ' '░'
    printf "${UI_PRIMARY}] ${UI_BOLD}%d%%${UI_RESET}\n" $(( current * 100 / total ))
}

# Print a menu option
ui_option() {
    local number="$1"
    local title="$2"
    local description="$3"
    local selected="${4:-false}"

    if [ "$selected" = "true" ]; then
        echo -e "  ${UI_PRIMARY}${ICON_ARROW} ${UI_BOLD}${number}.${UI_RESET} ${UI_BOLD}${title}${UI_RESET} ${UI_DIM}(recommended)${UI_RESET}"
    else
        echo -e "  ${UI_SUBTEXT0}  ${number}.${UI_RESET} ${title}"
    fi

    if [ -n "$description" ]; then
        echo -e "     ${UI_DIM}${description}${UI_RESET}"
    fi
    echo ""
}

# Print a key-value pair
ui_kv() {
    local key="$1"
    local value="$2"
    local width=20

    printf "  ${UI_OVERLAY1}%-${width}s${UI_RESET} ${UI_TEXT}%s${UI_RESET}\n" "$key:" "$value"
}

# Print a banner with ASCII art
ui_banner() {
    local version="$1"

    echo ""
    echo -e "${UI_PRIMARY}"
    cat << 'EOF'
    ╦ ╦╔═╗╦ ╦╔═╗  ╔╦╗╔═╗╦  ╦
    ╚╦╝║ ║╚╦╝║ ║───║║║╣ ╚╗╔╝
     ╩ ╚═╝ ╩ ╚═╝  ═╩╝╚═╝ ╚╝
EOF
    echo -e "${UI_RESET}"
    echo -e "${UI_SUBTEXT1}    AI-Assisted Development Framework${UI_RESET}"
    echo -e "${UI_DIM}    Version ${version}${UI_RESET}"
    echo ""
}

# Print TUI v4 badge
ui_tui_badge() {
    echo -e "${UI_SUCCESS}${ICON_SPARKLES}${UI_RESET} ${UI_BOLD}TUI v4${UI_RESET} ${UI_DIM}(TypeScript/Ink)${UI_RESET}"
}

# Ask yes/no question
ui_ask() {
    local question="$1"
    local default="${2:-y}"

    if [ "$default" = "y" ]; then
        echo -ne "${UI_INFO}${ICON_INFO}${UI_RESET}  ${question} ${UI_DIM}[Y/n]${UI_RESET} "
    else
        echo -ne "${UI_INFO}${ICON_INFO}${UI_RESET}  ${question} ${UI_DIM}[y/N]${UI_RESET} "
    fi

    read -r response

    if [ "$default" = "y" ]; then
        [[ "$response" =~ ^([yY][eE][sS]|[yY]|)$ ]]
    else
        [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
    fi
}

# Show a spinner while running a command
ui_spinner() {
    local pid=$1
    local message="$2"
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'

    echo -n "$message "

    while kill -0 "$pid" 2>/dev/null; do
        local temp=${spinstr#?}
        printf "${UI_PRIMARY}%c${UI_RESET}" "$spinstr"
        spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b"
    done

    printf " \b"
}

# Clear screen and show header
ui_clear_screen() {
    clear
    ui_banner "${1:-4.0.0}"
}

# Print a completion message
ui_complete() {
    local message="$1"

    echo ""
    ui_line 70 "$BOX_H" "$UI_SUCCESS"
    echo -e "${UI_SUCCESS}${ICON_SUCCESS} ${UI_BOLD}${message}${UI_RESET}"
    ui_line 70 "$BOX_H" "$UI_SUCCESS"
    echo ""
}

# Print installation summary
ui_summary() {
    local title="$1"
    shift
    local items=("$@")

    echo ""
    echo -e "${UI_ACCENT}${BOX_TL}${BOX_H}${BOX_H} ${UI_BOLD}${title}${UI_RESET}"
    echo ""

    for item in "${items[@]}"; do
        echo -e "  ${UI_SUCCESS}${ICON_CHECK}${UI_RESET} ${item}"
    done

    echo ""
}

# Export all functions
export -f ui_line ui_box_header ui_section ui_success ui_error ui_warning ui_info
export -f ui_step ui_progress ui_option ui_kv ui_banner ui_tui_badge ui_ask
export -f ui_spinner ui_clear_screen ui_complete ui_summary
