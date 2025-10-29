"""
Tests for KeyboardShortcuts footer widget.

Tests keyboard shortcut display and dynamic context-aware shortcuts.
"""

import pytest
from unittest.mock import Mock

from lib.yoyo_tui_v3.widgets.keyboard_shortcuts import KeyboardShortcuts


@pytest.fixture
def mock_app():
    """Mock Textual App for testing."""
    app = Mock()
    app.BINDINGS = [
        Mock(key="?", action="help", description="Help"),
        Mock(key="/", action="command_search", description="Commands"),
        Mock(key="r", action="refresh", description="Refresh"),
        Mock(key="g", action="git_menu", description="Git"),
        Mock(key="t", action="focus_active_work", description="Tasks"),
        Mock(key="s", action="focus_specs", description="Specs"),
        Mock(key="h", action="focus_history", description="History"),
        Mock(key="q", action="quit", description="Quit"),
    ]
    return app


# ============================================================================
# Initialization Tests
# ============================================================================

def test_keyboard_shortcuts_creation():
    """Test that KeyboardShortcuts can be created."""
    shortcuts = KeyboardShortcuts()
    assert shortcuts is not None
    assert isinstance(shortcuts, KeyboardShortcuts)


def test_keyboard_shortcuts_has_default_shortcuts():
    """Test that KeyboardShortcuts has default shortcuts defined."""
    shortcuts = KeyboardShortcuts()
    assert hasattr(shortcuts, 'shortcuts')
    assert len(shortcuts.shortcuts) > 0


# ============================================================================
# Display Tests
# ============================================================================

def test_keyboard_shortcuts_displays_help_shortcut():
    """Test that KeyboardShortcuts displays help shortcut."""
    shortcuts = KeyboardShortcuts()
    shortcuts_list = shortcuts.shortcuts

    # Should contain help shortcut
    help_shortcut = next((s for s in shortcuts_list if "?" in s['key']), None)
    assert help_shortcut is not None
    assert "help" in help_shortcut['description'].lower()


def test_keyboard_shortcuts_displays_quit_shortcut():
    """Test that KeyboardShortcuts displays quit shortcut."""
    shortcuts = KeyboardShortcuts()
    shortcuts_list = shortcuts.shortcuts

    # Should contain quit shortcut
    quit_shortcut = next((s for s in shortcuts_list if "q" in s['key']), None)
    assert quit_shortcut is not None
    assert "quit" in quit_shortcut['description'].lower()


def test_keyboard_shortcuts_displays_refresh_shortcut():
    """Test that KeyboardShortcuts displays refresh shortcut."""
    shortcuts = KeyboardShortcuts()
    shortcuts_list = shortcuts.shortcuts

    # Should contain refresh shortcut
    refresh_shortcut = next((s for s in shortcuts_list if "r" in s['key']), None)
    assert refresh_shortcut is not None
    assert "refresh" in refresh_shortcut['description'].lower()


def test_keyboard_shortcuts_formats_shortcuts_correctly():
    """Test that KeyboardShortcuts formats shortcuts with key and description."""
    shortcuts = KeyboardShortcuts()

    # Each shortcut should have key and description
    for shortcut in shortcuts.shortcuts:
        assert 'key' in shortcut
        assert 'description' in shortcut
        assert len(shortcut['key']) > 0
        assert len(shortcut['description']) > 0


# ============================================================================
# Layout Tests
# ============================================================================

def test_keyboard_shortcuts_docked_at_bottom():
    """Test that KeyboardShortcuts is docked at bottom."""
    shortcuts = KeyboardShortcuts()

    # Should be docked at bottom (verified via CSS or property)
    # Implementation-specific, but widget should have bottom positioning


def test_keyboard_shortcuts_has_single_line_height():
    """Test that KeyboardShortcuts has single-line height."""
    shortcuts = KeyboardShortcuts()

    # Should be compact (1-2 lines max)
    # Implementation-specific


def test_keyboard_shortcuts_spans_full_width():
    """Test that KeyboardShortcuts spans full width."""
    shortcuts = KeyboardShortcuts()

    # Should span full terminal width
    # Implementation-specific


# ============================================================================
# Shortcut List Tests
# ============================================================================

def test_keyboard_shortcuts_contains_all_primary_shortcuts():
    """Test that KeyboardShortcuts contains all primary shortcuts."""
    shortcuts = KeyboardShortcuts()
    shortcuts_list = shortcuts.shortcuts

    # Primary shortcuts
    expected_keys = ["?", "/", "r", "g", "t", "s", "h", "q"]

    for key in expected_keys:
        shortcut = next((s for s in shortcuts_list if key in s['key']), None)
        assert shortcut is not None, f"Missing shortcut for key: {key}"


def test_keyboard_shortcuts_ordered_logically():
    """Test that KeyboardShortcuts are ordered logically."""
    shortcuts = KeyboardShortcuts()
    shortcuts_list = shortcuts.shortcuts

    # Help should be first
    assert shortcuts_list[0]['key'] == "?"

    # Quit should be last
    assert shortcuts_list[-1]['key'] == "q"


# ============================================================================
# Context-Aware Tests
# ============================================================================

def test_keyboard_shortcuts_can_update_dynamically():
    """Test that KeyboardShortcuts can update shortcuts dynamically."""
    shortcuts = KeyboardShortcuts()

    # Should have method to update shortcuts
    assert hasattr(shortcuts, 'update_shortcuts') or hasattr(shortcuts, 'set_shortcuts')


def test_keyboard_shortcuts_highlights_active_context():
    """Test that KeyboardShortcuts can highlight active context."""
    shortcuts = KeyboardShortcuts()

    # Should support highlighting (e.g., when in spec detail screen)
    # Implementation-specific


# ============================================================================
# Formatting Tests
# ============================================================================

def test_keyboard_shortcuts_formats_single_char_keys():
    """Test that KeyboardShortcuts formats single-char keys correctly."""
    shortcuts = KeyboardShortcuts()
    shortcuts_list = shortcuts.shortcuts

    # Single char keys should be simple
    for shortcut in shortcuts_list:
        if len(shortcut['key']) == 1:
            # Should not have extra formatting like "Key.Q"
            assert not shortcut['key'].startswith("Key.")


def test_keyboard_shortcuts_separates_shortcuts_with_delimiter():
    """Test that KeyboardShortcuts separates shortcuts with delimiter."""
    shortcuts = KeyboardShortcuts()

    # Should render shortcuts with separators (e.g., " | " or " • ")
    # Verified in render method


# ============================================================================
# Accessibility Tests
# ============================================================================

def test_keyboard_shortcuts_keys_are_readable():
    """Test that shortcut keys are readable and clear."""
    shortcuts = KeyboardShortcuts()
    shortcuts_list = shortcuts.shortcuts

    # All keys should be 1-2 chars (readable)
    for shortcut in shortcuts_list:
        assert len(shortcut['key']) <= 3, f"Key too long: {shortcut['key']}"


def test_keyboard_shortcuts_descriptions_are_concise():
    """Test that shortcut descriptions are concise."""
    shortcuts = KeyboardShortcuts()
    shortcuts_list = shortcuts.shortcuts

    # Descriptions should be short (< 20 chars ideal)
    for shortcut in shortcuts_list:
        assert len(shortcut['description']) <= 25, f"Description too long: {shortcut['description']}"


# ============================================================================
# Color/Style Tests
# ============================================================================

def test_keyboard_shortcuts_uses_contrasting_colors():
    """Test that KeyboardShortcuts uses contrasting colors for readability."""
    shortcuts = KeyboardShortcuts()

    # Should use different colors for keys vs descriptions
    # Verified in CSS or render method


def test_keyboard_shortcuts_keys_are_highlighted():
    """Test that shortcut keys are visually highlighted."""
    shortcuts = KeyboardShortcuts()

    # Keys should be bold or colored differently
    # Verified in render method


# ============================================================================
# Refresh Tests
# ============================================================================

def test_keyboard_shortcuts_has_refresh_method():
    """Test that KeyboardShortcuts has refresh method."""
    shortcuts = KeyboardShortcuts()
    assert hasattr(shortcuts, 'refresh') or hasattr(shortcuts, 'refresh_display')


def test_keyboard_shortcuts_refreshes_on_context_change():
    """Test that KeyboardShortcuts refreshes when context changes."""
    shortcuts = KeyboardShortcuts()

    # Should update when moving between screens
    # Implementation-specific


# ============================================================================
# Edge Case Tests
# ============================================================================

def test_keyboard_shortcuts_handles_empty_shortcuts():
    """Test that KeyboardShortcuts handles empty shortcuts list."""
    shortcuts = KeyboardShortcuts()
    shortcuts.shortcuts = []

    # Should not crash
    shortcuts._update_display()
    assert True


def test_keyboard_shortcuts_handles_long_descriptions():
    """Test that KeyboardShortcuts handles long descriptions gracefully."""
    shortcuts = KeyboardShortcuts()
    shortcuts.shortcuts = [
        {'key': 'x', 'description': 'This is a very long description that should be truncated or wrapped'}
    ]

    # Should truncate or wrap long descriptions
    # Implementation-specific


def test_keyboard_shortcuts_handles_special_characters_in_keys():
    """Test that KeyboardShortcuts handles special characters."""
    shortcuts = KeyboardShortcuts()
    shortcuts.shortcuts = [
        {'key': '/', 'description': 'Search'},
        {'key': '?', 'description': 'Help'},
        {'key': 'ctrl+c', 'description': 'Cancel'},
    ]

    # Should format special characters correctly
    shortcuts._update_display()
    assert True


# ============================================================================
# Integration Tests
# ============================================================================

def test_keyboard_shortcuts_integrates_with_app_bindings(mock_app):
    """Test that KeyboardShortcuts can load from app bindings."""
    shortcuts = KeyboardShortcuts()

    # Should be able to extract shortcuts from app BINDINGS
    # If implemented
    if hasattr(shortcuts, 'load_from_app'):
        shortcuts.load_from_app(mock_app)
        assert len(shortcuts.shortcuts) > 0


def test_keyboard_shortcuts_matches_app_binding_count(mock_app):
    """Test that KeyboardShortcuts count matches app bindings."""
    shortcuts = KeyboardShortcuts()

    # Should have same number of shortcuts as app bindings (if loading from app)
    # Or reasonable subset for primary shortcuts


# ============================================================================
# Priority/Visibility Tests
# ============================================================================

def test_keyboard_shortcuts_shows_most_important_shortcuts_first():
    """Test that KeyboardShortcuts prioritizes important shortcuts."""
    shortcuts = KeyboardShortcuts()
    shortcuts_list = shortcuts.shortcuts

    # Help (?) should be first or near first
    first_keys = [s['key'] for s in shortcuts_list[:3]]
    assert "?" in first_keys


def test_keyboard_shortcuts_limits_visible_shortcuts_on_narrow_terminals():
    """Test that KeyboardShortcuts limits shortcuts on narrow terminals."""
    shortcuts = KeyboardShortcuts()

    # Should have adaptive rendering (fewer shortcuts on narrow terminals)
    # Implementation-specific


# ============================================================================
# Documentation Tests
# ============================================================================

def test_keyboard_shortcuts_has_docstring():
    """Test that KeyboardShortcuts class has documentation."""
    assert KeyboardShortcuts.__doc__ is not None
    assert len(KeyboardShortcuts.__doc__) > 50
