#!/usr/bin/env python3
"""
Test suite for Yoyo Dev Textual TUI application.

Tests app initialization, configuration loading, and basic functionality.
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


class TestAppInitialization(unittest.TestCase):
    """Test that the App class initializes correctly."""

    def test_app_can_be_imported(self):
        """Test that the App class can be imported."""
        try:
            from yoyo_tui.app import YoyoDevApp
            self.assertTrue(True, "App should be importable")
        except ImportError as e:
            self.fail(f"App should be importable: {e}")

    def test_app_has_title(self):
        """Test that app has a title."""
        from yoyo_tui.app import YoyoDevApp
        self.assertTrue(hasattr(YoyoDevApp, 'TITLE'))
        self.assertEqual(YoyoDevApp.TITLE, "Yoyo Dev - AI-Assisted Development")

    def test_app_has_bindings(self):
        """Test that app has key bindings defined."""
        from yoyo_tui.app import YoyoDevApp
        self.assertTrue(hasattr(YoyoDevApp, 'BINDINGS'))
        self.assertIsInstance(YoyoDevApp.BINDINGS, list)
        self.assertGreater(len(YoyoDevApp.BINDINGS), 0)

    def test_app_has_required_action_methods(self):
        """Test that app has all required action methods."""
        from yoyo_tui.app import YoyoDevApp

        required_methods = [
            'action_command_palette',
            'action_help',
            'action_refresh',
            'action_git_menu',
            'action_quit'
        ]

        for method_name in required_methods:
            self.assertTrue(
                hasattr(YoyoDevApp, method_name),
                f"App should have {method_name} method"
            )

    @patch('yoyo_tui.app.ConfigManager')
    def test_app_loads_configuration_on_init(self, mock_config_manager):
        """Test that app loads configuration during initialization."""
        from yoyo_tui.app import YoyoDevApp
        from yoyo_tui.config import TUIConfig

        # Mock config loading
        mock_config = TUIConfig()
        mock_config_manager.load.return_value = mock_config

        # Create app instance
        app = YoyoDevApp()

        # Verify config was loaded
        self.assertIsNotNone(app.config)

    def test_app_has_on_mount_method(self):
        """Test that app has on_mount lifecycle method."""
        from yoyo_tui.app import YoyoDevApp
        self.assertTrue(hasattr(YoyoDevApp, 'on_mount'))


class TestEntryPointScript(unittest.TestCase):
    """Test the main entry point script functionality."""

    def test_entry_point_script_exists(self):
        """Test that yoyo-tui.py entry point exists."""
        entry_point = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo-tui.py'
        self.assertTrue(
            entry_point.exists(),
            "yoyo-tui.py entry point should exist"
        )

    def test_entry_point_is_executable(self):
        """Test that yoyo-tui.py is executable."""
        entry_point = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo-tui.py'
        if entry_point.exists():
            self.assertTrue(
                entry_point.stat().st_mode & 0o111,
                "yoyo-tui.py should be executable"
            )


class TestDependencyChecking(unittest.TestCase):
    """Test dependency checking functionality."""

    def test_check_dependencies_function_exists(self):
        """Test that check_dependencies function exists in entry point."""
        # This will be tested when we create the entry point
        # For now, we just ensure the pattern is correct
        pass

    @patch('sys.exit')
    def test_missing_textual_triggers_fallback(self, mock_exit):
        """Test that missing textual dependency triggers fallback."""
        # This test would check that sys.exit(1) is called when textual is missing
        # Actual implementation will be in yoyo-tui.py
        pass


class TestConfigurationLoading(unittest.TestCase):
    """Test configuration loading in app."""

    @patch('yoyo_tui.config.ConfigManager.load')
    def test_app_uses_default_config_if_file_missing(self, mock_load):
        """Test that app uses default config if config file doesn't exist."""
        from yoyo_tui.app import YoyoDevApp
        from yoyo_tui.config import TUIConfig

        # Mock config loading to return defaults
        mock_load.return_value = TUIConfig()

        app = YoyoDevApp()

        # Verify default config is used
        self.assertIsNotNone(app.config)
        self.assertEqual(app.config.theme, "yoyo-dev")

    @patch('yoyo_tui.config.ConfigManager.load')
    def test_app_loads_custom_config_if_exists(self, mock_load):
        """Test that app loads custom config if it exists."""
        from yoyo_tui.app import YoyoDevApp
        from yoyo_tui.config import TUIConfig

        # Mock custom config
        custom_config = TUIConfig(theme="dark", sidebar_width=40)
        mock_load.return_value = custom_config

        app = YoyoDevApp()

        # Verify custom config is loaded
        self.assertEqual(app.config.theme, "dark")
        self.assertEqual(app.config.sidebar_width, 40)


class TestKeyBindings(unittest.TestCase):
    """Test keyboard bindings configuration."""

    def test_app_has_command_palette_binding(self):
        """Test that Ctrl+P and / are bound to command palette."""
        from yoyo_tui.app import YoyoDevApp

        bindings = [b for b in YoyoDevApp.BINDINGS]
        binding_keys = [b.key for b in bindings]

        self.assertIn("ctrl+p", binding_keys, "Ctrl+P should trigger command palette")
        self.assertIn("/", binding_keys, "/ should trigger command palette")

    def test_app_has_help_binding(self):
        """Test that ? is bound to help."""
        from yoyo_tui.app import YoyoDevApp

        bindings = [b for b in YoyoDevApp.BINDINGS]
        binding_keys = [b.key for b in bindings]

        self.assertIn("?", binding_keys, "? should trigger help")

    def test_app_has_quit_binding(self):
        """Test that q is bound to quit."""
        from yoyo_tui.app import YoyoDevApp

        bindings = [b for b in YoyoDevApp.BINDINGS]
        binding_keys = [b.key for b in bindings]

        self.assertIn("q", binding_keys, "q should trigger quit")

    def test_app_has_refresh_binding(self):
        """Test that r is bound to refresh."""
        from yoyo_tui.app import YoyoDevApp

        bindings = [b for b in YoyoDevApp.BINDINGS]
        binding_keys = [b.key for b in bindings]

        self.assertIn("r", binding_keys, "r should trigger refresh")

    def test_app_has_git_menu_binding(self):
        """Test that g is bound to git menu."""
        from yoyo_tui.app import YoyoDevApp

        bindings = [b for b in YoyoDevApp.BINDINGS]
        binding_keys = [b.key for b in bindings]

        self.assertIn("g", binding_keys, "g should trigger git menu")


if __name__ == '__main__':
    unittest.main()
