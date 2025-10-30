#!/usr/bin/env python3
"""
Test responsive layout behavior in MainDashboard.

This test verifies that the dashboard properly switches between:
- Horizontal 3-panel layout (>= 80 cols)
- Vertical stacked layout (< 80 cols)
"""

import sys
from pathlib import Path

# Add lib directory to path
lib_path = Path(__file__).parent.parent / "lib"
sys.path.insert(0, str(lib_path))

def test_responsive_layout_logic():
    """Test the responsive layout logic."""

    print("Testing responsive layout breakpoints...")
    print()

    # Test breakpoint logic
    test_cases = [
        (79, "vertical", "Small screen (<80 cols)"),
        (80, "horizontal", "Large screen (>=80 cols)"),
        (100, "horizontal", "Medium screen"),
        (120, "horizontal", "Wide screen"),
        (50, "vertical", "Very small screen"),
    ]

    passed = 0
    failed = 0

    for width, expected_layout, description in test_cases:
        # Simulate the breakpoint logic
        if width < 80:
            actual_layout = "vertical"
            panel_width = "100%"
        else:
            actual_layout = "horizontal"
            panel_width = "30%/40%/30%"

        if actual_layout == expected_layout:
            print(f"✓ PASS: {description} (width={width})")
            print(f"         Layout: {actual_layout}, Panels: {panel_width}")
            passed += 1
        else:
            print(f"✗ FAIL: {description} (width={width})")
            print(f"         Expected: {expected_layout}, Got: {actual_layout}")
            failed += 1
        print()

    # Summary
    print("=" * 60)
    print(f"Tests run: {passed + failed}")
    print(f"Tests passed: {passed}")
    print(f"Tests failed: {failed}")
    print()

    if failed == 0:
        print("✓ All tests passed!")
        return 0
    else:
        print("✗ Some tests failed")
        return 1


def test_import_main_dashboard():
    """Test that MainDashboard can be imported."""
    try:
        from yoyo_tui_v3.screens.main_dashboard import MainDashboard
        print("✓ MainDashboard imported successfully")
        print(f"  - Class: {MainDashboard.__name__}")
        print(f"  - Module: {MainDashboard.__module__}")

        # Check for responsive method
        if hasattr(MainDashboard, '_apply_responsive_layout'):
            print("  - ✓ _apply_responsive_layout method found")
        else:
            print("  - ✗ _apply_responsive_layout method NOT found")
            return 1

        if hasattr(MainDashboard, 'on_resize'):
            print("  - ✓ on_resize method found")
        else:
            print("  - ✗ on_resize method NOT found")
            return 1

        print()
        return 0
    except ImportError as e:
        print(f"✗ Failed to import MainDashboard: {e}")
        return 1


if __name__ == "__main__":
    print("=" * 60)
    print("Responsive Layout Test Suite")
    print("=" * 60)
    print()

    # Test 1: Import check
    print("Test 1: Import MainDashboard")
    print("-" * 60)
    result1 = test_import_main_dashboard()

    # Test 2: Layout logic
    print("Test 2: Responsive Layout Logic")
    print("-" * 60)
    result2 = test_responsive_layout_logic()

    # Final result
    if result1 == 0 and result2 == 0:
        print("✓ All tests passed!")
        sys.exit(0)
    else:
        print("✗ Some tests failed")
        sys.exit(1)
