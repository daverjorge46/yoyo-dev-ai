#!/bin/bash

echo "=== Yoyo Dev TUI Diagnostic ==="
echo ""

# Check if yoyo command exists
echo "1. Checking yoyo command..."
if command -v yoyo &> /dev/null; then
    echo "   ✓ yoyo command found: $(which yoyo)"
    echo "   → Points to: $(readlink -f $(which yoyo))"
else
    echo "   ✗ yoyo command not found"
fi
echo ""

# Check if yoyo-tui.py exists
echo "2. Checking yoyo-tui.py..."
if [ -f "$HOME/yoyo-dev/lib/yoyo-tui.py" ]; then
    echo "   ✓ Found: $HOME/yoyo-dev/lib/yoyo-tui.py"
else
    echo "   ✗ Missing: $HOME/yoyo-dev/lib/yoyo-tui.py"
fi
echo ""

# Check Python dependencies
echo "3. Checking Python dependencies..."

# Check venv
if [ -f "$HOME/yoyo-dev/venv/bin/python3" ]; then
    echo "   ✓ Virtual environment found"

    # Check Textual
    if "$HOME/yoyo-dev/venv/bin/python3" -c "import textual" &> /dev/null; then
        version=$("$HOME/yoyo-dev/venv/bin/python3" -c "import textual; print(textual.__version__)")
        echo "   ✓ textual installed (v$version)"
    else
        echo "   ✗ textual NOT installed in venv"
    fi

    # Check watchdog
    if "$HOME/yoyo-dev/venv/bin/python3" -c "import watchdog" &> /dev/null; then
        version=$("$HOME/yoyo-dev/venv/bin/python3" -c "import watchdog; print(watchdog.__version__)")
        echo "   ✓ watchdog installed (v$version)"
    else
        echo "   ✗ watchdog NOT installed in venv"
    fi

    # Check yaml
    if "$HOME/yoyo-dev/venv/bin/python3" -c "import yaml" &> /dev/null; then
        echo "   ✓ yaml installed"
    else
        echo "   ✗ yaml NOT installed in venv"
    fi
else
    echo "   ✗ Virtual environment not found"
fi
echo ""

# Check if TUI app can be imported
echo "4. Checking TUI app import..."
if [ -f "$HOME/yoyo-dev/venv/bin/python3" ]; then
    if "$HOME/yoyo-dev/venv/bin/python3" -c "import sys; sys.path.insert(0, '$HOME/yoyo-dev/lib'); from yoyo_tui.app import YoyoDevApp" &> /dev/null; then
        echo "   ✓ yoyo_tui.app.YoyoDevApp imports successfully"
    else
        echo "   ✗ Failed to import yoyo_tui.app.YoyoDevApp"
        echo "   Error:"
        "$HOME/yoyo-dev/venv/bin/python3" -c "import sys; sys.path.insert(0, '$HOME/yoyo-dev/lib'); from yoyo_tui.app import YoyoDevApp" 2>&1 | sed 's/^/     /'
    fi
else
    echo "   - Skipped (no venv)"
fi
echo ""

# Check yoyo_tui library structure
echo "5. Checking yoyo_tui library structure..."
if [ -d "$HOME/yoyo-dev/lib/yoyo_tui" ]; then
    echo "   ✓ lib/yoyo_tui/ directory exists"
    echo "   Files:"
    ls -1 "$HOME/yoyo-dev/lib/yoyo_tui/" | grep -v "__pycache__" | sed 's/^/     - /'

    echo ""
    echo "   Services:"
    ls -1 "$HOME/yoyo-dev/lib/yoyo_tui/services/" | grep -v "__pycache__" | sed 's/^/     - /'
else
    echo "   ✗ lib/yoyo_tui/ directory missing"
fi
echo ""

# Test what dashboard would be launched
echo "6. Determining which dashboard would launch..."
if [ -f "$HOME/yoyo-dev/venv/bin/python3" ]; then
    if "$HOME/yoyo-dev/venv/bin/python3" -c "import textual, watchdog, yaml" &> /dev/null 2>&1; then
        echo "   → Would launch: Textual TUI (yoyo-tui.py)"
        echo "   Command: $HOME/yoyo-dev/venv/bin/python3 $HOME/yoyo-dev/lib/yoyo-tui.py"
    elif "$HOME/yoyo-dev/venv/bin/python3" -c "import rich, watchdog, yaml" &> /dev/null 2>&1; then
        echo "   → Would launch: Rich dashboard (yoyo-dashboard.py)"
        echo "   Command: $HOME/yoyo-dev/venv/bin/python3 $HOME/yoyo-dev/lib/yoyo-dashboard.py"
    else
        echo "   → Would launch: Bash fallback (yoyo-status.sh)"
        echo "   Command: $HOME/yoyo-dev/lib/yoyo-status.sh"
    fi
elif command -v python3 &> /dev/null; then
    if python3 -c "import textual, watchdog, yaml" &> /dev/null 2>&1; then
        echo "   → Would launch: Textual TUI (system Python)"
        echo "   Command: python3 $HOME/yoyo-dev/lib/yoyo-tui.py"
    elif python3 -c "import rich, watchdog, yaml" &> /dev/null 2>&1; then
        echo "   → Would launch: Rich dashboard (system Python)"
        echo "   Command: python3 $HOME/yoyo-dev/lib/yoyo-dashboard.py"
    else
        echo "   → Would launch: Bash fallback"
        echo "   Command: $HOME/yoyo-dev/lib/yoyo-status.sh"
    fi
else
    echo "   → Would launch: Bash fallback (no Python)"
    echo "   Command: $HOME/yoyo-dev/lib/yoyo-status.sh"
fi
echo ""

echo "=== End of diagnostic ==="
