"""
Tests for HistoryTracker service.

Tests the aggregation of project history from multiple sources:
- Git commit history with real timestamps
- Spec folders
- Fix folders
- Recap files

Focus: Git timestamp fix (using get_recent_commits_with_timestamps())
"""

import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

from yoyo_tui.services.history_tracker import HistoryTracker, HistoryEntry, HistoryType


class TestHistoryTrackerGitTimestamps(unittest.TestCase):
    """Test HistoryTracker git commit retrieval with real timestamps."""

    def setUp(self):
        """Set up test fixtures."""
        self.project_root = Path("/tmp/test_project")
        self.tracker = HistoryTracker(self.project_root)

    def test_get_git_commits_uses_timestamps_method(self):
        """Test that _get_git_commits() calls get_recent_commits_with_timestamps()."""
        # Mock GitService methods
        with patch('yoyo_tui.services.history_tracker.GitService') as mock_git:
            mock_git.is_git_repo.return_value = True
            mock_git.get_recent_commits_with_timestamps.return_value = [
                {
                    'hash': 'abc123',
                    'timestamp': '2025-10-17T14:30:00-07:00',
                    'message': 'feat: add new feature'
                },
                {
                    'hash': 'def456',
                    'timestamp': '2025-10-17T10:15:00-07:00',
                    'message': 'fix: resolve bug'
                }
            ]

            # Execute
            entries = self.tracker._get_git_commits()

            # Verify get_recent_commits_with_timestamps was called
            mock_git.get_recent_commits_with_timestamps.assert_called_once_with(
                self.project_root,
                count=5
            )

            # Verify entries were created correctly
            self.assertEqual(len(entries), 2)

            # First entry
            self.assertEqual(entries[0].type, HistoryType.COMMIT)
            self.assertEqual(entries[0].title, 'feat: add new feature')
            self.assertIsInstance(entries[0].timestamp, datetime)

            # Second entry
            self.assertEqual(entries[1].type, HistoryType.COMMIT)
            self.assertEqual(entries[1].title, 'fix: resolve bug')
            self.assertIsInstance(entries[1].timestamp, datetime)

    def test_git_commits_parse_iso_timestamps_correctly(self):
        """Test that ISO 8601 timestamps are parsed correctly."""
        with patch('yoyo_tui.services.history_tracker.GitService') as mock_git:
            mock_git.is_git_repo.return_value = True
            mock_git.get_recent_commits_with_timestamps.return_value = [
                {
                    'hash': 'abc123',
                    'timestamp': '2025-10-17T14:30:00-07:00',
                    'message': 'Recent commit'
                }
            ]

            # Execute
            entries = self.tracker._get_git_commits()

            # Verify timestamp was parsed from ISO format
            self.assertEqual(len(entries), 1)
            entry = entries[0]

            # Check timestamp is a datetime object (not datetime.now())
            self.assertIsInstance(entry.timestamp, datetime)

            # Verify it's the correct parsed timestamp (not current time)
            # The timestamp should be October 17, 2025, 14:30
            self.assertEqual(entry.timestamp.year, 2025)
            self.assertEqual(entry.timestamp.month, 10)
            self.assertEqual(entry.timestamp.day, 17)
            self.assertEqual(entry.timestamp.hour, 14)
            self.assertEqual(entry.timestamp.minute, 30)

    def test_chronological_sorting_with_varied_timestamps(self):
        """Test that history entries are sorted chronologically (newest first)."""
        with patch('yoyo_tui.services.history_tracker.GitService') as mock_git:
            mock_git.is_git_repo.return_value = True

            # Create commits with varied timestamps (not in order)
            mock_git.get_recent_commits_with_timestamps.return_value = [
                {
                    'hash': 'commit1',
                    'timestamp': '2025-10-15T10:00:00-07:00',  # Oldest
                    'message': 'Old commit'
                },
                {
                    'hash': 'commit2',
                    'timestamp': '2025-10-17T14:00:00-07:00',  # Newest
                    'message': 'Recent commit'
                },
                {
                    'hash': 'commit3',
                    'timestamp': '2025-10-16T12:00:00-07:00',  # Middle
                    'message': 'Middle commit'
                }
            ]

            # Execute aggregation (which includes sorting)
            all_entries = self.tracker._aggregate_history()

            # Verify entries are sorted newest first
            self.assertEqual(len(all_entries), 3)

            # Should be in reverse chronological order
            self.assertEqual(all_entries[0].title, 'Recent commit')  # 2025-10-17
            self.assertEqual(all_entries[1].title, 'Middle commit')   # 2025-10-16
            self.assertEqual(all_entries[2].title, 'Old commit')      # 2025-10-15

    def test_git_timestamps_not_using_datetime_now(self):
        """Test that git commits don't use datetime.now() as fallback."""
        with patch('yoyo_tui.services.history_tracker.GitService') as mock_git:
            mock_git.is_git_repo.return_value = True

            # Set up commit with specific old timestamp
            old_timestamp = '2025-01-15T10:00:00-07:00'
            mock_git.get_recent_commits_with_timestamps.return_value = [
                {
                    'hash': 'abc123',
                    'timestamp': old_timestamp,
                    'message': 'Old commit from January'
                }
            ]

            # Execute
            entries = self.tracker._get_git_commits()

            # Verify timestamp is from January, not current time
            self.assertEqual(len(entries), 1)
            entry = entries[0]

            # Should be January 2025, not current datetime
            self.assertEqual(entry.timestamp.year, 2025)
            self.assertEqual(entry.timestamp.month, 1)
            self.assertEqual(entry.timestamp.day, 15)

            # Verify it's NOT today's date (would fail if using datetime.now())
            today = datetime.now()
            self.assertNotEqual(entry.timestamp.date(), today.date())

    def test_empty_git_log_returns_empty_list(self):
        """Test that empty git log returns empty list."""
        with patch('yoyo_tui.services.history_tracker.GitService') as mock_git:
            mock_git.is_git_repo.return_value = True
            mock_git.get_recent_commits_with_timestamps.return_value = []

            # Execute
            entries = self.tracker._get_git_commits()

            # Verify empty list
            self.assertEqual(len(entries), 0)

    def test_not_git_repo_returns_empty_list(self):
        """Test that non-git repo returns empty list."""
        with patch('yoyo_tui.services.history_tracker.GitService') as mock_git:
            mock_git.is_git_repo.return_value = False

            # Execute
            entries = self.tracker._get_git_commits()

            # Verify empty list
            self.assertEqual(len(entries), 0)

            # Verify get_recent_commits_with_timestamps was NOT called
            mock_git.get_recent_commits_with_timestamps.assert_not_called()

    def test_git_service_exception_handled_gracefully(self):
        """Test that GitService exceptions are handled gracefully."""
        with patch('yoyo_tui.services.history_tracker.GitService') as mock_git:
            mock_git.is_git_repo.return_value = True
            mock_git.get_recent_commits_with_timestamps.side_effect = Exception("Git error")

            # Execute (should not raise)
            entries = self.tracker._get_git_commits()

            # Verify empty list returned
            self.assertEqual(len(entries), 0)

    def test_malformed_timestamp_handled_gracefully(self):
        """Test that malformed timestamps are handled gracefully."""
        with patch('yoyo_tui.services.history_tracker.GitService') as mock_git:
            mock_git.is_git_repo.return_value = True
            mock_git.get_recent_commits_with_timestamps.return_value = [
                {
                    'hash': 'abc123',
                    'timestamp': 'invalid-timestamp',
                    'message': 'Commit with bad timestamp'
                }
            ]

            # Execute (should handle gracefully)
            entries = self.tracker._get_git_commits()

            # Should either skip the entry or handle gracefully
            # (Implementation can choose to skip or use fallback)
            # For now, we expect it to be handled without crashing
            self.assertIsInstance(entries, list)


class TestHistoryTrackerChronologicalSorting(unittest.TestCase):
    """Test chronological sorting of mixed history sources."""

    def setUp(self):
        """Set up test fixtures."""
        self.project_root = Path("/tmp/test_project")
        self.tracker = HistoryTracker(self.project_root)

    def test_mixed_sources_sorted_chronologically(self):
        """Test that git commits, specs, fixes, and recaps are sorted together."""
        with patch('yoyo_tui.services.history_tracker.GitService') as mock_git:
            mock_git.is_git_repo.return_value = True

            # Git commits with varied dates
            mock_git.get_recent_commits_with_timestamps.return_value = [
                {
                    'hash': 'commit1',
                    'timestamp': '2025-10-17T10:00:00-07:00',
                    'message': 'Recent commit'
                },
                {
                    'hash': 'commit2',
                    'timestamp': '2025-10-15T10:00:00-07:00',
                    'message': 'Old commit'
                }
            ]

            # Mock specs directory (would need actual filesystem mocking for full test)
            # For now, just test git commits are sorted correctly
            entries = self.tracker._aggregate_history()

            # Verify newest first
            self.assertTrue(len(entries) >= 2)
            self.assertEqual(entries[0].title, 'Recent commit')
            self.assertEqual(entries[1].title, 'Old commit')


if __name__ == '__main__':
    unittest.main()
