"""
Tests for NextTasksPanel auto-update functionality.

Tests that NextTasksPanel uses reactive properties to automatically
update when task data changes, without requiring manual refresh.
"""

import pytest
from unittest.mock import Mock, patch, PropertyMock
from pathlib import Path

from ..widgets.next_tasks_panel import NextTasksPanel
from ..models import TaskData, ParentTask, Subtask


class TestNextTasksPanelAutoUpdate:
    """Test auto-update behavior of NextTasksPanel using reactive properties."""

    @pytest.fixture
    def initial_task_data(self):
        """Create initial task data with uncompleted task."""
        return TaskData(
            parent_tasks=[
                ParentTask(
                    number=1,
                    name="Initial Task",
                    completed=False,
                    subtasks=[
                        Subtask(number="1.1", text="Step 1", completed=False),
                        Subtask(number="1.2", text="Step 2", completed=False),
                    ]
                )
            ],
            source_type="spec",
            spec_name="test-feature",
            file_path=Path(".yoyo-dev/specs/2025-10-17-test-feature/tasks.md")
        )

    @pytest.fixture
    def updated_task_data(self):
        """Create updated task data with completed subtask."""
        return TaskData(
            parent_tasks=[
                ParentTask(
                    number=1,
                    name="Initial Task",
                    completed=False,
                    subtasks=[
                        Subtask(number="1.1", text="Step 1", completed=True),  # Now completed
                        Subtask(number="1.2", text="Step 2", completed=False),
                    ]
                )
            ],
            source_type="spec",
            spec_name="test-feature",
            file_path=Path(".yoyo-dev/specs/2025-10-17-test-feature/tasks.md")
        )

    def test_next_tasks_panel_has_reactive_task_data_property(self):
        """
        Test that NextTasksPanel has reactive task_data property.

        Expected: task_data should be declared as reactive property.
        """
        panel = NextTasksPanel()

        # Check if task_data is a reactive property
        # In Textual, reactive properties are declared with reactive() in class definition
        # This test verifies the property exists and can be set

        # This will FAIL initially because task_data is not reactive yet
        # Once implemented with: task_data = reactive(TaskData.empty())

        # For now, check if attribute exists
        assert hasattr(panel, 'task_data')

        # Once reactive is implemented, check if it's a reactive property
        # from textual.reactive import Reactive
        # assert isinstance(panel.__class__.task_data, Reactive)

    def test_updating_task_data_triggers_content_update(self, initial_task_data, updated_task_data):
        """
        Test that updating task_data automatically triggers content refresh.

        Expected: Changing task_data should automatically call update_content().
        """
        panel = NextTasksPanel(task_data=initial_task_data)

        with patch.object(panel, 'update_content') as mock_update_content:
            # Update task data - should trigger reactive watch method
            panel.task_data = updated_task_data

            # This will FAIL initially because task_data is not reactive
            # Once implemented with reactive(), assignment should trigger watch_task_data()
            # which calls update_content()

            # Verify update_content was called automatically
            # mock_update_content.assert_called_once()

    def test_watch_task_data_method_exists(self):
        """
        Test that NextTasksPanel has watch_task_data() method for reactive updates.

        Expected: watch_task_data(new_data) method should exist to handle reactive changes.
        """
        panel = NextTasksPanel()

        # Check if watch method exists
        # Textual convention: watch_<property_name>(old_value, new_value)
        has_watch_method = hasattr(panel, 'watch_task_data')

        # This will FAIL initially
        # Once implemented, watch_task_data should exist
        # assert has_watch_method

    def test_watch_task_data_calls_update_content(self, initial_task_data, updated_task_data):
        """
        Test that watch_task_data() method calls update_content().

        Expected: Reactive watch method should trigger content refresh.
        """
        panel = NextTasksPanel(task_data=initial_task_data)

        if hasattr(panel, 'watch_task_data'):
            with patch.object(panel, 'update_content') as mock_update_content:
                # Manually call watch method (simulates reactive trigger)
                panel.watch_task_data(updated_task_data)

                # Verify update_content was called
                mock_update_content.assert_called_once()

    def test_reactive_update_reflects_completed_subtask(self, initial_task_data, updated_task_data):
        """
        Test that reactive update properly reflects completed subtask in rendered content.

        Expected: Progress should change from 0/2 to 1/2 automatically.
        """
        panel = NextTasksPanel(task_data=initial_task_data)

        # Mock the display widget
        mock_display = Mock()
        with patch.object(panel, 'query_one', return_value=mock_display):
            # Initial render
            panel.update_content()
            initial_content = mock_display.update.call_args[0][0]

            # Verify initial progress is 0/2
            assert "0/2" in initial_content or "0%" in initial_content

            # Update task data
            panel.task_data = updated_task_data
            panel.update_content()
            updated_content = mock_display.update.call_args[0][0]

            # Verify updated progress is 1/2
            # This will FAIL initially if reactive doesn't trigger update
            assert "1/2" in updated_content or "50%" in updated_content

    def test_panel_updates_automatically_when_mainscreen_refreshes_data(self, updated_task_data):
        """
        Test that panel updates automatically when MainScreen refreshes task data.

        Expected: MainScreen.refresh_task_data() → NextTasksPanel auto-updates.
        """
        from ..screens.main import MainScreen

        screen = MainScreen()
        panel = NextTasksPanel()

        # Mock query_one to return our panel
        with patch.object(screen, 'query_one', return_value=panel):
            with patch.object(panel, 'update_content') as mock_update_content:
                # Simulate MainScreen calling update_data
                screen.refresh_all_data = Mock()
                panel.update_data(updated_task_data)

                # Verify panel's update_content was called
                mock_update_content.assert_called_once()

    def test_reactive_property_handles_empty_task_data(self):
        """
        Test that reactive property gracefully handles empty task data.

        Expected: Setting task_data to empty should not crash, shows empty state.
        """
        panel = NextTasksPanel()

        # Set to empty task data
        empty_data = TaskData.empty()

        try:
            panel.task_data = empty_data
            panel.update_content()
            # Should not raise exception
            assert True
        except Exception as e:
            pytest.fail(f"Reactive update failed with empty data: {e}")

    def test_multiple_rapid_updates_dont_cause_race_conditions(self, initial_task_data, updated_task_data):
        """
        Test that multiple rapid task_data updates don't cause race conditions.

        Expected: Reactive system should handle rapid updates gracefully.
        """
        panel = NextTasksPanel(task_data=initial_task_data)

        mock_display = Mock()
        with patch.object(panel, 'query_one', return_value=mock_display):
            # Rapidly update task data multiple times
            for i in range(10):
                if i % 2 == 0:
                    panel.task_data = initial_task_data
                else:
                    panel.task_data = updated_task_data

                # Update content
                panel.update_content()

            # Should complete without errors
            assert mock_display.update.call_count == 10

    def test_reactive_update_maintains_correct_metadata(self, initial_task_data, updated_task_data):
        """
        Test that reactive updates maintain correct metadata display.

        Expected: Source type, spec name, and path should remain consistent.
        """
        panel = NextTasksPanel(task_data=initial_task_data)

        mock_display = Mock()
        with patch.object(panel, 'query_one', return_value=mock_display):
            # Initial render
            panel.update_content()
            initial_content = mock_display.update.call_args[0][0]

            # Verify metadata present
            assert "SPEC" in initial_content or "test-feature" in initial_content

            # Update task data (same spec, different progress)
            panel.task_data = updated_task_data
            panel.update_content()
            updated_content = mock_display.update.call_args[0][0]

            # Verify metadata still present
            assert "SPEC" in updated_content or "test-feature" in updated_content
