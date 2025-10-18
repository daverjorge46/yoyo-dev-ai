#!/usr/bin/env python3
"""
Simplified test for HistoryTracker timestamp bug.

Bug #2: HistoryTracker uses datetime.now() instead of actual git commit timestamps.

This simplified test directly verifies the code behavior without complex mocking.
"""

import unittest
import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))

from yoyo_tui.services.history_tracker import HistoryTracker


class TestHistoryTrackerTimestampBug(unittest.TestCase):
    """Verify the timestamp bug exists by examining the code."""

    def test_get_git_commits_uses_datetime_now(self):
        """
        Test that _get_git_commits() uses datetime.now() for timestamps.

        EXPECTED: Should extract actual git commit timestamps
        ACTUAL: Uses datetime.now() for all commits (line 162 in history_tracker.py)

        BUG CONFIRMED: Examining the source code shows datetime.now() is used.
        """
        # Read the source code
        source_file = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'services' / 'history_tracker.py'
        source_code = source_file.read_text()

        # Verify the bug exists in source code
        self.assertIn('datetime.now()', source_code,
                      "Bug confirmed: datetime.now() is used in history_tracker.py")

        # Verify the problematic code is in _get_git_commits method
        get_git_commits_section = source_code[source_code.find('def _get_git_commits'):]
        get_git_commits_section = get_git_commits_section[:get_git_commits_section.find('\n    def ')]

        self.assertIn('datetime.now()', get_git_commits_section,
                      "BUG: _get_git_commits() method uses datetime.now() instead of git timestamps")

        # Verify the comment that acknowledges this is a hack
        self.assertIn('approximate timestamp', source_code,
                      "Code comment admits timestamps are 'approximate' (actually wrong)")

    def test_code_comment_admits_timestamp_issue(self):
        """
        Test that code comments acknowledge the timestamp problem.

        The code has a comment saying git timestamps should be used in production,
        proving the developer knew this was wrong.
        """
        source_file = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'services' / 'history_tracker.py'
        source_code = source_file.read_text()

        # Find the comment about production timestamps
        self.assertIn('get_recent_commits_with_timestamps', source_code,
                      "Code mentions get_recent_commits_with_timestamps() should be used")

        self.assertIn('could be used for exact timestamps', source_code,
                      "Code admits current timestamps are not exact")

    def test_expected_fix_documented(self):
        """
        Document the expected fix.

        FIX: Replace get_recent_commits() with get_recent_commits_with_timestamps()
        and use actual git timestamps instead of datetime.now()
        """
        expected_fix = """
        Should use:
            commit_data = GitService.get_recent_commits_with_timestamps(
                self.project_root,
                count=5
            )

            for msg, timestamp in commit_data:
                entries.append(HistoryEntry(
                    type=HistoryType.COMMIT,
                    timestamp=timestamp,  # Real git timestamp
                    title=msg,
                    description="",
                    source_path=None
                ))
        """

        # This test always passes - it documents the expected fix
        self.assertTrue(True, f"Expected fix: {expected_fix}")


if __name__ == '__main__':
    unittest.main()
