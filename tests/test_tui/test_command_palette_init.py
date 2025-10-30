"""
Test for CommandPalettePanel initialization with all required parameters.

This test reproduces the bug where CommandPalettePanel.__init__() rejects
command_suggester and error_detector kwargs.
"""

import pytest
from unittest.mock import Mock

from lib.yoyo_tui_v3.widgets.command_palette import CommandPalettePanel


class TestCommandPalettePanelInit:
    """Test CommandPalettePanel initialization."""

    def test_init_with_all_parameters(self):
        """
        Test that CommandPalettePanel can be instantiated with all required parameters.

        This test ensures that the widget accepts:
        - data_manager
        - event_bus
        - command_suggester
        - error_detector
        - id (standard Widget parameter)

        Without raising TypeError about unexpected keyword arguments.
        """
        # Mock dependencies
        mock_data_manager = Mock()
        mock_event_bus = Mock()
        mock_command_suggester = Mock()
        mock_error_detector = Mock()

        # This should NOT raise TypeError
        panel = CommandPalettePanel(
            data_manager=mock_data_manager,
            event_bus=mock_event_bus,
            command_suggester=mock_command_suggester,
            error_detector=mock_error_detector,
            id="command-palette-panel"
        )

        # Verify the panel was created
        assert panel is not None
        assert panel.data_manager == mock_data_manager
        assert panel.event_bus == mock_event_bus
        assert panel.command_suggester == mock_command_suggester
        assert panel.error_detector == mock_error_detector
        assert panel.id == "command-palette-panel"

    def test_init_without_optional_parameters(self):
        """
        Test that CommandPalettePanel can be instantiated with only required parameters.
        """
        # Mock required dependencies
        mock_data_manager = Mock()
        mock_event_bus = Mock()
        mock_command_suggester = Mock()
        mock_error_detector = Mock()

        # Should work without id parameter
        panel = CommandPalettePanel(
            data_manager=mock_data_manager,
            event_bus=mock_event_bus,
            command_suggester=mock_command_suggester,
            error_detector=mock_error_detector
        )

        assert panel is not None
        assert panel.data_manager == mock_data_manager
        assert panel.event_bus == mock_event_bus
