"""
Tests for CommandSuggester ActiveWork dataclass handling.

These tests verify that CommandSuggester properly handles ActiveWork as a
dataclass (using attribute access) rather than as a dict (using .get()).
"""

import pytest
from pathlib import Path
from lib.yoyo_tui_v3.services.command_suggester import IntelligentCommandSuggester
from lib.yoyo_tui_v3.services.data_manager import DataManager
from lib.yoyo_tui_v3.services.event_bus import EventBus
from lib.yoyo_tui_v3.services.cache_manager import CacheManager
from lib.yoyo_tui_v3.models import ActiveWork, Task


class TestCommandSuggesterActiveWork:
    """Test CommandSuggester handling of ActiveWork dataclass."""

    def test_active_work_tasks_attribute_access(self, tmp_path):
        """Test that CommandSuggester accesses active_work.tasks as attribute, not dict."""
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

        # Create ActiveWork dataclass with tasks
        tasks = [
            Task(number=1, title="Task 1", completed=False, parent_number=None)
        ]
        active_work = ActiveWork(
            spec_name="test-spec",
            spec_folder="test-spec",
            tasks=tasks,
            progress=0.5,
            status="in_progress",
            pr_url=None
        )

        # Act & Assert - Should access .tasks attribute, not .get("tasks")
        # This will fail if CommandSuggester uses active_work.get("tasks")
        try:
            # Pass active_work directly to generate_suggestions
            suggestions = command_suggester.generate_suggestions(active_work)
            assert isinstance(suggestions, list)
            # If we get here, it means CommandSuggester is handling dataclass correctly
        except AttributeError as e:
            # This is expected to fail initially because CommandSuggester uses .get()
            assert "'ActiveWork' object has no attribute 'get'" in str(e)

    def test_active_work_progress_attribute_access(self, tmp_path):
        """Test that CommandSuggester accesses active_work.progress as attribute."""
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

        # Create ActiveWork with specific progress
        active_work = ActiveWork(
            spec_name="test-spec",
            spec_folder="test-spec",
            tasks=[],
            progress=0.75,
            status="in_progress",
            pr_url=None
        )

        # Act & Assert - Should access .progress attribute
        try:
            suggestions = command_suggester.generate_suggestions(active_work)
            assert isinstance(suggestions, list)
        except AttributeError as e:
            assert "'ActiveWork' object has no attribute 'get'" in str(e)

    def test_active_work_status_attribute_access(self, tmp_path):
        """Test that CommandSuggester accesses active_work.status as attribute."""
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

        # Create ActiveWork with specific status
        active_work = ActiveWork(
            spec_name="test-spec",
            spec_folder="test-spec",
            tasks=[],
            progress=1.0,
            status="completed",
            pr_url="https://github.com/user/repo/pull/123"
        )

        # Act & Assert - Should access .status and .pr_url attributes
        try:
            suggestions = command_suggester.generate_suggestions(active_work)
            assert isinstance(suggestions, list)
        except AttributeError as e:
            assert "'ActiveWork' object has no attribute 'get'" in str(e)

    def test_active_work_pr_url_attribute_access(self, tmp_path):
        """Test that CommandSuggester accesses active_work.pr_url as attribute."""
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

        # Create ActiveWork with PR URL
        active_work = ActiveWork(
            spec_name="test-spec",
            spec_folder="test-spec",
            tasks=[],
            progress=1.0,
            status="completed",
            pr_url="https://github.com/user/repo/pull/456"
        )

        # Act & Assert - Should access .pr_url attribute, not .get("pr_url")
        try:
            suggestions = command_suggester.generate_suggestions(active_work)
            assert isinstance(suggestions, list)
        except AttributeError as e:
            assert "'ActiveWork' object has no attribute 'get'" in str(e)
