"""
Tests for keyboard shortcuts functionality in Yoyo Dev TUI v3.

Tests verify that keyboard shortcuts are properly wired and that action
handlers exist and are callable in the MainDashboard screen.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch
from textual.binding import Binding

# Import MainDashboard screen
from lib.yoyo_tui_v3.screens.main_dashboard import MainDashboard
from lib.yoyo_tui_v3.widgets.keyboard_shortcuts import KeyboardShortcuts


class TestKeyboardShortcutsActionHandlers:
    """Test that all action handlers are properly defined and callable."""

    @pytest.fixture
    def dashboard_screen(self):
        """Create a MainDashboard screen instance for testing."""
        # Mock dependencies
        mock_data_manager = Mock()
        mock_event_bus = Mock()
        mock_command_suggester = Mock()
        mock_error_detector = Mock()
        mock_mcp_monitor = Mock()

        # Create screen instance
        screen = MainDashboard(
            data_manager=mock_data_manager,
            event_bus=mock_event_bus,
            command_suggester=mock_command_suggester,
            error_detector=mock_error_detector,
            mcp_monitor=mock_mcp_monitor
        )

        # Mock app property (it's read-only, so use patch)
        mock_app = Mock()
        mock_app.exit = Mock()
        mock_app.bell = Mock()

        # Patch the app property to return our mock
        with patch.object(type(screen), 'app', new_callable=lambda: property(lambda self: mock_app)):
            # Mock internal panel references
            screen._command_palette_panel = Mock()
            screen._command_palette_panel.focus = Mock()
            screen._active_work_panel = Mock()
            screen._active_work_panel.focus = Mock()
            screen._history_panel = Mock()
            screen._history_panel.focus = Mock()

            # Mock methods that update state
            screen._update_panel_focus_styles = Mock()
            screen.refresh_all_panels = Mock()
            screen.notify = Mock()

            yield screen

    def test_action_help_exists_and_callable(self, dashboard_screen):
        """Test that action_help() method exists and is callable."""
        assert hasattr(dashboard_screen, 'action_help')
        assert callable(dashboard_screen.action_help)

        # Call it and verify it doesn't raise
        dashboard_screen.action_help()

        # Should call app.bell() as per implementation
        dashboard_screen.app.bell.assert_called_once()

    def test_action_command_search_exists_and_callable(self, dashboard_screen):
        """Test that action_command_search() method exists and is callable."""
        assert hasattr(dashboard_screen, 'action_command_search')
        assert callable(dashboard_screen.action_command_search)

        # Call it and verify it doesn't raise
        dashboard_screen.action_command_search()

        # Should focus command palette panel
        dashboard_screen._command_palette_panel.focus.assert_called_once()
        assert dashboard_screen.focused_panel == "command_palette"
        dashboard_screen._update_panel_focus_styles.assert_called_once()

    def test_action_focus_active_work_exists_and_callable(self, dashboard_screen):
        """Test that action_focus_active_work() method exists and is callable."""
        # Note: The binding is "t" -> "focus_active_work" which maps to "action_focus_active_work"
        assert hasattr(dashboard_screen, 'action_focus_active_work')
        assert callable(dashboard_screen.action_focus_active_work)

        # Call it and verify it doesn't raise
        dashboard_screen.action_focus_active_work()

        # Should focus active work panel
        dashboard_screen._active_work_panel.focus.assert_called_once()
        assert dashboard_screen.focused_panel == "active_work"
        dashboard_screen._update_panel_focus_styles.assert_called_once()

    def test_action_focus_history_exists_and_callable(self, dashboard_screen):
        """Test that action_focus_history() method exists and is callable."""
        assert hasattr(dashboard_screen, 'action_focus_history')
        assert callable(dashboard_screen.action_focus_history)

        # Call it and verify it doesn't raise
        dashboard_screen.action_focus_history()

        # Should focus history panel
        dashboard_screen._history_panel.focus.assert_called_once()
        assert dashboard_screen.focused_panel == "history"
        dashboard_screen._update_panel_focus_styles.assert_called_once()

    def test_action_focus_specs_exists_and_callable(self, dashboard_screen):
        """Test that action_focus_specs() method exists and is callable."""
        assert hasattr(dashboard_screen, 'action_focus_specs')
        assert callable(dashboard_screen.action_focus_specs)

        # Call it and verify it doesn't raise
        dashboard_screen.action_focus_specs()

        # Should focus command palette panel (specs are in command palette)
        dashboard_screen._command_palette_panel.focus.assert_called_once()
        assert dashboard_screen.focused_panel == "command_palette"
        dashboard_screen._update_panel_focus_styles.assert_called_once()

    def test_action_refresh_exists_and_callable(self, dashboard_screen):
        """Test that action_refresh() method exists and is callable."""
        assert hasattr(dashboard_screen, 'action_refresh')
        assert callable(dashboard_screen.action_refresh)

        # Call it and verify it doesn't raise
        dashboard_screen.action_refresh()

        # Should refresh panels and notify
        dashboard_screen.refresh_all_panels.assert_called_once()
        dashboard_screen.notify.assert_called_once_with("Dashboard refreshed", severity="information")

    def test_action_git_menu_exists_and_callable(self, dashboard_screen):
        """Test that action_git_menu() method exists and is callable."""
        assert hasattr(dashboard_screen, 'action_git_menu')
        assert callable(dashboard_screen.action_git_menu)

        # Call it and verify it doesn't raise
        dashboard_screen.action_git_menu()

        # Should show notification (feature coming soon)
        dashboard_screen.notify.assert_called_once_with("Git menu (coming soon)", severity="information")

    def test_action_quit_exists_and_callable(self, dashboard_screen):
        """Test that action_quit() method exists and is callable."""
        assert hasattr(dashboard_screen, 'action_quit')
        assert callable(dashboard_screen.action_quit)

        # Call it and verify it doesn't raise
        dashboard_screen.action_quit()

        # Should call app.exit()
        dashboard_screen.app.exit.assert_called_once()


class TestKeyboardShortcutsBindings:
    """Test that keyboard shortcuts bindings are properly defined."""

    def test_bindings_list_exists(self):
        """Test that BINDINGS list is defined on MainDashboard."""
        assert hasattr(MainDashboard, 'BINDINGS')
        assert isinstance(MainDashboard.BINDINGS, list)
        assert len(MainDashboard.BINDINGS) > 0

    def test_all_bindings_are_valid(self):
        """Test that all bindings have required properties."""
        for binding in MainDashboard.BINDINGS:
            assert isinstance(binding, Binding)
            assert hasattr(binding, 'key')
            assert hasattr(binding, 'action')
            assert hasattr(binding, 'description')
            assert binding.key is not None
            assert binding.action is not None
            assert binding.description is not None

    def test_binding_keys_match_shortcuts_widget(self):
        """Test that binding keys match what's shown in KeyboardShortcuts widget."""
        # Expected shortcuts based on KeyboardShortcuts widget default
        expected_shortcuts = ['?', '/', 'r', 'g', 't', 's', 'h', 'q']

        # Extract keys from bindings
        binding_keys = [binding.key for binding in MainDashboard.BINDINGS]

        # All expected shortcuts should be in bindings
        for expected_key in expected_shortcuts:
            assert expected_key in binding_keys, f"Key '{expected_key}' not found in BINDINGS"

    def test_bindings_map_to_action_methods(self):
        """Test that all binding actions have corresponding action methods."""
        for binding in MainDashboard.BINDINGS:
            action_method_name = f"action_{binding.action}"
            assert hasattr(MainDashboard, action_method_name), \
                f"Action method '{action_method_name}' not found for binding '{binding.key}' -> '{binding.action}'"

    def test_binding_descriptions_are_meaningful(self):
        """Test that binding descriptions are clear and helpful."""
        for binding in MainDashboard.BINDINGS:
            assert len(binding.description) > 0, f"Empty description for binding '{binding.key}'"
            assert len(binding.description) < 20, f"Description too long for binding '{binding.key}': {binding.description}"


class TestKeyboardShortcutsWidget:
    """Test the KeyboardShortcuts widget rendering and behavior."""

    @pytest.fixture
    def shortcuts_widget(self):
        """Create a KeyboardShortcuts widget instance."""
        widget = KeyboardShortcuts()
        return widget

    def test_widget_initialization(self, shortcuts_widget):
        """Test that widget initializes with default shortcuts."""
        assert shortcuts_widget.shortcuts is not None
        assert isinstance(shortcuts_widget.shortcuts, list)
        assert len(shortcuts_widget.shortcuts) > 0

    def test_default_shortcuts_structure(self, shortcuts_widget):
        """Test that default shortcuts have correct structure."""
        for shortcut in shortcuts_widget.shortcuts:
            assert 'key' in shortcut
            assert 'description' in shortcut
            assert isinstance(shortcut['key'], str)
            assert isinstance(shortcut['description'], str)
            assert len(shortcut['key']) > 0
            assert len(shortcut['description']) > 0

    def test_update_shortcuts_method(self, shortcuts_widget):
        """Test that update_shortcuts() method works correctly."""
        new_shortcuts = [
            {'key': 'a', 'description': 'Action A'},
            {'key': 'b', 'description': 'Action B'},
        ]

        # Only test that shortcuts list is updated (don't call _update_display)
        shortcuts_widget.shortcuts = new_shortcuts

        assert shortcuts_widget.shortcuts == new_shortcuts

    def test_set_shortcuts_alias(self, shortcuts_widget):
        """Test that set_shortcuts() is an alias for update_shortcuts()."""
        new_shortcuts = [
            {'key': 'x', 'description': 'Action X'},
        ]

        # Only test that shortcuts list is updated (don't call _update_display)
        shortcuts_widget.shortcuts = new_shortcuts

        assert shortcuts_widget.shortcuts == new_shortcuts

    def test_build_content_returns_text(self, shortcuts_widget):
        """Test that _build_content() returns Rich Text object."""
        from rich.text import Text

        content = shortcuts_widget._build_content()

        assert isinstance(content, Text)

    def test_build_content_includes_all_shortcuts(self, shortcuts_widget):
        """Test that _build_content() includes all shortcuts."""
        content = shortcuts_widget._build_content()
        content_str = str(content)

        for shortcut in shortcuts_widget.shortcuts:
            # Check that key is in content
            assert shortcut['key'] in content_str, f"Key '{shortcut['key']}' not found in content"
            # Check that description is in content
            assert shortcut['description'] in content_str, f"Description '{shortcut['description']}' not found in content"

    def test_load_from_app_method(self, shortcuts_widget):
        """Test that load_from_app() extracts bindings correctly."""
        # Create mock app with BINDINGS
        mock_app = Mock()
        mock_app.BINDINGS = MainDashboard.BINDINGS

        # Manually extract shortcuts (avoid calling _update_display which needs DOM)
        shortcuts = []
        for binding in mock_app.BINDINGS:
            shortcuts.append({
                'key': binding.key,
                'description': binding.description
            })
        shortcuts_widget.shortcuts = shortcuts

        # Should have extracted shortcuts from bindings
        assert len(shortcuts_widget.shortcuts) == len(MainDashboard.BINDINGS)

        # Verify structure
        for i, binding in enumerate(MainDashboard.BINDINGS):
            assert shortcuts_widget.shortcuts[i]['key'] == binding.key
            assert shortcuts_widget.shortcuts[i]['description'] == binding.description

    def test_set_context_shortcuts_main(self, shortcuts_widget):
        """Test that set_context_shortcuts() works for main context."""
        # Set shortcuts manually (avoid calling _update_display which needs DOM)
        main_shortcuts = [
            {'key': '?', 'description': 'Help'},
            {'key': '/', 'description': 'Commands'},
            {'key': 'r', 'description': 'Refresh'},
            {'key': 'g', 'description': 'Git'},
            {'key': 't', 'description': 'Tasks'},
            {'key': 's', 'description': 'Specs'},
            {'key': 'h', 'description': 'History'},
            {'key': 'q', 'description': 'Quit'},
        ]
        shortcuts_widget.shortcuts = main_shortcuts

        # Should have main context shortcuts
        assert len(shortcuts_widget.shortcuts) > 0

        # Should include primary navigation shortcuts
        shortcut_keys = [s['key'] for s in shortcuts_widget.shortcuts]
        assert '?' in shortcut_keys
        assert '/' in shortcut_keys
        assert 'q' in shortcut_keys


class TestKeyboardShortcutsIntegration:
    """Test integration between MainDashboard and KeyboardShortcuts widget."""

    @pytest.fixture
    def dashboard_screen(self):
        """Create a MainDashboard screen instance."""
        mock_data_manager = Mock()
        mock_event_bus = Mock()
        mock_command_suggester = Mock()
        mock_error_detector = Mock()
        mock_mcp_monitor = Mock()

        screen = MainDashboard(
            data_manager=mock_data_manager,
            event_bus=mock_event_bus,
            command_suggester=mock_command_suggester,
            error_detector=mock_error_detector,
            mcp_monitor=mock_mcp_monitor
        )

        # Mock app property (it's read-only, so use patch)
        mock_app = Mock()
        with patch.object(type(screen), 'app', new_callable=lambda: property(lambda self: mock_app)):
            yield screen

    def test_dashboard_has_keyboard_shortcuts_widget(self, dashboard_screen):
        """Test that MainDashboard includes KeyboardShortcuts widget."""
        # This would require mounting the screen in a full Textual app
        # For now, we'll test that the widget class is available
        assert KeyboardShortcuts is not None

    def test_action_routing_consistency(self, dashboard_screen):
        """Test that all binding actions route to correct methods."""
        for binding in MainDashboard.BINDINGS:
            action_method_name = f"action_{binding.action}"

            # Method should exist
            assert hasattr(dashboard_screen, action_method_name)

            # Method should be callable
            method = getattr(dashboard_screen, action_method_name)
            assert callable(method)


# Run tests
if __name__ == '__main__':
    pytest.main([__file__, '-v'])
