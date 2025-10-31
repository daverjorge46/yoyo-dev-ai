"""
Tests for DataManager integration with CommandSuggester and ErrorDetector.

These tests verify that DataManager properly integrates with the command
suggestion and error detection services.
"""

import pytest
from pathlib import Path
from lib.yoyo_tui_v3.services.data_manager import DataManager
from lib.yoyo_tui_v3.services.event_bus import EventBus
from lib.yoyo_tui_v3.services.cache_manager import CacheManager
from lib.yoyo_tui_v3.services.command_suggester import IntelligentCommandSuggester
from lib.yoyo_tui_v3.services.error_detector import ErrorDetector


class TestDataManagerIntegration:
    """Test DataManager integration with services."""

    def test_get_command_suggestions_method_exists(self, tmp_path):
        """Test that get_command_suggestions() method exists and is callable."""
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

        # Act & Assert - should have the method
        assert hasattr(data_manager, 'get_command_suggestions')
        assert callable(data_manager.get_command_suggestions)

        # Should return a list
        suggestions = data_manager.get_command_suggestions()
        assert isinstance(suggestions, list)

    def test_get_recent_errors_method_exists(self, tmp_path):
        """Test that get_recent_errors() method exists and is callable."""
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

        # Act & Assert - should have the method
        assert hasattr(data_manager, 'get_recent_errors')
        assert callable(data_manager.get_recent_errors)

        # Should return a list
        errors = data_manager.get_recent_errors()
        assert isinstance(errors, list)

    def test_command_suggester_integration(self, tmp_path):
        """Test that DataManager properly delegates to CommandSuggester."""
        # Arrange
        yoyo_dev_path = tmp_path / ".yoyo-dev"
        yoyo_dev_path.mkdir()

        event_bus = EventBus()
        cache_manager = CacheManager(default_ttl=60)

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev_path,
            event_bus=event_bus,
            cache_manager=cache_manager
        )

        command_suggester = IntelligentCommandSuggester(data_manager, event_bus, yoyo_dev_path)
        error_detector = ErrorDetector(yoyo_dev_path, event_bus)

        # Set services
        data_manager.command_suggester = command_suggester
        data_manager.error_detector = error_detector

        # Act
        suggestions = data_manager.get_command_suggestions()

        # Assert - should get suggestions from command suggester
        assert isinstance(suggestions, list)
        # Should have at least one suggestion (Rule 1: no active work)
        assert len(suggestions) > 0
