#!/usr/bin/env bash

# =============================================================================
# Yoyo Dev AI - One-Line Bootstrap Installer
# =============================================================================
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/daverjorge46/yoyo-dev-ai/main/setup/bootstrap.sh | bash
#   bash <(curl -sSL https://raw.githubusercontent.com/daverjorge46/yoyo-dev-ai/main/setup/bootstrap.sh) --interactive
#   bash bootstrap.sh [OPTIONS]
#
# This script bootstraps a complete yoyo-dev and yoyo-ai installation on a
# fresh machine. It handles OS detection, dependency installation, BASE cloning,
# global command setup, and OpenClaw configuration.
#
# Exit codes:
#   0 - Success
#   1 - General error
#   2 - Unsupported OS
#   3 - Dependency installation failed
# =============================================================================

# Strict mode (pipefail omitted for Bash 3.2 compat in early checks)
set -eu

readonly BOOTSTRAP_VERSION="1.0.0"
readonly YOYO_VERSION="7.0.0"
readonly REPO_HTTPS_URL="https://github.com/daverjorge46/yoyo-dev-ai.git"
readonly REPO_SSH_URL="git@github.com:daverjorge46/yoyo-dev-ai.git"
readonly REPO_RAW_URL="https://raw.githubusercontent.com/daverjorge46/yoyo-dev-ai"
readonly BASE_DIR="$HOME/.yoyo-dev"
readonly AI_DIR="$HOME/.yoyo-ai"
readonly NODE_REQUIRED_MAJOR=22
readonly MIN_DISK_MB=200

# =============================================================================
# Minimal UI (used before BASE is cloned and ui-library.sh is available)
# =============================================================================

# Detect color support
if [ -t 1 ] && [ "${NO_COLOR:-}" = "" ]; then
    _C_RED='\033[0;31m'
    _C_GREEN='\033[0;32m'
    _C_YELLOW='\033[1;33m'
    _C_CYAN='\033[0;36m'
    _C_BOLD='\033[1m'
    _C_DIM='\033[2m'
    _C_RESET='\033[0m'
else
    _C_RED='' _C_GREEN='' _C_YELLOW='' _C_CYAN=''
    _C_BOLD='' _C_DIM='' _C_RESET=''
fi

_info()    { printf "${_C_CYAN}info${_C_RESET}  %s\n" "$*"; }
_ok()      { printf "${_C_GREEN}  ok${_C_RESET}  %s\n" "$*"; }
_warn()    { printf "${_C_YELLOW}warn${_C_RESET}  %s\n" "$*" >&2; }
_error()   { printf "${_C_RED} err${_C_RESET}  %s\n" "$*" >&2; }
_step()    { printf "\n${_C_BOLD}[%s/%s]${_C_RESET} %s\n" "$1" "$TOTAL_STEPS" "$2"; }
_detail()  { printf "      %s\n" "$*"; }

# Total steps shown in progress (updated by mode)
TOTAL_STEPS=7

# =============================================================================
# CLI Flag Defaults
# =============================================================================

FLAG_INTERACTIVE=false
FLAG_YOYO_DEV_ONLY=false
FLAG_YOYO_AI_ONLY=false
FLAG_NO_DEPS=false
FLAG_NO_CLAUDE_CODE=false
FLAG_PREFIX=""
FLAG_BRANCH="main"
FLAG_VERBOSE=false
FLAG_DRY_RUN=false
FLAG_UNINSTALL=false
FLAG_SSH=false
FLAG_HELP=false

# =============================================================================
# CLI Flag Parsing
# =============================================================================

parse_flags() {
    while [ $# -gt 0 ]; do
        case "$1" in
            --interactive)
                FLAG_INTERACTIVE=true
                ;;
            --yoyo-dev-only)
                FLAG_YOYO_DEV_ONLY=true
                ;;
            --yoyo-ai-only)
                FLAG_YOYO_AI_ONLY=true
                ;;
            --no-deps)
                FLAG_NO_DEPS=true
                ;;
            --no-claude-code)
                FLAG_NO_CLAUDE_CODE=true
                ;;
            --prefix)
                shift
                if [ $# -eq 0 ]; then
                    _error "--prefix requires a path argument"
                    exit 1
                fi
                FLAG_PREFIX="$1"
                ;;
            --prefix=*)
                FLAG_PREFIX="${1#--prefix=}"
                ;;
            --branch)
                shift
                if [ $# -eq 0 ]; then
                    _error "--branch requires a name argument"
                    exit 1
                fi
                FLAG_BRANCH="$1"
                ;;
            --branch=*)
                FLAG_BRANCH="${1#--branch=}"
                ;;
            --ssh)
                FLAG_SSH=true
                ;;
            --verbose)
                FLAG_VERBOSE=true
                ;;
            --dry-run)
                FLAG_DRY_RUN=true
                ;;
            --uninstall)
                FLAG_UNINSTALL=true
                ;;
            --help|-h)
                FLAG_HELP=true
                ;;
            *)
                _error "Unknown option: $1"
                _detail "Run with --help for usage information"
                exit 1
                ;;
        esac
        shift
    done

    # Validate conflicting flags
    if [ "$FLAG_YOYO_DEV_ONLY" = true ] && [ "$FLAG_YOYO_AI_ONLY" = true ]; then
        _error "Cannot use --yoyo-dev-only and --yoyo-ai-only together"
        exit 1
    fi
}

# =============================================================================
# Help
# =============================================================================

show_help() {
    cat <<EOF
Yoyo Dev AI Bootstrap Installer v${BOOTSTRAP_VERSION}

USAGE:
  curl -sSL <url> | bash                    Non-interactive install (both components)
  bash <(curl -sSL <url>) --interactive     Guided interactive setup
  bash bootstrap.sh [OPTIONS]               Direct execution with options

OPTIONS:
  --interactive         Full guided setup with prompts
  --yoyo-dev-only       Install only yoyo-dev (skip OpenClaw/yoyo-ai)
  --yoyo-ai-only        Install only yoyo-ai/OpenClaw (skip dev tools)
  --no-deps             Skip dependency installation (assume pre-installed)
  --no-claude-code      Skip Claude Code CLI installation
  --ssh                 Clone via SSH (git@github.com:) instead of HTTPS (for private repos)
  --prefix <path>       Custom install prefix for commands (default: auto-detect)
  --branch <name>       Clone specific branch (default: main)
  --verbose             Show detailed output for debugging
  --dry-run             Show what would be installed without doing it
  --uninstall           Remove yoyo-dev-ai completely
  --help, -h            Show this help message

EXAMPLES:
  # Quick install (everything, defaults):
  curl -sSL https://raw.githubusercontent.com/daverjorge46/yoyo-dev-ai/main/setup/bootstrap.sh | bash

  # Interactive guided setup:
  bash <(curl -sSL https://raw.githubusercontent.com/daverjorge46/yoyo-dev-ai/main/setup/bootstrap.sh) --interactive

  # Dev tools only, no AI assistant:
  bash <(curl -sSL <url>) --yoyo-dev-only

  # Preview what would be installed:
  bash <(curl -sSL <url>) --dry-run

COMPONENTS:
  yoyo-dev      Development environment (Claude Code, specs, orchestration)
  yoyo-ai       Business and Personal AI Assistant (OpenClaw daemon)

DIRECTORIES:
  ~/.yoyo-dev   BASE installation (framework source, shared across projects)
  ~/.yoyo-ai    OpenClaw configuration and sessions

AFTER INSTALLATION:
  cd <your-project>
  yoyo-init --claude-code

EOF
}

# =============================================================================
# OS Detection
# =============================================================================

# Detected OS (set by detect_os)
DETECTED_OS=""
DETECTED_PKG_MGR=""

detect_os() {
    # WSL detection (check first since it's also "Linux")
    if [ -f /proc/version ] && grep -qi "microsoft\|wsl" /proc/version 2>/dev/null; then
        DETECTED_OS="wsl"
        DETECTED_PKG_MGR="apt-get"
        return 0
    fi
    if [ -n "${WSL_DISTRO_NAME:-}" ]; then
        DETECTED_OS="wsl"
        DETECTED_PKG_MGR="apt-get"
        return 0
    fi

    # macOS detection
    if [ "$(uname -s)" = "Darwin" ]; then
        DETECTED_OS="macos"
        DETECTED_PKG_MGR="brew"
        return 0
    fi

    # Linux distro detection via /etc/os-release
    if [ -f /etc/os-release ]; then
        # shellcheck disable=SC1091
        . /etc/os-release

        local id="${ID:-unknown}"
        local id_like="${ID_LIKE:-}"

        case "$id" in
            ubuntu|debian|pop|linuxmint|elementary|zorin|kali|raspbian)
                DETECTED_OS="linux-debian"
                DETECTED_PKG_MGR="apt-get"
                return 0
                ;;
            fedora|rhel|centos|rocky|almalinux|ol)
                DETECTED_OS="linux-fedora"
                DETECTED_PKG_MGR="dnf"
                return 0
                ;;
            arch|manjaro|endeavouros|garuda)
                DETECTED_OS="linux-arch"
                DETECTED_PKG_MGR="pacman"
                return 0
                ;;
            opensuse*|sles)
                DETECTED_OS="linux-suse"
                DETECTED_PKG_MGR="zypper"
                return 0
                ;;
        esac

        # Fallback: check ID_LIKE for derivatives
        case "$id_like" in
            *debian*|*ubuntu*)
                DETECTED_OS="linux-debian"
                DETECTED_PKG_MGR="apt-get"
                return 0
                ;;
            *fedora*|*rhel*)
                DETECTED_OS="linux-fedora"
                DETECTED_PKG_MGR="dnf"
                return 0
                ;;
            *arch*)
                DETECTED_OS="linux-arch"
                DETECTED_PKG_MGR="pacman"
                return 0
                ;;
            *suse*)
                DETECTED_OS="linux-suse"
                DETECTED_PKG_MGR="zypper"
                return 0
                ;;
        esac
    fi

    # Unknown OS
    DETECTED_OS="unknown"
    DETECTED_PKG_MGR=""
    return 1
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

check_internet() {
    if command -v curl >/dev/null 2>&1; then
        curl -sSf --max-time 10 "https://github.com" >/dev/null 2>&1
    elif command -v wget >/dev/null 2>&1; then
        wget -q --timeout=10 --spider "https://github.com" 2>/dev/null
    else
        # No curl or wget, will be installed in deps step
        return 0
    fi
}

check_disk_space() {
    local available_mb=0
    if command -v df >/dev/null 2>&1; then
        # Get available space in MB for home directory
        available_mb=$(df -m "$HOME" 2>/dev/null | awk 'NR==2 {print $4}')
    fi
    if [ -n "$available_mb" ] && [ "$available_mb" -lt "$MIN_DISK_MB" ] 2>/dev/null; then
        return 1
    fi
    return 0
}

preflight_checks() {
    local failed=false

    # OS support
    if ! detect_os; then
        _error "Unsupported operating system"
        _detail "Supported: Ubuntu/Debian, Fedora/RHEL, Arch, openSUSE, macOS, WSL"
        _detail "Detected uname: $(uname -s) $(uname -r)"
        if [ -f /etc/os-release ]; then
            _detail "os-release ID: $(. /etc/os-release && echo "${ID:-unknown}")"
        fi
        exit 2
    fi
    _ok "OS detected: ${DETECTED_OS} (package manager: ${DETECTED_PKG_MGR})"

    # Root warning (not blocking)
    if [ "$(id -u)" -eq 0 ]; then
        _warn "Running as root. Global npm packages will install system-wide."
        _detail "Consider running as a regular user for per-user installation."
    fi

    # Disk space
    if ! check_disk_space; then
        _error "Insufficient disk space (need at least ${MIN_DISK_MB}MB free in $HOME)"
        failed=true
    else
        _ok "Disk space check passed"
    fi

    # Internet connectivity
    if ! check_internet; then
        _error "Cannot reach github.com. Check your internet connection."
        failed=true
    else
        _ok "Internet connectivity check passed"
    fi

    if [ "$failed" = true ]; then
        exit 1
    fi
}

# =============================================================================
# Existing Installation Detection
# =============================================================================

# Return values via global vars (Bash 3.2 compat)
EXISTING_BASE="none"      # none | valid | broken
EXISTING_AI="none"        # none | valid | broken
EXISTING_COMMANDS=false    # true if any yoyo-* command found in PATH

detect_existing() {
    # Check ~/.yoyo-dev
    if [ -d "$BASE_DIR" ]; then
        if [ -f "$BASE_DIR/setup/install.sh" ] && [ -d "$BASE_DIR/instructions" ]; then
            EXISTING_BASE="valid"
        else
            EXISTING_BASE="broken"
        fi
    else
        EXISTING_BASE="none"
    fi

    # Check ~/.yoyo-ai
    if [ -d "$AI_DIR" ]; then
        if [ -f "$AI_DIR/openclaw.json" ] || [ -f "$AI_DIR/.yoyo-onboarded" ]; then
            EXISTING_AI="valid"
        else
            EXISTING_AI="broken"
        fi
    else
        EXISTING_AI="none"
    fi

    # Check global commands
    if command -v yoyo-dev >/dev/null 2>&1 || command -v yoyo-ai >/dev/null 2>&1; then
        EXISTING_COMMANDS=true
    fi
}

# =============================================================================
# Dependency Installation
# =============================================================================

# Run a command with sudo if available and needed
_maybe_sudo() {
    if [ "$(id -u)" -eq 0 ]; then
        "$@"
    elif command -v sudo >/dev/null 2>&1; then
        sudo "$@"
    else
        _error "Need root privileges to run: $*"
        _detail "Please install sudo or run as root"
        return 1
    fi
}

# Retry a command once after delay
_retry() {
    local delay="$1"
    shift
    if "$@"; then
        return 0
    fi
    _warn "Command failed, retrying in ${delay}s..."
    sleep "$delay"
    "$@"
}

install_system_deps() {
    local need_git=false
    local need_curl=false

    if ! command -v git >/dev/null 2>&1; then
        need_git=true
    fi
    if ! command -v curl >/dev/null 2>&1; then
        need_curl=true
    fi

    if [ "$need_git" = false ] && [ "$need_curl" = false ]; then
        _ok "System dependencies already installed (git, curl)"
        return 0
    fi

    _info "Installing system dependencies..."

    case "$DETECTED_PKG_MGR" in
        apt-get)
            _maybe_sudo apt-get update -qq
            local pkgs=""
            [ "$need_git" = true ] && pkgs="$pkgs git"
            [ "$need_curl" = true ] && pkgs="$pkgs curl"
            # shellcheck disable=SC2086
            _maybe_sudo apt-get install -y -qq $pkgs
            ;;
        dnf)
            local pkgs=""
            [ "$need_git" = true ] && pkgs="$pkgs git"
            [ "$need_curl" = true ] && pkgs="$pkgs curl"
            # shellcheck disable=SC2086
            _maybe_sudo dnf install -y -q $pkgs
            ;;
        pacman)
            local pkgs=""
            [ "$need_git" = true ] && pkgs="$pkgs git"
            [ "$need_curl" = true ] && pkgs="$pkgs curl"
            # shellcheck disable=SC2086
            _maybe_sudo pacman -Sy --noconfirm --needed $pkgs
            ;;
        zypper)
            local pkgs=""
            [ "$need_git" = true ] && pkgs="$pkgs git"
            [ "$need_curl" = true ] && pkgs="$pkgs curl"
            # shellcheck disable=SC2086
            _maybe_sudo zypper install -y $pkgs
            ;;
        brew)
            if ! command -v brew >/dev/null 2>&1; then
                install_homebrew
            fi
            local pkgs=""
            [ "$need_git" = true ] && pkgs="$pkgs git"
            [ "$need_curl" = true ] && pkgs="$pkgs curl"
            # shellcheck disable=SC2086
            brew install $pkgs
            ;;
    esac

    # Verify
    if [ "$need_git" = true ] && ! command -v git >/dev/null 2>&1; then
        _error "Failed to install git"
        _detail "Please install git manually and re-run this script"
        return 1
    fi
    if [ "$need_curl" = true ] && ! command -v curl >/dev/null 2>&1; then
        _error "Failed to install curl"
        _detail "Please install curl manually and re-run this script"
        return 1
    fi

    _ok "System dependencies installed"
}

install_homebrew() {
    _info "Installing Homebrew..."
    if [ "$FLAG_DRY_RUN" = true ]; then
        _detail "[dry-run] Would install Homebrew"
        return 0
    fi
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" </dev/null

    # Add brew to PATH for this session (Apple Silicon vs Intel)
    if [ -f /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -f /usr/local/bin/brew ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi

    if ! command -v brew >/dev/null 2>&1; then
        _error "Homebrew installation failed"
        _detail "Please install manually: https://brew.sh"
        return 1
    fi
    _ok "Homebrew installed"
}

install_nodejs() {
    # Check if already installed and sufficient version
    if command -v node >/dev/null 2>&1; then
        local node_version
        node_version=$(node --version 2>/dev/null | sed 's/^v//')
        local node_major
        node_major=$(echo "$node_version" | cut -d. -f1)
        if [ "$node_major" -ge "$NODE_REQUIRED_MAJOR" ] 2>/dev/null; then
            _ok "Node.js v${node_version} already installed (>= ${NODE_REQUIRED_MAJOR} required)"
            return 0
        fi
        _warn "Node.js v${node_version} found but v${NODE_REQUIRED_MAJOR}+ required"
    fi

    _info "Installing Node.js v${NODE_REQUIRED_MAJOR}..."

    if [ "$FLAG_DRY_RUN" = true ]; then
        _detail "[dry-run] Would install Node.js >= ${NODE_REQUIRED_MAJOR}"
        return 0
    fi

    local install_success=false

    case "$DETECTED_OS" in
        linux-debian|wsl)
            # Primary: NodeSource repository
            if _retry 5 curl -fsSL "https://deb.nodesource.com/setup_${NODE_REQUIRED_MAJOR}.x" -o /tmp/nodesource_setup.sh; then
                if _maybe_sudo bash /tmp/nodesource_setup.sh; then
                    if _maybe_sudo apt-get install -y -qq nodejs; then
                        install_success=true
                    fi
                fi
                rm -f /tmp/nodesource_setup.sh
            fi
            ;;
        linux-fedora)
            if _retry 5 curl -fsSL "https://rpm.nodesource.com/setup_${NODE_REQUIRED_MAJOR}.x" -o /tmp/nodesource_setup.sh; then
                if _maybe_sudo bash /tmp/nodesource_setup.sh; then
                    if _maybe_sudo dnf install -y -q nodejs; then
                        install_success=true
                    fi
                fi
                rm -f /tmp/nodesource_setup.sh
            fi
            ;;
        linux-arch)
            # Arch typically has recent Node.js in repos
            if _maybe_sudo pacman -Sy --noconfirm nodejs npm; then
                install_success=true
            fi
            ;;
        linux-suse)
            if _retry 5 curl -fsSL "https://rpm.nodesource.com/setup_${NODE_REQUIRED_MAJOR}.x" -o /tmp/nodesource_setup.sh; then
                if _maybe_sudo bash /tmp/nodesource_setup.sh; then
                    if _maybe_sudo zypper install -y nodejs; then
                        install_success=true
                    fi
                fi
                rm -f /tmp/nodesource_setup.sh
            fi
            ;;
        macos)
            if command -v brew >/dev/null 2>&1; then
                if brew install "node@${NODE_REQUIRED_MAJOR}"; then
                    # Link if needed
                    brew link --overwrite "node@${NODE_REQUIRED_MAJOR}" 2>/dev/null || true
                    install_success=true
                fi
            fi
            ;;
    esac

    # Fallback: nvm
    if [ "$install_success" = false ]; then
        _warn "Primary Node.js installation failed. Trying nvm fallback..."
        install_nodejs_via_nvm
        return $?
    fi

    # Verify
    if command -v node >/dev/null 2>&1; then
        local installed_ver
        installed_ver=$(node --version 2>/dev/null)
        _ok "Node.js ${installed_ver} installed"
    else
        _error "Node.js installation could not be verified"
        return 1
    fi
}

install_nodejs_via_nvm() {
    _info "Installing Node.js via nvm..."

    if [ "$FLAG_DRY_RUN" = true ]; then
        _detail "[dry-run] Would install nvm and Node.js ${NODE_REQUIRED_MAJOR}"
        return 0
    fi

    # Install nvm
    local nvm_dir="${NVM_DIR:-$HOME/.nvm}"
    if [ ! -d "$nvm_dir" ]; then
        if ! _retry 5 curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh -o /tmp/nvm_install.sh; then
            _error "Failed to download nvm installer"
            _detail "Please install Node.js >= ${NODE_REQUIRED_MAJOR} manually"
            _detail "Visit: https://nodejs.org/"
            return 3
        fi
        bash /tmp/nvm_install.sh
        rm -f /tmp/nvm_install.sh
    fi

    # Source nvm for this session
    export NVM_DIR="$nvm_dir"
    # shellcheck disable=SC1091
    [ -s "$nvm_dir/nvm.sh" ] && . "$nvm_dir/nvm.sh"

    if ! command -v nvm >/dev/null 2>&1; then
        _error "nvm installation failed"
        _detail "Please install Node.js >= ${NODE_REQUIRED_MAJOR} manually"
        return 3
    fi

    nvm install "$NODE_REQUIRED_MAJOR"
    nvm use "$NODE_REQUIRED_MAJOR"

    if command -v node >/dev/null 2>&1; then
        _ok "Node.js $(node --version) installed via nvm"
    else
        _error "Node.js installation via nvm failed"
        return 3
    fi
}

install_claude_code() {
    if [ "$FLAG_NO_CLAUDE_CODE" = true ]; then
        _info "Skipping Claude Code CLI (--no-claude-code)"
        return 0
    fi

    if command -v claude >/dev/null 2>&1; then
        _ok "Claude Code CLI already installed"
        return 0
    fi

    _info "Installing Claude Code CLI..."

    if [ "$FLAG_DRY_RUN" = true ]; then
        _detail "[dry-run] Would run: npm install -g @anthropic-ai/claude-code"
        return 0
    fi

    if npm install -g @anthropic-ai/claude-code 2>/dev/null; then
        _ok "Claude Code CLI installed"
    else
        _warn "Claude Code CLI installation failed (non-critical)"
        _detail "Install manually later: npm install -g @anthropic-ai/claude-code"
    fi
}

# =============================================================================
# BASE Installation (Clone/Update)
# =============================================================================

_repo_url() {
    if [ "$FLAG_SSH" = true ]; then
        echo "$REPO_SSH_URL"
    else
        echo "$REPO_HTTPS_URL"
    fi
}

# Detect if the script is being run from within the yoyo-dev-ai source repo
# Returns the repo root path on stdout, or empty if not in a source repo
_detect_local_source() {
    # Resolve the directory containing this script
    local script_dir=""
    if [ -n "${BASH_SOURCE[0]:-}" ]; then
        script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    elif [ -f "$0" ]; then
        script_dir="$(cd "$(dirname "$0")" && pwd)"
    fi

    # Check if script_dir/.. looks like the yoyo-dev-ai repo
    if [ -n "$script_dir" ]; then
        local candidate
        candidate="$(cd "$script_dir/.." 2>/dev/null && pwd)"
        if [ -f "$candidate/setup/install.sh" ] && [ -d "$candidate/instructions" ] && [ -d "$candidate/setup" ]; then
            # Confirm it's not already the BASE_DIR itself
            if [ "$candidate" != "$BASE_DIR" ]; then
                echo "$candidate"
                return 0
            fi
        fi
    fi
    return 1
}

clone_or_update_base() {
    detect_existing

    # First check: are we running from within the source repo?
    local local_source=""
    local_source="$(_detect_local_source)" || true

    case "$EXISTING_BASE" in
        valid)
            _info "Existing BASE installation found at ${BASE_DIR}"
            if [ -n "$local_source" ]; then
                _info "Updating from local source: ${local_source}"
                if [ "$FLAG_DRY_RUN" = true ]; then
                    _detail "[dry-run] Would rsync from ${local_source}/ to ${BASE_DIR}/"
                    return 0
                fi
                _copy_from_local "$local_source"
            else
                _info "Updating via git pull..."
                if [ "$FLAG_DRY_RUN" = true ]; then
                    _detail "[dry-run] Would run: git -C ${BASE_DIR} pull origin ${FLAG_BRANCH}"
                    return 0
                fi
                if git -C "$BASE_DIR" pull origin "$FLAG_BRANCH" --ff-only 2>/dev/null; then
                    _ok "BASE updated"
                else
                    _warn "git pull failed (possibly diverged). Performing backup and re-clone..."
                    local backup="${BASE_DIR}.backup.$(date +%s)"
                    mv "$BASE_DIR" "$backup"
                    _detail "Backup saved to: $backup"
                    _clone_base
                fi
            fi
            ;;
        broken)
            _warn "Broken BASE installation detected at ${BASE_DIR}"
            if [ "$FLAG_DRY_RUN" = true ]; then
                _detail "[dry-run] Would backup broken install and re-install"
                return 0
            fi
            local backup="${BASE_DIR}.backup.$(date +%s)"
            mv "$BASE_DIR" "$backup"
            _detail "Backup saved to: $backup"
            if [ -n "$local_source" ]; then
                _copy_from_local "$local_source"
            else
                _clone_base
            fi
            ;;
        none)
            _info "No existing installation found"
            if [ "$FLAG_DRY_RUN" = true ]; then
                if [ -n "$local_source" ]; then
                    _detail "[dry-run] Would copy from local source: ${local_source}"
                else
                    _detail "[dry-run] Would clone $(_repo_url) to ${BASE_DIR}"
                fi
                return 0
            fi
            if [ -n "$local_source" ]; then
                _copy_from_local "$local_source"
            else
                _clone_base
            fi
            ;;
    esac
}

# Copy from local source repo to BASE_DIR
_copy_from_local() {
    local source="$1"
    _info "Installing from local source: ${source}"

    if command -v rsync >/dev/null 2>&1; then
        rsync -a --exclude='.git' --exclude='node_modules' --exclude='.yoyo-dev' \
            "$source/" "$BASE_DIR/"
    else
        mkdir -p "$BASE_DIR"
        # Copy key directories, skip .git and node_modules
        for item in setup instructions standards .claude src gui gui-ai tests package.json; do
            if [ -e "$source/$item" ]; then
                cp -a "$source/$item" "$BASE_DIR/" 2>/dev/null || true
            fi
        done
    fi
    _ok "BASE installed from local source"
}

_clone_base() {
    local repo_url
    repo_url="$(_repo_url)"
    _info "Cloning yoyo-dev-ai to ${BASE_DIR}..."
    _info "Cloning from: ${repo_url}"
    if _retry 5 git clone --branch "$FLAG_BRANCH" --single-branch "$repo_url" "$BASE_DIR"; then
        _ok "BASE cloned successfully"
    else
        _error "Failed to clone repository"
        _detail "URL: ${repo_url}"
        _detail "Branch: ${FLAG_BRANCH}"
        _detail "Please check your internet connection and try again"
        exit 1
    fi
}

# Upgrade output to full ui-library.sh after BASE is cloned
_upgrade_ui() {
    if [ -f "$BASE_DIR/setup/ui-library.sh" ]; then
        # shellcheck disable=SC1091
        . "$BASE_DIR/setup/ui-library.sh" 2>/dev/null || true
        if [ "$FLAG_VERBOSE" = true ]; then
            _detail "UI upgraded to full ui-library.sh"
        fi
    fi
}

# =============================================================================
# Global Commands Setup
# =============================================================================

setup_global_commands() {
    _info "Installing global commands..."

    if [ "$FLAG_DRY_RUN" = true ]; then
        _detail "[dry-run] Would run: ${BASE_DIR}/setup/install-global-command.sh"
        return 0
    fi

    if [ -f "$BASE_DIR/setup/install-global-command.sh" ]; then
        chmod +x "$BASE_DIR/setup/install-global-command.sh"
        bash "$BASE_DIR/setup/install-global-command.sh"
    else
        _error "install-global-command.sh not found in BASE"
        return 1
    fi
}

# =============================================================================
# OpenClaw / yoyo-ai Installation
# =============================================================================

install_openclaw() {
    if [ "$FLAG_YOYO_DEV_ONLY" = true ]; then
        _info "Skipping OpenClaw (--yoyo-dev-only)"
        return 0
    fi

    _info "Installing OpenClaw (yoyo-ai)..."

    if [ "$FLAG_DRY_RUN" = true ]; then
        _detail "[dry-run] Would install openclaw@latest globally"
        _detail "[dry-run] Would create ${AI_DIR} and generate gateway token"
        return 0
    fi

    # Install OpenClaw npm package
    if ! npm install -g openclaw@latest 2>/dev/null; then
        _warn "OpenClaw installation failed"
        _detail "Install manually later: npm install -g openclaw@latest"
        _detail "Then run: yoyo-ai --start"
        return 0
    fi
    _ok "OpenClaw package installed"

    # Create yoyo-ai directory
    mkdir -p "$AI_DIR"

    # Generate gateway token
    local token_file="$AI_DIR/.gateway-token"
    if [ ! -f "$token_file" ]; then
        local token
        token="yoyo-$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')"
        printf '%s' "$token" > "$token_file"
        chmod 600 "$token_file"
        _ok "Gateway token generated"
    else
        _ok "Gateway token already exists"
    fi

    # Run onboarding (non-interactive)
    if command -v openclaw >/dev/null 2>&1; then
        local gw_token
        gw_token=$(cat "$token_file")
        if openclaw onboard \
            --non-interactive \
            --accept-risk \
            --flow quickstart \
            --mode local \
            --gateway-port 18789 \
            --gateway-auth token \
            --gateway-token "$gw_token" \
            --install-daemon 2>/dev/null; then
            _ok "OpenClaw onboarded"
        else
            _warn "OpenClaw onboarding had warnings (may need manual config)"
            _detail "Run 'yoyo-ai --start' to complete setup"
        fi
    fi

    # Create backwards compat symlink
    if [ ! -e "$HOME/.openclaw" ]; then
        ln -sf "$AI_DIR" "$HOME/.openclaw" 2>/dev/null || true
    fi
}

# =============================================================================
# Shell Profile Integration
# =============================================================================

setup_shell_profile() {
    # Determine install dir for PATH
    local install_dir="${FLAG_PREFIX}"
    if [ -z "$install_dir" ]; then
        if [ -w "/usr/local/bin" ] || [ "$(id -u)" -eq 0 ]; then
            # /usr/local/bin is typically already in PATH
            return 0
        elif [ -d "$HOME/.local/bin" ]; then
            install_dir="$HOME/.local/bin"
        elif [ -d "$HOME/bin" ]; then
            install_dir="$HOME/bin"
        else
            install_dir="$HOME/.local/bin"
        fi
    fi

    # Check if already in PATH
    case ":$PATH:" in
        *":$install_dir:"*)
            if [ "$FLAG_VERBOSE" = true ]; then
                _detail "$install_dir already in PATH"
            fi
            return 0
            ;;
    esac

    _info "Adding $install_dir to PATH..."

    if [ "$FLAG_DRY_RUN" = true ]; then
        _detail "[dry-run] Would add PATH entry to shell profile"
        return 0
    fi

    local marker_start="# >>> yoyo-dev-ai >>>"
    local marker_end="# <<< yoyo-dev-ai <<<"
    local path_line="export PATH=\"${install_dir}:\$PATH\""

    # Detect shell and profile file
    local shell_name
    shell_name=$(basename "${SHELL:-/bin/bash}")
    local profile_file=""

    case "$shell_name" in
        bash)
            if [ -f "$HOME/.bashrc" ]; then
                profile_file="$HOME/.bashrc"
            elif [ -f "$HOME/.bash_profile" ]; then
                profile_file="$HOME/.bash_profile"
            else
                profile_file="$HOME/.bashrc"
            fi
            ;;
        zsh)
            profile_file="$HOME/.zshrc"
            ;;
        fish)
            profile_file="$HOME/.config/fish/config.fish"
            path_line="set -gx PATH ${install_dir} \$PATH"
            ;;
        *)
            profile_file="$HOME/.profile"
            ;;
    esac

    # Check if marker already exists
    if [ -f "$profile_file" ] && grep -q "$marker_start" "$profile_file" 2>/dev/null; then
        _ok "PATH entry already exists in $profile_file"
        return 0
    fi

    # Append to profile
    {
        echo ""
        echo "$marker_start"
        echo "$path_line"
        echo "$marker_end"
    } >> "$profile_file"

    _ok "PATH entry added to $profile_file"
    _detail "Run 'source $profile_file' or restart your terminal to apply"
}

# =============================================================================
# Verification
# =============================================================================

verify_installation() {
    local all_ok=true

    _info "Verifying installation..."

    # Check BASE directory
    if [ -d "$BASE_DIR" ] && [ -f "$BASE_DIR/setup/install.sh" ]; then
        _ok "BASE directory: ${BASE_DIR}"
    else
        _error "BASE directory missing or incomplete"
        all_ok=false
    fi

    # Check yoyo-ai (if installed)
    if [ "$FLAG_YOYO_DEV_ONLY" = false ]; then
        if [ -d "$AI_DIR" ]; then
            _ok "AI directory: ${AI_DIR}"
        else
            _warn "AI directory missing: ${AI_DIR}"
        fi
    fi

    # Check commands
    local commands_to_check="yoyo-dev yoyo-init yoyo-update"
    if [ "$FLAG_YOYO_DEV_ONLY" = false ]; then
        commands_to_check="$commands_to_check yoyo-ai"
    fi

    for cmd in $commands_to_check; do
        if command -v "$cmd" >/dev/null 2>&1; then
            _ok "Command available: $cmd"
        else
            _warn "Command not in PATH: $cmd (restart terminal or source profile)"
        fi
    done

    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        _ok "Node.js: $(node --version)"
    else
        _warn "Node.js not found in PATH"
    fi

    # Check npm
    if command -v npm >/dev/null 2>&1; then
        _ok "npm: $(npm --version)"
    fi

    # Check Claude Code
    if [ "$FLAG_NO_CLAUDE_CODE" = false ] && command -v claude >/dev/null 2>&1; then
        _ok "Claude Code CLI: installed"
    fi

    # Check OpenClaw
    if [ "$FLAG_YOYO_DEV_ONLY" = false ] && command -v openclaw >/dev/null 2>&1; then
        _ok "OpenClaw: $(openclaw --version 2>/dev/null || echo 'installed')"
    fi

    if [ "$all_ok" = false ]; then
        return 1
    fi
}

# =============================================================================
# Uninstall
# =============================================================================

run_uninstall() {
    printf "\n${_C_BOLD}${_C_RED}Yoyo Dev AI Uninstaller${_C_RESET}\n\n"
    _warn "This will remove:"
    _detail "  - ${BASE_DIR} (BASE installation)"
    _detail "  - ${AI_DIR} (OpenClaw data)"
    _detail "  - ${HOME}/.openclaw (symlink)"
    _detail "  - Global command symlinks (yoyo-dev, yoyo-ai, etc.)"
    _detail "  - Shell profile PATH entries"

    if [ "$FLAG_DRY_RUN" = true ]; then
        _detail "[dry-run] Would remove all of the above"
        return 0
    fi

    printf "\n"
    printf "Are you sure? Type 'yes' to confirm: "
    local confirm
    read -r confirm
    if [ "$confirm" != "yes" ]; then
        _info "Uninstall cancelled"
        return 0
    fi

    # Remove global commands
    for cmd in yoyo-dev yoyo-ai yoyo-cli yoyo-init yoyo-update yoyo-gui yoyo-doctor yoyo yoyo-install; do
        local cmd_path
        cmd_path=$(command -v "$cmd" 2>/dev/null || true)
        if [ -n "$cmd_path" ] && [ -L "$cmd_path" ]; then
            rm -f "$cmd_path" 2>/dev/null || _maybe_sudo rm -f "$cmd_path" 2>/dev/null || true
            _ok "Removed: $cmd"
        fi
    done

    # Remove directories
    if [ -d "$BASE_DIR" ]; then
        rm -rf "$BASE_DIR"
        _ok "Removed: ${BASE_DIR}"
    fi
    if [ -d "$AI_DIR" ]; then
        rm -rf "$AI_DIR"
        _ok "Removed: ${AI_DIR}"
    fi
    if [ -L "$HOME/.openclaw" ]; then
        rm -f "$HOME/.openclaw"
        _ok "Removed: ${HOME}/.openclaw symlink"
    fi

    # Remove shell profile entries
    local marker_start="# >>> yoyo-dev-ai >>>"
    local marker_end="# <<< yoyo-dev-ai <<<"
    for profile in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.bash_profile" "$HOME/.profile" "$HOME/.config/fish/config.fish"; do
        if [ -f "$profile" ] && grep -q "$marker_start" "$profile" 2>/dev/null; then
            # Remove the block between markers (inclusive)
            sed -i.bak "/${marker_start}/,/${marker_end}/d" "$profile" 2>/dev/null || true
            rm -f "${profile}.bak" 2>/dev/null || true
            _ok "Cleaned PATH from: $profile"
        fi
    done

    # Uninstall global npm packages
    if command -v npm >/dev/null 2>&1; then
        npm uninstall -g openclaw 2>/dev/null && _ok "Uninstalled: openclaw" || true
        npm uninstall -g @anthropic-ai/claude-code 2>/dev/null && _ok "Uninstalled: claude-code" || true
    fi

    printf "\n"
    _ok "Yoyo Dev AI has been completely removed"
    _detail "Restart your terminal to clear cached command paths"
}

# =============================================================================
# Interactive Mode
# =============================================================================

_prompt_choice() {
    local prompt="$1"
    local default="$2"
    shift 2

    printf "\n${_C_BOLD}%s${_C_RESET}\n" "$prompt"
    local i=1
    for option in "$@"; do
        printf "  ${_C_CYAN}%d${_C_RESET}. %s\n" "$i" "$option"
        i=$((i + 1))
    done
    printf "  Choice [%s]: " "$default"
    local choice
    read -r choice
    choice="${choice:-$default}"
    echo "$choice"
}

run_interactive() {
    printf "\n${_C_BOLD}${_C_CYAN}╔════════════════════════════════════════════════════════════════╗${_C_RESET}\n"
    printf "${_C_BOLD}${_C_CYAN}║${_C_RESET}       ${_C_BOLD}Yoyo Dev AI - Interactive Installer v${BOOTSTRAP_VERSION}${_C_RESET}             ${_C_BOLD}${_C_CYAN}║${_C_RESET}\n"
    printf "${_C_BOLD}${_C_CYAN}╚════════════════════════════════════════════════════════════════╝${_C_RESET}\n"

    # Component selection
    local comp_choice
    comp_choice=$(_prompt_choice "What would you like to install?" "1" \
        "Both yoyo-dev + yoyo-ai (recommended)" \
        "yoyo-dev only (dev environment)" \
        "yoyo-ai only (AI assistant)")

    case "$comp_choice" in
        2) FLAG_YOYO_DEV_ONLY=true ;;
        3) FLAG_YOYO_AI_ONLY=true ;;
    esac

    # Claude Code
    if [ "$FLAG_YOYO_AI_ONLY" = false ]; then
        local cc_choice
        cc_choice=$(_prompt_choice "Install Claude Code CLI?" "1" \
            "Yes (recommended)" \
            "No, I'll install it later")
        if [ "$cc_choice" = "2" ]; then
            FLAG_NO_CLAUDE_CODE=true
        fi
    fi

    printf "\n${_C_BOLD}Installation Summary:${_C_RESET}\n"
    _detail "Components: $([ "$FLAG_YOYO_DEV_ONLY" = true ] && echo "yoyo-dev only" || ([ "$FLAG_YOYO_AI_ONLY" = true ] && echo "yoyo-ai only" || echo "yoyo-dev + yoyo-ai"))"
    _detail "Claude Code: $([ "$FLAG_NO_CLAUDE_CODE" = true ] && echo "skip" || echo "install")"
    _detail "Clone via: $([ "$FLAG_SSH" = true ] && echo "SSH" || echo "HTTPS")"
    _detail "Branch: ${FLAG_BRANCH}"
    printf "\n"
    printf "Proceed with installation? [Y/n]: "
    local proceed
    read -r proceed
    proceed="${proceed:-Y}"
    case "$proceed" in
        [Yy]*) ;;
        *) _info "Installation cancelled"; exit 0 ;;
    esac
}

# =============================================================================
# Post-Install Summary
# =============================================================================

show_post_install() {
    printf "\n"
    printf "${_C_BOLD}${_C_GREEN}════════════════════════════════════════════════════════════════${_C_RESET}\n"
    printf "${_C_BOLD}${_C_GREEN}  Yoyo Dev AI installed successfully!${_C_RESET}\n"
    printf "${_C_BOLD}${_C_GREEN}════════════════════════════════════════════════════════════════${_C_RESET}\n"
    printf "\n"
    printf "${_C_BOLD}Next steps:${_C_RESET}\n"
    printf "\n"

    # Check if PATH was modified
    local needs_source=false
    for cmd in yoyo-dev yoyo-ai; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            needs_source=true
            break
        fi
    done

    if [ "$needs_source" = true ]; then
        local shell_name
        shell_name=$(basename "${SHELL:-/bin/bash}")
        local profile_file
        case "$shell_name" in
            bash) profile_file="~/.bashrc" ;;
            zsh)  profile_file="~/.zshrc" ;;
            fish) profile_file="~/.config/fish/config.fish" ;;
            *)    profile_file="~/.profile" ;;
        esac
        printf "  ${_C_CYAN}1.${_C_RESET} Reload your shell:\n"
        printf "     ${_C_BOLD}source %s${_C_RESET}\n" "$profile_file"
        printf "\n"
        printf "  ${_C_CYAN}2.${_C_RESET} Initialize a project:\n"
    else
        printf "  ${_C_CYAN}1.${_C_RESET} Initialize a project:\n"
    fi
    printf "     ${_C_BOLD}cd <your-project>${_C_RESET}\n"
    printf "     ${_C_BOLD}yoyo-init --claude-code${_C_RESET}\n"
    printf "\n"

    if [ "$FLAG_YOYO_DEV_ONLY" = false ]; then
        printf "  ${_C_CYAN}$([ "$needs_source" = true ] && echo "3" || echo "2").${_C_RESET} Start the AI assistant:\n"
        printf "     ${_C_BOLD}yoyo-ai --start${_C_RESET}\n"
        printf "\n"
    fi

    printf "${_C_DIM}Yoyo Dev AI v${YOYO_VERSION} - \"Your AI learns. Your AI remembers. Your AI evolves.\"${_C_RESET}\n"
    printf "\n"
}

# =============================================================================
# Main
# =============================================================================

main() {
    parse_flags "$@"

    # Handle --help
    if [ "$FLAG_HELP" = true ]; then
        show_help
        exit 0
    fi

    # Handle --uninstall
    if [ "$FLAG_UNINSTALL" = true ]; then
        run_uninstall
        exit 0
    fi

    # Banner
    printf "\n${_C_BOLD}${_C_CYAN}╔════════════════════════════════════════════════════════════════╗${_C_RESET}\n"
    printf "${_C_BOLD}${_C_CYAN}║${_C_RESET}          ${_C_BOLD}Yoyo Dev AI - Bootstrap Installer v${BOOTSTRAP_VERSION}${_C_RESET}              ${_C_BOLD}${_C_CYAN}║${_C_RESET}\n"
    printf "${_C_BOLD}${_C_CYAN}╚════════════════════════════════════════════════════════════════╝${_C_RESET}\n"

    # Interactive mode prompts
    if [ "$FLAG_INTERACTIVE" = true ]; then
        run_interactive
    fi

    # Dry-run notice
    if [ "$FLAG_DRY_RUN" = true ]; then
        _warn "DRY RUN MODE - no changes will be made"
        printf "\n"
    fi

    # Step 1: Pre-flight checks
    _step 1 "Pre-flight checks"
    preflight_checks

    # Step 2: Install system dependencies
    if [ "$FLAG_NO_DEPS" = false ]; then
        _step 2 "Installing system dependencies"
        install_system_deps
    else
        _step 2 "Skipping dependency installation (--no-deps)"
    fi

    # Step 3: Install Node.js
    if [ "$FLAG_NO_DEPS" = false ]; then
        _step 3 "Ensuring Node.js >= ${NODE_REQUIRED_MAJOR}"
        install_nodejs
    else
        _step 3 "Skipping Node.js check (--no-deps)"
    fi

    # Step 4: Clone/Update BASE
    _step 4 "Setting up BASE installation"
    clone_or_update_base
    _upgrade_ui

    # Step 5: Install global commands + Claude Code
    _step 5 "Installing global commands"
    if [ "$FLAG_YOYO_AI_ONLY" = false ]; then
        setup_global_commands
        install_claude_code
    else
        _info "Skipping dev tools (--yoyo-ai-only)"
    fi

    # Step 6: Install OpenClaw
    _step 6 "Setting up yoyo-ai (OpenClaw)"
    install_openclaw

    # Step 7: Shell profile + verification
    _step 7 "Finalizing installation"
    setup_shell_profile
    verify_installation

    # Post-install summary
    if [ "$FLAG_DRY_RUN" = false ]; then
        show_post_install
    else
        printf "\n"
        _ok "Dry run complete. No changes were made."
        _detail "Remove --dry-run to perform actual installation."
    fi
}

# Run main with all arguments
# When piped via curl, $@ is empty (non-interactive default)
main "$@"
