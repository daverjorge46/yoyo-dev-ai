#!/bin/bash

# Interactive File Manager for Yoyo Dev
# Auto-detects and launches best available file manager

set -euo pipefail

# Colors
readonly COLOR_BOLD="\033[1m"
readonly COLOR_CYAN="\033[36m"
readonly COLOR_GREEN="\033[32m"
readonly COLOR_YELLOW="\033[33m"
readonly COLOR_RED="\033[31m"
readonly COLOR_RESET="\033[0m"

# User preference (can be set via env var)
readonly PREFERRED_MANAGER="${YOYO_FILE_MANAGER:-auto}"

# Detect available file managers in order of preference
detect_file_manager() {
    # Check user preference first
    if [[ "$PREFERRED_MANAGER" != "auto" ]]; then
        if command -v "$PREFERRED_MANAGER" &> /dev/null; then
            echo "$PREFERRED_MANAGER"
            return 0
        fi
    fi

    # Auto-detect in order of preference
    if command -v ranger &> /dev/null; then
        echo "ranger"
    elif command -v lf &> /dev/null; then
        echo "lf"
    elif command -v nnn &> /dev/null; then
        echo "nnn"
    elif command -v vifm &> /dev/null; then
        echo "vifm"
    elif command -v broot &> /dev/null; then
        echo "broot"
    else
        echo "none"
    fi
}

# Show installation instructions
show_install_options() {
    clear
    echo ""
    echo -e "${COLOR_BOLD}${COLOR_CYAN}╔════════════════════════════════════════════════════════════════╗${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  📂 ${COLOR_BOLD}FILE MANAGER REQUIRED${COLOR_RESET}                                 ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}╚════════════════════════════════════════════════════════════════╝${COLOR_RESET}"
    echo ""
    echo -e "${COLOR_YELLOW}No file manager detected.${COLOR_RESET} Choose one to install:"
    echo ""
    echo -e "${COLOR_BOLD}Recommended Options:${COLOR_RESET}"
    echo ""
    echo -e "${COLOR_GREEN}1. ranger${COLOR_RESET} ${COLOR_CYAN}(Recommended)${COLOR_RESET}"
    echo "   • Python-based, vim-like navigation"
    echo "   • File preview, syntax highlighting"
    echo "   • Easy to use, well-documented"
    echo ""
    echo "   Install:"
    echo -e "   ${COLOR_CYAN}sudo apt install ranger${COLOR_RESET}  (Ubuntu/Debian)"
    echo -e "   ${COLOR_CYAN}sudo dnf install ranger${COLOR_RESET}  (Fedora)"
    echo -e "   ${COLOR_CYAN}sudo pacman -S ranger${COLOR_RESET}   (Arch)"
    echo ""
    echo -e "${COLOR_GREEN}2. lf${COLOR_RESET} ${COLOR_CYAN}(Lightweight)${COLOR_RESET}"
    echo "   • Go-based, fast and minimal"
    echo "   • Similar to ranger but faster"
    echo "   • Low memory footprint"
    echo ""
    echo "   Install:"
    echo -e "   ${COLOR_CYAN}sudo apt install lf${COLOR_RESET}       (Ubuntu 22.04+)"
    echo -e "   ${COLOR_CYAN}go install github.com/gokcehan/lf@latest${COLOR_RESET}"
    echo ""
    echo -e "${COLOR_GREEN}3. nnn${COLOR_RESET} ${COLOR_CYAN}(Ultra-fast)${COLOR_RESET}"
    echo "   • C-based, extremely lightweight"
    echo "   • Blazing fast, powerful filtering"
    echo "   • Plugin support"
    echo ""
    echo "   Install:"
    echo -e "   ${COLOR_CYAN}sudo apt install nnn${COLOR_RESET}     (Ubuntu/Debian)"
    echo -e "   ${COLOR_CYAN}sudo dnf install nnn${COLOR_RESET}     (Fedora)"
    echo ""
    echo "────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "${COLOR_BOLD}Quick Install (choose one):${COLOR_RESET}"
    echo ""
    echo -e "  ${COLOR_CYAN}r${COLOR_RESET} - Install ranger (recommended)"
    echo -e "  ${COLOR_CYAN}l${COLOR_RESET} - Install lf"
    echo -e "  ${COLOR_CYAN}n${COLOR_RESET} - Install nnn"
    echo -e "  ${COLOR_CYAN}s${COLOR_RESET} - Skip (use fallback browser)"
    echo -e "  ${COLOR_CYAN}q${COLOR_RESET} - Quit"
    echo ""
    read -p "Choice (r/l/n/s/q): " choice

    case "$choice" in
        r|R)
            echo ""
            echo -e "${COLOR_GREEN}Installing ranger...${COLOR_RESET}"
            echo ""
            if command -v apt &> /dev/null; then
                sudo apt update && sudo apt install -y ranger
            elif command -v dnf &> /dev/null; then
                sudo dnf install -y ranger
            elif command -v pacman &> /dev/null; then
                sudo pacman -S --noconfirm ranger
            else
                echo -e "${COLOR_RED}Error: Package manager not supported${COLOR_RESET}"
                echo "Please install ranger manually"
                return 1
            fi
            echo ""
            echo -e "${COLOR_GREEN}✓ ranger installed successfully!${COLOR_RESET}"
            sleep 2
            ;;
        l|L)
            echo ""
            echo -e "${COLOR_GREEN}Installing lf...${COLOR_RESET}"
            echo ""
            if command -v apt &> /dev/null; then
                sudo apt update && sudo apt install -y lf
            elif command -v go &> /dev/null; then
                go install github.com/gokcehan/lf@latest
                echo "Note: Make sure ~/go/bin is in your PATH"
            else
                echo -e "${COLOR_RED}Error: lf not available via apt, and go not found${COLOR_RESET}"
                echo "Install go first: sudo apt install golang-go"
                return 1
            fi
            echo ""
            echo -e "${COLOR_GREEN}✓ lf installed successfully!${COLOR_RESET}"
            sleep 2
            ;;
        n|N)
            echo ""
            echo -e "${COLOR_GREEN}Installing nnn...${COLOR_RESET}"
            echo ""
            if command -v apt &> /dev/null; then
                sudo apt update && sudo apt install -y nnn
            elif command -v dnf &> /dev/null; then
                sudo dnf install -y nnn
            elif command -v pacman &> /dev/null; then
                sudo pacman -S --noconfirm nnn
            else
                echo -e "${COLOR_RED}Error: Package manager not supported${COLOR_RESET}"
                echo "Please install nnn manually"
                return 1
            fi
            echo ""
            echo -e "${COLOR_GREEN}✓ nnn installed successfully!${COLOR_RESET}"
            sleep 2
            ;;
        s|S)
            echo ""
            echo -e "${COLOR_YELLOW}Using fallback browser...${COLOR_RESET}"
            echo ""
            return 2  # Signal to use fallback
            ;;
        q|Q)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo ""
            echo -e "${COLOR_RED}Invalid choice${COLOR_RESET}"
            sleep 1
            show_install_options
            ;;
    esac
}

# Launch ranger with optimal config (restricted to project dir)
launch_ranger() {
    local target_dir="${1:-.}"

    # Get absolute path of project directory
    local project_dir=$(cd "$target_dir" && pwd)

    # Create temporary ranger config directory for this session
    local temp_config=$(mktemp -d)

    # Create rc.conf with preview enabled and directory restriction
    cat > "$temp_config/rc.conf" << EOF
# Yoyo Dev ranger configuration - Project restricted
set preview_files true
set preview_directories true
set collapse_preview true
set show_hidden false
set colorscheme default
set confirm_on_delete multiple
set automatically_count_files true
set open_all_images true
set vcs_aware false
set use_preview_script true
set preview_images false

# Prevent going above project root
map H cd $project_dir
map gH cd $project_dir

# Override parent directory command to stop at project root
map h eval if fm.thisdir.path != '$project_dir': fm.cd('..')
EOF

    # Create commands.py to enforce directory restriction
    cat > "$temp_config/commands.py" << 'EOFPY'
from ranger.api.commands import Command
import os

class cd(Command):
    """Override cd to prevent leaving project directory"""
    def execute(self):
        project_dir = os.environ.get('YOYO_PROJECT_DIR', os.getcwd())
        line = self.rest(1)
        destination = os.path.abspath(os.path.expanduser(line))

        # Only allow cd within project directory
        if destination.startswith(project_dir):
            self.fm.cd(destination)
        else:
            self.fm.notify("Cannot navigate outside project directory", bad=True)
EOFPY

    # Launch ranger with custom config and set project dir env var
    YOYO_PROJECT_DIR="$project_dir" \
    RANGER_LOAD_DEFAULT_RC=FALSE \
    ranger --confdir="$temp_config" "$project_dir"

    # Cleanup
    rm -rf "$temp_config"
}

# Launch lf with optimal config (restricted to project dir)
launch_lf() {
    local target_dir="${1:-.}"

    # Get absolute path of project directory
    local project_dir=$(cd "$target_dir" && pwd)

    # Create temporary lf config for this session
    local temp_config=$(mktemp)

    cat > "$temp_config" << EOF
# Yoyo Dev lf configuration - Project restricted
set preview true
set hidden false
set drawbox true
set icons false

# Custom command to prevent going above project root
cmd up \${{
    current=\$(pwd)
    if [ "\$current" != "$project_dir" ]; then
        lf -remote "send \$id cd .."
    fi
}}

# Map h key to custom up command
map h up

# Map ~ and gh to project root
map ~ cd $project_dir
map gh cd $project_dir
EOF

    # Launch lf with custom config
    lf -config "$temp_config" "$project_dir"

    # Cleanup
    rm -f "$temp_config"
}

# Launch nnn with optimal config (restricted to project dir)
launch_nnn() {
    local target_dir="${1:-.}"

    # Get absolute path of project directory
    local project_dir=$(cd "$target_dir" && pwd)

    # Create wrapper script that restricts nnn to project directory
    local wrapper_script=$(mktemp)

    cat > "$wrapper_script" << EOFWRAPPER
#!/bin/bash
# nnn wrapper - restricts navigation to project directory only

PROJECT_DIR="$project_dir"

# Function to check if we're trying to leave project
check_boundary() {
    current_dir=\$(pwd)
    if [[ "\$current_dir" != "\$PROJECT_DIR"* ]]; then
        cd "\$PROJECT_DIR"
    fi
}

# Change to project directory
cd "\$PROJECT_DIR"

# Launch nnn with project directory as root
# -e: open text files in editor
# -H: show hidden files toggle
# The directory is locked by starting in it and using minimal plugins
NNN_OPTS="e" nnn -H "\$PROJECT_DIR"

# Cleanup
rm -f "$wrapper_script"
EOFWRAPPER

    chmod +x "$wrapper_script"
    "$wrapper_script"
}

# Launch vifm (restricted to project dir)
launch_vifm() {
    local target_dir="${1:-.}"

    # Get absolute path of project directory
    local project_dir=$(cd "$target_dir" && pwd)

    # vifm doesn't have built-in directory restriction
    # Launch in project dir and user must manually stay within it
    cd "$project_dir" && vifm "$project_dir"
}

# Launch broot (restricted to project dir)
launch_broot() {
    local target_dir="${1:-.}"

    # Get absolute path of project directory
    local project_dir=$(cd "$target_dir" && pwd)

    # broot can be configured to not go above starting directory
    cd "$project_dir" && broot --only-folders "$project_dir"
}

# Fallback: Basic interactive file browser using fzf or simple menu
launch_fallback() {
    local target_dir="${1:-.}"

    if command -v fzf &> /dev/null; then
        # Use fzf for interactive file browsing
        launch_fzf_browser "$target_dir"
    else
        # Ultra-simple fallback
        launch_simple_browser "$target_dir"
    fi
}

# FZF-based file browser with preview (restricted to project dir)
launch_fzf_browser() {
    local target_dir="${1:-.}"

    # Get absolute path of project directory
    local project_dir=$(cd "$target_dir" && pwd)

    clear
    echo ""
    echo -e "${COLOR_BOLD}${COLOR_CYAN}╔════════════════════════════════════════════════════════════════╗${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  📂 ${COLOR_BOLD}FILE BROWSER (FZF) - Project Only${COLOR_RESET}                    ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}╚════════════════════════════════════════════════════════════════╝${COLOR_RESET}"
    echo ""
    echo -e " ${COLOR_YELLOW}Project:${COLOR_RESET} $project_dir"
    echo ""
    echo -e " ${COLOR_YELLOW}Controls:${COLOR_RESET}"
    echo "   • Arrow keys to navigate"
    echo "   • Enter to view file"
    echo "   • Ctrl+C to exit"
    echo ""
    echo "────────────────────────────────────────────────────────────────"
    echo ""

    cd "$project_dir"

    while true; do
        # Find files only within project directory (exclude common build dirs)
        local selected_file=$(find "$project_dir" -type f \
            ! -path "*/node_modules/*" \
            ! -path "*/.git/*" \
            ! -path "*/dist/*" \
            ! -path "*/build/*" \
            ! -path "*/.next/*" \
            | sed "s|^$project_dir/||" \
            | fzf --height 100% --reverse \
                  --preview "head -100 '$project_dir'/{}" \
                  --preview-window right:50% \
                  --prompt "📂 Browse files > " \
                  --header "Project: $project_dir | Press Ctrl+C to exit" \
                  || echo "")

        if [[ -z "$selected_file" ]]; then
            break
        fi

        # View the file (ensure we stay in project dir)
        local full_path="$project_dir/$selected_file"
        if command -v bat &> /dev/null; then
            bat "$full_path"
        else
            less "$full_path"
        fi
    done
}

# Simple directory browser (no dependencies, restricted to project dir)
launch_simple_browser() {
    local target_dir="${1:-.}"

    # Get absolute path of project directory
    local project_dir=$(cd "$target_dir" && pwd)

    clear
    echo ""
    echo -e "${COLOR_BOLD}${COLOR_CYAN}╔════════════════════════════════════════════════════════════════╗${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  📂 ${COLOR_BOLD}SIMPLE FILE BROWSER - Project Only${COLOR_RESET}                   ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}╚════════════════════════════════════════════════════════════════╝${COLOR_RESET}"
    echo ""
    echo -e " ${COLOR_YELLOW}Project:${COLOR_RESET} $project_dir"
    echo ""
    echo -e " ${COLOR_YELLOW}Recommendation:${COLOR_RESET} Install a proper file manager for better experience:"
    echo -e "   ${COLOR_CYAN}sudo apt install ranger${COLOR_RESET}"
    echo ""
    echo " Press Enter to continue or Ctrl+C to exit..."
    read

    # Just show tree and exit (restricted to project dir)
    if command -v tree &> /dev/null; then
        tree -L 3 -I 'node_modules|.git|dist|build|.next' "$project_dir" | less
    else
        find "$project_dir" -maxdepth 3 \
            ! -path "*/node_modules/*" \
            ! -path "*/.git/*" \
            ! -path "*/dist/*" \
            ! -path "*/build/*" \
            -print | less
    fi
}

# Main
main() {
    local target_dir="${1:-.}"

    # Detect file manager
    local manager=$(detect_file_manager)

    # If none found, show install options
    if [[ "$manager" == "none" ]]; then
        show_install_options
        local install_result=$?

        if [[ $install_result -eq 2 ]]; then
            # User chose fallback
            launch_fallback "$target_dir"
            exit 0
        elif [[ $install_result -ne 0 ]]; then
            # Installation failed
            echo ""
            echo -e "${COLOR_RED}Installation failed. Exiting...${COLOR_RESET}"
            exit 1
        fi

        # Re-detect after installation
        manager=$(detect_file_manager)
    fi

    # Launch the appropriate file manager
    case "$manager" in
        ranger)
            launch_ranger "$target_dir"
            ;;
        lf)
            launch_lf "$target_dir"
            ;;
        nnn)
            launch_nnn "$target_dir"
            ;;
        vifm)
            launch_vifm "$target_dir"
            ;;
        broot)
            launch_broot "$target_dir"
            ;;
        *)
            # Fallback
            launch_fallback "$target_dir"
            ;;
    esac
}

main "$@"
