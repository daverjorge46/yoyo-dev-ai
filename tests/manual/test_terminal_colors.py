#!/usr/bin/env python3
"""
Manual visual test for terminal color scheme compatibility.

This script displays the split view visual elements with various color
combinations to verify they look good across different terminal themes
(dark/light backgrounds, different color schemes).

Run this script and visually inspect the output in your terminal.
Test in multiple terminal emulators and color schemes.
"""

import sys
import time

# Add parent directory to path
sys.path.insert(0, '/home/yoga999/PROJECTS/yoyo-dev')

from lib.yoyo_tui_v3.split_view.terminal_control import TerminalController, PaneBounds
from lib.yoyo_tui_v3.split_view.shortcuts_help import get_shortcuts_help_text


def print_section(title: str):
    """Print a section header"""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70 + "\n")


def test_border_colors():
    """Test border rendering with active/inactive colors"""
    print_section("Border Color Test")

    tc = TerminalController()

    # Test bright cyan (active border)
    print("ACTIVE PANE BORDER (Bright Cyan):")
    tc.set_color('bright_cyan')
    print("┌────────────────────────────────────────┐")
    print("│  This is the active pane border color │")
    print("└────────────────────────────────────────┘")
    tc.set_color('reset')

    print("\n")

    # Test dim white (inactive border)
    print("INACTIVE PANE BORDER (Dim White):")
    tc.set_color('dim_white')
    print("┌────────────────────────────────────────┐")
    print("│ This is the inactive pane border color│")
    print("└────────────────────────────────────────┘")
    tc.set_color('reset')


def test_box_drawing_characters():
    """Test Unicode box-drawing characters"""
    print_section("Box Drawing Characters Test")

    tc = TerminalController()

    print("Single-line box (standard borders):")
    print("┌───────────────────┐")
    print("│  Standard border  │")
    print("└───────────────────┘")

    print("\nDouble-line box (Claude fallback message):")
    print("╔════════════════════╗")
    print("║  Double border     ║")
    print("╚════════════════════╝")

    print("\nBox characters work correctly: ✓")


def test_color_scheme_combinations():
    """Test color combinations for visibility"""
    print_section("Color Scheme Compatibility Test")

    tc = TerminalController()

    print("Testing colors against terminal background:\n")

    # Test bright cyan
    tc.set_color('bright_cyan')
    print("■ Bright Cyan - Should be highly visible on dark backgrounds")
    tc.set_color('reset')

    # Test dim white
    tc.set_color('dim_white')
    print("■ Dim White - Should be subtle but visible")
    tc.set_color('reset')

    print("\n")
    print("Visual Check:")
    print("  ✓ Can you clearly distinguish between the two colors above?")
    print("  ✓ Is bright cyan noticeably brighter/more prominent?")
    print("  ✓ Is dim white visible but less eye-catching?")


def test_full_split_view_mockup():
    """Test full split view visual mockup"""
    print_section("Full Split View Mockup")

    tc = TerminalController()

    print("Active Pane (Left - Claude Code):")
    tc.set_color('bright_cyan')
    print("┌─────────────────────────┐")
    print("│ [ACTIVE - BRIGHT CYAN] │")
    print("│                         │")
    print("│ Claude Code CLI         │")
    print("│                         │")
    print("│ > /create-new           │")
    print("│                         │")
    print("└─────────────────────────┘")
    tc.set_color('reset')

    print("\nInactive Pane (Right - TUI Dashboard):")
    tc.set_color('dim_white')
    print("┌─────────────────────────┐")
    print("│ [INACTIVE - DIM WHITE]  │")
    print("│                         │")
    print("│ Yoyo TUI Dashboard      │")
    print("│                         │")
    print("│ Active Work: (0%)       │")
    print("│                         │")
    print("└─────────────────────────┘")
    tc.set_color('reset')


def test_claude_fallback_message():
    """Test Claude not found message appearance"""
    print_section("Claude Not Found Message")

    print("╔═══════════════════════════════════════════════════════════╗")
    print("║ ⚠️  Claude Code Not Found                                 ║")
    print("╠═══════════════════════════════════════════════════════════╣")
    print("║                                                           ║")
    print("║ Claude Code CLI is not installed or not in PATH.         ║")
    print("║                                                           ║")
    print("║ To install Claude Code:                                  ║")
    print("║ https://github.com/anthropics/claude-code                ║")
    print("║                                                           ║")
    print("║ After installation, run 'yoyo' again for split view     ║")
    print("║                                                           ║")
    print("║ To suppress this message: yoyo --no-split               ║")
    print("║                                                           ║")
    print("║ [Launching TUI in 3 seconds...]                          ║")
    print("╚═══════════════════════════════════════════════════════════╝")


def test_keyboard_shortcuts_display():
    """Test keyboard shortcuts help display"""
    print_section("Keyboard Shortcuts Help")

    print(get_shortcuts_help_text())


def test_color_contrast():
    """Test color contrast and readability"""
    print_section("Contrast and Readability Test")

    tc = TerminalController()

    print("Testing contrast levels:\n")

    # Test normal text
    print("Normal text (default terminal color)")

    # Test bright cyan
    tc.set_color('bright_cyan')
    print("Bright cyan text - Active pane indicator")
    tc.set_color('reset')

    # Test dim white
    tc.set_color('dim_white')
    print("Dim white text - Inactive pane indicator")
    tc.set_color('reset')

    print("\n")
    print("Visual Check:")
    print("  ✓ Is normal text clearly readable?")
    print("  ✓ Does bright cyan stand out without being harsh?")
    print("  ✓ Is dim white readable but subdued?")


def run_all_tests():
    """Run all visual tests"""
    print("\n" + "=" * 70)
    print("  SPLIT VIEW VISUAL POLISH - TERMINAL COLOR SCHEME TEST")
    print("=" * 70)
    print("\nThis script tests visual appearance across different terminal themes.")
    print("Please verify that all elements are clearly visible and well-contrasted.")
    print("\nRecommended testing environments:")
    print("  • GNOME Terminal (dark theme)")
    print("  • GNOME Terminal (light theme)")
    print("  • Konsole")
    print("  • Alacritty")
    print("  • Kitty")
    print("\n")

    time.sleep(2)

    test_border_colors()
    time.sleep(1)

    test_box_drawing_characters()
    time.sleep(1)

    test_color_scheme_combinations()
    time.sleep(1)

    test_full_split_view_mockup()
    time.sleep(1)

    test_claude_fallback_message()
    time.sleep(1)

    test_keyboard_shortcuts_display()
    time.sleep(1)

    test_color_contrast()

    print("\n" + "=" * 70)
    print("  TEST COMPLETE")
    print("=" * 70)
    print("\nVisual Verification Checklist:")
    print("  [ ] All box-drawing characters display correctly")
    print("  [ ] Bright cyan is clearly visible and prominent")
    print("  [ ] Dim white is visible but subdued")
    print("  [ ] Colors work well on your terminal background")
    print("  [ ] Text is readable in all cases")
    print("  [ ] No character encoding issues (boxes, arrows, emoji)")
    print("\nIf all checks pass, visual polish is terminal-compatible! ✓")
    print()


if __name__ == "__main__":
    run_all_tests()
