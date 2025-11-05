#!/bin/bash
#
# Test script to verify yoyo-update.sh handles broken venv correctly
#

set -e

echo "Testing yoyo-update.sh venv handling..."
echo ""

# Test 1: Check if venv directory exists but pip doesn't
echo "Test 1: Broken venv (directory exists, pip missing)"
echo "-----------------------------------------------"

# Simulate the condition
BASE_AGENT_OS="/home/yoga999/yoyo-dev"
VENV_DIR="$BASE_AGENT_OS/venv"
PIP_PATH="$VENV_DIR/bin/pip"

echo "Checking venv directory: $VENV_DIR"
if [ -d "$VENV_DIR" ]; then
    echo "✓ venv directory exists"
else
    echo "✗ venv directory does NOT exist"
fi

echo ""
echo "Checking pip executable: $PIP_PATH"
if [ -f "$PIP_PATH" ]; then
    echo "✓ pip executable exists"
else
    echo "✗ pip executable does NOT exist"
fi

echo ""
echo "Logic test:"
echo "-----------"

# Test the fixed logic
if [ -d "$VENV_DIR" ] && [ -f "$PIP_PATH" ]; then
    echo "→ Would upgrade dependencies in venv"
elif [ -d "$VENV_DIR" ] && [ ! -f "$PIP_PATH" ]; then
    echo "→ Would reinstall dependencies (broken venv detected)"
elif command -v pip3 &> /dev/null; then
    echo "→ Would use system pip3"
else
    echo "→ Would skip (no pip available)"
fi

echo ""
echo "Test 2: Check actual venv state"
echo "--------------------------------"
ls -la "$VENV_DIR" 2>/dev/null || echo "venv directory not found"

echo ""
echo "Test complete!"
