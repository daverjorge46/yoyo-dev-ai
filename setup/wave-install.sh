#!/bin/bash
# Wave Terminal Installation Script for Yoyo Dev
# Handles detection, installation, and configuration deployment

set -euo pipefail

# ============================================================================
# Version and Constants
# ============================================================================

readonly WAVE_VERSION="0.10.0"
readonly WAVE_CONFIG_VERSION="1.3.5"
readonly WAVE_DOWNLOAD_BASE="https://github.com/wavetermdev/waveterm/releases/download"
readonly WAVE_CONFIG_DIR="${HOME}/.config/waveterm"
readonly WAVE_VERSION_FILE="${WAVE_CONFIG_DIR}/.yoyo-dev-wave-version"

# ============================================================================
# Load UI Library
# ============================================================================

SCRIPT_PATH="${BASH_SOURCE[0]}"
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"

# Try to load UI library
if [ -f "$SCRIPT_DIR/ui-library.sh" ]; then
    source "$SCRIPT_DIR/ui-library.sh"
else
    # Fallback colors and functions
    UI_PRIMARY='\033[0;36m'
    UI_SUCCESS='\033[0;32m'
    UI_ERROR='\033[0;31m'
    UI_WARNING='\033[1;33m'
    UI_DIM='\033[2m'
    UI_BOLD='\033[1m'
    UI_RESET='\033[0m'
    ICON_SUCCESS='[OK]'
    ICON_ERROR='[ERR]'
    ICON_WARNING='[WARN]'
    ICON_INFO='[INFO]'
    ui_success() { echo -e "${UI_SUCCESS}${ICON_SUCCESS}${UI_RESET} $1"; }
    ui_error() { echo -e "${UI_ERROR}${ICON_ERROR}${UI_RESET} $1"; }
    ui_info() { echo -e "${UI_PRIMARY}${ICON_INFO}${UI_RESET} $1"; }
    ui_warning() { echo -e "${UI_WARNING}${ICON_WARNING}${UI_RESET} $1"; }
fi

# ============================================================================
# Platform Detection
# ============================================================================

# Detection paths for each platform
WAVE_PATHS_MACOS=(
    "/Applications/Wave.app/Contents/MacOS/Wave"
    "$HOME/Applications/Wave.app/Contents/MacOS/Wave"
)

WAVE_PATHS_LINUX=(
    "/usr/bin/waveterm"
    "/usr/bin/wave"
    "/usr/local/bin/waveterm"
    "/usr/local/bin/wave"
    "/opt/Wave/waveterm"
    "/opt/wave/wave"
    "$HOME/.local/bin/waveterm"
    "$HOME/.local/bin/wave"
    "/snap/bin/waveterm"
    "/snap/bin/wave"
)

# Windows paths - use defaults if env vars not set
# These are only used when running on Windows (Git Bash, WSL, etc.)
WAVE_PATHS_WINDOWS=(
    "${LOCALAPPDATA:-/c/Users/$USER/AppData/Local}/Programs/Wave/Wave.exe"
    "${PROGRAMFILES:-/c/Program Files}/Wave/Wave.exe"
    "/c/Program Files/Wave/Wave.exe"
)

# Detect operating system
# Returns: macos, linux, windows, or unknown
detect_os() {
    local os_type=""

    case "$(uname -s)" in
        Darwin*)
            os_type="macos"
            ;;
        Linux*)
            # Check for WSL
            if grep -qi microsoft /proc/version 2>/dev/null; then
                os_type="windows"
            else
                os_type="linux"
            fi
            ;;
        CYGWIN*|MINGW*|MSYS*)
            os_type="windows"
            ;;
        *)
            os_type="unknown"
            ;;
    esac

    echo "$os_type"
}

# Detect CPU architecture
# Returns: arm64, x64, or unknown
detect_arch() {
    local arch=""
    local machine
    machine="$(uname -m)"

    case "$machine" in
        x86_64|amd64)
            arch="x64"
            ;;
        arm64|aarch64)
            arch="arm64"
            ;;
        *)
            arch="unknown"
            ;;
    esac

    echo "$arch"
}

# Detect Linux distribution
# Returns: debian, fedora, arch, or unknown
detect_linux_distro() {
    local distro="unknown"

    if [ -f /etc/os-release ]; then
        # shellcheck disable=SC1091
        . /etc/os-release
        case "${ID:-}" in
            ubuntu|debian|linuxmint|pop)
                distro="debian"
                ;;
            fedora|rhel|centos|rocky|almalinux)
                distro="fedora"
                ;;
            arch|manjaro|endeavouros)
                distro="arch"
                ;;
            opensuse*)
                distro="fedora"  # Uses rpm
                ;;
            *)
                # Check for package managers as fallback
                if command -v apt &>/dev/null; then
                    distro="debian"
                elif command -v dnf &>/dev/null || command -v yum &>/dev/null; then
                    distro="fedora"
                elif command -v pacman &>/dev/null; then
                    distro="arch"
                fi
                ;;
        esac
    else
        # Fallback to checking package managers
        if command -v apt &>/dev/null; then
            distro="debian"
        elif command -v dnf &>/dev/null || command -v yum &>/dev/null; then
            distro="fedora"
        elif command -v pacman &>/dev/null; then
            distro="arch"
        fi
    fi

    echo "$distro"
}

# ============================================================================
# Wave Detection Functions
# ============================================================================

# Detect if Wave is installed
# Returns: Path to Wave binary on success, empty string on failure
# Exit code: 0 if found, 1 if not found
detect_wave() {
    local os_type
    os_type=$(detect_os)
    local wave_path=""

    # First try command -v for both 'waveterm' and 'wave' (most reliable)
    for cmd in waveterm wave; do
        if wave_path=$(command -v "$cmd" 2>/dev/null); then
            if [ -x "$wave_path" ]; then
                echo "$wave_path"
                return 0
            fi
        fi
    done

    # Check platform-specific paths
    case "$os_type" in
        macos)
            for path in "${WAVE_PATHS_MACOS[@]}"; do
                if [ -x "$path" ]; then
                    echo "$path"
                    return 0
                fi
            done
            ;;
        linux)
            for path in "${WAVE_PATHS_LINUX[@]}"; do
                if [ -x "$path" ]; then
                    echo "$path"
                    return 0
                fi
            done
            # Also check for AppImage in common locations
            for appimage in "$HOME"/.local/bin/Wave*.AppImage "$HOME"/Applications/Wave*.AppImage; do
                if [ -x "$appimage" ] 2>/dev/null; then
                    echo "$appimage"
                    return 0
                fi
            done
            ;;
        windows)
            for path in "${WAVE_PATHS_WINDOWS[@]}"; do
                # Expand Windows environment variables
                local expanded_path
                expanded_path=$(eval echo "$path" 2>/dev/null || echo "$path")
                if [ -x "$expanded_path" ] 2>/dev/null; then
                    echo "$expanded_path"
                    return 0
                fi
            done
            ;;
    esac

    return 1
}

# Get Wave version if installed
# Returns: Version string or empty
get_wave_version() {
    local wave_path
    if wave_path=$(detect_wave); then
        # Try to get version from Wave
        "$wave_path" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo ""
    else
        echo ""
    fi
}

# ============================================================================
# Download URL Functions
# ============================================================================

# Get platform-specific download URL for Wave
# Args: $1 = version (optional, defaults to WAVE_VERSION)
# Returns: Download URL for current platform
get_wave_download_url() {
    local version="${1:-$WAVE_VERSION}"
    local os_type
    local arch
    os_type=$(detect_os)
    arch=$(detect_arch)

    local base_url="${WAVE_DOWNLOAD_BASE}/v${version}"
    local filename=""

    case "$os_type" in
        macos)
            if [ "$arch" = "arm64" ]; then
                filename="Wave-darwin-arm64-${version}.dmg"
            else
                filename="Wave-darwin-x64-${version}.dmg"
            fi
            ;;
        linux)
            local distro
            distro=$(detect_linux_distro)
            case "$distro" in
                debian)
                    if [ "$arch" = "arm64" ]; then
                        filename="Wave-linux-arm64-${version}.deb"
                    else
                        filename="Wave-linux-x64-${version}.deb"
                    fi
                    ;;
                fedora)
                    if [ "$arch" = "arm64" ]; then
                        filename="Wave-linux-arm64-${version}.rpm"
                    else
                        filename="Wave-linux-x64-${version}.rpm"
                    fi
                    ;;
                *)
                    # Fallback to AppImage (universal)
                    if [ "$arch" = "arm64" ]; then
                        filename="Wave-linux-arm64-${version}.AppImage"
                    else
                        filename="Wave-linux-x64-${version}.AppImage"
                    fi
                    ;;
            esac
            ;;
        windows)
            filename="Wave-win32-x64-${version}.exe"
            ;;
        *)
            ui_error "Unsupported platform: $os_type"
            return 1
            ;;
    esac

    echo "${base_url}/${filename}"
}

# Get filename from download URL
get_download_filename() {
    local url="$1"
    basename "$url"
}

# ============================================================================
# Download Utilities
# ============================================================================

# Download a file with progress indication
# Args: $1 = URL, $2 = output path
# Returns: 0 on success, 1 on failure
download_file() {
    local url="$1"
    local output="$2"

    ui_info "Downloading from: ${url##*/}"

    if command -v curl &>/dev/null; then
        if curl -fSL --progress-bar -o "$output" "$url"; then
            return 0
        fi
    elif command -v wget &>/dev/null; then
        if wget --show-progress -q -O "$output" "$url"; then
            return 0
        fi
    else
        ui_error "Neither curl nor wget found. Please install one of them."
        return 1
    fi

    ui_error "Download failed"
    return 1
}

# ============================================================================
# macOS Installation
# ============================================================================

# Install Wave Terminal on macOS
# Downloads DMG, mounts it, copies to /Applications, and cleans up
install_wave_macos() {
    local version="${1:-$WAVE_VERSION}"
    local download_url
    local temp_dir
    local dmg_file
    local mount_point

    ui_info "Installing Wave Terminal v${version} for macOS..."

    # Get download URL
    download_url=$(get_wave_download_url "$version")
    if [ -z "$download_url" ]; then
        ui_error "Could not determine download URL"
        return 1
    fi

    # Create temp directory
    temp_dir=$(mktemp -d)
    dmg_file="${temp_dir}/$(get_download_filename "$download_url")"
    mount_point="${temp_dir}/wave_mount"

    # Download DMG
    if ! download_file "$download_url" "$dmg_file"; then
        rm -rf "$temp_dir"
        return 1
    fi

    ui_info "Mounting disk image..."

    # Mount DMG
    mkdir -p "$mount_point"
    if ! hdiutil attach "$dmg_file" -mountpoint "$mount_point" -nobrowse -quiet; then
        ui_error "Failed to mount DMG"
        rm -rf "$temp_dir"
        return 1
    fi

    ui_info "Installing Wave.app to /Applications..."

    # Find and copy Wave.app
    local wave_app="${mount_point}/Wave.app"
    if [ ! -d "$wave_app" ]; then
        wave_app=$(find "$mount_point" -name "Wave.app" -type d | head -1)
    fi

    if [ ! -d "$wave_app" ]; then
        ui_error "Wave.app not found in DMG"
        hdiutil detach "$mount_point" -quiet 2>/dev/null || true
        rm -rf "$temp_dir"
        return 1
    fi

    # Remove existing installation if present
    if [ -d "/Applications/Wave.app" ]; then
        ui_info "Removing existing installation..."
        rm -rf "/Applications/Wave.app"
    fi

    # Copy to /Applications
    if ! cp -R "$wave_app" "/Applications/"; then
        ui_error "Failed to copy Wave.app to /Applications"
        ui_warning "You may need administrator privileges. Try:"
        echo "  sudo cp -R \"${wave_app}\" /Applications/"
        hdiutil detach "$mount_point" -quiet 2>/dev/null || true
        rm -rf "$temp_dir"
        return 1
    fi

    ui_info "Cleaning up..."

    # Unmount and cleanup
    hdiutil detach "$mount_point" -quiet 2>/dev/null || true
    rm -rf "$temp_dir"

    # Verify installation
    if detect_wave &>/dev/null; then
        ui_success "Wave Terminal v${version} installed successfully!"
        return 0
    else
        ui_error "Installation verification failed"
        return 1
    fi
}

# ============================================================================
# Linux Installation
# ============================================================================

# Install Wave Terminal on Linux
# Detects package manager and uses appropriate method
install_wave_linux() {
    local version="${1:-$WAVE_VERSION}"
    local distro
    local download_url
    local temp_dir
    local pkg_file

    distro=$(detect_linux_distro)
    ui_info "Installing Wave Terminal v${version} for Linux (${distro})..."

    # Get download URL
    download_url=$(get_wave_download_url "$version")
    if [ -z "$download_url" ]; then
        ui_error "Could not determine download URL"
        return 1
    fi

    # Create temp directory
    temp_dir=$(mktemp -d)
    pkg_file="${temp_dir}/$(get_download_filename "$download_url")"

    # Download package
    if ! download_file "$download_url" "$pkg_file"; then
        rm -rf "$temp_dir"
        return 1
    fi

    ui_info "Installing package..."

    case "$distro" in
        debian)
            # Install .deb package
            if command -v apt &>/dev/null; then
                if sudo apt install -y "$pkg_file"; then
                    ui_success "Wave Terminal installed successfully!"
                else
                    ui_error "apt installation failed"
                    rm -rf "$temp_dir"
                    return 1
                fi
            elif command -v dpkg &>/dev/null; then
                if sudo dpkg -i "$pkg_file"; then
                    sudo apt-get install -f -y 2>/dev/null || true
                    ui_success "Wave Terminal installed successfully!"
                else
                    ui_error "dpkg installation failed"
                    rm -rf "$temp_dir"
                    return 1
                fi
            fi
            ;;
        fedora)
            # Install .rpm package
            if command -v dnf &>/dev/null; then
                if sudo dnf install -y "$pkg_file"; then
                    ui_success "Wave Terminal installed successfully!"
                else
                    ui_error "dnf installation failed"
                    rm -rf "$temp_dir"
                    return 1
                fi
            elif command -v yum &>/dev/null; then
                if sudo yum install -y "$pkg_file"; then
                    ui_success "Wave Terminal installed successfully!"
                else
                    ui_error "yum installation failed"
                    rm -rf "$temp_dir"
                    return 1
                fi
            elif command -v rpm &>/dev/null; then
                if sudo rpm -i "$pkg_file"; then
                    ui_success "Wave Terminal installed successfully!"
                else
                    ui_error "rpm installation failed"
                    rm -rf "$temp_dir"
                    return 1
                fi
            fi
            ;;
        arch)
            # Arch Linux - try AUR or AppImage
            ui_warning "Arch Linux detected. Using AppImage fallback."
            if ! install_wave_appimage "$version"; then
                rm -rf "$temp_dir"
                return 1
            fi
            ;;
        *)
            # Fallback to AppImage
            ui_info "Using AppImage for universal compatibility..."
            if ! install_wave_appimage "$version"; then
                rm -rf "$temp_dir"
                return 1
            fi
            ;;
    esac

    # Cleanup
    rm -rf "$temp_dir"

    # Verify installation
    if detect_wave &>/dev/null; then
        return 0
    else
        ui_warning "Installation may have succeeded but Wave not found in PATH"
        ui_info "You may need to restart your terminal or add Wave to PATH"
        return 0
    fi
}

# Install Wave as AppImage (fallback for unsupported distros)
install_wave_appimage() {
    local version="${1:-$WAVE_VERSION}"
    local arch
    local download_url
    local appimage_dir="$HOME/.local/bin"
    local appimage_file

    arch=$(detect_arch)

    # Construct AppImage URL
    if [ "$arch" = "arm64" ]; then
        download_url="${WAVE_DOWNLOAD_BASE}/v${version}/Wave-linux-arm64-${version}.AppImage"
    else
        download_url="${WAVE_DOWNLOAD_BASE}/v${version}/Wave-linux-x64-${version}.AppImage"
    fi

    ui_info "Downloading AppImage..."

    # Create directory if needed
    mkdir -p "$appimage_dir"
    appimage_file="${appimage_dir}/Wave-${version}.AppImage"

    # Download AppImage
    if ! download_file "$download_url" "$appimage_file"; then
        return 1
    fi

    # Make executable
    chmod +x "$appimage_file"

    # Create symlink for easier access
    ln -sf "$appimage_file" "${appimage_dir}/wave" 2>/dev/null || true

    ui_success "Wave AppImage installed to: $appimage_file"

    # Check if ~/.local/bin is in PATH
    if [[ ":$PATH:" != *":$appimage_dir:"* ]]; then
        ui_warning "~/.local/bin is not in your PATH"
        ui_info "Add this to your shell configuration:"
        echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    fi

    return 0
}

# ============================================================================
# Windows Installation
# ============================================================================

# Install Wave Terminal on Windows (basic support)
# Works from Git Bash, WSL, or similar environments
install_wave_windows() {
    local version="${1:-$WAVE_VERSION}"
    local download_url
    local temp_dir
    local installer_file

    ui_info "Installing Wave Terminal v${version} for Windows..."

    # Get download URL
    download_url=$(get_wave_download_url "$version")
    if [ -z "$download_url" ]; then
        ui_error "Could not determine download URL"
        return 1
    fi

    # Create temp directory
    temp_dir=$(mktemp -d)
    installer_file="${temp_dir}/$(get_download_filename "$download_url")"

    # Download installer
    if ! download_file "$download_url" "$installer_file"; then
        rm -rf "$temp_dir"
        return 1
    fi

    ui_info "Running installer..."

    # Check if we can run Windows executables
    if command -v cmd.exe &>/dev/null; then
        # WSL environment
        local win_path
        win_path=$(wslpath -w "$installer_file" 2>/dev/null || echo "")

        if [ -n "$win_path" ]; then
            cmd.exe /c "start /wait \"\" \"$win_path\"" 2>/dev/null || {
                ui_warning "Silent installation not supported"
                ui_info "Please run the installer manually: $installer_file"
                cmd.exe /c "start \"\" \"$win_path\"" 2>/dev/null || true
            }
        else
            ui_error "Could not convert path for Windows"
            rm -rf "$temp_dir"
            return 1
        fi
    elif command -v start &>/dev/null; then
        # Git Bash / MSYS2
        start "" "$installer_file" || {
            ui_warning "Could not launch installer automatically"
            ui_info "Please run the installer manually: $installer_file"
        }
    else
        ui_warning "Cannot run Windows installer from this environment"
        ui_info "Installer downloaded to: $installer_file"
        ui_info "Please run the installer manually"
        return 0
    fi

    # Give installer time to complete
    ui_info "Waiting for installation to complete..."
    sleep 5

    # Cleanup (may fail if installer is still running)
    rm -rf "$temp_dir" 2>/dev/null || true

    # Verify installation
    if detect_wave &>/dev/null; then
        ui_success "Wave Terminal v${version} installed successfully!"
        return 0
    else
        ui_info "Installation may require a terminal restart to detect Wave"
        return 0
    fi
}

# ============================================================================
# Installation Prompt UI
# ============================================================================

# Display user-friendly installation prompt
# Returns: 0 if user wants to install, 1 if user skips
prompt_wave_install() {
    local os_type
    os_type=$(detect_os)
    local arch
    arch=$(detect_arch)

    echo ""
    echo -e "${UI_PRIMARY}${UI_BOLD}Wave Terminal Not Found${UI_RESET}"
    echo ""
    echo -e "  Wave Terminal is a modern terminal with enhanced features:"
    echo ""
    echo -e "  ${UI_SUCCESS}*${UI_RESET} Multi-pane layouts in a single window"
    echo -e "  ${UI_SUCCESS}*${UI_RESET} Built-in web browser and file preview"
    echo -e "  ${UI_SUCCESS}*${UI_RESET} Native AI integration"
    echo -e "  ${UI_SUCCESS}*${UI_RESET} Customizable themes and widgets"
    echo ""
    echo -e "  ${UI_DIM}Platform: ${os_type} (${arch})${UI_RESET}"
    echo -e "  ${UI_DIM}Version to install: ${WAVE_VERSION}${UI_RESET}"
    echo ""

    if type ui_ask &>/dev/null; then
        if ui_ask "Would you like to install Wave Terminal?" "y"; then
            return 0
        else
            return 1
        fi
    else
        # Fallback prompt
        echo -n "  Install Wave Terminal? [Y/n]: "
        read -r response
        response="${response:-y}"
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            return 0
        else
            return 1
        fi
    fi
}

# ============================================================================
# Main Installation Function
# ============================================================================

# Install Wave Terminal for current platform
# Args: $1 = version (optional), $2 = --force (optional, skip prompt)
install_wave() {
    local version="${1:-$WAVE_VERSION}"
    local force="${2:-}"
    local os_type

    os_type=$(detect_os)

    # Check if already installed
    local existing_path
    if existing_path=$(detect_wave); then
        ui_success "Wave Terminal already installed at: $existing_path"
        local existing_version
        existing_version=$(get_wave_version)
        if [ -n "$existing_version" ]; then
            ui_info "Current version: $existing_version"
        fi
        return 0
    fi

    # Show prompt unless forced
    if [ "$force" != "--force" ] && [ "$force" != "-f" ]; then
        if ! prompt_wave_install; then
            ui_info "Skipping Wave Terminal installation"
            return 2  # Return 2 to indicate user skipped
        fi
    fi

    echo ""

    # Install based on platform
    case "$os_type" in
        macos)
            install_wave_macos "$version"
            ;;
        linux)
            install_wave_linux "$version"
            ;;
        windows)
            install_wave_windows "$version"
            ;;
        *)
            ui_error "Unsupported platform: $os_type"
            ui_info "Please install Wave Terminal manually from: https://waveterm.dev/download"
            return 1
            ;;
    esac
}

# ============================================================================
# Configuration Deployment Functions
# ============================================================================

# Get the yoyo-dev base installation directory
# This finds where setup/wave-config/ lives
# Returns: Path to yoyo-dev base directory
get_base_dir() {
    local base_dir=""

    # First, try relative to this script (setup/ directory)
    if [ -d "${SCRIPT_DIR}/wave-config" ]; then
        base_dir="$(dirname "$SCRIPT_DIR")"
        echo "$base_dir"
        return 0
    fi

    # Try common installation locations
    local search_paths=(
        "${HOME}/.yoyo-dev"
        "/opt/yoyo-dev"
        "/usr/local/share/yoyo-dev"
        "${XDG_DATA_HOME:-${HOME}/.local/share}/yoyo-dev"
    )

    for path in "${search_paths[@]}"; do
        if [ -d "${path}/setup/wave-config" ]; then
            base_dir="$path"
            echo "$base_dir"
            return 0
        fi
    done

    # Try to find via YOYO_DEV_DIR environment variable
    if [ -n "${YOYO_DEV_DIR:-}" ] && [ -d "${YOYO_DEV_DIR}/setup/wave-config" ]; then
        echo "$YOYO_DEV_DIR"
        return 0
    fi

    ui_error "Could not find yoyo-dev base directory"
    return 1
}

# Check if Wave configuration needs to be updated
# Args: $1 = --force (optional, skip version check)
# Returns: 0 if update needed, 1 if up to date, 2 on error
check_config_version() {
    local force="${1:-}"

    # Force update if requested
    if [ "$force" = "--force" ] || [ "$force" = "-f" ]; then
        return 0
    fi

    # If version file doesn't exist, update is needed
    if [ ! -f "$WAVE_VERSION_FILE" ]; then
        return 0
    fi

    # Read installed version
    local installed_version
    installed_version=$(cat "$WAVE_VERSION_FILE" 2>/dev/null || echo "0.0.0")

    # Compare versions
    if [ "$installed_version" = "$WAVE_CONFIG_VERSION" ]; then
        return 1  # Up to date
    fi

    # Version mismatch - update needed
    return 0
}

# Merge a JSON configuration file preserving user customizations
# Args: $1 = source file (yoyo-dev default), $2 = target file (user's file)
# Returns: 0 on success, 1 on failure
merge_wave_config() {
    local source_file="$1"
    local target_file="$2"

    # If source doesn't exist, nothing to do
    if [ ! -f "$source_file" ]; then
        ui_error "Source config file not found: $source_file"
        return 1
    fi

    # If target doesn't exist, just copy source
    if [ ! -f "$target_file" ]; then
        cp "$source_file" "$target_file"
        chmod 600 "$target_file"
        return 0
    fi

    # Create backup before merge
    local backup_file="${target_file}.backup.$(date +%Y%m%d%H%M%S)"
    cp "$target_file" "$backup_file"

    # Check if jq is available for smart merging
    if command -v jq &>/dev/null; then
        # Validate both JSON files
        if ! jq empty "$source_file" 2>/dev/null; then
            ui_error "Invalid JSON in source file: $source_file"
            return 1
        fi

        if ! jq empty "$target_file" 2>/dev/null; then
            ui_warning "Invalid JSON in target file, replacing with source"
            cp "$source_file" "$target_file"
            chmod 600 "$target_file"
            return 0
        fi

        # Merge: source values override target, but preserve user keys not in source
        # This uses jq's * operator which recursively merges objects
        # Target is first, source second - source keys override target keys
        local merged
        if merged=$(jq -s '.[0] * .[1]' "$target_file" "$source_file" 2>/dev/null); then
            echo "$merged" > "$target_file"
            chmod 600 "$target_file"
            ui_info "Merged config: $(basename "$target_file")"
            return 0
        else
            ui_warning "JSON merge failed, replacing with source"
            cp "$source_file" "$target_file"
            chmod 600 "$target_file"
            return 0
        fi
    else
        # No jq available - fallback to simple copy
        # Preserve backup so user can manually merge if desired
        ui_warning "jq not available - replacing config (backup saved)"
        cp "$source_file" "$target_file"
        chmod 600 "$target_file"
        return 0
    fi
}

# Deploy yoyo-dev Wave configuration files
# Args: $1 = --force (optional, skip version check)
# Returns: 0 on success, 1 on failure
deploy_wave_config() {
    local force="${1:-}"
    local base_dir
    local source_config_dir

    # Get yoyo-dev base directory
    if ! base_dir=$(get_base_dir); then
        ui_error "Cannot deploy config: yoyo-dev installation not found"
        return 1
    fi

    source_config_dir="${base_dir}/setup/wave-config"

    # Verify source config directory exists
    if [ ! -d "$source_config_dir" ]; then
        ui_error "Wave config directory not found: $source_config_dir"
        return 1
    fi

    # Check if update is needed
    if ! check_config_version "$force"; then
        ui_info "Wave configuration is up to date (v${WAVE_CONFIG_VERSION})"
        return 0
    fi

    ui_info "Deploying yoyo-dev Wave configuration..."

    # Create Wave config directory if it doesn't exist
    if [ ! -d "$WAVE_CONFIG_DIR" ]; then
        mkdir -p "$WAVE_CONFIG_DIR"
        chmod 700 "$WAVE_CONFIG_DIR"
        ui_info "Created Wave config directory: $WAVE_CONFIG_DIR"
    fi

    # List of config files to deploy
    local config_files=(
        "settings.json"
        "presets.json"
        "widgets.json"
        "termthemes.json"
        "waveai.json"
    )

    local deployed_count=0
    local failed_count=0

    # Deploy each config file
    for config_file in "${config_files[@]}"; do
        local source_file="${source_config_dir}/${config_file}"
        local target_file="${WAVE_CONFIG_DIR}/${config_file}"

        if [ -f "$source_file" ]; then
            if merge_wave_config "$source_file" "$target_file"; then
                ((deployed_count++))
            else
                ((failed_count++))
                ui_warning "Failed to deploy: $config_file"
            fi
        else
            ui_warning "Source file not found: $config_file"
        fi
    done

    # Write version file
    echo "$WAVE_CONFIG_VERSION" > "$WAVE_VERSION_FILE"
    chmod 600 "$WAVE_VERSION_FILE"

    # Report results
    if [ $failed_count -eq 0 ]; then
        ui_success "Deployed ${deployed_count} config files (v${WAVE_CONFIG_VERSION})"
        return 0
    else
        ui_warning "Deployed ${deployed_count} files, ${failed_count} failed"
        return 1
    fi
}

# ============================================================================
# Layout Setup Functions
# ============================================================================

# Marker file to track if initial layout setup has been done
readonly WAVE_LAYOUT_MARKER="${WAVE_CONFIG_DIR}/.yoyo-dev-layout-done"

# Check if initial layout setup is needed
needs_layout_setup() {
    # Return 0 (true) if setup is needed, 1 (false) if already done
    if [ -f "$WAVE_LAYOUT_MARKER" ]; then
        return 1
    fi
    return 0
}

# Mark layout setup as complete
mark_layout_done() {
    echo "$(date -Iseconds)" > "$WAVE_LAYOUT_MARKER"
    chmod 600 "$WAVE_LAYOUT_MARKER" 2>/dev/null || true
}

# Wait for Wave to be ready (wsh becomes available)
wait_for_wave_ready() {
    local max_wait="${1:-30}"
    local waited=0

    while [ $waited -lt $max_wait ]; do
        # Check if wsh is available and responsive
        if command -v wsh &>/dev/null && wsh wavepath &>/dev/null; then
            return 0
        fi
        sleep 1
        ((waited++))
    done

    return 1
}

# Setup yoyo-dev layout in Wave Terminal
# This runs in background after Wave opens (first time only)
# Layout: Left=yoyo-cli, Middle=GUI, Right-top=Files, Right-bottom=System
setup_yoyo_layout() {
    local project_dir="${1:-$PWD}"

    # Wait for Wave to be ready
    if ! wait_for_wave_ready 30; then
        return 1
    fi

    # Small additional delay for UI to stabilize
    sleep 2

    # Check if wsh is available
    if ! command -v wsh &>/dev/null; then
        mark_layout_done
        return 1
    fi

    # Set up the yoyo-dev layout using wsh commands
    # Note: This is best-effort - Wave may not support all operations

    # 1. Launch yoyo-cli in the default terminal (left pane)
    #    The terminal that opens by default should run yoyo-cli
    wsh run -c "clear && cd '$project_dir' && (command -v yoyo-cli >/dev/null && yoyo-cli || claude)" &>/dev/null || true
    sleep 1

    # 2. Open the GUI dashboard (middle pane)
    wsh web open "http://localhost:5173" &>/dev/null || true
    sleep 0.5

    # 3. Open the file browser with project directory (right-top)
    wsh view "$project_dir" &>/dev/null || true
    sleep 0.5

    # 4. Open system info (right-bottom)
    wsh sysinfo &>/dev/null || true

    # Mark setup as done
    mark_layout_done

    return 0
}

# Reset layout setup marker (allows re-running setup)
reset_layout_marker() {
    if [ -f "$WAVE_LAYOUT_MARKER" ]; then
        rm -f "$WAVE_LAYOUT_MARKER"
        ui_success "Layout marker reset. Next Wave launch will run setup."
    else
        ui_info "Layout marker does not exist."
    fi
}

# ============================================================================
# Script Entry Point (when run directly)
# ============================================================================

# Main function for direct script execution
main() {
    local action="${1:-}"
    local version="${2:-$WAVE_VERSION}"

    case "$action" in
        detect|--detect|-d)
            if wave_path=$(detect_wave); then
                echo "$wave_path"
                exit 0
            else
                exit 1
            fi
            ;;
        version|--version|-v)
            echo "$WAVE_VERSION"
            exit 0
            ;;
        config-version|--config-version)
            echo "$WAVE_CONFIG_VERSION"
            exit 0
            ;;
        install|--install|-i)
            install_wave "$version" "${3:-}"
            exit $?
            ;;
        deploy|--deploy)
            deploy_wave_config "${2:-}"
            exit $?
            ;;
        check-config|--check-config)
            if check_config_version "${2:-}"; then
                echo "Update needed"
                exit 0
            else
                echo "Up to date"
                exit 1
            fi
            ;;
        url|--url)
            get_wave_download_url "$version"
            exit 0
            ;;
        help|--help|-h)
            echo "Wave Terminal Installation Script for Yoyo Dev"
            echo ""
            echo "Usage: $0 [action] [options]"
            echo ""
            echo "Actions:"
            echo "  detect, -d         Check if Wave is installed (prints path)"
            echo "  install, -i        Install Wave Terminal"
            echo "  deploy             Deploy yoyo-dev Wave configuration"
            echo "  check-config       Check if config update is needed"
            echo "  version, -v        Show script version"
            echo "  config-version     Show config version"
            echo "  url                Show download URL for current platform"
            echo "  help, -h           Show this help"
            echo ""
            echo "Options:"
            echo "  --force, -f        Skip installation prompt or force config update"
            echo ""
            echo "Environment:"
            echo "  WAVE_VERSION       Override default Wave version ($WAVE_VERSION)"
            echo "  YOYO_DEV_DIR       Override yoyo-dev installation directory"
            echo ""
            exit 0
            ;;
        "")
            # Default: Check if installed, prompt to install if not
            if detect_wave &>/dev/null; then
                ui_success "Wave Terminal is installed"
                wave_path=$(detect_wave)
                ui_info "Location: $wave_path"
                wave_ver=$(get_wave_version)
                if [ -n "$wave_ver" ]; then
                    ui_info "Version: $wave_ver"
                fi
                exit 0
            else
                install_wave "$WAVE_VERSION"
                exit $?
            fi
            ;;
        *)
            ui_error "Unknown action: $action"
            echo "Use '$0 --help' for usage information"
            exit 1
            ;;
    esac
}

# Run main if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
