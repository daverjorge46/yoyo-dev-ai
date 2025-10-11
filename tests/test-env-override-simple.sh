#!/bin/bash

# Simple test for environment variable override
# Checks the script content directly without sourcing

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
RESET='\033[0m'

YOYO_STATUS="/home/yoga999/.yoyo-dev/lib/yoyo-status.sh"

# Test 1: Default value in script is 10
test_default() {
    local default=$(grep 'YOYO_STATUS_REFRESH:-' "$YOYO_STATUS" | grep -o '[0-9]\+' | tail -1)
    if [ "$default" = "10" ]; then
        echo -e "${GREEN}✓${RESET} Default value is 10 seconds"
        return 0
    else
        echo -e "${RED}✗${RESET} Default value wrong: $default"
        return 1
    fi
}

# Test 2: Environment variable pattern exists
test_env_pattern() {
    if grep -q 'YOYO_STATUS_REFRESH:-' "$YOYO_STATUS"; then
        echo -e "${GREEN}✓${RESET} Environment variable override pattern exists"
        return 0
    else
        echo -e "${RED}✗${RESET} Environment variable override pattern missing"
        return 1
    fi
}

# Test 3: Verify documentation mentions configuration
test_documentation() {
    if head -20 "$YOYO_STATUS" | grep -q "YOYO_STATUS_REFRESH"; then
        echo -e "${GREEN}✓${RESET} Documentation includes YOYO_STATUS_REFRESH"
        return 0
    else
        echo -e "${RED}✗${RESET} Documentation missing YOYO_STATUS_REFRESH"
        return 1
    fi
}

# Test 4: Verify examples exist
test_examples() {
    if head -20 "$YOYO_STATUS" | grep -q "Examples:"; then
        echo -e "${GREEN}✓${RESET} Usage examples included in documentation"
        return 0
    else
        echo -e "${RED}✗${RESET} Usage examples missing"
        return 1
    fi
}

echo ""
echo "=========================================="
echo "  Configuration Validation Tests"
echo "=========================================="
echo ""

failed=0
test_default || failed=$((failed + 1))
test_env_pattern || failed=$((failed + 1))
test_documentation || failed=$((failed + 1))
test_examples || failed=$((failed + 1))

echo ""
if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✓ All configuration tests passed!${RESET}"
    exit 0
else
    echo -e "${RED}✗ $failed test(s) failed${RESET}"
    exit 1
fi
