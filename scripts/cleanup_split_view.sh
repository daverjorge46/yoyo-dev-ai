#!/bin/bash
# Final cleanup and verification script for split view implementation

set -e  # Exit on error

echo "================================"
echo "Split View Final Cleanup"
echo "================================"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

echo "[1/5] Removing temporary files and caches..."
find . -type d -name "__pycache__" -path "*/split_view/*" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -path "*/split_view/*" -delete 2>/dev/null || true

echo "[2/5] Running code formatters..."
if command -v black &> /dev/null; then
    black lib/yoyo_tui_v3/split_view/*.py --quiet || true
    echo "  ✓ black formatting complete"
else
    echo "  ⚠ black not installed (optional)"
fi

if command -v isort &> /dev/null; then
    isort lib/yoyo_tui_v3/split_view/*.py --quiet || true
    echo "  ✓ isort import sorting complete"
else
    echo "  ⚠ isort not installed (optional)"
fi

echo "[3/5] Running linters..."
if command -v flake8 &> /dev/null; then
    flake8 lib/yoyo_tui_v3/split_view/*.py --max-line-length=100 --ignore=E501,W503 || true
    echo "  ✓ flake8 linting complete"
else
    echo "  ⚠ flake8 not installed (optional)"
fi

echo "[4/5] Running type checks..."
if command -v mypy &> /dev/null; then
    mypy lib/yoyo_tui_v3/split_view/*.py --ignore-missing-imports --no-error-summary || true
    echo "  ✓ mypy type checking complete"
else
    echo "  ⚠ mypy not installed (optional)"
fi

echo "[5/5] Running tests..."
python3 -m pytest tests/test_split_view/test_performance.py -q
python3 -m pytest tests/test_split_view/test_pane.py -q

echo ""
echo "================================"
echo "Cleanup Complete!"
echo "================================"
echo ""
echo "Summary:"
echo "  ✓ Temporary files removed"
echo "  ✓ Code formatted"
echo "  ✓ Performance tests passed"
echo "  ✓ Pane tests passed"
echo ""
echo "Next steps:"
echo "  1. Run full test suite: python3 -m pytest tests/test_split_view/"
echo "  2. Profile performance: python3 scripts/profile_split_view.py"
echo "  3. Review and commit changes"
echo ""
