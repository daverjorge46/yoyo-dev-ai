#!/bin/bash

# Force TUI Update Script
# Ensures yoyo-tui.py and yoyo_tui library are properly installed/updated in a project

echo ""
echo "🔄 Force TUI Update"
echo "==================="
echo ""

# Check if we're in a yoyo-dev project
if [ ! -d "./.yoyo-dev" ]; then
    echo "❌ Error: Not in a Yoyo Dev project directory"
    echo ""
    echo "Run this from a project that has Yoyo Dev installed (contains .yoyo-dev/)"
    echo ""
    exit 1
fi

BASE_DIR="$HOME/.yoyo-dev"

echo "📍 Project: $(basename $(pwd))"
echo "📦 Base installation: $BASE_DIR"
echo ""

# Copy yoyo-tui.py
echo "1. Installing yoyo-tui.py..."
if [ -f "$BASE_DIR/lib/yoyo-tui.py" ]; then
    mkdir -p "./.yoyo-dev/lib"
    cp "$BASE_DIR/lib/yoyo-tui.py" "./.yoyo-dev/lib/yoyo-tui.py"
    chmod +x "./.yoyo-dev/lib/yoyo-tui.py"
    echo "   ✓ yoyo-tui.py copied"
else
    echo "   ✗ yoyo-tui.py not found in base installation"
fi

# Update yoyo_tui library
echo ""
echo "2. Updating yoyo_tui library..."
if [ -d "$BASE_DIR/lib/yoyo_tui" ]; then
    mkdir -p "./.yoyo-dev/lib"

    # Use rsync to copy, excluding venv and cache
    rsync -av --exclude='venv' --exclude='__pycache__' --exclude='*.pyc' \
        "$BASE_DIR/lib/yoyo_tui/" "./.yoyo-dev/lib/yoyo_tui/" > /dev/null 2>&1

    echo "   ✓ yoyo_tui library updated"
    echo "     - EventBus (event-driven architecture)"
    echo "     - CacheManager (TTL-based caching)"
    echo "     - DataManager (centralized state management)"
    echo "     - FileWatcher (monitors .yoyo-dev changes)"
    echo "     - All parsers (spec, fix, recap, progress)"
else
    echo "   ✗ yoyo_tui library not found in base installation"
fi

# Update yoyo-dashboard.py
echo ""
echo "3. Updating yoyo-dashboard.py..."
if [ -f "$BASE_DIR/lib/yoyo-dashboard.py" ]; then
    cp "$BASE_DIR/lib/yoyo-dashboard.py" "./.yoyo-dev/lib/yoyo-dashboard.py"
    chmod +x "./.yoyo-dev/lib/yoyo-dashboard.py"
    echo "   ✓ yoyo-dashboard.py copied"
else
    echo "   ✗ yoyo-dashboard.py not found"
fi

# Update requirements.txt
echo ""
echo "4. Updating requirements.txt..."
if [ -f "$BASE_DIR/requirements.txt" ]; then
    cp "$BASE_DIR/requirements.txt" "./.yoyo-dev/requirements.txt"
    echo "   ✓ requirements.txt updated"
else
    echo "   ✗ requirements.txt not found"
fi

echo ""
echo "✅ TUI update complete!"
echo ""
echo "Next steps:"
echo "  1. Run 'yoyo' to launch with the new event-driven TUI"
echo "  2. The TUI will automatically:"
echo "     - Monitor .yoyo-dev/ for file changes"
echo "     - Update UI in real-time when specs/fixes/tasks change"
echo "     - Cache parsed data for faster performance"
echo ""
