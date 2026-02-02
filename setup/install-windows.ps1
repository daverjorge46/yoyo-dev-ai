#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Yoyo Dev AI - Windows Installation Bootstrap
.DESCRIPTION
    Installs WSL2 with Ubuntu, prerequisites (Node.js 22, git), then runs
    the Yoyo Dev AI installation inside WSL. Run from PowerShell as Administrator.
.EXAMPLE
    # From PowerShell (Admin):
    .\install-windows.ps1

    # Or from CMD (Admin):
    powershell -ExecutionPolicy Bypass -File install-windows.ps1
.NOTES
    Version: 7.0.0
    Requires: Windows 10 version 2004+ or Windows 11
    Requires: Administrator privileges
#>

param(
    [switch]$SkipWSL,       # Skip WSL installation (already installed)
    [switch]$SkipNode,      # Skip Node.js installation inside WSL
    [switch]$NonInteractive, # Skip confirmation prompts
    [ValidateSet("both", "yoyo-ai", "yoyo-dev")]
    [string]$Components = "" # Component selection (prompted if empty)
)

$ErrorActionPreference = "Stop"
$Version = "7.0.0"
$RepoURL = "https://github.com/daverjorge46/yoyo-dev-ai.git"
$WSLDistro = "Ubuntu"
$NodeMajor = 22
$BaseInstallPath = "~/.yoyo-dev-base"

# ============================================================================
# UI Helpers
# ============================================================================

function Write-Banner {
    Write-Host ""
    Write-Host "  ╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║                                                            ║" -ForegroundColor Cyan
    Write-Host "  ║         YOYO DEV AI v$Version - Windows Installer            ║" -ForegroundColor Cyan
    Write-Host "  ║                                                            ║" -ForegroundColor Cyan
    Write-Host "  ╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([int]$Num, [int]$Total, [string]$Message)
    Write-Host "  [$Num/$Total] $Message" -ForegroundColor White
}

function Write-OK {
    param([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "  [!!] $Message" -ForegroundColor Yellow
}

function Write-Fail {
    param([string]$Message)
    Write-Host "  [FAIL] $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "  [i] $Message" -ForegroundColor DarkGray
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

function Test-AdminPrivileges {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-WindowsVersion {
    $os = [System.Environment]::OSVersion
    $build = [int](Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion").CurrentBuildNumber
    # WSL2 requires Windows 10 build 19041+
    return $build -ge 19041
}

function Test-WSLInstalled {
    try {
        $result = wsl --status 2>&1
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

function Test-UbuntuInstalled {
    try {
        $distros = wsl --list --quiet 2>&1
        return ($distros -match "Ubuntu")
    }
    catch {
        return $false
    }
}

# ============================================================================
# Installation Steps
# ============================================================================

function Install-WSL2 {
    Write-Step 1 6 "Checking WSL2..."

    if (Test-WSLInstalled) {
        Write-OK "WSL2 is already installed"
    }
    else {
        Write-Info "Installing WSL2 (this may require a restart)..."
        try {
            wsl --install --no-distribution 2>&1 | Out-Null
            Write-OK "WSL2 installed"
        }
        catch {
            # Try enabling features manually
            Write-Info "Trying manual WSL2 setup..."
            dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart 2>&1 | Out-Null
            dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart 2>&1 | Out-Null
            wsl --set-default-version 2 2>&1 | Out-Null
            Write-OK "WSL2 features enabled"
            Write-Warn "A RESTART may be required. After restart, re-run this script."
        }
    }
}

function Install-Ubuntu {
    Write-Step 2 6 "Checking Ubuntu distribution..."

    if (Test-UbuntuInstalled) {
        Write-OK "Ubuntu is already installed in WSL"
    }
    else {
        Write-Info "Installing Ubuntu (this may take a few minutes)..."
        try {
            wsl --install -d Ubuntu 2>&1 | Out-Null
            Write-OK "Ubuntu installed"
            Write-Info "Ubuntu will prompt you to create a username and password on first launch."
            Write-Info "After setup, re-run this script to continue installation."

            # Launch Ubuntu to complete setup
            Write-Host ""
            Write-Host "  Ubuntu is launching for first-time setup." -ForegroundColor Yellow
            Write-Host "  1. Create your username and password" -ForegroundColor Yellow
            Write-Host "  2. Type 'exit' when done" -ForegroundColor Yellow
            Write-Host "  3. Re-run this script to continue" -ForegroundColor Yellow
            Write-Host ""

            Start-Process "ubuntu.exe" -Wait
            return
        }
        catch {
            Write-Fail "Failed to install Ubuntu: $_"
            Write-Host ""
            Write-Host "  Install manually from Microsoft Store:" -ForegroundColor Yellow
            Write-Host "  https://apps.microsoft.com/detail/9PDXGNCFSCZV" -ForegroundColor Cyan
            Write-Host ""
            exit 1
        }
    }
}

function Update-Ubuntu {
    Write-Step 3 6 "Updating Ubuntu packages..."
    try {
        wsl -d $WSLDistro -- bash -c "sudo apt-get update -qq && sudo apt-get upgrade -y -qq" 2>&1 | Out-Null
        Write-OK "Ubuntu packages updated"
    }
    catch {
        Write-Warn "Package update failed (non-critical, continuing...)"
    }
}

function Install-Prerequisites {
    Write-Step 4 6 "Installing prerequisites in WSL..."

    # Install essential tools
    Write-Info "Installing git, curl, build-essential..."
    wsl -d $WSLDistro -- bash -c "sudo apt-get install -y -qq git curl build-essential 2>/dev/null" 2>&1 | Out-Null
    Write-OK "Essential tools installed"

    if (-not $SkipNode) {
        # Check if Node.js 22+ is already installed
        $nodeCheck = wsl -d $WSLDistro -- bash -c "node --version 2>/dev/null || echo 'none'" 2>&1
        $nodeVersion = $nodeCheck.Trim()

        if ($nodeVersion -match "^v(\d+)" -and [int]$Matches[1] -ge $NodeMajor) {
            Write-OK "Node.js $nodeVersion already installed"
        }
        else {
            Write-Info "Installing Node.js $NodeMajor via NodeSource..."
            $nodeInstallCmd = @"
curl -fsSL https://deb.nodesource.com/setup_${NodeMajor}.x | sudo -E bash - 2>/dev/null && sudo apt-get install -y -qq nodejs 2>/dev/null
"@
            wsl -d $WSLDistro -- bash -c $nodeInstallCmd 2>&1 | Out-Null

            # Verify
            $nodeVerify = wsl -d $WSLDistro -- bash -c "node --version 2>/dev/null" 2>&1
            if ($nodeVerify -match "^v\d+") {
                Write-OK "Node.js $($nodeVerify.Trim()) installed"
            }
            else {
                Write-Fail "Node.js installation failed"
                Write-Host ""
                Write-Host "  Install manually inside WSL:" -ForegroundColor Yellow
                Write-Host "  curl -fsSL https://deb.nodesource.com/setup_${NodeMajor}.x | sudo -E bash -" -ForegroundColor Cyan
                Write-Host "  sudo apt-get install -y nodejs" -ForegroundColor Cyan
                Write-Host ""
                exit 1
            }
        }

        # Verify npm
        $npmCheck = wsl -d $WSLDistro -- bash -c "npm --version 2>/dev/null || echo 'none'" 2>&1
        Write-OK "npm $($npmCheck.Trim()) available"
    }
}

function Install-YoyoDevAI {
    param([string]$InstallComponents)

    Write-Step 5 7 "Installing Yoyo Dev AI in WSL..."

    # Check if already cloned
    $baseExists = wsl -d $WSLDistro -- bash -c "[ -d $BaseInstallPath ] && echo 'yes' || echo 'no'" 2>&1
    if ($baseExists.Trim() -eq "yes") {
        Write-Info "Updating existing installation..."
        wsl -d $WSLDistro -- bash -c "cd $BaseInstallPath && git pull --quiet 2>/dev/null" 2>&1 | Out-Null
        Write-OK "Yoyo Dev AI updated"
    }
    else {
        Write-Info "Cloning Yoyo Dev AI repository..."
        wsl -d $WSLDistro -- bash -c "git clone --quiet $RepoURL $BaseInstallPath 2>/dev/null" 2>&1 | Out-Null
        Write-OK "Yoyo Dev AI cloned to $BaseInstallPath"
    }

    # Install global commands
    Write-Info "Installing global commands..."
    wsl -d $WSLDistro -- bash -c "bash $BaseInstallPath/setup/install-global-command.sh 2>/dev/null" 2>&1 | Out-Null
    Write-OK "Global commands installed"

    # Install OpenClaw (yoyo-ai) — unless yoyo-dev only
    if ($InstallComponents -ne "yoyo-dev") {
        Write-Info "Installing OpenClaw (yoyo-ai)..."
        $openclawResult = wsl -d $WSLDistro -- bash -c "npm install -g openclaw@latest 2>&1 | tail -1" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-OK "OpenClaw installed"
        }
        else {
            Write-Warn "OpenClaw installation failed (can install later with: npm install -g openclaw@latest)"
        }
    }
    else {
        Write-Info "Skipping OpenClaw (yoyo-dev only mode)"
    }
}

function Install-ClaudeCode {
    param([string]$InstallComponents)

    # Install Claude Code CLI — unless yoyo-ai only
    if ($InstallComponents -eq "yoyo-ai") {
        Write-Step 6 7 "Skipping Claude Code CLI (yoyo-ai only mode)..."
        return
    }

    Write-Step 6 7 "Installing Claude Code CLI in WSL..."

    $claudeCheck = wsl -d $WSLDistro -- bash -c "command -v claude && echo 'found' || echo 'notfound'" 2>&1
    if ($claudeCheck.Trim() -eq "found") {
        Write-OK "Claude Code CLI already installed"
    }
    else {
        Write-Info "Installing Claude Code CLI via npm..."
        $result = wsl -d $WSLDistro -- bash -c "npm install -g @anthropic-ai/claude-code 2>&1 | tail -1" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-OK "Claude Code CLI installed"
        }
        else {
            Write-Warn "Claude Code CLI installation failed"
            Write-Host "  Install manually in WSL: npm install -g @anthropic-ai/claude-code" -ForegroundColor Cyan
        }
    }
}

function Show-Completion {
    param([string]$InstallComponents)
    Write-Step 7 7 "Installation complete!"
    Write-Host ""
    Write-Host "  ╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "  ║              YOYO DEV AI - Installation Complete            ║" -ForegroundColor Green
    Write-Host "  ╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Next steps:" -ForegroundColor White
    Write-Host ""
    Write-Host "  1. Open WSL (type 'wsl' in CMD/PowerShell or open Ubuntu)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Navigate to your project:" -ForegroundColor Gray
    Write-Host "     cd /mnt/c/Users/$env:USERNAME/your-project" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  3. Initialize Yoyo Dev:" -ForegroundColor Gray
    Write-Host "     yoyo-init --claude-code" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  4. Launch development environment:" -ForegroundColor Gray
    Write-Host "     yoyo-dev --no-wave" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  5. Start AI assistant:" -ForegroundColor Gray
    Write-Host "     yoyo-ai --start" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Note: On WSL, use '--no-wave' flag as Wave Terminal should" -ForegroundColor DarkGray
    Write-Host "  be installed natively on Windows, not inside WSL." -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Wave Terminal (optional): https://waveterm.dev/download" -ForegroundColor DarkGray
    Write-Host ""
}

# ============================================================================
# Main
# ============================================================================

Write-Banner

# Pre-flight checks
if (-not (Test-AdminPrivileges)) {
    Write-Fail "This script requires Administrator privileges."
    Write-Host ""
    Write-Host "  Right-click PowerShell and select 'Run as administrator'" -ForegroundColor Yellow
    Write-Host "  Or from CMD: powershell -ExecutionPolicy Bypass -File install-windows.ps1" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

if (-not (Test-WindowsVersion)) {
    Write-Fail "Windows 10 version 2004 (build 19041) or later is required for WSL2."
    Write-Host ""
    Write-Host "  Please update Windows first." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Component selection
if (-not $Components) {
    if (-not $NonInteractive) {
        Write-Host "  What would you like to install?" -ForegroundColor White
        Write-Host ""
        Write-Host "    1. Both (recommended) - yoyo-dev + yoyo-ai" -ForegroundColor Cyan
        Write-Host "    2. yoyo-ai only       - Business & Personal AI Assistant (OpenClaw)" -ForegroundColor Gray
        Write-Host "    3. yoyo-dev only      - Dev environment (Claude Code, Wave, GUI)" -ForegroundColor Gray
        Write-Host ""
        $compChoice = Read-Host "  Choice [1]"
        if (-not $compChoice) { $compChoice = "1" }
        switch ($compChoice) {
            "1" { $Components = "both" }
            "2" { $Components = "yoyo-ai" }
            "3" { $Components = "yoyo-dev" }
            default { $Components = "both" }
        }
        Write-Host ""
    }
    else {
        $Components = "both"
    }
}

# Confirmation
if (-not $NonInteractive) {
    Write-Host "  This script will:" -ForegroundColor White
    Write-Host "    - Install/enable WSL2 with Ubuntu" -ForegroundColor Gray
    Write-Host "    - Update Ubuntu and install Node.js $NodeMajor, git, curl" -ForegroundColor Gray
    Write-Host "    - Clone Yoyo Dev AI into WSL" -ForegroundColor Gray
    if ($Components -ne "yoyo-dev") {
        Write-Host "    - Install OpenClaw (yoyo-ai)" -ForegroundColor Gray
    }
    if ($Components -ne "yoyo-ai") {
        Write-Host "    - Install Claude Code CLI" -ForegroundColor Gray
    }
    Write-Host "    - Install global yoyo commands" -ForegroundColor Gray
    Write-Host ""

    $confirm = Read-Host "  Proceed? (Y/n)"
    if ($confirm -and $confirm.ToLower() -ne "y") {
        Write-Host ""
        Write-Host "  Installation cancelled." -ForegroundColor Yellow
        Write-Host ""
        exit 0
    }
    Write-Host ""
}

# Run installation steps
if (-not $SkipWSL) {
    Install-WSL2
    Install-Ubuntu
}

# Verify WSL is functional before continuing
try {
    $wslTest = wsl -d $WSLDistro -- echo "ok" 2>&1
    if ($wslTest.Trim() -ne "ok") {
        throw "WSL not responding"
    }
}
catch {
    Write-Fail "WSL/Ubuntu is not ready yet."
    Write-Host ""
    Write-Host "  If Ubuntu was just installed, it may need first-time setup." -ForegroundColor Yellow
    Write-Host "  1. Open Ubuntu from the Start menu" -ForegroundColor Yellow
    Write-Host "  2. Create your username and password" -ForegroundColor Yellow
    Write-Host "  3. Re-run this script" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Update-Ubuntu
Install-Prerequisites
Install-YoyoDevAI -InstallComponents $Components
Install-ClaudeCode -InstallComponents $Components
Show-Completion -InstallComponents $Components
