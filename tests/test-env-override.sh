#!/bin/bash

# Test environment variable override functionality
# Verifies YOYO_STATUS_REFRESH works correctly

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
RESET='\033[0m'

# Test with custom value
test_custom_interval() {
    # Source the script in a subshell and check the interval
    local result=$(YOYO_STATUS_REFRESH=2 bash -c 'source /home/yoga999/.yoyo-dev/lib/yoyo-status.sh 2>/dev/null; echo "$REFRESH_INTERVAL"' 2>/dev/null || echo "error")

    if [ "$result" = "2" ]; then
        echo -e "${GREEN}✓${RESET} Custom interval (2s) works correctly"
        return 0
    else
        echo -e "${RED}✗${RESET} Custom interval failed (got: $result)"
        return 1
    fi
}

# Test with default value (no override)
test_default_interval() {
    local result=$(bash -c 'source /home/yoga999/.yoyo-dev/lib/yoyo-status.sh 2>/dev/null; echo "$REFRESH_INTERVAL"' 2>/dev/null || echo "error")

    if [ "$result" = "10" ]; then
        echo -e "${GREEN}✓${RESET} Default interval (10s) is correct"
        return 0
    else
        echo -e "${RED}✗${RESET} Default interval wrong (got: $result)"
        return 1
    fi
}

# Test with 30 second override
test_slow_interval() {
    local result=$(YOYO_STATUS_REFRESH=30 bash -c 'source /home/yoga999/.yoyo-dev/lib/yoyo-status.sh 2>/dev/null; echo "$REFRESH_INTERVAL"' 2>/dev/null || echo "error")

    if [ "$result" = "30" ]; then
        echo -e "${GREEN}✓${RESET} Slow interval (30s) works correctly"
        return 0
    else
        echo -e "${RED}✗${RESET} Slow interval failed (got: $result)"
        return 1
    fi
}

echo ""
echo "=========================================="
echo "  Environment Variable Override Tests"
echo "=========================================="
echo ""

test_default_interval
test_custom_interval
test_slow_interval

echo ""
echo -e "${GREEN}✓ All environment override tests passed!${RESET}"
