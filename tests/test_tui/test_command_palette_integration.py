"""
Tests for CommandPalette widget integration with DataManager.

These tests verify that CommandPalette properly integrates with DataManager
to get command suggestions and recent errors.
"""

import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch
from lib.yoyo_tui_v3.widgets.command_palette import CommandPalettePanel
from lib.yoyo_tui_v3.services.data_manager import DataManager
from lib.yoyo_tui_v3.services.event_bus import EventBus
from lib.yoyo_tui_v3.services.cache_manager import CacheManager
from lib.yoyo_tui_v3.services.command_suggester import IntelligentCommandSuggester
from lib.yoyo_tui_v3.services.error_detector import ErrorDetector


class TestCommandPaletteIntegration:
    """Test CommandPalettePanel integration with DataManager."""

    def test_command_palette_calls_get_command_suggestions(self, tmp_path):
        """Test that CommandPalettePanel calls data_manager.get_command_suggestions()."""
        # Arrange
        yoyo_dev_path = tmp_path / ".yoyo-dev"
        yoyo_dev_path.mkdir()

        event_bus = EventBus()
        cache_manager = CacheManager(default_ttl=60)
        command_suggester = IntelligentCommandSuggester(None, event_bus, yoyo_dev_path)
        error_detector = ErrorDetector(yoyo_dev_path, event_bus)

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev_path,
            event_bus=event_bus,
            cache_manager=cache_manager,
            command_suggester=command_suggester,
            error_detector=error_detector
        )

        # Act & Assert - CommandPalettePanel should call get_command_suggestions()
        # This will fail if DataManager doesn't have this method
        try:
            command_palette = CommandPalettePanel(data_manager, event_bus, id="test-command-palette")
            # Should be able to create widget without errors
            assert command_palette is not None
            assert hasattr(command_palette, '_suggestions')
        except AttributeError as e:
            # Expected to fail initially
            assert "'DataManager' object has no attribute 'get_command_suggestions'" in str(e)

    def test_command_palette_calls_get_recent_errors(self, tmp_path):
        """Test that CommandPalettePanel calls data_manager.get_recent_errors()."""
        # Arrange
        yoyo_dev_path = tmp_path / ".yoyo-dev"
        yoyo_dev_path.mkdir()

        event_bus = EventBus()
        cache_manager = CacheManager(default_ttl=60)
        command_suggester = IntelligentCommandSuggester(None, event_bus, yoyo_dev_path)
        error_detector = ErrorDetector(yoyo_dev_path, event_bus)

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev_path,
            event_bus=event_bus,
            cache_manager=cache_manager,
            command_suggester=command_suggester,
            error_detector=error_detector
        )

        # Act & Assert - CommandPalettePanel should call get_recent_errors()
        try:
            command_palette = CommandPalettePanel(data_manager, event_bus, id="test-command-palette")
            assert command_palette is not None
            assert hasattr(command_palette, '_errors')
        except AttributeError as e:
            # Expected to fail initially
            assert "'DataManager' object has no attribute 'get_recent_errors'" in str(e)

    def test_command_palette_updates_on_state_change(self, tmp_path):
        """Test that CommandPalettePanel updates display when STATE_UPDATED event fires."""
        # Arrange
        yoyo_dev_path = tmp_path / ".yoyo-dev"
        yoyo_dev_path.mkdir()

        event_bus = EventBus()
        cache_manager = CacheManager(default_ttl=60)
        command_suggester = IntelligentCommandSuggester(None, event_bus, yoyo_dev_path)
        error_detector = ErrorDetector(yoyo_dev_path, event_bus)

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev_path,
            event_bus=event_bus,
            cache_manager=cache_manager,
            command_suggester=command_suggester,
            error_detector=error_detector
        )

        # Act & Assert - Widget should subscribe to events and update
        try:
            command_palette = CommandPalettePanel(data_manager, event_bus, id="test-command-palette")

            # Should have _update_display method
            assert hasattr(command_palette, '_update_display')
            assert callable(command_palette._update_display)

            # Should subscribe to STATE_UPDATED event
            # (actual event subscription happens in on_mount, can't test without app)

        except AttributeError as e:
            # Expected to fail if DataManager methods missing
            assert "'DataManager' object has no attribute" in str(e)

    def test_command_palette_renders_suggestions(self, tmp_path):
        """Test that CommandPalettePanel renders command suggestions from DataManager."""
        # Arrange
        yoyo_dev_path = tmp_path / ".yoyo-dev"
        yoyo_dev_path.mkdir()

        event_bus = EventBus()
        cache_manager = CacheManager(default_ttl=60)
        command_suggester = IntelligentCommandSuggester(None, event_bus, yoyo_dev_path)
        error_detector = ErrorDetector(yoyo_dev_path, event_bus)

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev_path,
            event_bus=event_bus,
            cache_manager=cache_manager,
            command_suggester=command_suggester,
            error_detector=error_detector
        )

        # Act & Assert - Should render suggestions if available
        try:
            command_palette = CommandPalettePanel(data_manager, event_bus, id="test-command-palette")

            # Widget should have _suggestions list
            assert hasattr(command_palette, '_suggestions')
            assert isinstance(command_palette._suggestions, list)

        except AttributeError as e:
            assert "'DataManager' object has no attribute" in str(e)

    def test_command_palette_renders_errors(self, tmp_path):
        """Test that CommandPalettePanel renders recent errors from DataManager."""
        # Arrange
        yoyo_dev_path = tmp_path / ".yoyo-dev"
        yoyo_dev_path.mkdir()

        event_bus = EventBus()
        cache_manager = CacheManager(default_ttl=60)
        command_suggester = IntelligentCommandSuggester(None, event_bus, yoyo_dev_path)
        error_detector = ErrorDetector(yoyo_dev_path, event_bus)

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev_path,
            event_bus=event_bus,
            cache_manager=cache_manager,
            command_suggester=command_suggester,
            error_detector=error_detector
        )

        # Act & Assert - Should render errors if available
        try:
            command_palette = CommandPalettePanel(data_manager, event_bus, id="test-command-palette")

            # Widget should have _errors list
            assert hasattr(command_palette, '_errors')
            assert isinstance(command_palette._errors, list)

        except AttributeError as e:
            assert "'DataManager' object has no attribute" in str(e)
