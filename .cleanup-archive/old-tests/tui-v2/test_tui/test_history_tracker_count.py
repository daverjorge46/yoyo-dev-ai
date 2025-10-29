"""
Tests for HistoryTracker entry count behavior.

Tests that verify the fix for limited history display (3 entries → 10 entries).
"""

import pytest
from pathlib import Path
from datetime import datetime
from lib.yoyo_tui.services.history_tracker import HistoryTracker, HistoryEntry, HistoryType


def test_history_tracker_default_count_should_be_10():
    """
    Test that HistoryTracker.get_recent_actions() returns 10 entries by default.

    This test verifies the fix for Issue #1: Limited history display.
    Before fix: Returns 3 entries
    After fix: Returns 10 entries
    """
    # Create a temporary project root with dummy history
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)

        # Create .yoyo-dev structure with multiple specs
        yoyo_dev = project_root / ".yoyo-dev"
        specs_dir = yoyo_dev / "specs"
        specs_dir.mkdir(parents=True)

        # Create 15 spec folders to ensure we have more than 10 entries
        for i in range(15):
            spec_folder = specs_dir / f"2025-10-{i+1:02d}-test-spec-{i+1}"
            spec_folder.mkdir()

        # Initialize HistoryTracker
        tracker = HistoryTracker(project_root)

        # Get recent actions with default count
        recent_actions = tracker.get_recent_actions()

        # Assert that we get 10 entries (not 3)
        assert len(recent_actions) == 10, f"Expected 10 entries, got {len(recent_actions)}"


def test_history_tracker_respects_custom_count():
    """
    Test that HistoryTracker.get_recent_actions(count=N) respects custom count.
    """
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)

        # Create .yoyo-dev structure with multiple specs
        yoyo_dev = project_root / ".yoyo-dev"
        specs_dir = yoyo_dev / "specs"
        specs_dir.mkdir(parents=True)

        # Create 20 spec folders
        for i in range(20):
            spec_folder = specs_dir / f"2025-10-{i+1:02d}-test-spec-{i+1}"
            spec_folder.mkdir()

        # Initialize HistoryTracker
        tracker = HistoryTracker(project_root)

        # Get recent actions with custom count
        recent_actions = tracker.get_recent_actions(count=5)

        # Assert that we get exactly 5 entries
        assert len(recent_actions) == 5, f"Expected 5 entries, got {len(recent_actions)}"

        # Get recent actions with count=15
        recent_actions = tracker.get_recent_actions(count=15)
        assert len(recent_actions) == 15, f"Expected 15 entries, got {len(recent_actions)}"


def test_history_tracker_old_behavior_3_entries():
    """
    Test to document the old behavior (3 entries) - this test SHOULD FAIL before fix.

    This test verifies that the old default of 3 is no longer used.
    """
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)

        # Create .yoyo-dev structure with multiple specs
        yoyo_dev = project_root / ".yoyo-dev"
        specs_dir = yoyo_dev / "specs"
        specs_dir.mkdir(parents=True)

        # Create 15 spec folders
        for i in range(15):
            spec_folder = specs_dir / f"2025-10-{i+1:02d}-test-spec-{i+1}"
            spec_folder.mkdir()

        # Initialize HistoryTracker
        tracker = HistoryTracker(project_root)

        # Get recent actions with default count
        recent_actions = tracker.get_recent_actions()

        # This assertion should FAIL after the fix (we want 10, not 3)
        # Before fix: passes (returns 3)
        # After fix: fails (returns 10)
        assert len(recent_actions) != 3, "History tracker should not default to 3 entries anymore"
