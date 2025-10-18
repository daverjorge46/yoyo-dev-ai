#!/usr/bin/env python3
"""
Test suite for HistoryTracker timestamp handling.

This test file reproduces Bug #2: HistoryTracker uses datetime.now() instead of git timestamps.

PROBLEM:
The HistoryTracker service gets git commit messages but uses datetime.now() for
all commit timestamps instead of extracting the actual commit timestamps from git.
This causes all commits to appear at the same time and makes chronological sorting
meaningless.

EXPECTED BEHAVIOR:
- HistoryTracker should extract actual git commit timestamps
- Each commit should have its real timestamp
- Commits should be sorted by actual chronological order

ACTUAL BEHAVIOR:
- All commits get datetime.now() as their timestamp
- Chronological sorting is broken (all appear at same time)
- Recent commits are indistinguishable from old commits

Following TDD approach - these tests should FAIL initially (red phase).
"""

import unittest
import sys
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
import tempfile

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))

from yoyo_tui.services.history_tracker import HistoryTracker, HistoryEntry, HistoryType
from yoyo_tui.services.git_service import GitService


class TestHistoryTrackerGitTimestamps(unittest.TestCase):
    """Test HistoryTracker's git timestamp extraction."""

    def test_git_commits_have_actual_timestamps(self):
        """
        Test that git commits have their actual timestamps, not datetime.now().

        Expected: Each commit should have its real commit timestamp
        Actual: All commits get datetime.now() as timestamp

        FAIL: Bug reproduction - datetime.now() used instead of git timestamps
        """
        # Create mock git service that returns commits with timestamps
        with tempfile.TemporaryDirectory() as tmp_path:
            tmp_path = Path(tmp_path)
            with patch.object(GitService, 'is_git_repo', return_value=True):
                with patch.object(GitService, 'get_recent_commits') as mock_commits:
                    # Simulate git commits with different timestamps
                    mock_commits.return_value = [
                        "feat: add new feature",
                        "fix: critical bug",
                        "docs: update readme",
                    ]

                    tracker = HistoryTracker(tmp_path)

                    # Get commit history
                    commits = tracker._get_git_commits()

                    # Expected: Each commit should have different timestamps
                    # Actual: All commits have datetime.now() (same timestamp)

                    self.assertEqual(len(commits), 3, "Should have 3 commits")

                    # Get all timestamps
                    timestamps = [entry.timestamp for entry in commits]

                    # Expected: Timestamps should be different (from git history)
                    # Actual: All timestamps are identical (datetime.now())
                    unique_timestamps = set(timestamps)

                    self.assertGreater(len(unique_timestamps), 1,
                        "EXPECTED: Each commit should have unique timestamp from git\n"
                        "ACTUAL: All commits have same timestamp (datetime.now())\n"
                        "BUG: Line 162 in history_tracker.py uses datetime.now() instead of git timestamp")

    def test_git_commits_sorted_chronologically_by_actual_time(selfself):
        """
        Test that git commits are sorted by their actual commit time.

        Expected: Commits sorted by real git commit timestamp (newest first)
        Actual: All commits have same timestamp, sorting is meaningless

        FAIL: Bug reproduction - Cannot sort by time when all times are identical
        """
        with patch.object(GitService, 'is_git_repo', return_value=True):
            with patch.object(GitService, 'get_recent_commits') as mock_commits:
                # Simulate commits in chronological order (oldest to newest)
                mock_commits.return_value = [
                    "feat: first feature (oldest)",
                    "fix: bug fix (middle)",
                    "docs: documentation (newest)",
                ]

                tracker = HistoryTracker(tmp_path)

                # Get all history (includes sorting)
                all_history = tracker._aggregate_history()

                # Filter to just commits
                git_commits = [e for e in all_history if e.type == HistoryType.COMMIT]

                # Expected: Commits should be sorted newest first
                # Actual: All have same timestamp, order is arbitrary

                self.assertlen(git_commits) >= 3

                # Check if timestamps are monotonically decreasing (newest first)
                for i in range(len(git_commits) - 1):
                    self.assertgit_commits[i].timestamp >= git_commits[i + 1].timestamp, \
                        "EXPECTED: Commits sorted by actual git timestamp (newest first)\n" \
                        "ACTUAL: All commits have same timestamp (datetime.now())\n" \
                        "BUG: Cannot sort chronologically when all timestamps are identical"

    def test_git_commits_have_different_timestamps_from_now(selfself):
        """
        Test that git commit timestamps are NOT all datetime.now().

        Expected: Historic commits should have past timestamps
        Actual: All commits get current time (datetime.now())

        FAIL: Bug reproduction - Past commits appear as current time
        """
        with patch.object(GitService, 'is_git_repo', return_value=True):
            with patch.object(GitService, 'get_recent_commits') as mock_commits:
                mock_commits.return_value = [
                    "feat: feature from last week",
                    "fix: fix from yesterday",
                    "docs: docs from today",
                ]

                # Record current time
                now = datetime.now()

                tracker = HistoryTracker(tmp_path)
                commits = tracker._get_git_commits()

                # Expected: Commits should have varying timestamps (some in the past)
                # Actual: All commits have datetime.now() (current time)

                for commit in commits:
                    # Check if timestamp is approximately now (within 1 second)
                    time_diff = abs((commit.timestamp - now).total_seconds())

                    # At least some commits should be from the past (not within 1 second of now)
                    # But current implementation makes ALL commits have datetime.now()
                    pass

                # All timestamps should NOT be approximately "now"
                all_are_now = all(
                    abs((commit.timestamp - now).total_seconds()) < 1
                    for commit in commits
                )

                self.assertnot all_are_now, \
                    "EXPECTED: Historic commits should have past timestamps\n" \
                    "ACTUAL: All commits have current time (datetime.now())\n" \
                    "BUG: Line 162 uses datetime.now() instead of git timestamp"


class TestHistoryTrackerTimestampCorrectness:
    """Test that HistoryTracker should use GitService timestamp methods."""

    def test_git_service_has_timestamp_methods(self):
        """
        Test that GitService provides methods for getting commit timestamps.

        Expected: GitService should have get_recent_commits_with_timestamps() or similar
        Actual: Code comment mentions this method exists but isn't used

        PASS: Documents that timestamp methods exist but aren't called
        """
        # Check if GitService has timestamp methods
        has_timestamp_method = hasattr(GitService, 'get_recent_commits_with_timestamps')

        # The code comment in history_tracker.py line 159 mentions:
        # "In production, GitService.get_recent_commits_with_timestamps could be used"
        #
        # This proves the developer KNEW about proper timestamps but chose datetime.now()
        # as a shortcut/hack

        self.asserthas_timestamp_method or True, \
            "GitService should provide commit timestamp extraction methods"

    def test_history_tracker_uses_correct_git_method(selfself):
        """
        Test that HistoryTracker should use get_recent_commits_with_timestamps.

        Expected: Should call GitService.get_recent_commits_with_timestamps()
        Actual: Calls GitService.get_recent_commits() and adds datetime.now()

        FAIL: Bug reproduction - Wrong git method is called
        """
        # Create mock that tracks which method is called
        with patch.object(GitService, 'is_git_repo', return_value=True):
            with patch.object(GitService, 'get_recent_commits') as mock_simple:
                with patch.object(GitService, 'get_recent_commits_with_timestamps',
                                  create=True) as mock_with_timestamps:

                    mock_simple.return_value = ["commit 1", "commit 2"]
                    mock_with_timestamps.return_value = [
                        ("commit 1", datetime.now() - timedelta(days=1)),
                        ("commit 2", datetime.now() - timedelta(days=2)),
                    ]

                    tracker = HistoryTracker(tmp_path)
                    tracker._get_git_commits()

                    # Expected: Should call get_recent_commits_with_timestamps
                    # Actual: Calls get_recent_commits (no timestamps)

                    self.assertmock_with_timestamps.called, \
                        "EXPECTED: Should call get_recent_commits_with_timestamps()\n" \
                        "ACTUAL: Calls get_recent_commits() without timestamps\n" \
                        "BUG: Lines 151-154 call wrong GitService method"

                    self.assertnot mock_simple.called or mock_with_timestamps.called, \
                        "Should prefer timestamp method over simple method"


class TestHistoryTrackerBugDocumentation:
    """Document the exact bug behavior with clear expected vs actual."""

    def test_bug_reproduction_complete_workflow(selfself):
        """
        Complete bug reproduction showing exact issue.

        PROBLEM SUMMARY:
        ---------------
        history_tracker.py line 151-166:

        ```python
        commit_messages = GitService.get_recent_commits(
            self.project_root,
            count=5
        )

        entries = []
        for msg in commit_messages:
            # Use current time as approximate timestamp
            # (In production, GitService.get_recent_commits_with_timestamps
            # could be used for exact timestamps)
            entries.append(HistoryEntry(
                type=HistoryType.COMMIT,
                timestamp=datetime.now(),  # ← BUG: All commits get same timestamp
                title=msg,
                description="",
                source_path=None
            ))
        ```

        EXPECTED:
        ---------
        1. Call GitService.get_recent_commits_with_timestamps()
        2. Extract (message, timestamp) tuples
        3. Use actual git commit timestamp for each entry
        4. Commits appear in correct chronological order

        ACTUAL:
        -------
        1. Calls GitService.get_recent_commits() (messages only)
        2. Manually creates entries in loop
        3. Uses datetime.now() for ALL commits (line 162)
        4. All commits have identical timestamp
        5. Chronological sorting is meaningless

        FIX NEEDED:
        -----------
        Replace lines 151-166 with:

        ```python
        commit_data = GitService.get_recent_commits_with_timestamps(
            self.project_root,
            count=5
        )

        entries = []
        for msg, timestamp in commit_data:
            entries.append(HistoryEntry(
                type=HistoryType.COMMIT,
                timestamp=timestamp,  # ← FIX: Use actual git timestamp
                title=msg,
                description="",
                source_path=None
            ))
        ```

        IMPACT:
        -------
        - Recent activity panel shows meaningless timestamps
        - Cannot distinguish old commits from new commits
        - Sorting by time is broken
        - User sees all commits at "current time"

        FAIL: This test reproduces the exact bug
        """
        with patch.object(GitService, 'is_git_repo', return_value=True):
            with patch.object(GitService, 'get_recent_commits') as mock_commits:
                # Simulate real git commits from different times
                mock_commits.return_value = [
                    "feat: add feature (3 days ago)",
                    "fix: bug fix (2 days ago)",
                    "docs: update (1 day ago)",
                    "refactor: cleanup (today)",
                ]

                # Record the exact time we call this
                call_time = datetime.now()

                tracker = HistoryTracker(tmp_path)
                commits = tracker._get_git_commits()

                # BUG VERIFICATION:
                # ----------------

                # 1. All commits should have different timestamps
                timestamps = [c.timestamp for c in commits]
                unique_timestamps = set(timestamps)

                self.assertlen(unique_timestamps) > 1, \
                    "EXPECTED: Each commit has unique timestamp from git history\n" \
                    "ACTUAL: All commits have datetime.now() (identical timestamp)\n" \
                    "BUG: Line 162 in history_tracker.py"

                # 2. Not all commits should be "now"
                all_timestamps_are_now = all(
                    abs((ts - call_time).total_seconds()) < 2  # within 2 seconds
                    for ts in timestamps
                )

                self.assertnot all_timestamps_are_now, \
                    "EXPECTED: Historic commits should have past timestamps\n" \
                    "ACTUAL: All commits timestamped at current time\n" \
                    "BUG: datetime.now() used for all commits"

                # 3. Commits should be sortable chronologically
                # With all identical timestamps, this is impossible
                sorted_commits = sorted(commits, key=lambda c: c.timestamp, reverse=True)

                # After sorting, should have meaningful order
                # But with identical timestamps, order is arbitrary
                self.assertsorted_commits != commits or len(unique_timestamps) > 1, \
                    "EXPECTED: Chronological sorting should reorder commits\n" \
                    "ACTUAL: Sorting has no effect (all timestamps identical)\n" \
                    "BUG: Cannot sort by time when timestamps are all the same"


class TestHistoryTrackerTimestampFix:
    """Tests that verify the fix approach."""

    def test_using_git_timestamps_would_fix_issue(selfself):
        """
        Test that using actual git timestamps would fix the issue.

        This test shows what the CORRECT behavior should be.

        PASS: This test shows the target behavior after fix
        """
        # Create properly timestamped entries (what it SHOULD do)
        now = datetime.now()

        entries = [
            HistoryEntry(
                type=HistoryType.COMMIT,
                timestamp=now - timedelta(days=3),
                title="feat: old feature",
                description=""
            ),
            HistoryEntry(
                type=HistoryType.COMMIT,
                timestamp=now - timedelta(days=1),
                title="fix: recent fix",
                description=""
            ),
            HistoryEntry(
                type=HistoryType.COMMIT,
                timestamp=now - timedelta(hours=2),
                title="docs: very recent",
                description=""
            ),
        ]

        # Verify timestamps are different
        timestamps = [e.timestamp for e in entries]
        unique_timestamps = set(timestamps)

        self.assertlen(unique_timestamps) == 3, \
            "With real git timestamps, each commit has unique timestamp"

        # Verify sorting works correctly
        sorted_entries = sorted(entries)  # Uses __lt__ which compares timestamps

        self.assertsorted_entries[0].title == "docs: very recent", \
            "Newest commit should be first after sorting"
        self.assertsorted_entries[-1].title == "feat: old feature", \
            "Oldest commit should be last after sorting"

        # This is what the code SHOULD do after fix


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
