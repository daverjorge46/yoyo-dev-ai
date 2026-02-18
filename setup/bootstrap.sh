#!/usr/bin/env bash

# =============================================================================
# Yoyo AI - One-Line Bootstrap Installer v2.0.0
# =============================================================================
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/daverjorge46/yoyo-dev-ai/main/setup/bootstrap.sh | bash
#   bash bootstrap.sh [OPTIONS]
#
# Always interactive. Toggle menu lets you pick YoyoClaw, YoyoDev, or both.
#
# Exit codes:
#   0 - Success
#   1 - General error
#   2 - Unsupported OS
#   3 - Dependency installation failed
# =============================================================================

set -eu

# Error trap for debugging silent failures
trap '_error "Failed at line $LINENO (exit code $?)"; exit 1' ERR

readonly BOOTSTRAP_VERSION="2.0.0"
readonly YOYO_VERSION="7.0.0"
readonly REPO_HTTPS_URL="https://github.com/daverjorge46/yoyo-dev-ai.git"
readonly REPO_SSH_URL="git@github.com:daverjorge46/yoyo-dev-ai.git"
readonly BASE_DIR="$HOME/.yoyo-dev"
readonly YOYOCLAW_HOME="$HOME/.yoyoclaw"
readonly NODE_REQUIRED_MAJOR=22
readonly MIN_DISK_MB=200

# =============================================================================
# Colors (inline, pre-clone)
# =============================================================================

if [ -t 1 ] && [ "${NO_COLOR:-}" = "" ]; then
    _C_RED='\033[0;31m'
    _C_GREEN='\033[0;32m'
    _C_YELLOW='\033[38;2;210;153;34m'
    _C_CYAN='\033[0;36m'
    _C_MAUVE='\033[38;2;203;166;247m'
    _C_BOLD='\033[1m'
    _C_DIM='\033[2m'
    _C_RESET='\033[0m'
else
    _C_RED='' _C_GREEN='' _C_YELLOW='' _C_CYAN=''
    _C_MAUVE='' _C_BOLD='' _C_DIM='' _C_RESET=''
fi

_info()    { printf "${_C_CYAN}info${_C_RESET}  %s\n" "$*"; }
_ok()      { printf "${_C_GREEN}  ok${_C_RESET}  %s\n" "$*"; }
_warn()    { printf "${_C_YELLOW}warn${_C_RESET}  %s\n" "$*" >&2; }
_error()   { printf "${_C_RED} err${_C_RESET}  %s\n" "$*" >&2; }
_step()    { printf "\n${_C_BOLD}[%s/%s]${_C_RESET} %s\n" "$1" "$TOTAL_STEPS" "$2"; }
_detail()  { printf "      %s\n" "$*"; }

TOTAL_STEPS=7

# =============================================================================
# CLI Flag Defaults
# =============================================================================

FLAG_PREFIX=""
FLAG_BRANCH="main"
FLAG_VERBOSE=false
FLAG_DRY_RUN=false
FLAG_UNINSTALL=false
FLAG_SSH=false
FLAG_HELP=false

# Menu selections (toggled interactively)
INSTALL_YOYOCLAW=true
INSTALL_YOYODEV=false

# =============================================================================
# CLI Flag Parsing
# =============================================================================

parse_flags() {
    while [ $# -gt 0 ]; do
        case "$1" in
            --prefix)
                shift
                [ $# -eq 0 ] && { _error "--prefix requires a path argument"; exit 1; }
                FLAG_PREFIX="$1"
                ;;
            --prefix=*)
                FLAG_PREFIX="${1#--prefix=}"
                ;;
            --branch)
                shift
                [ $# -eq 0 ] && { _error "--branch requires a name argument"; exit 1; }
                FLAG_BRANCH="$1"
                ;;
            --branch=*)
                FLAG_BRANCH="${1#--branch=}"
                ;;
            --ssh)      FLAG_SSH=true ;;
            --verbose)  FLAG_VERBOSE=true ;;
            --dry-run)  FLAG_DRY_RUN=true ;;
            --uninstall) FLAG_UNINSTALL=true ;;
            --help|-h)  FLAG_HELP=true ;;
            *)
                _error "Unknown option: $1"
                _detail "Run with --help for usage information"
                exit 1
                ;;
        esac
        shift
    done
}

# =============================================================================
# Help
# =============================================================================

show_help() {
    cat <<EOF
Yoyo AI Bootstrap Installer v${BOOTSTRAP_VERSION}

USAGE:
  curl -sSL <url> | bash              Interactive install (toggle menu)
  bash bootstrap.sh [OPTIONS]          Direct execution with options

OPTIONS:
  --ssh                 Clone via SSH instead of HTTPS
  --prefix <path>       Custom install prefix for commands
  --branch <name>       Clone specific branch (default: main)
  --verbose             Show detailed output
  --dry-run             Show what would be installed without doing it
  --uninstall           Remove yoyo-dev-ai completely
  --help, -h            Show this help message

COMPONENTS:
  YoyoClaw    Business and Personal AI Assistant (daemon on port 18789)
  YoyoDev     Development environment (Claude Code, specs, orchestration)

AFTER INSTALLATION:
  yoyo-ai               Manage YoyoClaw AI assistant
  cd <your-project>
  yoyo-init --claude-code

EOF
}

# =============================================================================
# TTY Handling (for curl | bash)
# =============================================================================
# IMPORTANT: Do NOT use `exec < /dev/tty` -- it breaks `curl | bash` because
# bash reads the script from stdin. Instead, redirect individual `read` calls.

_tty_read() {
    # Wrapper for read that always reads from /dev/tty when stdin is piped.
    # read -n1 returns 1 on Enter (empty input) which trips set -e, so we
    # suppress that with || true.
    if [ -t 0 ]; then
        read "$@" || true
    else
        read "$@" < /dev/tty || true
    fi
}

# =============================================================================
# Welcome Banner
# =============================================================================

show_banner() {
    local cols
    cols=$(tput cols 2>/dev/null || echo 80)

    if [ "$cols" -ge 80 ]; then
        printf "\n"
        printf "${_C_MAUVE}${_C_BOLD}"
        printf "  ╔══════════════════════════════════════════════════════════════╗\n"
        printf "  ║                                                              ║\n"
        printf "  ║   ██    ██  ██████  ██    ██  ██████       █████  ██         ║\n"
        printf "  ║    ██  ██  ██    ██  ██  ██  ██    ██     ██   ██ ██         ║\n"
        printf "  ║     ████   ██    ██   ████   ██    ██     ███████ ██         ║\n"
        printf "  ║      ██    ██    ██    ██    ██    ██     ██   ██ ██         ║\n"
        printf "  ║      ██     ██████     ██     ██████      ██   ██ ██         ║\n"
        printf "  ║                                                              ║\n"
        printf "  ║${_C_RESET}${_C_DIM}  \"Your AI learns. Your AI remembers. Your AI evolves.\"${_C_RESET}${_C_MAUVE}${_C_BOLD}      ║\n"
        printf "  ║${_C_RESET}${_C_DIM}                                             ¯\\_(ツ)_/¯${_C_RESET}${_C_MAUVE}${_C_BOLD}       ║\n"
        printf "  ╚══════════════════════════════════════════════════════════════╝\n"
        printf "${_C_RESET}\n"
    else
        # Compact banner for narrow terminals
        printf "\n"
        printf "${_C_MAUVE}${_C_BOLD}  YOYO AI${_C_RESET} ${_C_DIM}v${BOOTSTRAP_VERSION}${_C_RESET}\n"
        printf "${_C_DIM}  Your AI learns. Your AI remembers. Your AI evolves.${_C_RESET}\n"
        printf "\n"
    fi
}

# =============================================================================
# Toggle Menu
# =============================================================================

show_toggle_menu() {
    while true; do
        # Clear menu area (move up and clear if redrawing)
        printf "\n"
        printf "${_C_BOLD}  What would you like to install?${_C_RESET}\n\n"

        # YoyoClaw option
        local claw_state claw_color
        if [ "$INSTALL_YOYOCLAW" = true ]; then
            claw_state="${_C_GREEN}[Yes]${_C_RESET}"
        else
            claw_state="${_C_DIM}[No]${_C_RESET}"
        fi
        printf "    ${_C_MAUVE}1${_C_RESET}  ${_C_MAUVE}${_C_BOLD}YoyoClaw${_C_RESET}  ${_C_DIM}(AI Assistant)${_C_RESET}       %b\n" "$claw_state"

        # YoyoDev option
        local dev_state
        if [ "$INSTALL_YOYODEV" = true ]; then
            dev_state="${_C_GREEN}[Yes]${_C_RESET}"
        else
            dev_state="${_C_DIM}[No]${_C_RESET}"
        fi
        printf "    ${_C_YELLOW}2${_C_RESET}  ${_C_YELLOW}${_C_BOLD}YoyoDev${_C_RESET}   ${_C_DIM}(Dev Framework)${_C_RESET}      %b\n" "$dev_state"

        printf "\n"
        printf "${_C_DIM}  Press 1/2 to toggle, Enter to install, q to exit${_C_RESET}\n"
        printf "  > "

        local key=""
        _tty_read -r -n1 -s key

        case "${key:-}" in
            1)
                if [ "$INSTALL_YOYOCLAW" = true ]; then
                    INSTALL_YOYOCLAW=false
                else
                    INSTALL_YOYOCLAW=true
                fi
                # Clear the menu block (7 lines) for redraw
                printf "\r"
                local i
                for i in 1 2 3 4 5 6 7 8 9; do
                    printf "\033[A\033[2K"
                done
                ;;
            2)
                if [ "$INSTALL_YOYODEV" = true ]; then
                    INSTALL_YOYODEV=false
                else
                    INSTALL_YOYODEV=true
                fi
                printf "\r"
                for i in 1 2 3 4 5 6 7 8 9; do
                    printf "\033[A\033[2K"
                done
                ;;
            q|Q)
                printf "\n"
                _info "Installation cancelled"
                exit 0
                ;;
            "")
                # Enter pressed
                printf "\n"
                if [ "$INSTALL_YOYOCLAW" = false ] && [ "$INSTALL_YOYODEV" = false ]; then
                    _warn "Nothing selected! Toggle at least one option."
                    # Clear for redraw
                    for i in 1 2 3 4 5 6 7 8 9 10; do
                        printf "\033[A\033[2K"
                    done
                else
                    break
                fi
                ;;
            *)
                # Ignore other keys, redraw
                printf "\r"
                for i in 1 2 3 4 5 6 7 8 9; do
                    printf "\033[A\033[2K"
                done
                ;;
        esac
    done

    # Show summary
    printf "\n"
    printf "${_C_BOLD}  Installing:${_C_RESET} "
    local parts=""
    [ "$INSTALL_YOYOCLAW" = true ] && parts="${_C_MAUVE}YoyoClaw${_C_RESET}" || true
    if [ "$INSTALL_YOYODEV" = true ]; then
        [ -n "$parts" ] && parts="$parts + " || true
        parts="${parts}${_C_YELLOW}YoyoDev${_C_RESET}"
    fi
    printf "%b\n\n" "$parts"
}

# =============================================================================
# Compute Dynamic Step Count
# =============================================================================

compute_steps() {
    local count=0

    # Always: pre-flight, system deps, Node.js, clone BASE, source helpers, shell profile, verify
    count=7

    if [ "$INSTALL_YOYOCLAW" = true ]; then
        # pnpm, build, onboard, start gateway, open browser, install yoyo-ai cmd
        count=$((count + 6))
    fi

    if [ "$INSTALL_YOYODEV" = true ]; then
        # Claude Code CLI, global commands
        count=$((count + 2))
    fi

    TOTAL_STEPS=$count
}

# =============================================================================
# OS Detection
# =============================================================================

DETECTED_OS=""
DETECTED_PKG_MGR=""

detect_os() {
    # WSL detection
    if [ -f /proc/version ] && grep -qi "microsoft\|wsl" /proc/version 2>/dev/null; then
        DETECTED_OS="wsl"; DETECTED_PKG_MGR="apt-get"; return 0
    fi
    if [ -n "${WSL_DISTRO_NAME:-}" ]; then
        DETECTED_OS="wsl"; DETECTED_PKG_MGR="apt-get"; return 0
    fi

    # macOS
    if [ "$(uname -s)" = "Darwin" ]; then
        DETECTED_OS="macos"; DETECTED_PKG_MGR="brew"; return 0
    fi

    # Linux distro via /etc/os-release
    if [ -f /etc/os-release ]; then
        # shellcheck disable=SC1091
        . /etc/os-release
        local id="${ID:-unknown}" id_like="${ID_LIKE:-}"

        case "$id" in
            ubuntu|debian|pop|linuxmint|elementary|zorin|kali|raspbian)
                DETECTED_OS="linux-debian"; DETECTED_PKG_MGR="apt-get"; return 0 ;;
            fedora|rhel|centos|rocky|almalinux|ol)
                DETECTED_OS="linux-fedora"; DETECTED_PKG_MGR="dnf"; return 0 ;;
            arch|manjaro|endeavouros|garuda)
                DETECTED_OS="linux-arch"; DETECTED_PKG_MGR="pacman"; return 0 ;;
            opensuse*|sles)
                DETECTED_OS="linux-suse"; DETECTED_PKG_MGR="zypper"; return 0 ;;
        esac

        case "$id_like" in
            *debian*|*ubuntu*) DETECTED_OS="linux-debian"; DETECTED_PKG_MGR="apt-get"; return 0 ;;
            *fedora*|*rhel*)   DETECTED_OS="linux-fedora"; DETECTED_PKG_MGR="dnf"; return 0 ;;
            *arch*)            DETECTED_OS="linux-arch"; DETECTED_PKG_MGR="pacman"; return 0 ;;
            *suse*)            DETECTED_OS="linux-suse"; DETECTED_PKG_MGR="zypper"; return 0 ;;
        esac
    fi

    DETECTED_OS="unknown"; DETECTED_PKG_MGR=""
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
        return 0
    fi
}

check_disk_space() {
    local available_mb=0
    if command -v df >/dev/null 2>&1; then
        available_mb=$(df -m "$HOME" 2>/dev/null | awk 'NR==2 {print $4}')
    fi
    if [ -n "$available_mb" ] && [ "$available_mb" -lt "$MIN_DISK_MB" ] 2>/dev/null; then
        return 1
    fi
    return 0
}

preflight_checks() {
    local failed=false

    if ! detect_os; then
        _error "Unsupported operating system"
        _detail "Supported: Ubuntu/Debian, Fedora/RHEL, Arch, openSUSE, macOS, WSL"
        exit 2
    fi
    _ok "OS detected: ${DETECTED_OS} (${DETECTED_PKG_MGR})"

    if [ "$(id -u)" -eq 0 ]; then
        _warn "Running as root. Consider running as a regular user."
    fi

    if ! check_disk_space; then
        _error "Insufficient disk space (need at least ${MIN_DISK_MB}MB free in $HOME)"
        failed=true
    else
        _ok "Disk space OK"
    fi

    if ! check_internet; then
        _error "Cannot reach github.com. Check your internet connection."
        failed=true
    else
        _ok "Internet connectivity OK"
    fi

    if [ "$failed" = true ]; then exit 1; fi
}

# =============================================================================
# Dependency Helpers
# =============================================================================

_maybe_sudo() {
    if [ "$(id -u)" -eq 0 ]; then
        "$@"
    elif command -v sudo >/dev/null 2>&1; then
        sudo "$@"
    else
        _error "Need root privileges to run: $*"
        return 1
    fi
}

_retry() {
    local delay="$1"; shift
    if "$@"; then return 0; fi
    _warn "Retrying in ${delay}s..."
    sleep "$delay"
    "$@"
}

# =============================================================================
# System Dependencies
# =============================================================================

install_system_deps() {
    local need_git=false need_curl=false

    command -v git >/dev/null 2>&1 || need_git=true
    command -v curl >/dev/null 2>&1 || need_curl=true

    if [ "$need_git" = false ] && [ "$need_curl" = false ]; then
        _ok "System dependencies present (git, curl)"
        return 0
    fi

    _info "Installing system dependencies..."

    local pkgs=""
    [ "$need_git" = true ] && pkgs="$pkgs git" || true
    [ "$need_curl" = true ] && pkgs="$pkgs curl" || true

    case "$DETECTED_PKG_MGR" in
        apt-get)
            _maybe_sudo apt-get update -qq
            # shellcheck disable=SC2086
            _maybe_sudo apt-get install -y -qq $pkgs
            ;;
        dnf)
            # shellcheck disable=SC2086
            _maybe_sudo dnf install -y -q $pkgs
            ;;
        pacman)
            # shellcheck disable=SC2086
            _maybe_sudo pacman -Sy --noconfirm --needed $pkgs
            ;;
        zypper)
            # shellcheck disable=SC2086
            _maybe_sudo zypper install -y $pkgs
            ;;
        brew)
            if ! command -v brew >/dev/null 2>&1; then
                install_homebrew
            fi
            # shellcheck disable=SC2086
            brew install $pkgs
            ;;
    esac

    if [ "$need_git" = true ] && ! command -v git >/dev/null 2>&1; then
        _error "Failed to install git"; return 1
    fi
    if [ "$need_curl" = true ] && ! command -v curl >/dev/null 2>&1; then
        _error "Failed to install curl"; return 1
    fi
    _ok "System dependencies installed"
}

install_homebrew() {
    _info "Installing Homebrew..."
    if [ "$FLAG_DRY_RUN" = true ]; then _detail "[dry-run] Would install Homebrew"; return 0; fi
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" </dev/null
    if [ -f /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -f /usr/local/bin/brew ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
    command -v brew >/dev/null 2>&1 || { _error "Homebrew installation failed"; return 1; }
    _ok "Homebrew installed"
}

# =============================================================================
# Node.js
# =============================================================================

install_nodejs() {
    if command -v node >/dev/null 2>&1; then
        local node_version node_major
        node_version=$(node --version 2>/dev/null | sed 's/^v//')
        node_major=$(echo "$node_version" | cut -d. -f1)
        if [ "$node_major" -ge "$NODE_REQUIRED_MAJOR" ] 2>/dev/null; then
            _ok "Node.js v${node_version} (>= ${NODE_REQUIRED_MAJOR} required)"
            return 0
        fi
        _warn "Node.js v${node_version} too old, need v${NODE_REQUIRED_MAJOR}+"
    fi

    _info "Installing Node.js v${NODE_REQUIRED_MAJOR}..."
    if [ "$FLAG_DRY_RUN" = true ]; then _detail "[dry-run] Would install Node.js >= ${NODE_REQUIRED_MAJOR}"; return 0; fi

    local install_success=false

    case "$DETECTED_OS" in
        linux-debian|wsl)
            if _retry 5 curl -fsSL "https://deb.nodesource.com/setup_${NODE_REQUIRED_MAJOR}.x" -o /tmp/nodesource_setup.sh; then
                _maybe_sudo bash /tmp/nodesource_setup.sh && _maybe_sudo apt-get install -y -qq nodejs && install_success=true
                rm -f /tmp/nodesource_setup.sh
            fi
            ;;
        linux-fedora)
            if _retry 5 curl -fsSL "https://rpm.nodesource.com/setup_${NODE_REQUIRED_MAJOR}.x" -o /tmp/nodesource_setup.sh; then
                _maybe_sudo bash /tmp/nodesource_setup.sh && _maybe_sudo dnf install -y -q nodejs && install_success=true
                rm -f /tmp/nodesource_setup.sh
            fi
            ;;
        linux-arch)
            _maybe_sudo pacman -Sy --noconfirm nodejs npm && install_success=true
            ;;
        linux-suse)
            if _retry 5 curl -fsSL "https://rpm.nodesource.com/setup_${NODE_REQUIRED_MAJOR}.x" -o /tmp/nodesource_setup.sh; then
                _maybe_sudo bash /tmp/nodesource_setup.sh && _maybe_sudo zypper install -y nodejs && install_success=true
                rm -f /tmp/nodesource_setup.sh
            fi
            ;;
        macos)
            if command -v brew >/dev/null 2>&1; then
                brew install "node@${NODE_REQUIRED_MAJOR}" && brew link --overwrite "node@${NODE_REQUIRED_MAJOR}" 2>/dev/null || true
                install_success=true
            fi
            ;;
    esac

    if [ "$install_success" = false ]; then
        _warn "Primary install failed, trying nvm..."
        install_nodejs_via_nvm
        return $?
    fi

    command -v node >/dev/null 2>&1 && _ok "Node.js $(node --version) installed" || { _error "Node.js install failed"; return 1; }
}

install_nodejs_via_nvm() {
    _info "Installing Node.js via nvm..."
    if [ "$FLAG_DRY_RUN" = true ]; then _detail "[dry-run] Would install nvm + Node.js ${NODE_REQUIRED_MAJOR}"; return 0; fi

    local nvm_dir="${NVM_DIR:-$HOME/.nvm}"
    if [ ! -d "$nvm_dir" ]; then
        _retry 5 curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh -o /tmp/nvm_install.sh || {
            _error "Failed to download nvm"; return 3
        }
        bash /tmp/nvm_install.sh
        rm -f /tmp/nvm_install.sh
    fi

    export NVM_DIR="$nvm_dir"
    # shellcheck disable=SC1091
    [ -s "$nvm_dir/nvm.sh" ] && . "$nvm_dir/nvm.sh"
    command -v nvm >/dev/null 2>&1 || { _error "nvm installation failed"; return 3; }

    nvm install "$NODE_REQUIRED_MAJOR"
    nvm use "$NODE_REQUIRED_MAJOR"
    command -v node >/dev/null 2>&1 && _ok "Node.js $(node --version) via nvm" || { _error "nvm Node.js install failed"; return 3; }
}

# =============================================================================
# Clone BASE
# =============================================================================

_repo_url() {
    if [ "$FLAG_SSH" = true ]; then echo "$REPO_SSH_URL"; else echo "$REPO_HTTPS_URL"; fi
}

_detect_local_source() {
    local script_dir=""
    if [ -n "${BASH_SOURCE[0]:-}" ]; then
        script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    elif [ -f "$0" ]; then
        script_dir="$(cd "$(dirname "$0")" && pwd)"
    fi
    if [ -n "$script_dir" ]; then
        local candidate
        candidate="$(cd "$script_dir/.." 2>/dev/null && pwd)"
        if [ -f "$candidate/setup/install.sh" ] && [ -d "$candidate/instructions" ] && [ "$candidate" != "$BASE_DIR" ]; then
            echo "$candidate"
            return 0
        fi
    fi
    return 1
}

_copy_from_local() {
    local source="$1"
    _info "Installing from local source: ${source}"
    if command -v rsync >/dev/null 2>&1; then
        rsync -a --exclude='.git' --exclude='node_modules' --exclude='.yoyo-dev' "$source/" "$BASE_DIR/"
    else
        mkdir -p "$BASE_DIR"
        for item in setup instructions standards .claude src gui gui-ai tests package.json yoyoclaw; do
            [ -e "$source/$item" ] && cp -a "$source/$item" "$BASE_DIR/" 2>/dev/null || true
        done
    fi
    _ok "BASE installed from local source"
}

_clone_base() {
    local repo_url
    repo_url="$(_repo_url)"
    _info "Cloning yoyo-dev-ai to ${BASE_DIR}..."
    if _retry 5 git clone --branch "$FLAG_BRANCH" --single-branch "$repo_url" "$BASE_DIR"; then
        _ok "Repository cloned"
    else
        _error "Failed to clone repository"
        _detail "URL: ${repo_url} | Branch: ${FLAG_BRANCH}"
        exit 1
    fi

    # Init yoyoclaw submodule
    _info "Initializing yoyoclaw submodule..."
    if git -C "$BASE_DIR" submodule update --init yoyoclaw 2>/dev/null; then
        if [ -f "$BASE_DIR/yoyoclaw/package.json" ]; then
            _ok "Submodule initialized"
        else
            _warn "Submodule init returned OK but yoyoclaw is empty, cloning directly..."
            rm -rf "$BASE_DIR/yoyoclaw"
            git clone --depth 1 https://github.com/daverjorge46/yoyoclaw.git "$BASE_DIR/yoyoclaw" 2>/dev/null || {
                _error "Failed to clone yoyoclaw"; exit 1
            }
            _ok "YoyoClaw cloned directly"
        fi
    else
        _warn "Submodule init failed, cloning yoyoclaw directly..."
        rm -rf "$BASE_DIR/yoyoclaw"
        git clone --depth 1 https://github.com/daverjorge46/yoyoclaw.git "$BASE_DIR/yoyoclaw" 2>/dev/null || {
            _error "Failed to clone yoyoclaw"; exit 1
        }
        _ok "YoyoClaw cloned directly"
    fi
}

clone_or_update_base() {
    local local_source=""
    local_source="$(_detect_local_source)" || true

    if [ -d "$BASE_DIR" ] && [ -f "$BASE_DIR/setup/install.sh" ] && [ -d "$BASE_DIR/instructions" ]; then
        _info "Existing BASE found at ${BASE_DIR}, updating..."
        if [ "$FLAG_DRY_RUN" = true ]; then
            _detail "[dry-run] Would update BASE"; return 0
        fi
        if [ -n "$local_source" ]; then
            _copy_from_local "$local_source"
        else
            if ! git -C "$BASE_DIR" pull origin "$FLAG_BRANCH" --ff-only 2>/dev/null; then
                local backup="${BASE_DIR}.backup.$(date +%s)"
                mv "$BASE_DIR" "$backup"
                _detail "Backup: $backup"
                _clone_base
            else
                _ok "BASE updated"
                # Ensure yoyoclaw submodule is populated
                if [ ! -f "$BASE_DIR/yoyoclaw/package.json" ]; then
                    _info "Initializing yoyoclaw submodule..."
                    git -C "$BASE_DIR" submodule update --init yoyoclaw 2>/dev/null || true
                    if [ ! -f "$BASE_DIR/yoyoclaw/package.json" ]; then
                        _warn "Submodule init failed, cloning yoyoclaw directly..."
                        rm -rf "$BASE_DIR/yoyoclaw"
                        git clone --depth 1 https://github.com/daverjorge46/yoyoclaw.git "$BASE_DIR/yoyoclaw" 2>/dev/null || true
                    fi
                fi
            fi
        fi
    elif [ -d "$BASE_DIR" ]; then
        _warn "Broken BASE detected, re-installing..."
        if [ "$FLAG_DRY_RUN" = true ]; then _detail "[dry-run] Would backup + re-install"; return 0; fi
        local backup="${BASE_DIR}.backup.$(date +%s)"
        mv "$BASE_DIR" "$backup"
        [ -n "$local_source" ] && _copy_from_local "$local_source" || _clone_base
    else
        if [ "$FLAG_DRY_RUN" = true ]; then _detail "[dry-run] Would clone to ${BASE_DIR}"; return 0; fi
        [ -n "$local_source" ] && _copy_from_local "$local_source" || _clone_base
    fi
}

# =============================================================================
# Source Helpers (after clone)
# =============================================================================

source_helpers() {
    if [ -f "$BASE_DIR/setup/functions.sh" ]; then
        # shellcheck disable=SC1091
        . "$BASE_DIR/setup/functions.sh"
        _ok "Loaded shared helpers from functions.sh"
    else
        _warn "functions.sh not found in BASE (some YoyoClaw features may fail)"
    fi
}

# =============================================================================
# Install pnpm
# =============================================================================

install_pnpm() {
    if command -v pnpm >/dev/null 2>&1; then
        _ok "pnpm already available"
        return 0
    fi
    _info "Installing pnpm..."
    if [ "$FLAG_DRY_RUN" = true ]; then _detail "[dry-run] Would install pnpm"; return 0; fi

    if command -v corepack >/dev/null 2>&1; then
        if corepack enable pnpm 2>/dev/null; then
            _ok "pnpm enabled via corepack"
            return 0
        fi
        # corepack failed (EACCES) - retry with sudo
        if _maybe_sudo corepack enable pnpm 2>/dev/null; then
            _ok "pnpm enabled via corepack (sudo)"
            return 0
        fi
    fi

    # Fallback: npm install -g (may also need sudo)
    if npm install -g pnpm 2>/dev/null; then
        _ok "pnpm installed via npm"
        return 0
    fi
    if _maybe_sudo npm install -g pnpm 2>/dev/null; then
        _ok "pnpm installed via npm (sudo)"
        return 0
    fi

    _error "Failed to install pnpm"
    return 1
}

# =============================================================================
# Build YoyoClaw
# =============================================================================

build_yoyoclaw() {
    _info "Building YoyoClaw from source..."
    if [ "$FLAG_DRY_RUN" = true ]; then _detail "[dry-run] Would build YoyoClaw"; return 0; fi

    local claw_dir="$BASE_DIR/yoyoclaw"

    # Validate yoyoclaw has actual source code (not an empty submodule dir)
    if [ ! -f "$claw_dir/package.json" ]; then
        _error "yoyoclaw/package.json not found — submodule may not be initialized"
        _detail "Try: git -C $BASE_DIR submodule update --init yoyoclaw"
        _detail "Or:  git clone https://github.com/daverjorge46/yoyoclaw.git $claw_dir"
        return 1
    fi

    if type build_yoyo_claw >/dev/null 2>&1; then
        if build_yoyo_claw 2>&1 | tail -5; then
            _ok "YoyoClaw built successfully"
        else
            _error "YoyoClaw build failed"
            _detail "Try: cd $claw_dir && pnpm install --frozen-lockfile && pnpm build"
            return 1
        fi
    else
        # Direct build if helper not available
        (cd "$claw_dir" && pnpm install --frozen-lockfile && pnpm build) 2>&1 | tail -5
        _ok "YoyoClaw built successfully"
    fi
}

# =============================================================================
# Onboard YoyoClaw
# =============================================================================

onboard_yoyoclaw() {
    _info "Running YoyoClaw onboarding..."
    if [ "$FLAG_DRY_RUN" = true ]; then _detail "[dry-run] Would run onboarding"; return 0; fi

    # Migrate legacy directories
    if type migrate_yoyo_claw_home >/dev/null 2>&1; then
        migrate_yoyo_claw_home 2>/dev/null || true
    fi
    mkdir -p "$YOYOCLAW_HOME"

    # Ensure gateway token
    if type ensure_yoyo_claw_token >/dev/null 2>&1; then
        ensure_yoyo_claw_token
    else
        # Inline token generation
        local token_file="$YOYOCLAW_HOME/.gateway-token"
        if [ ! -f "$token_file" ]; then
            local token
            token="yoyo-$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')"
            printf '%s' "$token" > "$token_file"
            chmod 600 "$token_file"
        fi
    fi

    # Run onboard
    if type run_yoyo_claw_onboard >/dev/null 2>&1; then
        run_yoyo_claw_onboard
        _ok "YoyoClaw onboarded"
    else
        _warn "Onboard helper not available, skipping"
    fi
}

# =============================================================================
# Start Gateway
# =============================================================================

start_gateway() {
    _info "Starting YoyoClaw gateway..."
    if [ "$FLAG_DRY_RUN" = true ]; then _detail "[dry-run] Would start gateway"; return 0; fi

    # Check if already running
    if type is_gateway_running >/dev/null 2>&1 && is_gateway_running; then
        _ok "Gateway already running on port 18789"
        return 0
    fi

    # Ensure token is loaded
    if type ensure_yoyo_claw_token >/dev/null 2>&1; then
        ensure_yoyo_claw_token
    fi

    local gw_token=""
    if [ -f "$YOYOCLAW_HOME/.gateway-token" ]; then
        gw_token="$(cat "$YOYOCLAW_HOME/.gateway-token")"
    fi

    # Try systemd first
    if type has_systemd >/dev/null 2>&1 && has_systemd; then
        systemctl --user start yoyoclaw-gateway.service 2>/dev/null || true
        sleep 1
        if type is_gateway_running >/dev/null 2>&1 && is_gateway_running; then
            _ok "Gateway started (systemd) on port 18789"
            return 0
        fi
    fi

    # Fallback: background process
    if type yoyo_claw >/dev/null 2>&1; then
        local gateway_log="/tmp/yoyoclaw-gateway.log"
        yoyo_claw gateway \
            --port 18789 \
            --token "${gw_token:-}" \
            --allow-unconfigured \
            >> "$gateway_log" 2>&1 &
        disown
        sleep 4

        if type is_gateway_running >/dev/null 2>&1 && is_gateway_running; then
            _ok "Gateway started on port 18789"
        else
            _warn "Gateway may not have started. Check /tmp/yoyoclaw-gateway.log"
        fi
    else
        _warn "yoyo_claw helper not found, cannot start gateway"
        _detail "Start manually: yoyo-ai --start"
    fi
}

# =============================================================================
# Open Browser
# =============================================================================

open_browser() {
    if [ "$FLAG_DRY_RUN" = true ]; then _detail "[dry-run] Would open browser"; return 0; fi

    local token=""
    if [ -f "$YOYOCLAW_HOME/.gateway-token" ]; then
        token="$(cat "$YOYOCLAW_HOME/.gateway-token")"
    fi

    local url="http://localhost:18789"
    [ -n "$token" ] && url="${url}?token=${token}" || true

    _info "Opening browser: ${url}"

    case "$DETECTED_OS" in
        macos)
            open "$url" 2>/dev/null || true
            ;;
        wsl)
            if command -v wslview >/dev/null 2>&1; then
                wslview "$url" 2>/dev/null || true
            elif command -v cmd.exe >/dev/null 2>&1; then
                cmd.exe /c start "$url" 2>/dev/null || true
            fi
            ;;
        *)
            if command -v xdg-open >/dev/null 2>&1; then
                xdg-open "$url" 2>/dev/null || true
            fi
            ;;
    esac
    _ok "Browser opened"
}

# =============================================================================
# Install yoyo-ai Command (YoyoClaw only)
# =============================================================================

install_yoyoclaw_commands() {
    _info "Installing yoyo-ai and yoyoclaw commands..."
    if [ "$FLAG_DRY_RUN" = true ]; then _detail "[dry-run] Would install commands"; return 0; fi

    local install_dir=""
    if [ -n "$FLAG_PREFIX" ]; then
        install_dir="$FLAG_PREFIX"
    elif [ -w "/usr/local/bin" ] || [ "$(id -u)" -eq 0 ]; then
        install_dir="/usr/local/bin"
    elif [ -d "$HOME/.local/bin" ]; then
        install_dir="$HOME/.local/bin"
    else
        mkdir -p "$HOME/.local/bin"
        install_dir="$HOME/.local/bin"
    fi

    local setup_dir="$BASE_DIR/setup"
    local count=0

    for cmd_pair in "yoyo-ai:yoyo-ai.sh" "yoyoclaw:yoyoclaw.sh" "yoyo-gui:yoyo-gui.sh" "yoyo-doctor:yoyo-doctor.sh"; do
        local cmd="${cmd_pair%%:*}"
        local script="${cmd_pair##*:}"
        local script_path="$setup_dir/$script"
        local install_path="$install_dir/$cmd"

        if [ -f "$script_path" ]; then
            chmod +x "$script_path"
            if [ "$install_dir" = "/usr/local/bin" ] && [ ! -w "$install_dir" ]; then
                _maybe_sudo ln -sf "$script_path" "$install_path" 2>/dev/null || true
            else
                ln -sf "$script_path" "$install_path" 2>/dev/null || true
            fi
            count=$((count + 1))
        fi
    done

    # Add install_dir to PATH for the current session so commands work immediately
    case ":$PATH:" in
        *":$install_dir:"*) ;;
        *) export PATH="$install_dir:$PATH" ;;
    esac

    _ok "$count commands installed to $install_dir"
}

# =============================================================================
# Install Claude Code CLI (YoyoDev)
# =============================================================================

install_claude_code() {
    if command -v claude >/dev/null 2>&1; then
        _ok "Claude Code CLI already installed"
        return 0
    fi
    _info "Installing Claude Code CLI..."
    if [ "$FLAG_DRY_RUN" = true ]; then _detail "[dry-run] Would install Claude Code CLI"; return 0; fi

    if npm install -g @anthropic-ai/claude-code 2>/dev/null; then
        _ok "Claude Code CLI installed"
    else
        _warn "Claude Code install failed (non-critical)"
        _detail "Install later: npm install -g @anthropic-ai/claude-code"
    fi
}

# =============================================================================
# Install Global Commands (YoyoDev)
# =============================================================================

setup_global_commands() {
    _info "Installing global commands..."
    if [ "$FLAG_DRY_RUN" = true ]; then _detail "[dry-run] Would install global commands"; return 0; fi

    if [ -f "$BASE_DIR/setup/install-global-command.sh" ]; then
        chmod +x "$BASE_DIR/setup/install-global-command.sh"
        bash "$BASE_DIR/setup/install-global-command.sh"
    else
        _error "install-global-command.sh not found"
        return 1
    fi
}

# =============================================================================
# Shell Profile
# =============================================================================

setup_shell_profile() {
    local install_dir="${FLAG_PREFIX}"
    if [ -z "$install_dir" ]; then
        if [ -w "/usr/local/bin" ] || [ "$(id -u)" -eq 0 ]; then
            return 0
        elif [ -d "$HOME/.local/bin" ]; then
            install_dir="$HOME/.local/bin"
        else
            install_dir="$HOME/.local/bin"
        fi
    fi

    case ":$PATH:" in
        *":$install_dir:"*) return 0 ;;
    esac

    _info "Adding $install_dir to PATH..."
    if [ "$FLAG_DRY_RUN" = true ]; then _detail "[dry-run] Would update shell profile"; return 0; fi

    local marker_start="# >>> yoyo-dev-ai >>>"
    local marker_end="# <<< yoyo-dev-ai <<<"
    local path_line="export PATH=\"${install_dir}:\$PATH\""

    local shell_name
    shell_name=$(basename "${SHELL:-/bin/bash}")
    local profile_file=""

    case "$shell_name" in
        bash)
            [ -f "$HOME/.bashrc" ] && profile_file="$HOME/.bashrc" || profile_file="$HOME/.bashrc"
            ;;
        zsh)  profile_file="$HOME/.zshrc" ;;
        fish)
            profile_file="$HOME/.config/fish/config.fish"
            path_line="set -gx PATH ${install_dir} \$PATH"
            ;;
        *)    profile_file="$HOME/.profile" ;;
    esac

    if [ -f "$profile_file" ] && grep -q "$marker_start" "$profile_file" 2>/dev/null; then
        _ok "PATH already in $profile_file"
        return 0
    fi

    {
        echo ""
        echo "$marker_start"
        echo "$path_line"
        echo "$marker_end"
    } >> "$profile_file"
    _ok "PATH added to $profile_file"
}

# =============================================================================
# Verification
# =============================================================================

verify_installation() {
    _info "Verifying installation..."

    if [ -d "$BASE_DIR" ] && [ -f "$BASE_DIR/setup/install.sh" ]; then
        _ok "BASE: ${BASE_DIR}"
    else
        _error "BASE missing"
    fi

    if [ "$INSTALL_YOYOCLAW" = true ]; then
        if [ -d "$YOYOCLAW_HOME" ]; then _ok "YoyoClaw home: ${YOYOCLAW_HOME}"; else _warn "YoyoClaw home missing"; fi
        if command -v yoyo-ai >/dev/null 2>&1; then _ok "yoyo-ai command"; else _warn "yoyo-ai not in PATH (restart terminal)"; fi
    fi

    if [ "$INSTALL_YOYODEV" = true ]; then
        for cmd in yoyo-dev yoyo-init yoyo-update; do
            if command -v "$cmd" >/dev/null 2>&1; then _ok "$cmd command"; else _warn "$cmd not in PATH (restart terminal)"; fi
        done
        if command -v claude >/dev/null 2>&1; then _ok "Claude Code CLI"; else _warn "Claude Code CLI not found"; fi
    fi

    if command -v node >/dev/null 2>&1; then _ok "Node.js: $(node --version)"; fi
}

# =============================================================================
# Completion Screens
# =============================================================================

show_yoyoclaw_complete() {
    local token=""
    [ -f "$YOYOCLAW_HOME/.gateway-token" ] && token="$(cat "$YOYOCLAW_HOME/.gateway-token")" || true

    local local_url="http://localhost:18789"
    [ -n "$token" ] && local_url="${local_url}?token=${token}" || true

    local network_ip=""
    if type get_network_ip >/dev/null 2>&1; then
        network_ip="$(get_network_ip)"
    fi
    local network_url=""
    if [ -n "$network_ip" ] && [ -n "$token" ]; then
        network_url="http://${network_ip}:18789?token=${token}"
    elif [ -n "$network_ip" ]; then
        network_url="http://${network_ip}:18789"
    fi

    printf "\n"
    printf "${_C_MAUVE}${_C_BOLD}  ╔══════════════════════════════════════════════════════════════╗${_C_RESET}\n"
    printf "${_C_MAUVE}${_C_BOLD}  ║${_C_RESET}  ${_C_BOLD}YoyoClaw is running!${_C_RESET}  ¯\\_(ツ)_/¯                          ${_C_MAUVE}${_C_BOLD}║${_C_RESET}\n"
    printf "${_C_MAUVE}${_C_BOLD}  ╚══════════════════════════════════════════════════════════════╝${_C_RESET}\n"
    printf "\n"
    printf "  ${_C_DIM}Dashboard:${_C_RESET}  ${_C_CYAN}%s${_C_RESET}\n" "$local_url"
    if [ -n "$network_url" ]; then
        printf "  ${_C_DIM}Network:${_C_RESET}    ${_C_CYAN}%s${_C_RESET}\n" "$network_url"
    fi
    printf "  ${_C_DIM}Commands:${_C_RESET}   ${_C_BOLD}yoyo-ai${_C_RESET}  ${_C_DIM}|${_C_RESET}  ${_C_BOLD}yoyoclaw${_C_RESET}  ${_C_DIM}|${_C_RESET}  ${_C_BOLD}yoyo-gui --ai${_C_RESET}  ${_C_DIM}|${_C_RESET}  ${_C_BOLD}yoyo-doctor${_C_RESET}\n"
    printf "\n"
    printf "${_C_DIM}  \"Your AI learns. Your AI remembers. Your AI evolves.\"${_C_RESET}\n"
    printf "\n"
}

show_yoyodev_complete() {
    printf "\n"
    printf "${_C_YELLOW}${_C_BOLD}"
    printf "  ╔══════════════════════════════════════════════════════════════╗\n"
    printf "  ║  YoyoDev installed!                                         ║\n"
    printf "  ╠══════════════════════════════════════════════════════════════╣\n"
    printf "  ║${_C_RESET}                                                              ${_C_YELLOW}${_C_BOLD}║\n"
    printf "  ║${_C_RESET}  ${_C_DIM}Next steps:${_C_RESET}                                                   ${_C_YELLOW}${_C_BOLD}║\n"
    printf "  ║${_C_RESET}    ${_C_BOLD}cd <your-project>${_C_RESET}                                          ${_C_YELLOW}${_C_BOLD}║\n"
    printf "  ║${_C_RESET}    ${_C_BOLD}yoyo-init --claude-code${_C_RESET}                                    ${_C_YELLOW}${_C_BOLD}║\n"
    printf "  ║${_C_RESET}                                                              ${_C_YELLOW}${_C_BOLD}║\n"
    printf "  ║${_C_RESET}  ${_C_DIM}Commands:${_C_RESET} yoyo-dev, yoyo-init, yoyo-update, yoyo-gui          ${_C_YELLOW}${_C_BOLD}║\n"
    printf "  ╚══════════════════════════════════════════════════════════════╝\n"
    printf "${_C_RESET}\n"
}

# =============================================================================
# Uninstall
# =============================================================================

run_uninstall() {
    printf "\n${_C_BOLD}${_C_RED}Yoyo AI Uninstaller${_C_RESET}\n\n"
    _warn "This will remove:"
    _detail "  ${BASE_DIR} (BASE installation)"
    _detail "  ${YOYOCLAW_HOME} (YoyoClaw data)"
    _detail "  $HOME/.openclaw, $HOME/.yoyo-claw, $HOME/.yoyo-ai (symlinks)"
    _detail "  Global command symlinks"
    _detail "  Shell profile PATH entries"

    if [ "$FLAG_DRY_RUN" = true ]; then _detail "[dry-run] Would remove all above"; return 0; fi

    printf "\nType 'yes' to confirm: "
    local confirm
    _tty_read -r confirm
    if [ "$confirm" != "yes" ]; then _info "Uninstall cancelled"; return 0; fi

    # Remove global commands
    for cmd in yoyo-dev yoyo-ai yoyo-cli yoyo-init yoyo-update yoyo-gui yoyo-doctor yoyo yoyo-install yoyoclaw; do
        local cmd_path
        cmd_path=$(command -v "$cmd" 2>/dev/null || true)
        if [ -n "$cmd_path" ] && [ -L "$cmd_path" ]; then
            rm -f "$cmd_path" 2>/dev/null || _maybe_sudo rm -f "$cmd_path" 2>/dev/null || true
            _ok "Removed: $cmd"
        fi
    done

    # Remove directories
    if [ -d "$BASE_DIR" ]; then rm -rf "$BASE_DIR"; _ok "Removed: ${BASE_DIR}"; fi
    if [ -d "$YOYOCLAW_HOME" ]; then rm -rf "$YOYOCLAW_HOME"; _ok "Removed: ${YOYOCLAW_HOME}"; fi

    # Remove symlinks
    for link in "$HOME/.openclaw" "$HOME/.yoyo-claw" "$HOME/.yoyo-ai"; do
        if [ -L "$link" ]; then rm -f "$link"; _ok "Removed: $link"; fi
    done

    # Clean shell profiles
    local marker_start="# >>> yoyo-dev-ai >>>"
    local marker_end="# <<< yoyo-dev-ai <<<"
    for profile in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.bash_profile" "$HOME/.profile" "$HOME/.config/fish/config.fish"; do
        if [ -f "$profile" ] && grep -q "$marker_start" "$profile" 2>/dev/null; then
            sed -i.bak "/${marker_start}/,/${marker_end}/d" "$profile" 2>/dev/null || true
            rm -f "${profile}.bak" 2>/dev/null || true
            _ok "Cleaned: $profile"
        fi
    done

    # Uninstall npm globals
    if command -v npm >/dev/null 2>&1; then
        npm uninstall -g @anthropic-ai/claude-code 2>/dev/null && _ok "Uninstalled: claude-code" || true
    fi

    printf "\n"
    _ok "Yoyo AI has been completely removed"
    _detail "Restart your terminal to clear cached paths"
}

# =============================================================================
# Main
# =============================================================================

main() {
    parse_flags "$@"

    if [ "$FLAG_HELP" = true ]; then show_help; exit 0; fi
    if [ "$FLAG_UNINSTALL" = true ]; then run_uninstall; exit 0; fi

    # === 1. Welcome Banner ===
    show_banner

    # === 2. Interactive Toggle Menu ===
    show_toggle_menu

    # Compute dynamic step count
    compute_steps

    # Dry-run notice
    if [ "$FLAG_DRY_RUN" = true ]; then _warn "DRY RUN MODE - no changes will be made"; printf "\n"; fi

    # Track current step
    local S=0

    # === Step: Pre-flight ===
    S=$((S + 1)); _step $S "Pre-flight checks"
    preflight_checks

    # === Step: System deps ===
    S=$((S + 1)); _step $S "System dependencies"
    install_system_deps

    # === Step: Node.js ===
    S=$((S + 1)); _step $S "Node.js >= ${NODE_REQUIRED_MAJOR}"
    install_nodejs

    # === Step: Clone BASE ===
    S=$((S + 1)); _step $S "Clone BASE repository"
    clone_or_update_base

    # === Step: Source helpers ===
    S=$((S + 1)); _step $S "Load shared helpers"
    source_helpers

    # === YoyoClaw steps ===
    if [ "$INSTALL_YOYOCLAW" = true ]; then
        S=$((S + 1)); _step $S "Install pnpm"
        install_pnpm

        S=$((S + 1)); _step $S "Build YoyoClaw"
        build_yoyoclaw

        S=$((S + 1)); _step $S "Onboard YoyoClaw"
        onboard_yoyoclaw

        S=$((S + 1)); _step $S "Start gateway"
        start_gateway

        S=$((S + 1)); _step $S "Open browser"
        open_browser

        S=$((S + 1)); _step $S "Install yoyo-ai command"
        install_yoyoclaw_commands
    fi

    # === YoyoDev steps ===
    if [ "$INSTALL_YOYODEV" = true ]; then
        S=$((S + 1)); _step $S "Claude Code CLI"
        install_claude_code

        S=$((S + 1)); _step $S "Global commands"
        setup_global_commands
    fi

    # === Step: Shell profile ===
    S=$((S + 1)); _step $S "Shell profile"
    setup_shell_profile

    # === Step: Verify ===
    S=$((S + 1)); _step $S "Verify installation"
    verify_installation

    # === Completion screens ===
    if [ "$FLAG_DRY_RUN" = true ]; then
        printf "\n"
        _ok "Dry run complete. No changes were made."
    else
        if [ "$INSTALL_YOYOCLAW" = true ]; then show_yoyoclaw_complete; fi
        if [ "$INSTALL_YOYODEV" = true ]; then show_yoyodev_complete; fi
    fi
}

main "$@"
