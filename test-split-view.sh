#!/bin/bash
# Test script to check if split view launches

echo "=== Split View Test ==="
echo ""
echo "1. Checking if stdin is a TTY:"
python3 -c "import sys; print('  stdin.isatty():', sys.stdin.isatty())"

echo ""
echo "2. Checking if Claude Code is installed:"
if which claude > /dev/null 2>&1; then
    echo "  ✓ Claude Code found at: $(which claude)"
else
    echo "  ✗ Claude Code NOT found"
fi

echo ""
echo "3. Testing the CLI module directly:"
cd ~/yoyo-dev
timeout 2 python3 -m lib.yoyo_tui_v3.cli --version 2>&1 || echo "(timed out - that's OK)"

echo ""
echo "4. Checking what yoyo command will execute:"
echo "  Command: $(which yoyo)"
echo "  Points to: $(readlink -f $(which yoyo))"

echo ""
echo "=== Test Complete ==="
echo ""
echo "To actually test split view:"
echo "  1. Open Konsole (NOT from Claude Code)"
echo "  2. cd to a yoyo-dev project"
echo "  3. Run: yoyo"
echo "  4. You should see Claude Code (left) + TUI (right)"
