#!/bin/bash

# Yoyo Dev UI Library
# Shared UI components and functions for installation, update, and startup scripts

# ============================================================================
# Terminal Color Support Detection
# ============================================================================

# Detect if terminal supports 24-bit true color
# Returns 0 (true) if supported, 1 (false) otherwise
supports_truecolor() {
    # Check COLORTERM environment variable
    case "$COLORTERM" in
        truecolor|24bit)
            return 0
            ;;
    esac

    # Check TERM for known truecolor terminals
    case "$TERM" in
        *-truecolor|*-24bit|xterm-direct|linux-truecolor)
            return 0
            ;;
    esac

    # Check terminal emulator-specific variables
    if [ -n "$KONSOLE_VERSION" ] || [ -n "$KITTY_WINDOW_ID" ] || \
       [ -n "$ITERM_SESSION_ID" ] || [ -n "$ALACRITTY_LOG" ] || \
       [ -n "$WEZTERM_PANE" ]; then
        return 0
    fi

    # Check tmux with truecolor support
    if [ -n "$TMUX" ] && [ "$TERM" = "tmux-256color" ]; then
        return 0
    fi

    # Most modern terminals support truecolor even without advertising it
    # Check if TERM contains 256color as a reasonable fallback
    case "$TERM" in
        *256color*)
            return 0
            ;;
    esac

    return 1
}

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
# Yoyo Brand Colors (#D29922)
# ============================================================================

# Yoyo Yellow - Primary brand color (#D29922 - RGB: 210, 153, 34)
export UI_YOYO_YELLOW='\033[38;2;210;153;34m'

# Yoyo Yellow Background (48 = background, 38 = foreground)
export UI_YOYO_YELLOW_BG='\033[48;2;210;153;34m'

# Yoyo Yellow Dimmed - For borders and subtle accents (RGB: 168, 122, 27)
export UI_YOYO_YELLOW_DIM='\033[38;2;168;122;27m'

# ============================================================================
# Background Panel Colors (GitHub Dark theme)
# ============================================================================

# Panel background - Darkest background for main panels (#161b22 - RGB: 22, 27, 34)
export UI_BG_PANEL='\033[48;2;22;27;34m'

# Elevated background - Slightly lighter for elevated elements (#21262d - RGB: 33, 38, 45)
export UI_BG_ELEVATED='\033[48;2;33;38;45m'

# Highlight background - For hover/focus states (#30363d - RGB: 48, 54, 61)
export UI_BG_HIGHLIGHT='\033[48;2;48;54;61m'

# ============================================================================
# Agent Colors (matching output-formatter.ts ANSI_COLORS)
# ============================================================================

export UI_AGENT_YOYO_AI='\033[36m'         # Cyan
export UI_AGENT_ARTHAS_ORACLE='\033[33m'   # Yellow
export UI_AGENT_ALMA_LIBRARIAN='\033[32m'  # Green
export UI_AGENT_ALVARO_EXPLORE='\033[34m'  # Blue
export UI_AGENT_DAVE_ENGINEER='\033[35m'   # Magenta
export UI_AGENT_ANGELES_WRITER='\033[37m'  # White

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
export BOX_DBL_VR='╠'  # Double vertical-right junction
export BOX_DBL_VL='╣'  # Double vertical-left junction

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
export ICON_CLIPBOARD='📋'
export ICON_BRANCH='🌿'

# Agent-specific icons
export ICON_AGENT_YOYO_AI='🤖'
export ICON_AGENT_ARTHAS_ORACLE='🔮'
export ICON_AGENT_ALMA_LIBRARIAN='📚'
export ICON_AGENT_ALVARO_EXPLORE='🔍'
export ICON_AGENT_DAVE_ENGINEER='🎨'
export ICON_AGENT_ANGELES_WRITER='✍️'

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

# ============================================================================
# Yoyo AI Branded Banner
# ============================================================================

# Get terminal width with fallback
# Returns terminal column count, defaults to 80 if detection fails
_get_terminal_width() {
    local width
    # Try tput first (most reliable)
    if command -v tput &>/dev/null && tput cols &>/dev/null 2>&1; then
        width=$(tput cols 2>/dev/null)
    # Fallback to COLUMNS environment variable
    elif [ -n "$COLUMNS" ]; then
        width="$COLUMNS"
    # Last resort: assume standard 80 columns
    else
        width=80
    fi
    echo "${width:-80}"
}

# Print the branded YOYO AI ASCII banner with double-line border
# Usage: ui_yoyo_banner [version]
# Version defaults to "v6.2.0" if not provided
# Automatically switches to compact mode for terminals < 80 columns
ui_yoyo_banner() {
    local version="${1:-v6.2.0}"
    local tagline="Your AI learns. Your AI remembers. Your AI evolves."
    local term_width
    term_width=$(_get_terminal_width)

    # For narrow terminals (<80 cols), show compact banner
    if [ "$term_width" -lt 80 ]; then
        _ui_yoyo_banner_compact "$version" "$tagline"
        return
    fi

    # Full ASCII art banner for wide terminals
    _ui_yoyo_banner_full "$version" "$tagline" "$term_width"
}

# Compact banner for narrow terminals (<80 columns)
# Shows simplified text-only version without ASCII art
_ui_yoyo_banner_compact() {
    local version="$1"
    local tagline="$2"
    local border_width=40

    echo ""
    # Top border
    echo -ne "${UI_YOYO_YELLOW_DIM}${BOX_DBL_TL}"
    for ((i=0; i<border_width; i++)); do
        echo -n "${BOX_DBL_H}"
    done
    echo -e "${BOX_DBL_TR}${UI_RESET}"

    # Content line with YOYO AI and version
    echo -ne "${UI_YOYO_YELLOW_DIM}${BOX_DBL_V}${UI_RESET}"
    echo -ne "  ${UI_YOYO_YELLOW}${UI_BOLD}YOYO AI${UI_RESET}  "
    echo -ne "${UI_SUBTEXT0}${version}${UI_RESET}"
    # Padding calculation: 2 (left margin) + 7 (YOYO AI) + 2 (spaces) + version length
    local content_len=$((2 + 7 + 2 + ${#version}))
    local padding=$((border_width - content_len))
    if [ "$padding" -gt 0 ]; then
        printf "%${padding}s" ""
    fi
    echo -e "${UI_YOYO_YELLOW_DIM}${BOX_DBL_V}${UI_RESET}"

    # Bottom border
    echo -ne "${UI_YOYO_YELLOW_DIM}${BOX_DBL_BL}"
    for ((i=0; i<border_width; i++)); do
        echo -n "${BOX_DBL_H}"
    done
    echo -e "${BOX_DBL_BR}${UI_RESET}"

    # Tagline below the box
    echo -e "${UI_SUBTEXT0}${tagline}${UI_RESET}"
    echo ""
}

# Full ASCII art banner for wide terminals (>=80 columns)
# Displays block-letter "YOYO AI" with double-line border
_ui_yoyo_banner_full() {
    local version="$1"
    local tagline="$2"
    local term_width="$3"

    # Banner content width (inner content without borders)
    local banner_width=70

    # Cap banner width at terminal width - 2 for borders
    if [ "$banner_width" -gt $((term_width - 2)) ]; then
        banner_width=$((term_width - 2))
    fi

    # ASCII art lines for "YOYO AI" (6 lines tall)
    # Each line is designed to be 63 visible characters
    local art_line1="  ██╗   ██╗ ██████╗ ██╗   ██╗ ██████╗      █████╗ ██╗       "
    local art_line2="  ╚██╗ ██╔╝██╔═══██╗╚██╗ ██╔╝██╔═══██╗    ██╔══██╗██║       "
    local art_line3="   ╚████╔╝ ██║   ██║ ╚████╔╝ ██║   ██║    ███████║██║       "
    local art_line4="    ╚██╔╝  ██║   ██║  ╚██╔╝  ██║   ██║    ██╔══██║██║       "
    local art_line5="     ██║   ╚██████╔╝   ██║   ╚██████╔╝    ██║  ██║██║       "
    local art_line6="     ╚═╝    ╚═════╝    ╚═╝    ╚═════╝     ╚═╝  ╚═╝╚═╝       "

    # Display width of ASCII art (visual characters, not bytes)
    local art_display_width=63

    # Helper to print a padded line inside the banner
    _print_banner_art_line() {
        local content="$1"
        local display_width="$2"
        local padding=$((banner_width - display_width))

        echo -ne "${UI_YOYO_YELLOW_DIM}${BOX_DBL_V}${UI_RESET}"
        echo -ne "${UI_YOYO_YELLOW}${content}${UI_RESET}"
        if [ "$padding" -gt 0 ]; then
            printf "%${padding}s" ""
        fi
        echo -e "${UI_YOYO_YELLOW_DIM}${BOX_DBL_V}${UI_RESET}"
    }

    echo ""

    # Top border
    echo -ne "${UI_YOYO_YELLOW_DIM}${BOX_DBL_TL}"
    for ((i=0; i<banner_width; i++)); do
        echo -n "${BOX_DBL_H}"
    done
    echo -e "${BOX_DBL_TR}${UI_RESET}"

    # ASCII art lines (each is 63 display characters)
    _print_banner_art_line "$art_line1" "$art_display_width"
    _print_banner_art_line "$art_line2" "$art_display_width"
    _print_banner_art_line "$art_line3" "$art_display_width"
    _print_banner_art_line "$art_line4" "$art_display_width"
    _print_banner_art_line "$art_line5" "$art_display_width"
    _print_banner_art_line "$art_line6" "$art_display_width"

    # Middle separator using double-line junction characters
    echo -ne "${UI_YOYO_YELLOW_DIM}${BOX_DBL_VR}"
    for ((i=0; i<banner_width; i++)); do
        echo -n "${BOX_DBL_H}"
    done
    echo -e "${BOX_DBL_VL}${UI_RESET}"

    # Version and tagline line
    # Format: "  v6.2.0  |  Your AI learns..."
    local separator_char="|"
    local info_prefix_len=$((2 + ${#version} + 2 + 1 + 2))  # spaces + version + spaces + | + spaces

    echo -ne "${UI_YOYO_YELLOW_DIM}${BOX_DBL_V}${UI_RESET}"
    echo -ne "${UI_YOYO_YELLOW}  ${version}${UI_RESET}"
    echo -ne "${UI_YOYO_YELLOW_DIM}  ${separator_char}  ${UI_RESET}"
    echo -ne "${UI_SUBTEXT1}${tagline}${UI_RESET}"

    # Calculate remaining padding
    local total_content_len=$((info_prefix_len + ${#tagline}))
    local padding=$((banner_width - total_content_len))
    if [ "$padding" -gt 0 ]; then
        printf "%${padding}s" ""
    fi
    echo -e "${UI_YOYO_YELLOW_DIM}${BOX_DBL_V}${UI_RESET}"

    # Bottom border
    echo -ne "${UI_YOYO_YELLOW_DIM}${BOX_DBL_BL}"
    for ((i=0; i<banner_width; i++)); do
        echo -n "${BOX_DBL_H}"
    done
    echo -e "${BOX_DBL_BR}${UI_RESET}"

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

# ============================================================================
# Progress Bar Renderer
# ============================================================================

# Render a progress bar with filled and empty blocks
# Args: $1 = completed, $2 = total, $3 = width (default 20)
# Output: Progress bar string like "████████░░░░░░░░░░░░"
ui_render_progress_bar() {
    local completed="${1:-0}"
    local total="${2:-1}"
    local width="${3:-20}"

    # Avoid division by zero
    if [ "$total" -eq 0 ]; then
        total=1
    fi

    local filled=$(( completed * width / total ))
    local empty=$(( width - filled ))

    # Ensure we don't exceed width
    if [ "$filled" -gt "$width" ]; then
        filled=$width
        empty=0
    fi

    local bar=""
    for ((i=0; i<filled; i++)); do
        bar+="█"
    done
    for ((i=0; i<empty; i++)); do
        bar+="░"
    done

    echo "$bar"
}

# ============================================================================
# Project Dashboard Panel
# ============================================================================

# Get the most recent active spec from .yoyo-dev/specs/
# Returns: spec name or empty string
_dashboard_get_active_spec() {
    local yoyo_dir="${1:-.yoyo-dev}"
    local specs_dir="${yoyo_dir}/specs"

    if [ ! -d "$specs_dir" ]; then
        echo ""
        return
    fi

    # Find the most recently modified spec that is not completed
    local active_spec=""
    local latest_time=0

    for spec_dir in "$specs_dir"/*/; do
        [ -d "$spec_dir" ] || continue

        local state_file="${spec_dir}state.json"
        if [ -f "$state_file" ]; then
            local current_phase=""

            # Try jq first, fallback to grep/sed
            if command -v jq &>/dev/null; then
                current_phase=$(jq -r '.current_phase // "unknown"' "$state_file" 2>/dev/null)
            else
                # Fallback: grep for current_phase
                current_phase=$(grep -o '"current_phase"[[:space:]]*:[[:space:]]*"[^"]*"' "$state_file" 2>/dev/null | sed 's/.*:.*"\([^"]*\)".*/\1/')
            fi

            # Skip completed specs
            if [ "$current_phase" = "completed" ]; then
                continue
            fi

            # Get modification time
            local mod_time
            mod_time=$(stat -c %Y "$state_file" 2>/dev/null || stat -f %m "$state_file" 2>/dev/null || echo 0)

            if [ "$mod_time" -gt "$latest_time" ]; then
                latest_time=$mod_time
                # Extract spec name from directory name (remove date prefix)
                local dir_name
                dir_name=$(basename "$spec_dir")
                # Remove YYYY-MM-DD- prefix if present
                active_spec=$(echo "$dir_name" | sed 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')
            fi
        fi
    done

    echo "$active_spec"
}

# Get the spec directory path for the active spec
_dashboard_get_active_spec_dir() {
    local yoyo_dir="${1:-.yoyo-dev}"
    local specs_dir="${yoyo_dir}/specs"

    if [ ! -d "$specs_dir" ]; then
        echo ""
        return
    fi

    local latest_time=0
    local active_dir=""

    for spec_dir in "$specs_dir"/*/; do
        [ -d "$spec_dir" ] || continue

        local state_file="${spec_dir}state.json"
        if [ -f "$state_file" ]; then
            local current_phase=""

            if command -v jq &>/dev/null; then
                current_phase=$(jq -r '.current_phase // "unknown"' "$state_file" 2>/dev/null)
            else
                current_phase=$(grep -o '"current_phase"[[:space:]]*:[[:space:]]*"[^"]*"' "$state_file" 2>/dev/null | sed 's/.*:.*"\([^"]*\)".*/\1/')
            fi

            if [ "$current_phase" = "completed" ]; then
                continue
            fi

            local mod_time
            mod_time=$(stat -c %Y "$state_file" 2>/dev/null || stat -f %m "$state_file" 2>/dev/null || echo 0)

            if [ "$mod_time" -gt "$latest_time" ]; then
                latest_time=$mod_time
                active_dir="${spec_dir%/}"
            fi
        fi
    done

    echo "$active_dir"
}

# Count task checkboxes in a tasks.md file
# Returns: "completed total" (e.g., "4 12")
_dashboard_count_tasks() {
    local tasks_file="$1"

    if [ ! -f "$tasks_file" ]; then
        echo "0 0"
        return
    fi

    local completed=0
    local uncompleted=0

    # Count completed tasks: - [x] or - [X]
    completed=$(grep -cE '^\s*-\s*\[x\]' "$tasks_file" 2>/dev/null || echo 0)
    completed=$((completed + $(grep -cE '^\s*-\s*\[X\]' "$tasks_file" 2>/dev/null || echo 0)))

    # Count uncompleted tasks: - [ ]
    uncompleted=$(grep -cE '^\s*-\s*\[\s*\]' "$tasks_file" 2>/dev/null || echo 0)

    local total=$((completed + uncompleted))
    echo "$completed $total"
}

# Count recent fixes (directories from last 7 days)
_dashboard_count_recent_fixes() {
    local yoyo_dir="${1:-.yoyo-dev}"
    local fixes_dir="${yoyo_dir}/fixes"

    if [ ! -d "$fixes_dir" ]; then
        echo "0"
        return
    fi

    local count=0
    local seven_days_ago
    seven_days_ago=$(date -d '7 days ago' +%s 2>/dev/null || date -v-7d +%s 2>/dev/null || echo 0)

    for fix_dir in "$fixes_dir"/*/; do
        [ -d "$fix_dir" ] || continue

        local dir_time
        dir_time=$(stat -c %Y "$fix_dir" 2>/dev/null || stat -f %m "$fix_dir" 2>/dev/null || echo 0)

        if [ "$dir_time" -ge "$seven_days_ago" ]; then
            count=$((count + 1))
        fi
    done

    echo "$count"
}

# Get current git branch
_dashboard_get_git_branch() {
    local branch
    branch=$(git branch --show-current 2>/dev/null)

    if [ -z "$branch" ]; then
        # Try alternative method for detached HEAD
        branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    fi

    if [ -z "$branch" ] || [ "$branch" = "HEAD" ]; then
        echo ""
    else
        echo "$branch"
    fi
}

# Display the project dashboard panel
# Args: $1 = yoyo_dir (optional, defaults to .yoyo-dev)
#       $2 = panel_width (optional, defaults to 71)
ui_project_dashboard() {
    local yoyo_dir="${1:-.yoyo-dev}"
    local panel_width="${2:-71}"
    local inner_width=$((panel_width - 2))

    # Gather data
    local active_spec
    active_spec=$(_dashboard_get_active_spec "$yoyo_dir")

    local spec_dir
    spec_dir=$(_dashboard_get_active_spec_dir "$yoyo_dir")

    local tasks_completed=0
    local tasks_total=0
    if [ -n "$spec_dir" ] && [ -f "${spec_dir}/tasks.md" ]; then
        local task_counts
        task_counts=$(_dashboard_count_tasks "${spec_dir}/tasks.md")
        tasks_completed=$(echo "$task_counts" | cut -d' ' -f1)
        tasks_total=$(echo "$task_counts" | cut -d' ' -f2)
    fi

    local recent_fixes
    recent_fixes=$(_dashboard_count_recent_fixes "$yoyo_dir")

    local git_branch
    git_branch=$(_dashboard_get_git_branch)

    # Calculate percentage for progress bar
    local percentage=0
    if [ "$tasks_total" -gt 0 ]; then
        percentage=$(( tasks_completed * 100 / tasks_total ))
    fi

    # Generate progress bar (20 chars wide)
    local progress_bar
    progress_bar=$(ui_render_progress_bar "$tasks_completed" "$tasks_total" 20)

    # Build the panel
    echo ""

    # Top border
    printf "${UI_YOYO_YELLOW_DIM}${BOX_TL}"
    for ((i=0; i<inner_width; i++)); do printf "${BOX_H}"; done
    printf "${BOX_TR}${UI_RESET}\n"

    # Header row with background
    local header_text="PROJECT DASHBOARD"
    local badge_text="[yoyo]"
    local header_padding=$((inner_width - ${#header_text} - ${#badge_text} - 4))

    printf "${UI_YOYO_YELLOW_DIM}${BOX_V}${UI_RESET}"
    printf "${UI_BG_PANEL}  ${UI_YOYO_YELLOW}${UI_BOLD}%s${UI_RESET}${UI_BG_PANEL}" "$header_text"
    printf "%${header_padding}s" ""
    printf "${UI_SUBTEXT0}%s${UI_RESET}${UI_BG_PANEL}  " "$badge_text"
    printf "${UI_RESET}${UI_YOYO_YELLOW_DIM}${BOX_V}${UI_RESET}\n"

    # Separator
    printf "${UI_YOYO_YELLOW_DIM}${BOX_VR}"
    for ((i=0; i<inner_width; i++)); do printf "${BOX_H}"; done
    printf "${BOX_VL}${UI_RESET}\n"

    # Active Spec row
    local spec_display
    if [ -n "$active_spec" ]; then
        spec_display="$active_spec"
    else
        spec_display="No active spec"
    fi
    # Truncate if too long
    local max_spec_len=$((inner_width - 20))
    if [ ${#spec_display} -gt $max_spec_len ]; then
        spec_display="${spec_display:0:$((max_spec_len - 3))}..."
    fi
    local spec_row_padding=$((inner_width - 18 - ${#spec_display}))

    printf "${UI_YOYO_YELLOW_DIM}${BOX_V}${UI_RESET}"
    printf "${UI_BG_PANEL}  ${ICON_CLIPBOARD} ${UI_TEXT}Active Spec:  ${UI_RESET}${UI_BG_PANEL}"
    if [ -n "$active_spec" ]; then
        printf "${UI_GREEN}%-s${UI_RESET}${UI_BG_PANEL}" "$spec_display"
    else
        printf "${UI_SUBTEXT0}%-s${UI_RESET}${UI_BG_PANEL}" "$spec_display"
    fi
    printf "%${spec_row_padding}s" ""
    printf "${UI_RESET}${UI_YOYO_YELLOW_DIM}${BOX_V}${UI_RESET}\n"

    # Tasks row with progress bar
    local tasks_display
    if [ "$tasks_total" -gt 0 ]; then
        tasks_display="${tasks_completed}/${tasks_total} completed"
    else
        tasks_display="No tasks"
    fi
    # Progress bar display: tasks_display + "  " + progress_bar + "  " + percentage%
    local tasks_info_len=$((${#tasks_display} + 2 + 20 + 2 + ${#percentage} + 1))
    local tasks_row_padding=$((inner_width - 18 - tasks_info_len))
    if [ $tasks_row_padding -lt 0 ]; then
        tasks_row_padding=0
    fi

    printf "${UI_YOYO_YELLOW_DIM}${BOX_V}${UI_RESET}"
    printf "${UI_BG_PANEL}  ${ICON_SUCCESS} ${UI_TEXT}Tasks:        ${UI_RESET}${UI_BG_PANEL}"
    if [ "$tasks_total" -gt 0 ]; then
        printf "${UI_TEXT}%s${UI_RESET}${UI_BG_PANEL}  " "$tasks_display"
        printf "${UI_GREEN}%s${UI_RESET}${UI_BG_PANEL}  " "$progress_bar"
        printf "${UI_BOLD}%d%%${UI_RESET}${UI_BG_PANEL}" "$percentage"
    else
        printf "${UI_SUBTEXT0}%s${UI_RESET}${UI_BG_PANEL}" "$tasks_display"
        printf "%$((2 + 20 + 2 + 3))s" ""
    fi
    printf "%${tasks_row_padding}s" ""
    printf "${UI_RESET}${UI_YOYO_YELLOW_DIM}${BOX_V}${UI_RESET}\n"

    # Recent Fixes row
    local fixes_display="${recent_fixes} in last 7 days"
    local fixes_row_padding=$((inner_width - 18 - ${#fixes_display}))

    printf "${UI_YOYO_YELLOW_DIM}${BOX_V}${UI_RESET}"
    printf "${UI_BG_PANEL}  ${ICON_WRENCH} ${UI_TEXT}Recent Fixes: ${UI_RESET}${UI_BG_PANEL}"
    if [ "$recent_fixes" -gt 0 ]; then
        printf "${UI_PEACH}%s${UI_RESET}${UI_BG_PANEL}" "$fixes_display"
    else
        printf "${UI_SUBTEXT0}%s${UI_RESET}${UI_BG_PANEL}" "$fixes_display"
    fi
    printf "%${fixes_row_padding}s" ""
    printf "${UI_RESET}${UI_YOYO_YELLOW_DIM}${BOX_V}${UI_RESET}\n"

    # Git Branch row
    local branch_display
    if [ -n "$git_branch" ]; then
        branch_display="$git_branch"
    else
        branch_display="Not a git repository"
    fi
    # Truncate if too long
    local max_branch_len=$((inner_width - 20))
    if [ ${#branch_display} -gt $max_branch_len ]; then
        branch_display="${branch_display:0:$((max_branch_len - 3))}..."
    fi
    local branch_row_padding=$((inner_width - 18 - ${#branch_display}))

    printf "${UI_YOYO_YELLOW_DIM}${BOX_V}${UI_RESET}"
    printf "${UI_BG_PANEL}  ${ICON_BRANCH} ${UI_TEXT}Branch:       ${UI_RESET}${UI_BG_PANEL}"
    if [ -n "$git_branch" ]; then
        printf "${UI_SAPPHIRE}%s${UI_RESET}${UI_BG_PANEL}" "$branch_display"
    else
        printf "${UI_SUBTEXT0}%s${UI_RESET}${UI_BG_PANEL}" "$branch_display"
    fi
    printf "%${branch_row_padding}s" ""
    printf "${UI_RESET}${UI_YOYO_YELLOW_DIM}${BOX_V}${UI_RESET}\n"

    # Bottom border
    printf "${UI_YOYO_YELLOW_DIM}${BOX_BL}"
    for ((i=0; i<inner_width; i++)); do printf "${BOX_H}"; done
    printf "${BOX_BR}${UI_RESET}\n"

    echo ""
}

# ============================================================================
# Agent Activity Panel
# ============================================================================

# Get agent color by name
# Usage: color=$(ui_get_agent_color "alvaro-explore")
ui_get_agent_color() {
    local agent_name="$1"

    case "$agent_name" in
        "yoyo-ai")
            echo "$UI_AGENT_YOYO_AI"
            ;;
        "arthas-oracle")
            echo "$UI_AGENT_ARTHAS_ORACLE"
            ;;
        "alma-librarian")
            echo "$UI_AGENT_ALMA_LIBRARIAN"
            ;;
        "alvaro-explore")
            echo "$UI_AGENT_ALVARO_EXPLORE"
            ;;
        "dave-engineer")
            echo "$UI_AGENT_DAVE_ENGINEER"
            ;;
        "angeles-writer")
            echo "$UI_AGENT_ANGELES_WRITER"
            ;;
        *)
            echo "$UI_TEXT"
            ;;
    esac
}

# Get agent icon by name
# Usage: icon=$(ui_get_agent_icon "alvaro-explore")
ui_get_agent_icon() {
    local agent_name="$1"

    case "$agent_name" in
        "yoyo-ai")
            echo "$ICON_AGENT_YOYO_AI"
            ;;
        "arthas-oracle")
            echo "$ICON_AGENT_ARTHAS_ORACLE"
            ;;
        "alma-librarian")
            echo "$ICON_AGENT_ALMA_LIBRARIAN"
            ;;
        "alvaro-explore")
            echo "$ICON_AGENT_ALVARO_EXPLORE"
            ;;
        "dave-engineer")
            echo "$ICON_AGENT_DAVE_ENGINEER"
            ;;
        "angeles-writer")
            echo "$ICON_AGENT_ANGELES_WRITER"
            ;;
        *)
            echo "$ICON_CIRCLE"
            ;;
    esac
}

# Get agent description by name
# Usage: desc=$(ui_get_agent_description "alvaro-explore")
ui_get_agent_description() {
    local agent_name="$1"

    case "$agent_name" in
        "yoyo-ai")
            echo "Primary orchestrator"
            ;;
        "arthas-oracle")
            echo "Strategic advisor and debugger"
            ;;
        "alma-librarian")
            echo "External research specialist"
            ;;
        "alvaro-explore")
            echo "Codebase search specialist"
            ;;
        "dave-engineer")
            echo "UI/UX development specialist"
            ;;
        "angeles-writer")
            echo "Technical documentation writer"
            ;;
        *)
            echo "Specialized agent"
            ;;
    esac
}

# Print agent activity panel
# Usage: ui_agent_panel "alvaro-explore" "Finding theme configuration files"
#
# Panel layout:
# ╔═══════════════════════════════════════════════════════════════════════╗
# ║  🔍 ALVARO-EXPLORE                                                    ║
# ║  ─────────────────                                                    ║
# ║  Codebase search specialist                                           ║
# ║  Task: "theme configuration files"                                    ║
# ╚═══════════════════════════════════════════════════════════════════════╝
ui_agent_panel() {
    local agent_name="$1"
    local task_description="${2:-}"
    local width=${3:-71}

    # Get agent-specific styling
    local agent_color
    agent_color=$(ui_get_agent_color "$agent_name")
    local agent_icon
    agent_icon=$(ui_get_agent_icon "$agent_name")
    local agent_desc
    agent_desc=$(ui_get_agent_description "$agent_name")

    # Convert agent name to uppercase for display
    local agent_upper
    agent_upper=$(echo "$agent_name" | tr '[:lower:]' '[:upper:]')

    # Calculate underline length (matches agent name length)
    local underline_len=${#agent_upper}
    local underline
    underline=$(printf '%*s' "$underline_len" | tr ' ' '─')

    # Calculate content width (width minus borders and padding)
    local content_width=$((width - 4))

    # Print top border with Yoyo yellow
    echo ""
    echo -ne "${UI_YOYO_YELLOW_DIM}${BOX_DBL_TL}"
    for ((i=0; i<width; i++)); do echo -n "$BOX_DBL_H"; done
    echo -e "${BOX_DBL_TR}${UI_RESET}"

    # Print agent name line with background
    echo -ne "${UI_YOYO_YELLOW_DIM}${BOX_DBL_V}${UI_RESET}${UI_BG_ELEVATED}"
    echo -ne "  ${agent_icon} ${agent_color}${UI_BOLD}${agent_upper}${UI_RESET}${UI_BG_ELEVATED}"
    local name_len=$((${#agent_upper} + 4))  # icon + space + name
    local padding=$((content_width - name_len))
    printf "%${padding}s" ""
    echo -e "${UI_RESET}${UI_YOYO_YELLOW_DIM}${BOX_DBL_V}${UI_RESET}"

    # Print underline
    echo -ne "${UI_YOYO_YELLOW_DIM}${BOX_DBL_V}${UI_RESET}${UI_BG_ELEVATED}"
    echo -ne "  ${UI_OVERLAY0}${underline}${UI_RESET}${UI_BG_ELEVATED}"
    local underline_padding=$((content_width - underline_len - 2))
    printf "%${underline_padding}s" ""
    echo -e "${UI_RESET}${UI_YOYO_YELLOW_DIM}${BOX_DBL_V}${UI_RESET}"

    # Print agent description
    echo -ne "${UI_YOYO_YELLOW_DIM}${BOX_DBL_V}${UI_RESET}${UI_BG_ELEVATED}"
    echo -ne "  ${UI_SUBTEXT1}${agent_desc}${UI_RESET}${UI_BG_ELEVATED}"
    local desc_padding=$((content_width - ${#agent_desc} - 2))
    printf "%${desc_padding}s" ""
    echo -e "${UI_RESET}${UI_YOYO_YELLOW_DIM}${BOX_DBL_V}${UI_RESET}"

    # Print task description if provided
    if [ -n "$task_description" ]; then
        # Truncate task description if too long
        local max_task_len=$((content_width - 12))  # "  Task: " + quotes
        local task_display="$task_description"
        if [ ${#task_description} -gt $max_task_len ]; then
            task_display="${task_description:0:$((max_task_len - 3))}..."
        fi

        echo -ne "${UI_YOYO_YELLOW_DIM}${BOX_DBL_V}${UI_RESET}${UI_BG_ELEVATED}"
        echo -ne "  ${UI_TEXT}Task: ${UI_YOYO_YELLOW}\"${task_display}\"${UI_RESET}${UI_BG_ELEVATED}"
        local task_len=$((8 + ${#task_display}))  # "  Task: " + quotes + content
        local task_padding=$((content_width - task_len))
        printf "%${task_padding}s" ""
        echo -e "${UI_RESET}${UI_YOYO_YELLOW_DIM}${BOX_DBL_V}${UI_RESET}"
    fi

    # Print bottom border
    echo -ne "${UI_YOYO_YELLOW_DIM}${BOX_DBL_BL}"
    for ((i=0; i<width; i++)); do echo -n "$BOX_DBL_H"; done
    echo -e "${BOX_DBL_BR}${UI_RESET}"
    echo ""
}

# ============================================================================
# Help Panel - Categorized command reference with Yoyo branding
# ============================================================================

# Print a styled help panel with categorized commands
# Uses rounded corners, yellow branding, and consistent column alignment
ui_help_panel() {
    local width=${1:-69}
    local cmd_col_width=22
    local desc_col_width=$((width - cmd_col_width - 6))

    # Helper to print horizontal line with rounded corners
    _help_hline() {
        local left_char="$1"
        local right_char="$2"
        echo -ne "${UI_YOYO_YELLOW_DIM}${left_char}"
        for ((i=0; i<width; i++)); do
            echo -n "$BOX_H"
        done
        echo -e "${right_char}${UI_RESET}"
    }

    # Helper to print a content row with borders
    _help_row() {
        local content="$1"
        echo -ne "${UI_YOYO_YELLOW_DIM}${BOX_V}${UI_RESET}"
        echo -ne "  "
        echo -ne "$content"
        # Calculate visible length (strip ANSI codes)
        local visible_len
        visible_len=$(echo -e "$content" | sed 's/\x1b\[[0-9;]*m//g' | wc -c)
        visible_len=$((visible_len - 1))
        local padding=$((width - visible_len - 2))
        if [ "$padding" -gt 0 ]; then
            printf "%${padding}s" ""
        fi
        echo -e "${UI_YOYO_YELLOW_DIM}${BOX_V}${UI_RESET}"
    }

    # Helper to print an empty row
    _help_empty_row() {
        echo -ne "${UI_YOYO_YELLOW_DIM}${BOX_V}${UI_RESET}"
        printf "%${width}s" ""
        echo -e "${UI_YOYO_YELLOW_DIM}${BOX_V}${UI_RESET}"
    }

    # Helper to print a separator row
    _help_separator() {
        echo -ne "${UI_YOYO_YELLOW_DIM}${BOX_VR}"
        for ((i=0; i<width; i++)); do
            echo -n "$BOX_H"
        done
        echo -e "${BOX_VL}${UI_RESET}"
    }

    # Helper to print category header
    _help_category() {
        local icon="$1"
        local title="$2"
        local header="${icon} ${UI_YOYO_YELLOW}${UI_BOLD}${title}${UI_RESET}"
        _help_row "$header"
    }

    # Helper to print command entry
    _help_command() {
        local cmd="$1"
        local desc="$2"
        local formatted
        formatted=$(echo -ne "${UI_TEXT}"; printf "%-${cmd_col_width}s" "$cmd"; echo -ne "${UI_RESET}${UI_SUBTEXT0}${desc}${UI_RESET}")
        _help_row "   $formatted"
    }

    echo ""

    # Top border with rounded corners
    _help_hline "$BOX_TL" "$BOX_TR"

    # Title row
    local title="${UI_YOYO_YELLOW}${UI_BOLD}YOYO DEV HELP${UI_RESET}"
    _help_row "$title"

    # Separator after title
    _help_separator

    # Product Planning category
    _help_category "$ICON_PACKAGE" "PRODUCT PLANNING"
    _help_command "/plan-product" "Create mission & roadmap"
    _help_command "/analyze-product" "Analyze existing codebase"
    _help_empty_row

    # Feature Creation category
    _help_category "$ICON_SPARKLES" "FEATURE CREATION"
    _help_command "/create-new" "Full feature workflow"
    _help_command "/create-spec" "Detailed specification"
    _help_command "/create-tasks" "Task breakdown"
    _help_empty_row

    # Execution category
    _help_category "$ICON_ROCKET" "EXECUTION"
    _help_command "/execute-tasks" "TDD implementation"
    _help_command "/create-fix" "Bug fix workflow"
    _help_command "/orchestrate-tasks" "Multi-agent orchestration"
    _help_empty_row

    # Review & Status category
    _help_category "$ICON_CHECK" "REVIEW & STATUS"
    _help_command "/yoyo-status" "Show project status"
    _help_command "/yoyo-review" "Review current work"
    _help_command "/yoyo-help" "Display this help"
    _help_empty_row

    # Research category
    _help_category "$ICON_INFO" "RESEARCH"
    _help_command "/research" "External research task"
    _help_command "/consult-oracle" "Strategic consultation"
    _help_empty_row

    # Design category
    _help_category "$ICON_WRENCH" "DESIGN"
    _help_command "/design-init" "Initialize design system"
    _help_command "/design-audit" "Audit design compliance"
    _help_command "/design-component" "Create design component"
    _help_command "/design-fix" "Fix design issues"

    # Bottom border with rounded corners
    _help_hline "$BOX_BL" "$BOX_BR"

    echo ""
}

# Export all functions
export -f supports_truecolor
export -f ui_line ui_box_header ui_section ui_success ui_error ui_warning ui_info
export -f ui_step ui_progress ui_option ui_kv ui_banner ui_tui_badge ui_ask
export -f ui_spinner ui_clear_screen ui_complete ui_summary ui_help_panel
export -f _get_terminal_width ui_yoyo_banner _ui_yoyo_banner_compact _ui_yoyo_banner_full
export -f ui_get_agent_color ui_get_agent_icon ui_get_agent_description ui_agent_panel
export -f ui_render_progress_bar ui_project_dashboard
export -f _dashboard_get_active_spec _dashboard_get_active_spec_dir
export -f _dashboard_count_tasks _dashboard_count_recent_fixes _dashboard_get_git_branch
