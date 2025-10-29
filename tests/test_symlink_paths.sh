#!/bin/bash

# Test: Verify symlink paths are correct
# This test verifies that global commands point to the correct base installation

set -e

TESTS_PASSED=0
TESTS_FAILED=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
RESET='\033[0m'

echo ""
echo "Testing Yoyo Dev Symlink Paths"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Check base installation exists
echo -n "Test 1: Base installation exists at ~/yoyo-dev/... "
if [ -d "$HOME/yoyo-dev" ]; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 2: Check yoyo.sh exists
echo -n "Test 2: yoyo.sh exists in base installation... "
if [ -f "$HOME/yoyo-dev/setup/yoyo.sh" ]; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 3: Check yoyo-update.sh exists
echo -n "Test 3: yoyo-update.sh exists in base installation... "
if [ -f "$HOME/yoyo-dev/setup/yoyo-update.sh" ]; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 4: Check /usr/local/bin/yoyo symlink
echo -n "Test 4: /usr/local/bin/yoyo is a symlink... "
if [ -L "/usr/local/bin/yoyo" ]; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 5: Check yoyo symlink points to valid file
echo -n "Test 5: yoyo symlink points to existing file... "
if [ -L "/usr/local/bin/yoyo" ]; then
    TARGET=$(readlink -f /usr/local/bin/yoyo 2>/dev/null)
    if [ -f "$TARGET" ]; then
        echo -e "${GREEN}PASS${RESET} (→ $TARGET)"
        ((TESTS_PASSED++))
    else
        LINK=$(readlink /usr/local/bin/yoyo)
        echo -e "${RED}FAIL${RESET} (→ $LINK, target missing)"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}SKIP${RESET} (not a symlink)"
fi

# Test 6: Check yoyo symlink points to correct base path
echo -n "Test 6: yoyo symlink points to ~/yoyo-dev/setup/yoyo.sh... "
if [ -L "/usr/local/bin/yoyo" ]; then
    TARGET=$(readlink -f /usr/local/bin/yoyo 2>/dev/null)
    EXPECTED="$HOME/yoyo-dev/setup/yoyo.sh"
    if [ "$TARGET" = "$EXPECTED" ]; then
        echo -e "${GREEN}PASS${RESET}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}FAIL${RESET}"
        echo "  Expected: $EXPECTED"
        echo "  Actual:   $TARGET"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}SKIP${RESET} (not a symlink)"
fi

# Test 7: Check /usr/local/bin/yoyo-update symlink
echo -n "Test 7: /usr/local/bin/yoyo-update is a symlink... "
if [ -L "/usr/local/bin/yoyo-update" ]; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 8: Check yoyo-update symlink points to valid file
echo -n "Test 8: yoyo-update symlink points to existing file... "
if [ -L "/usr/local/bin/yoyo-update" ]; then
    TARGET=$(readlink -f /usr/local/bin/yoyo-update 2>/dev/null)
    if [ -f "$TARGET" ]; then
        echo -e "${GREEN}PASS${RESET} (→ $TARGET)"
        ((TESTS_PASSED++))
    else
        LINK=$(readlink /usr/local/bin/yoyo-update)
        echo -e "${RED}FAIL${RESET} (→ $LINK, target missing)"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}SKIP${RESET} (not a symlink)"
fi

# Test 9: Check yoyo-update symlink points to correct base path
echo -n "Test 9: yoyo-update points to ~/yoyo-dev/setup/yoyo-update.sh... "
if [ -L "/usr/local/bin/yoyo-update" ]; then
    TARGET=$(readlink -f /usr/local/bin/yoyo-update 2>/dev/null)
    EXPECTED="$HOME/yoyo-dev/setup/yoyo-update.sh"
    if [ "$TARGET" = "$EXPECTED" ]; then
        echo -e "${GREEN}PASS${RESET}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}FAIL${RESET}"
        echo "  Expected: $EXPECTED"
        echo "  Actual:   $TARGET"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}SKIP${RESET} (not a symlink)"
fi

# Test 10: Check yoyo.sh is executable
echo -n "Test 10: yoyo.sh is executable... "
if [ -x "$HOME/yoyo-dev/setup/yoyo.sh" ]; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary: $TESTS_PASSED passed, $TESTS_FAILED failed"
echo ""

if [ $TESTS_FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi
