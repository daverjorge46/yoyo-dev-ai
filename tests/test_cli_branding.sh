#!/bin/bash

# Test: CLI Branding Enhancement
# Validates all branding elements work correctly across environments
# Related spec: .yoyo-dev/specs/2026-01-03-cli-branding-enhancement/

# Note: Don't use set -e as we want all tests to run even if some fail

TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Source ui-library for testing
source "$PROJECT_ROOT/setup/ui-library.sh"

echo ""
echo "Testing CLI Branding Enhancement"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# Test Group 1: Color System
# ============================================================================

echo -e "${CYAN}▸ Color System Tests${RESET}"

# Test 1.1: UI_YOYO_YELLOW is defined
echo -n "  1.1 UI_YOYO_YELLOW variable exists... "
if [ -n "$UI_YOYO_YELLOW" ]; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 1.2: UI_YOYO_YELLOW_BG is defined
echo -n "  1.2 UI_YOYO_YELLOW_BG variable exists... "
if [ -n "$UI_YOYO_YELLOW_BG" ]; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 1.3: UI_BG_PANEL is defined
echo -n "  1.3 UI_BG_PANEL variable exists... "
if [ -n "$UI_BG_PANEL" ]; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 1.4: supports_truecolor function exists
echo -n "  1.4 supports_truecolor function exists... "
if type supports_truecolor &>/dev/null; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================================================
# Test Group 2: ASCII Banner
# ============================================================================

echo -e "${CYAN}▸ ASCII Banner Tests${RESET}"

# Test 2.1: ui_yoyo_banner function exists
echo -n "  2.1 ui_yoyo_banner function exists... "
if type ui_yoyo_banner &>/dev/null; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 2.2: Banner renders at 80 columns
echo -n "  2.2 Banner renders at 80 columns... "
BANNER_80=$(COLUMNS=80 ui_yoyo_banner 2>/dev/null)
if [ -n "$BANNER_80" ] && [ "${#BANNER_80}" -gt 100 ]; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 2.3: Banner renders at 120 columns
echo -n "  2.3 Banner renders at 120 columns... "
BANNER_120=$(COLUMNS=120 ui_yoyo_banner 2>/dev/null)
if [ -n "$BANNER_120" ] && [ "${#BANNER_120}" -gt 100 ]; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 2.4: Banner contains version number
echo -n "  2.4 Banner contains version number... "
if echo "$BANNER_80" | grep -qE "v[0-9]+\.[0-9]+\.[0-9]+"; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 2.5: Banner contains tagline
echo -n "  2.5 Banner contains tagline... "
if echo "$BANNER_80" | grep -q "learns.*remembers.*evolves"; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 2.6: Banner renders at narrow width (compact mode)
echo -n "  2.6 Banner handles narrow terminal (60 cols)... "
BANNER_60=$(COLUMNS=60 ui_yoyo_banner 2>/dev/null)
if [ -n "$BANNER_60" ]; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================================================
# Test Group 3: Project Dashboard
# ============================================================================

echo -e "${CYAN}▸ Project Dashboard Tests${RESET}"

# Test 3.1: ui_project_dashboard function exists
echo -n "  3.1 ui_project_dashboard function exists... "
if type ui_project_dashboard &>/dev/null; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 3.2: Dashboard renders without errors
echo -n "  3.2 Dashboard renders without errors... "
DASHBOARD_OUTPUT=$(ui_project_dashboard 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 3.3: Dashboard contains expected sections
echo -n "  3.3 Dashboard contains PROJECT DASHBOARD header... "
if echo "$DASHBOARD_OUTPUT" | grep -qiE "PROJECT.*DASHBOARD|dashboard"; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 3.4: Dashboard shows git branch (if in git repo)
echo -n "  3.4 Dashboard shows git branch info... "
if git rev-parse --git-dir &>/dev/null; then
    if echo "$DASHBOARD_OUTPUT" | grep -qiE "branch|🌿"; then
        echo -e "${GREEN}PASS${RESET}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}FAIL${RESET}"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}SKIP${RESET} (not a git repo)"
    ((TESTS_SKIPPED++))
fi

echo ""

# ============================================================================
# Test Group 4: Agent Panel
# ============================================================================

echo -e "${CYAN}▸ Agent Panel Tests${RESET}"

# Test 4.1: ui_agent_panel function exists
echo -n "  4.1 ui_agent_panel function exists... "
if type ui_agent_panel &>/dev/null; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test agents
AGENTS=("yoyo-ai" "arthas-oracle" "alma-librarian" "alvaro-explore" "dave-engineer" "angeles-writer")
TEST_NUM=2

for agent in "${AGENTS[@]}"; do
    echo -n "  4.$TEST_NUM Agent panel for $agent... "
    PANEL_OUTPUT=$(ui_agent_panel "$agent" "Test task description" 2>&1)
    if [ -n "$PANEL_OUTPUT" ] && echo "$PANEL_OUTPUT" | grep -qi "$agent"; then
        echo -e "${GREEN}PASS${RESET}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}FAIL${RESET}"
        ((TESTS_FAILED++))
    fi
    ((TEST_NUM++))
done

# Test 4.8: Agent panel shows task description
echo -n "  4.8 Agent panel shows task description... "
PANEL_WITH_TASK=$(ui_agent_panel "alvaro-explore" "Find theme files" 2>&1)
if echo "$PANEL_WITH_TASK" | grep -q "Find theme files"; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================================================
# Test Group 5: Help Panel
# ============================================================================

echo -e "${CYAN}▸ Help Panel Tests${RESET}"

# Test 5.1: ui_help_panel function exists
echo -n "  5.1 ui_help_panel function exists... "
if type ui_help_panel &>/dev/null; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 5.2: Help panel renders without errors
echo -n "  5.2 Help panel renders without errors... "
HELP_OUTPUT=$(ui_help_panel 2>&1)
if [ $? -eq 0 ] && [ -n "$HELP_OUTPUT" ]; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 5.3: Help panel contains command categories
echo -n "  5.3 Help panel has command categories... "
if echo "$HELP_OUTPUT" | grep -qiE "EXECUTION|PLANNING|FEATURE|CREATION"; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================================================
# Test Group 6: Color Fallback (TERM=dumb)
# ============================================================================

echo -e "${CYAN}▸ Color Fallback Tests${RESET}"

# Test 6.1: Banner works with TERM=dumb
echo -n "  6.1 Banner works with TERM=dumb... "
DUMB_BANNER=$(TERM=dumb ui_yoyo_banner 2>/dev/null)
if [ -n "$DUMB_BANNER" ]; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 6.2: Dashboard works with TERM=dumb
echo -n "  6.2 Dashboard works with TERM=dumb... "
DUMB_DASHBOARD=$(TERM=dumb ui_project_dashboard 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================================================
# Test Group 7: Performance
# ============================================================================

echo -e "${CYAN}▸ Performance Tests${RESET}"

# Test 7.1: Banner renders in < 100ms
echo -n "  7.1 Banner renders in < 100ms... "
START=$(date +%s%N)
ui_yoyo_banner > /dev/null 2>&1
END=$(date +%s%N)
DURATION_MS=$(( (END - START) / 1000000 ))
if [ "$DURATION_MS" -lt 100 ]; then
    echo -e "${GREEN}PASS${RESET} (${DURATION_MS}ms)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET} (${DURATION_MS}ms)"
    ((TESTS_FAILED++))
fi

# Test 7.2: Dashboard renders in < 3000ms (allows for large projects with many specs)
echo -n "  7.2 Dashboard renders in < 3000ms... "
START=$(date +%s%N)
ui_project_dashboard > /dev/null 2>&1
END=$(date +%s%N)
DURATION_MS=$(( (END - START) / 1000000 ))
if [ "$DURATION_MS" -lt 3000 ]; then
    echo -e "${GREEN}PASS${RESET} (${DURATION_MS}ms)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET} (${DURATION_MS}ms)"
    ((TESTS_FAILED++))
fi

# Test 7.3: Agent panel renders in < 50ms
echo -n "  7.3 Agent panel renders in < 50ms... "
START=$(date +%s%N)
ui_agent_panel "alvaro-explore" "test" > /dev/null 2>&1
END=$(date +%s%N)
DURATION_MS=$(( (END - START) / 1000000 ))
if [ "$DURATION_MS" -lt 50 ]; then
    echo -e "${GREEN}PASS${RESET} (${DURATION_MS}ms)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET} (${DURATION_MS}ms)"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================================================
# Test Group 8: Orchestration Hook (TypeScript)
# ============================================================================

echo -e "${CYAN}▸ Orchestration Hook Tests${RESET}"

# Test 8.1: orchestrate.cjs exists
echo -n "  8.1 orchestrate.cjs exists... "
if [ -f "$PROJECT_ROOT/.claude/hooks/orchestrate.cjs" ]; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 8.2: orchestrate.cjs contains formatAgentPanel
echo -n "  8.2 Hook contains formatAgentPanel... "
if grep -q "formatAgentPanel" "$PROJECT_ROOT/.claude/hooks/orchestrate.cjs" 2>/dev/null; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

# Test 8.3: Hook outputs agent panel on delegation (simulation)
echo -n "  8.3 Hook outputs panel for delegation... "
# Simulate hook input for codebase intent (triggers alvaro-explore)
HOOK_INPUT='{"prompt":"where is the theme config","cwd":"'"$PROJECT_ROOT"'","session_id":"test","hook_event_name":"UserPromptSubmit"}'
HOOK_OUTPUT=$(echo "$HOOK_INPUT" | node "$PROJECT_ROOT/.claude/hooks/orchestrate.cjs" 2>/dev/null)
if echo "$HOOK_OUTPUT" | grep -qi "alvaro-explore\|ALVARO-EXPLORE"; then
    echo -e "${GREEN}PASS${RESET}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${RESET}"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================================================
# Summary
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
TOTAL=$((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))
echo -e "Results: ${GREEN}${TESTS_PASSED} passed${RESET}, ${RED}${TESTS_FAILED} failed${RESET}, ${YELLOW}${TESTS_SKIPPED} skipped${RESET} / $TOTAL total"
echo ""

if [ "$TESTS_FAILED" -gt 0 ]; then
    echo -e "${RED}Some tests failed!${RESET}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${RESET}"
    exit 0
fi
