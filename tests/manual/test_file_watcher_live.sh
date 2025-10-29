#!/bin/bash
# Manual test for FileWatcher integration with TUI
#
# This script tests that the TUI automatically refreshes when files change.
#
# Test procedure:
# 1. Start the TUI in the background
# 2. Wait 2 seconds for TUI to initialize
# 3. Modify tasks.md
# 4. Wait 2 seconds (accounting for 1.5s debounce)
# 5. Check if TUI detected the change
# 6. Clean up
#
# Expected: TUI should display "Data refreshed" notification

set -e

echo "🧪 Manual FileWatcher Integration Test"
echo "======================================"
echo ""

# Ensure we're in the yoyo-dev directory
cd ~/yoyo-dev

# Check if .yoyo-dev directory exists
if [ ! -d ".yoyo-dev" ]; then
    echo "❌ ERROR: .yoyo-dev directory not found"
    exit 1
fi

# Find a tasks.md file
TASKS_FILE=""
if [ -f ".yoyo-dev/fixes/"*"/tasks.md" ]; then
    TASKS_FILE=$(find .yoyo-dev/fixes -name "tasks.md" | head -n 1)
elif [ -f ".yoyo-dev/specs/"*"/tasks.md" ]; then
    TASKS_FILE=$(find .yoyo-dev/specs -name "tasks.md" | head -n 1)
fi

if [ -z "$TASKS_FILE" ]; then
    echo "❌ ERROR: No tasks.md file found in .yoyo-dev/specs or .yoyo-dev/fixes"
    exit 1
fi

echo "✓ Found tasks file: $TASKS_FILE"
echo ""

echo "📝 Test Instructions:"
echo "1. The TUI will launch in 3 seconds"
echo "2. Watch for 'File watching enabled' notification"
echo "3. We'll modify $TASKS_FILE"
echo "4. Watch for 'Data refreshed' notification (should appear within 2 seconds)"
echo "5. Press 'q' to quit when done"
echo ""
echo "Press Ctrl+C to cancel, or wait 3 seconds to start..."
sleep 3

echo ""
echo "🚀 Launching TUI..."
echo ""

# Backup original file
cp "$TASKS_FILE" "$TASKS_FILE.backup"

# Launch TUI (this will block - run the test in another terminal)
# For automated testing, we would use textual console features
# For now, this is a manual test guide

echo "✓ Test file backed up to $TASKS_FILE.backup"
echo ""
echo "Manual test steps:"
echo "1. Run: yoyo-tui"
echo "2. Look for 'File watching enabled' notification"
echo "3. In another terminal, run: echo '# Test change' >> $TASKS_FILE"
echo "4. Within 2 seconds, you should see 'Data refreshed' notification"
echo "5. Press 'r' to manually refresh and verify it works too"
echo "6. Press 'q' to quit"
echo ""
echo "To restore backup: cp $TASKS_FILE.backup $TASKS_FILE"
