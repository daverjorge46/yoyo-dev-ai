"""
Tests for HistoryTracker service.

Tests unified history aggregation from multiple sources:
- Git commit history
- Spec files
- Fix files
- Recap files

Tests filtering, sorting, and chronological ordering.
"""

import pytest
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock
from lib.yoyo_tui.services.history_tracker import HistoryTracker, HistoryEntry, HistoryType


class TestHistoryTracker:
    """Test suite for HistoryTracker."""

    def test_history_tracker_initialization(self):
        """Test HistoryTracker initializes correctly."""
        tracker = HistoryTracker(Path("/test/project"))

        assert tracker.project_root == Path("/test/project")

    def test_get_recent_actions_returns_list(self):
        """Test get_recent_actions returns a list of HistoryEntry objects."""
        tracker = HistoryTracker(Path("/test/project"))

        with patch.object(tracker, '_aggregate_history') as mock_aggregate:
            mock_aggregate.return_value = []

            result = tracker.get_recent_actions(count=3)

            assert isinstance(result, list)
            mock_aggregate.assert_called_once()

    def test_get_recent_actions_limits_results(self):
        """Test get_recent_actions respects count parameter."""
        tracker = HistoryTracker(Path("/test/project"))

        # Mock 10 history entries
        mock_entries = [
            HistoryEntry(
                type=HistoryType.COMMIT,
                timestamp=datetime(2025, 10, 17, 12, i),
                title=f"Commit {i}",
                description=f"Description {i}",
                source_path=None
            )
            for i in range(10)
        ]

        with patch.object(tracker, '_aggregate_history') as mock_aggregate:
            mock_aggregate.return_value = mock_entries

            # Request only 3
            result = tracker.get_recent_actions(count=3)

            assert len(result) == 3

    def test_aggregate_history_combines_all_sources(self):
        """Test _aggregate_history combines commits, specs, fixes, and recaps."""
        tracker = HistoryTracker(Path("/test/project"))

        with patch.object(tracker, '_get_git_commits') as mock_git, \
             patch.object(tracker, '_get_specs') as mock_specs, \
             patch.object(tracker, '_get_fixes') as mock_fixes, \
             patch.object(tracker, '_get_recaps') as mock_recaps:

            # Mock each source returning 2 entries
            mock_git.return_value = [Mock(timestamp=datetime(2025, 10, 17, 12, 0))] * 2
            mock_specs.return_value = [Mock(timestamp=datetime(2025, 10, 17, 11, 0))] * 2
            mock_fixes.return_value = [Mock(timestamp=datetime(2025, 10, 17, 10, 0))] * 2
            mock_recaps.return_value = [Mock(timestamp=datetime(2025, 10, 17, 9, 0))] * 2

            result = tracker._aggregate_history()

            # Should combine all sources (8 total)
            assert len(result) == 8
            mock_git.assert_called_once()
            mock_specs.assert_called_once()
            mock_fixes.assert_called_once()
            mock_recaps.assert_called_once()

    def test_aggregate_history_sorts_chronologically(self):
        """Test _aggregate_history sorts entries by timestamp (newest first)."""
        tracker = HistoryTracker(Path("/test/project"))

        # Create entries with different timestamps
        entry1 = HistoryEntry(
            type=HistoryType.COMMIT,
            timestamp=datetime(2025, 10, 17, 10, 0),
            title="Oldest",
            description="",
            source_path=None
        )
        entry2 = HistoryEntry(
            type=HistoryType.SPEC,
            timestamp=datetime(2025, 10, 17, 12, 0),
            title="Newest",
            description="",
            source_path=None
        )
        entry3 = HistoryEntry(
            type=HistoryType.FIX,
            timestamp=datetime(2025, 10, 17, 11, 0),
            title="Middle",
            description="",
            source_path=None
        )

        with patch.object(tracker, '_get_git_commits') as mock_git, \
             patch.object(tracker, '_get_specs') as mock_specs, \
             patch.object(tracker, '_get_fixes') as mock_fixes, \
             patch.object(tracker, '_get_recaps') as mock_recaps:

            # Return entries out of order
            mock_git.return_value = [entry1]
            mock_specs.return_value = [entry2]
            mock_fixes.return_value = [entry3]
            mock_recaps.return_value = []

            result = tracker._aggregate_history()

            # Should be sorted newest first
            assert len(result) == 3
            assert result[0].title == "Newest"
            assert result[1].title == "Middle"
            assert result[2].title == "Oldest"

    def test_get_git_commits_calls_git_service(self):
        """Test _get_git_commits calls GitService to get recent commits."""
        tracker = HistoryTracker(Path("/test/project"))

        with patch('lib.yoyo_tui.services.history_tracker.GitService') as mock_git_service:
            mock_git_service.get_recent_commits.return_value = [
                "feat: Add feature X",
                "fix: Fix bug Y",
                "docs: Update README"
            ]
            mock_git_service.is_git_repo.return_value = True

            result = tracker._get_git_commits()

            # Should return 3 HistoryEntry objects
            assert len(result) == 3
            assert all(entry.type == HistoryType.COMMIT for entry in result)
            assert result[0].title == "feat: Add feature X"
            mock_git_service.get_recent_commits.assert_called_once_with(
                Path("/test/project"),
                count=5
            )

    def test_get_git_commits_handles_non_git_repo(self):
        """Test _get_git_commits returns empty list for non-git repos."""
        tracker = HistoryTracker(Path("/test/project"))

        with patch('lib.yoyo_tui.services.history_tracker.GitService') as mock_git_service:
            mock_git_service.is_git_repo.return_value = False

            result = tracker._get_git_commits()

            assert result == []

    def test_get_specs_reads_spec_folders(self):
        """Test _get_specs reads spec folder names from .yoyo-dev/specs/."""
        tracker = HistoryTracker(Path("/test/project"))

        # Mock spec directories
        mock_specs_dir = MagicMock()
        mock_specs_dir.exists.return_value = True
        mock_specs_dir.is_dir.return_value = True
        mock_specs_dir.iterdir.return_value = [
            MagicMock(
                name="2025-10-17-feature-x",
                is_dir=lambda: True,
                __str__=lambda self: "2025-10-17-feature-x"
            ),
            MagicMock(
                name="2025-10-16-feature-y",
                is_dir=lambda: True,
                __str__=lambda self: "2025-10-16-feature-y"
            ),
        ]

        with patch.object(Path, 'exists') as mock_exists, \
             patch.object(Path, 'is_dir') as mock_is_dir, \
             patch.object(Path, 'iterdir') as mock_iterdir:

            mock_exists.return_value = True
            mock_is_dir.return_value = True
            mock_iterdir.return_value = mock_specs_dir.iterdir.return_value

            result = tracker._get_specs()

            # Should return 2 HistoryEntry objects
            assert len(result) == 2
            assert all(entry.type == HistoryType.SPEC for entry in result)

    def test_get_specs_parses_date_from_folder_name(self):
        """Test _get_specs extracts date from folder name format YYYY-MM-DD-name."""
        tracker = HistoryTracker(Path("/test/project"))

        # Mock spec directory with date in name
        mock_dir = MagicMock()
        mock_dir.name = "2025-10-17-user-authentication"
        mock_dir.is_dir.return_value = True

        with patch.object(Path, 'exists') as mock_exists, \
             patch.object(Path, 'is_dir') as mock_is_dir, \
             patch.object(Path, 'iterdir') as mock_iterdir:

            mock_exists.return_value = True
            mock_is_dir.return_value = True
            mock_iterdir.return_value = [mock_dir]

            result = tracker._get_specs()

            # Should parse date correctly
            assert len(result) == 1
            assert result[0].timestamp.year == 2025
            assert result[0].timestamp.month == 10
            assert result[0].timestamp.day == 17
            assert "user-authentication" in result[0].title.lower()

    def test_get_fixes_reads_fix_folders(self):
        """Test _get_fixes reads fix folder names from .yoyo-dev/fixes/."""
        tracker = HistoryTracker(Path("/test/project"))

        # Mock fix directories
        mock_fix_dir = MagicMock()
        mock_fix_dir.name = "2025-10-17-bug-fix-auth"
        mock_fix_dir.is_dir.return_value = True

        with patch.object(Path, 'exists') as mock_exists, \
             patch.object(Path, 'is_dir') as mock_is_dir, \
             patch.object(Path, 'iterdir') as mock_iterdir:

            mock_exists.return_value = True
            mock_is_dir.return_value = True
            mock_iterdir.return_value = [mock_fix_dir]

            result = tracker._get_fixes()

            assert len(result) == 1
            assert result[0].type == HistoryType.FIX

    def test_get_recaps_reads_recap_files(self):
        """Test _get_recaps reads recap markdown files from .yoyo-dev/recaps/."""
        tracker = HistoryTracker(Path("/test/project"))

        # Mock recap files
        mock_recap = MagicMock()
        mock_recap.name = "2025-10-17-feature-completion.md"
        mock_recap.is_file.return_value = True
        mock_recap.suffix = ".md"

        with patch.object(Path, 'exists') as mock_exists, \
             patch.object(Path, 'is_dir') as mock_is_dir, \
             patch.object(Path, 'iterdir') as mock_iterdir:

            mock_exists.return_value = True
            mock_is_dir.return_value = True
            mock_iterdir.return_value = [mock_recap]

            result = tracker._get_recaps()

            assert len(result) == 1
            assert result[0].type == HistoryType.RECAP

    def test_get_recaps_extracts_pr_url_from_file(self):
        """Test _get_recaps extracts PR URL from recap file content."""
        tracker = HistoryTracker(Path("/test/project"))

        # Mock recap file with PR URL
        mock_recap = MagicMock()
        mock_recap.name = "2025-10-17-feature.md"
        mock_recap.is_file.return_value = True
        mock_recap.suffix = ".md"
        mock_recap.read_text.return_value = """
# Feature Recap

Some content here.

PR: https://github.com/user/repo/pull/123

More content.
"""

        with patch.object(Path, 'exists') as mock_exists, \
             patch.object(Path, 'is_dir') as mock_is_dir, \
             patch.object(Path, 'iterdir') as mock_iterdir, \
             patch.object(Path, 'read_text') as mock_read:

            mock_exists.return_value = True
            mock_is_dir.return_value = True
            mock_iterdir.return_value = [mock_recap]
            mock_read.return_value = mock_recap.read_text.return_value

            result = tracker._get_recaps()

            # Should extract PR URL
            assert len(result) == 1
            assert "https://github.com/user/repo/pull/123" in result[0].description

    def test_get_recaps_handles_missing_pr_url(self):
        """Test _get_recaps handles recap files without PR URLs gracefully."""
        tracker = HistoryTracker(Path("/test/project"))

        # Mock recap file without PR URL
        mock_recap = MagicMock()
        mock_recap.name = "2025-10-17-feature.md"
        mock_recap.is_file.return_value = True
        mock_recap.suffix = ".md"
        mock_recap.read_text.return_value = """
# Feature Recap

No PR URL in this file.
"""

        with patch.object(Path, 'exists') as mock_exists, \
             patch.object(Path, 'is_dir') as mock_is_dir, \
             patch.object(Path, 'iterdir') as mock_iterdir, \
             patch.object(Path, 'read_text') as mock_read:

            mock_exists.return_value = True
            mock_is_dir.return_value = True
            mock_iterdir.return_value = [mock_recap]
            mock_read.return_value = mock_recap.read_text.return_value

            result = tracker._get_recaps()

            # Should still create entry without PR URL
            assert len(result) == 1
            assert result[0].description == ""

    def test_history_entry_dataclass_attributes(self):
        """Test HistoryEntry dataclass has all required attributes."""
        entry = HistoryEntry(
            type=HistoryType.COMMIT,
            timestamp=datetime(2025, 10, 17, 12, 0),
            title="Test commit",
            description="Test description",
            source_path=Path("/test/file.py")
        )

        assert entry.type == HistoryType.COMMIT
        assert entry.timestamp == datetime(2025, 10, 17, 12, 0)
        assert entry.title == "Test commit"
        assert entry.description == "Test description"
        assert entry.source_path == Path("/test/file.py")

    def test_history_type_enum_values(self):
        """Test HistoryType enum has all expected values."""
        assert hasattr(HistoryType, 'COMMIT')
        assert hasattr(HistoryType, 'SPEC')
        assert hasattr(HistoryType, 'FIX')
        assert hasattr(HistoryType, 'RECAP')

    def test_get_recent_actions_returns_last_3_by_default(self):
        """Test get_recent_actions defaults to returning 3 entries."""
        tracker = HistoryTracker(Path("/test/project"))

        # Mock 10 entries
        mock_entries = [
            HistoryEntry(
                type=HistoryType.COMMIT,
                timestamp=datetime(2025, 10, 17, 12, i),
                title=f"Entry {i}",
                description="",
                source_path=None
            )
            for i in range(10)
        ]

        with patch.object(tracker, '_aggregate_history') as mock_aggregate:
            mock_aggregate.return_value = mock_entries

            # Call without count parameter
            result = tracker.get_recent_actions()

            # Should default to 3
            assert len(result) == 3

    def test_handles_empty_project_directory(self):
        """Test tracker handles project with no history gracefully."""
        tracker = HistoryTracker(Path("/empty/project"))

        with patch('lib.yoyo_tui.services.history_tracker.GitService') as mock_git, \
             patch.object(Path, 'exists') as mock_exists:

            # No git repo
            mock_git.is_git_repo.return_value = False
            # No specs/fixes/recaps directories
            mock_exists.return_value = False

            result = tracker.get_recent_actions()

            assert result == []

    def test_filters_invalid_date_formats(self):
        """Test tracker filters out folders with invalid date formats."""
        tracker = HistoryTracker(Path("/test/project"))

        # Mock directories with invalid date formats
        mock_dirs = [
            MagicMock(name="invalid-format", is_dir=lambda: True),
            MagicMock(name="2025-10-17-valid", is_dir=lambda: True),
            MagicMock(name="not-a-date-folder", is_dir=lambda: True),
        ]

        with patch.object(Path, 'exists') as mock_exists, \
             patch.object(Path, 'is_dir') as mock_is_dir, \
             patch.object(Path, 'iterdir') as mock_iterdir:

            mock_exists.return_value = True
            mock_is_dir.return_value = True
            mock_iterdir.return_value = mock_dirs

            result = tracker._get_specs()

            # Should only process valid date format
            assert len(result) == 1
            assert "valid" in result[0].title.lower()


class TestHistoryTrackerPerformance:
    """Test suite for HistoryTracker performance."""

    def test_get_recent_actions_is_efficient(self):
        """Test get_recent_actions doesn't process more than needed."""
        tracker = HistoryTracker(Path("/test/project"))

        # Mock 100 entries
        mock_entries = [
            HistoryEntry(
                type=HistoryType.COMMIT,
                timestamp=datetime(2025, 10, 17, 12, i),
                title=f"Entry {i}",
                description="",
                source_path=None
            )
            for i in range(100)
        ]

        with patch.object(tracker, '_aggregate_history') as mock_aggregate:
            mock_aggregate.return_value = mock_entries

            # Request only 3
            result = tracker.get_recent_actions(count=3)

            # Should limit to 3 (efficient slicing)
            assert len(result) == 3
            # Aggregate should still be called (returns all, then we slice)
            mock_aggregate.assert_called_once()


class TestHistoryTrackerEdgeCases:
    """Test suite for HistoryTracker edge cases."""

    def test_handles_corrupted_recap_files(self):
        """Test tracker handles corrupted/unreadable recap files gracefully."""
        tracker = HistoryTracker(Path("/test/project"))

        # Mock recap file that raises exception on read
        mock_recap = MagicMock()
        mock_recap.name = "2025-10-17-feature.md"
        mock_recap.is_file.return_value = True
        mock_recap.suffix = ".md"
        mock_recap.read_text.side_effect = IOError("File corrupted")

        with patch.object(Path, 'exists') as mock_exists, \
             patch.object(Path, 'is_dir') as mock_is_dir, \
             patch.object(Path, 'iterdir') as mock_iterdir, \
             patch.object(Path, 'read_text') as mock_read:

            mock_exists.return_value = True
            mock_is_dir.return_value = True
            mock_iterdir.return_value = [mock_recap]
            mock_read.side_effect = mock_recap.read_text.side_effect

            # Should not raise exception
            result = tracker._get_recaps()

            # Should skip corrupted file
            assert result == []

    def test_handles_git_service_errors(self):
        """Test tracker handles GitService errors gracefully."""
        tracker = HistoryTracker(Path("/test/project"))

        with patch('lib.yoyo_tui.services.history_tracker.GitService') as mock_git:
            # GitService raises exception
            mock_git.is_git_repo.side_effect = Exception("Git error")

            # Should not propagate exception
            result = tracker._get_git_commits()

            # Should return empty list
            assert result == []

    def test_handles_duplicate_timestamps(self):
        """Test tracker handles entries with identical timestamps."""
        tracker = HistoryTracker(Path("/test/project"))

        # Create entries with same timestamp
        same_time = datetime(2025, 10, 17, 12, 0)
        entries = [
            HistoryEntry(
                type=HistoryType.COMMIT,
                timestamp=same_time,
                title="Entry A",
                description="",
                source_path=None
            ),
            HistoryEntry(
                type=HistoryType.SPEC,
                timestamp=same_time,
                title="Entry B",
                description="",
                source_path=None
            ),
        ]

        with patch.object(tracker, '_aggregate_history') as mock_aggregate:
            mock_aggregate.return_value = entries

            result = tracker.get_recent_actions(count=3)

            # Should return both entries
            assert len(result) == 2
