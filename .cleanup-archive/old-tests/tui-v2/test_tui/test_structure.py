#!/usr/bin/env python3
"""
Test suite for Textual TUI project structure validation.

Tests that all required packages, modules, and files exist with correct structure.
"""

import unittest
from pathlib import Path


class TestProjectStructure(unittest.TestCase):
    """Test that the Textual TUI project structure is correctly set up."""

    def setUp(self):
        """Set up test fixtures."""
        self.base_dir = Path.home() / '.yoyo-dev'
        self.tui_package = self.base_dir / 'lib' / 'yoyo_tui'

    def test_tui_package_exists(self):
        """Test that yoyo_tui package directory exists."""
        self.assertTrue(
            self.tui_package.exists(),
            "yoyo_tui package directory should exist"
        )
        self.assertTrue(
            self.tui_package.is_dir(),
            "yoyo_tui should be a directory"
        )

    def test_package_init_exists(self):
        """Test that __init__.py exists in yoyo_tui package."""
        init_file = self.tui_package / '__init__.py'
        self.assertTrue(
            init_file.exists(),
            "__init__.py should exist in yoyo_tui package"
        )

    def test_models_module_exists(self):
        """Test that models.py module exists."""
        models_file = self.tui_package / 'models.py'
        self.assertTrue(
            models_file.exists(),
            "models.py should exist"
        )

    def test_config_module_exists(self):
        """Test that config.py module exists."""
        config_file = self.tui_package / 'config.py'
        self.assertTrue(
            config_file.exists(),
            "config.py should exist"
        )

    def test_installation_script_exists(self):
        """Test that installation script exists and is executable."""
        install_script = self.base_dir / 'setup' / 'install-tui-deps.sh'
        self.assertTrue(
            install_script.exists(),
            "install-tui-deps.sh should exist"
        )
        # Check if executable
        self.assertTrue(
            install_script.stat().st_mode & 0o111,
            "install-tui-deps.sh should be executable"
        )

    def test_config_template_exists(self):
        """Test that config template exists."""
        config_template = self.base_dir / 'config' / 'tui-config.yml'
        self.assertTrue(
            config_template.exists(),
            "tui-config.yml template should exist"
        )

    def test_models_can_be_imported(self):
        """Test that models module can be imported."""
        try:
            import sys
            sys.path.insert(0, str(self.base_dir / 'lib'))
            from yoyo_tui import models
            self.assertTrue(True, "models module should be importable")
        except ImportError as e:
            self.fail(f"models module should be importable: {e}")

    def test_config_can_be_imported(self):
        """Test that config module can be imported."""
        try:
            import sys
            sys.path.insert(0, str(self.base_dir / 'lib'))
            from yoyo_tui import config
            self.assertTrue(True, "config module should be importable")
        except ImportError as e:
            self.fail(f"config module should be importable: {e}")


if __name__ == '__main__':
    unittest.main()
