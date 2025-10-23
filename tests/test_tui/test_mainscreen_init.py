"""
Tests for MainScreen initialization with data_manager parameter.

This test reproduces and verifies the fix for the bug where MainScreen.__init__()
incorrectly forwards data_manager kwarg to Textual's Screen.__init__().
"""

import sys
from pathlib import Path

# Add lib directory to Python path for imports
lib_path = Path(__file__).parent.parent.parent / "lib"
sys.path.insert(0, str(lib_path))

import pytest
from unittest.mock import Mock, MagicMock
from yoyo_tui.screens.main import MainScreen
from yoyo_tui.config import TUIConfig
from yoyo_tui.services.data_manager import DataManager


class TestMainScreenInitialization:
    """Test MainScreen initialization with various parameter combinations."""

    def test_mainscreen_init_with_data_manager(self):
        """
        Test that MainScreen can be instantiated with data_manager parameter.

        This test reproduces the bug where passing data_manager causes TypeError.
        With the fix, data_manager should be extracted from kwargs and stored
        as an instance variable.
        """
        # Arrange
        mock_data_manager = Mock(spec=DataManager)
        config = TUIConfig()

        # Act - This should NOT raise TypeError after fix
        screen = MainScreen(config=config, data_manager=mock_data_manager)

        # Assert
        assert screen is not None
        assert isinstance(screen, MainScreen)
        assert screen.config == config
        assert screen.data_manager == mock_data_manager

    def test_mainscreen_stores_data_manager_as_instance_variable(self):
        """
        Test that data_manager is stored as an instance variable.

        Verifies that the data_manager parameter is properly extracted from
        kwargs and stored as self.data_manager.
        """
        # Arrange
        mock_data_manager = Mock(spec=DataManager)

        # Act
        screen = MainScreen(data_manager=mock_data_manager)

        # Assert
        assert hasattr(screen, 'data_manager')
        assert screen.data_manager is mock_data_manager

    def test_mainscreen_init_with_only_config(self):
        """
        Test that MainScreen can be instantiated with only config parameter.

        Ensures backward compatibility - MainScreen should work with just config.
        """
        # Arrange
        config = TUIConfig()

        # Act
        screen = MainScreen(config=config)

        # Assert
        assert screen is not None
        assert screen.config == config

    def test_mainscreen_init_without_parameters(self):
        """
        Test that MainScreen can be instantiated without any parameters.

        Ensures default initialization still works.
        """
        # Act
        screen = MainScreen()

        # Assert
        assert screen is not None
        assert isinstance(screen.config, TUIConfig)

    def test_mainscreen_init_with_both_config_and_data_manager(self):
        """
        Test that MainScreen works with both config and data_manager.

        This is the primary use case in app.py where both parameters are passed.
        """
        # Arrange
        config = TUIConfig()
        mock_data_manager = Mock(spec=DataManager)

        # Act
        screen = MainScreen(config=config, data_manager=mock_data_manager)

        # Assert
        assert screen.config == config
        assert screen.data_manager == mock_data_manager

    def test_mainscreen_data_manager_defaults_to_none(self):
        """
        Test that data_manager defaults to None if not provided.

        When data_manager is not passed, it should default to None.
        """
        # Act
        screen = MainScreen()

        # Assert
        # After fix, data_manager should exist as attribute
        assert hasattr(screen, 'data_manager')
        assert screen.data_manager is None
