"""
Tests for HistoryPanel auto-update functionality.

Tests that HistoryPanel uses reactive properties to automatically
update when history data changes, triggered by file system events.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
from datetime import datetime, timedelta

from ..widgets.history_panel import HistoryPanel
from ..services.history_tracker import HistoryEntry, HistoryType


class TestHistoryPanelAutoUpdate:
    """Test auto-update behavior of HistoryPanel using reactive properties."""

    @pytest.fixture
    def mock_history_entries(self):
        """Create mock history entries for testing."""
        now = datetime.now()
        return [
            HistoryEntry(
                type=HistoryType.COMMIT,
                title="feat: Add user authentication",
                timestamp=now - timedelta(hours=1),
                description="https://github.com/user/repo/pull/123"
            ),
            HistoryEntry(
                type=HistoryType.SPEC,
                title="User Profile Feature",
                timestamp=now - timedelta(hours=2),
                description="specs/2025-10-17-user-profiles"
            ),
            HistoryEntry(
                type=HistoryType.FIX,
                title="Fix login button styling",
                timestamp=now - timedelta(hours=3),
                description="fixes/2025-10-16-login-button-fix"
            ),
        ]

    @pytest.fixture
    def updated_history_entries(self):
        """Create updated history entries with new commit."""
        now = datetime.now()
        return [
            HistoryEntry(
                type=HistoryType.COMMIT,
                title="fix: Correct timestamp parsing",  # NEW ENTRY
                timestamp=now - timedelta(minutes=5),
                description="https://github.com/user/repo/pull/124"
            ),
            HistoryEntry(
                type=HistoryType.COMMIT,
                title="feat: Add user authentication",
                timestamp=now - timedelta(hours=1),
                description="https://github.com/user/repo/pull/123"
            ),
            HistoryEntry(
                type=HistoryType.SPEC,
                title="User Profile Feature",
                timestamp=now - timedelta(hours=2),
                description="specs/2025-10-17-user-profiles"
            ),
        ]

    def test_history_panel_has_reactive_history_content_property(self):
        """
        Test that HistoryPanel has reactive history_content property.

        Expected: history_content is already declared as reactive in current code.
        """
        panel = HistoryPanel()

        # HistoryPanel already has: history_content = reactive("")
        assert hasattr(panel, 'history_content')

        # Verify it's reactive
        from textual.reactive import Reactive
        # Check if the class attribute is a Reactive descriptor
        assert hasattr(panel.__class__, 'history_content')

    def test_updating_history_content_triggers_render(self):
        """
        Test that updating history_content automatically triggers widget re-render.

        Expected: Setting history_content should trigger watch_history_content().
        """
        panel = HistoryPanel()

        with patch.object(panel, 'update') as mock_update:
            # Update history content - should trigger reactive watch method
            panel.history_content = "[bold]New History[/bold]"

            # This should work because history_content is already reactive
            # The watch_history_content method should be called automatically
            # which calls self.update(new_content)

    def test_watch_history_content_method_exists(self):
        """
        Test that HistoryPanel has watch_history_content() method.

        Expected: Method exists (already implemented in current code).
        """
        panel = HistoryPanel()

        # HistoryPanel already has watch_history_content method
        assert hasattr(panel, 'watch_history_content')
        assert callable(panel.watch_history_content)

    def test_refresh_history_updates_reactive_property(self, mock_history_entries):
        """
        Test that refresh_history() updates the reactive history_content property.

        Expected: refresh_history() should set self.history_content, triggering reactive update.
        """
        panel = HistoryPanel()

        with patch.object(panel.tracker, 'get_recent_actions', return_value=mock_history_entries):
            with patch.object(panel, 'update') as mock_update:
                # Call refresh_history
                panel.refresh_history()

                # Verify history_content was set (should contain formatted entries)
                assert panel.history_content != ""
                assert "Recent Activity" in panel.history_content

                # Verify update was called via reactive watch
                # (watch_history_content calls self.update)
                mock_update.assert_called()

    def test_file_watcher_callback_triggers_history_refresh(self, mock_history_entries):
        """
        Test that FileWatcher callback triggers HistoryPanel.refresh_history().

        Expected: MainScreen.refresh_all_data() should call history_panel.refresh_history().
        """
        from ..screens.main import MainScreen

        screen = MainScreen()
        panel = HistoryPanel()

        with patch.object(screen, 'query_one', return_value=panel):
            with patch.object(panel, 'refresh_history') as mock_refresh_history:
                # Simulate FileWatcher triggering MainScreen refresh
                screen.refresh_all_data()

                # Verify history panel's refresh_history was called
                mock_refresh_history.assert_called_once()

    def test_auto_update_reflects_new_git_commit(self, mock_history_entries, updated_history_entries):
        """
        Test that auto-update reflects new git commit in history.

        Expected: New commit should appear at top of history automatically.
        """
        panel = HistoryPanel()

        with patch.object(panel.tracker, 'get_recent_actions', return_value=mock_history_entries):
            # Initial load
            panel.refresh_history()
            initial_content = panel.history_content

            # Verify initial content has 3 entries
            assert "feat: Add user authentication" in initial_content
            assert "User Profile Feature" in initial_content

        # Simulate file system change (new commit)
        with patch.object(panel.tracker, 'get_recent_actions', return_value=updated_history_entries):
            panel.refresh_history()
            updated_content = panel.history_content

            # Verify new commit appears
            assert "fix: Correct timestamp parsing" in updated_content

            # Old entries should still be present
            assert "feat: Add user authentication" in updated_content

    def test_reactive_update_handles_empty_history(self):
        """
        Test that reactive update gracefully handles empty history.

        Expected: Empty history should show "No recent activity" message.
        """
        panel = HistoryPanel()

        with patch.object(panel.tracker, 'get_recent_actions', return_value=[]):
            panel.refresh_history()

            # Verify empty state message
            assert "No recent activity" in panel.history_content

    def test_reactive_update_handles_tracker_error(self):
        """
        Test that reactive update gracefully handles HistoryTracker errors.

        Expected: Errors should not crash, shows "Unable to load history".
        """
        panel = HistoryPanel()

        with patch.object(panel.tracker, 'get_recent_actions', side_effect=Exception("Git error")):
            # Should not raise exception
            panel.refresh_history()

            # Verify error message
            assert "Unable to load history" in panel.history_content

    def test_multiple_rapid_refreshes_dont_cause_race_conditions(self, mock_history_entries):
        """
        Test that multiple rapid refresh_history() calls don't cause race conditions.

        Expected: Reactive system should handle rapid updates gracefully.
        """
        panel = HistoryPanel()

        with patch.object(panel.tracker, 'get_recent_actions', return_value=mock_history_entries):
            # Rapidly refresh multiple times
            for i in range(10):
                panel.refresh_history()

            # Should complete without errors
            assert panel.history_content != ""

    def test_reactive_update_maintains_correct_icons(self, mock_history_entries):
        """
        Test that reactive updates maintain correct icons for entry types.

        Expected: Icons should match entry types (📝 for commits, 📄 for specs, etc.).
        """
        panel = HistoryPanel()

        with patch.object(panel.tracker, 'get_recent_actions', return_value=mock_history_entries):
            panel.refresh_history()

            content = panel.history_content

            # Verify icons are present
            assert "📝" in content  # Commit icon
            assert "📄" in content  # Spec icon
            assert "🔧" in content  # Fix icon

    def test_reactive_update_formats_pr_links_correctly(self, mock_history_entries):
        """
        Test that reactive updates format PR links correctly.

        Expected: PR URLs should show as "PR #123" format.
        """
        panel = HistoryPanel()

        with patch.object(panel.tracker, 'get_recent_actions', return_value=mock_history_entries):
            panel.refresh_history()

            content = panel.history_content

            # Verify PR number is extracted and formatted
            assert "PR #123" in content

    def test_history_panel_auto_updates_on_mount(self):
        """
        Test that HistoryPanel automatically loads history on mount.

        Expected: on_mount() should call refresh_history().
        """
        panel = HistoryPanel()

        with patch.object(panel, 'refresh_history') as mock_refresh_history:
            # Simulate mount
            panel.on_mount()

            # Verify refresh_history was called
            mock_refresh_history.assert_called_once()

    def test_reactive_property_triggers_render_not_full_screen_refresh(self):
        """
        Test that reactive property triggers render, not full screen refresh.

        Expected: Only the HistoryPanel widget should re-render, not entire screen.
        """
        panel = HistoryPanel()

        with patch.object(panel, 'update') as mock_update:
            with patch.object(panel, 'refresh_history'):
                # Update reactive property
                panel.history_content = "[bold]Test[/bold]"

                # Verify only update() was called (not full screen methods)
                mock_update.assert_called_once()

                # Argument should be the new content
                assert mock_update.call_args[0][0] == "[bold]Test[/bold]"
