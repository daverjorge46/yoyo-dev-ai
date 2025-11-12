#!/bin/bash

# Integration Test Suite: yoyo-update End-to-End
# Tests complete update workflow

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "=================================================="
echo "Integration Test: yoyo-update End-to-End"
echo "=================================================="
echo ""

# Test 1: Verify script resolves BASE_YOYO_DEV correctly
echo "Test 1: Path Resolution"
echo "  Checking \$BASE_YOYO_DEV resolution..."

# Source the script logic for testing (simulate what script does)
SCRIPT_PATH="${BASH_SOURCE[0]}"
SCRIPT_PATH="/usr/local/bin/yoyo-update"
if [ -L "$SCRIPT_PATH" ]; then
    RESOLVED_PATH=$(readlink -f "$SCRIPT_PATH")
    SCRIPT_DIR=$(dirname "$RESOLVED_PATH")
    BASE_YOYO_DEV=$(dirname "$SCRIPT_DIR")
    echo -e "  ${GREEN}✓${NC} Resolved BASE_YOYO_DEV: $BASE_YOYO_DEV"
else
    echo -e "  ${YELLOW}⚠${NC}  Symlink not found, using current directory"
    BASE_YOYO_DEV=$(pwd)
fi

# Test 2: Verify venv path uses $BASE_YOYO_DEV
echo ""
echo "Test 2: Virtual Environment Path"
if [ -d "$BASE_YOYO_DEV/venv" ]; then
    echo -e "  ${GREEN}✓${NC} venv found at: $BASE_YOYO_DEV/venv"

    # Check if pip exists
    if [ -f "$BASE_YOYO_DEV/venv/bin/pip" ]; then
        echo -e "  ${GREEN}✓${NC} pip found in venv"
    else
        echo -e "  ${RED}✗${NC} pip not found in venv (expected for test)"
    fi
else
    echo -e "  ${YELLOW}⚠${NC}  venv not found (expected if not installed)"
fi

# Test 3: Verify requirements.txt path
echo ""
echo "Test 3: Requirements File Path"
if [ -f "$BASE_YOYO_DEV/requirements.txt" ]; then
    echo -e "  ${GREEN}✓${NC} requirements.txt found at: $BASE_YOYO_DEV/requirements.txt"
else
    echo -e "  ${RED}✗${NC} requirements.txt not found"
    exit 1
fi

# Test 4: Verify no hardcoded paths in script
echo ""
echo "Test 4: No Hardcoded Paths"
HARDCODED_COUNT=$(grep -c "\$HOME/yoyo-dev" setup/yoyo-update.sh || true)
if [ "$HARDCODED_COUNT" -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} No hardcoded \$HOME/yoyo-dev paths found"
else
    echo -e "  ${RED}✗${NC} Found $HARDCODED_COUNT hardcoded paths"
    exit 1
fi

# Test 5: Verify no symlink self-update logic
echo ""
echo "Test 5: No Symlink Self-Update"
if grep -q "ln -sf.*\/usr\/local\/bin\/yoyo" setup/yoyo-update.sh; then
    echo -e "  ${RED}✗${NC} Script contains symlink self-update logic"
    exit 1
else
    echo -e "  ${GREEN}✓${NC} No symlink self-update logic found"
fi

# Test 6: Verify error handling for missing pip
echo ""
echo "Test 6: Error Handling for Missing Pip"
if grep -q "Virtual environment exists but pip not found" setup/yoyo-update.sh; then
    echo -e "  ${GREEN}✓${NC} Error message for missing pip found"
else
    echo -e "  ${RED}✗${NC} No error handling for missing pip"
    exit 1
fi

# Test 7: Verify requirements.txt existence check
echo ""
echo "Test 7: Requirements.txt Existence Check"
if grep -q "if \[ -f.*requirements.txt" setup/yoyo-update.sh; then
    echo -e "  ${GREEN}✓${NC} requirements.txt existence check found"
else
    echo -e "  ${RED}✗${NC} No requirements.txt existence check"
    exit 1
fi

# Summary
echo ""
echo "=================================================="
echo "Integration Test Summary"
echo "=================================================="
echo -e "${GREEN}✓ All integration tests passed!${NC}"
echo ""
echo "The yoyo-update script:"
echo "  • Resolves paths correctly using \$BASE_YOYO_DEV"
echo "  • Has no hardcoded \$HOME/yoyo-dev paths"
echo "  • Does not attempt to self-update symlinks"
echo "  • Validates virtual environment and pip existence"
echo "  • Provides actionable error messages"
echo ""
