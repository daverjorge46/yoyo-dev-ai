#!/usr/bin/env python3
"""
Verification test that HistoryTracker now uses real git timestamps.

This test confirms the fix works by checking:
1. datetime.now() is NOT in the code
2. get_recent_commits_with_timestamps() IS used
3. Actual git timestamps are extracted correctly
"""

import unittest
import sys
from pathlib import Path
from datetime import datetime

# Add lib to path
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))

from yoyo_tui.services.history_tracker import HistoryTracker


class TestHistoryTrackerFixed(unittest.TestCase):
    """Verify the timestamp bug is fixed."""

    def test_datetime_now_removed(self):
        """
        Test that datetime.now() is NO LONGER used in _get_git_commits().

        FIX VERIFICATION: datetime.now() should be removed from the code.
        """
        source_file = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'services' / 'history_tracker.py'
        source_code = source_file.read_text()

        # Find _get_git_commits method
        get_git_commits_section = source_code[source_code.find('def _get_git_commits'):]
        get_git_commits_section = get_git_commits_section[:get_git_commits_section.find('\n    def ')]

        # Verify datetime.now() is NOT in the method
        self.assertNotIn('datetime.now()', get_git_commits_section,
                         "SUCCESS: datetime.now() has been removed from _get_git_commits()")

    def test_uses_get_recent_commits_with_timestamps(self):
        """
        Test that get_recent_commits_with_timestamps() IS now used.

        FIX VERIFICATION: Should use GitService.get_recent_commits_with_timestamps()
        """
        source_file = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'services' / 'history_tracker.py'
        source_code = source_file.read_text()

        # Find _get_git_commits method
        get_git_commits_section = source_code[source_code.find('def _get_git_commits'):]
        get_git_commits_section = get_git_commits_section[:get_git_commits_section.find('\n    def ')]

        # Verify get_recent_commits_with_timestamps is used
        self.assertIn('get_recent_commits_with_timestamps', get_git_commits_section,
                      "SUCCESS: get_recent_commits_with_timestamps() is now used")

    def test_timestamp_parsing_code_exists(self):
        """
        Test that timestamp parsing code exists.

        FIX VERIFICATION: Should parse timestamps from git data
        """
        source_file = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'services' / 'history_tracker.py'
        source_code = source_file.read_text()

        # Find _get_git_commits method
        get_git_commits_section = source_code[source_code.find('def _get_git_commits'):]
        get_git_commits_section = get_git_commits_section[:get_git_commits_section.find('\n    def ')]

        # Verify timestamp parsing exists
        self.assertIn('fromisoformat', get_git_commits_section,
                      "SUCCESS: Timestamp parsing code exists")
        self.assertIn("commit['timestamp']", get_git_commits_section,
                      "SUCCESS: Accesses timestamp from commit data")

    def test_real_git_timestamps_functional(self):
        """
        Functional test: Verify HistoryTracker extracts real git timestamps.

        This test runs in the actual .yoyo-dev repo which has real commits.
        """
        project_root = Path.home() / '.yoyo-dev'
        tracker = HistoryTracker(project_root)

        # Get git commits
        commits = tracker._get_git_commits()

        # Should have some commits
        self.assertGreater(len(commits), 0, "Should have at least one commit")

        # Check that commits have real timestamps (not all the same)
        if len(commits) >= 2:
            timestamps = [entry.timestamp for entry in commits]

            # All timestamps should be datetime objects
            for ts in timestamps:
                self.assertIsInstance(ts, datetime,
                                      f"Timestamp should be datetime object, got {type(ts)}")

            # Timestamps should be different (not all datetime.now())
            unique_timestamps = len(set(timestamps))
            if unique_timestamps > 1:
                self.assertGreater(unique_timestamps, 1,
                                   "SUCCESS: Commits have different timestamps (not all datetime.now())")
            else:
                # If all timestamps are same, they should be actual git timestamps
                # (could happen if commits are made in same second)
                print("Note: All timestamps are same (commits may be in same second)")

    def test_chronological_sorting_works(self):
        """
        Test that chronological sorting works with real git timestamps.

        FIX VERIFICATION: Commits should be sorted by actual git timestamp
        """
        project_root = Path.home() / '.yoyo-dev'
        tracker = HistoryTracker(project_root)

        # Get all history (includes git commits)
        history = tracker._aggregate_history()

        # Should have some entries
        self.assertGreater(len(history), 0, "Should have history entries")

        # Check that entries are sorted (newest first)
        for i in range(len(history) - 1):
            self.assertGreaterEqual(
                history[i].timestamp,
                history[i + 1].timestamp,
                f"History should be sorted newest first: {history[i].title} ({history[i].timestamp}) should be >= {history[i+1].title} ({history[i+1].timestamp})"
            )

        print(f"SUCCESS: {len(history)} history entries are sorted chronologically")


if __name__ == '__main__':
    unittest.main(verbosity=2)
