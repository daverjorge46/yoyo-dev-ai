"""
Unit Tests for ProgressParser

Tests execution progress file parsing with defensive error handling.
"""

import json
from pathlib import Path
import pytest
import tempfile
import shutil

from lib.yoyo_tui.services.progress_parser import ProgressParser
from lib.yoyo_tui.models import ExecutionProgress


class TestProgressParser:
    """Test suite for ProgressParser."""

    @pytest.fixture
    def temp_progress_file(self):
        """Create temporary progress file for testing."""
        temp_dir = tempfile.mkdtemp()
        progress_file = Path(temp_dir) / "execution-progress.json"
        yield progress_file
        shutil.rmtree(temp_dir)

    def test_parse_valid_progress_running(self, temp_progress_file):
        """Test parsing valid execution progress (running)."""
        progress_data = {
            "is_running": True,
            "spec_or_fix_name": "test-feature",
            "current_phase": "implementation",
            "current_parent_task": 2,
            "current_subtask": "Implement parser",
            "total_parent_tasks": 5,
            "total_subtasks": 20,
            "percentage": 35,
            "current_action": "Writing tests",
            "started_at": "2025-10-23T10:00:00.000000",
            "last_updated": "2025-10-23T10:15:00.000000"
        }
        temp_progress_file.write_text(json.dumps(progress_data))

        progress = ProgressParser.parse(temp_progress_file)

        assert progress is not None
        assert progress.is_running is True
        assert progress.spec_or_fix_name == "test-feature"
        assert progress.current_phase == "implementation"
        assert progress.current_parent_task == 2
        assert progress.current_subtask == "Implement parser"
        assert progress.total_parent_tasks == 5
        assert progress.total_subtasks == 20
        assert progress.percentage == 35
        assert progress.current_action == "Writing tests"
        assert progress.started_at == "2025-10-23T10:00:00.000000"
        assert progress.last_updated == "2025-10-23T10:15:00.000000"

    def test_parse_valid_progress_idle(self, temp_progress_file):
        """Test parsing valid execution progress (idle)."""
        progress_data = {
            "is_running": False
        }
        temp_progress_file.write_text(json.dumps(progress_data))

        progress = ProgressParser.parse(temp_progress_file)

        assert progress is not None
        assert progress.is_running is False
        assert progress.spec_or_fix_name is None
        assert progress.percentage == 0

    def test_parse_missing_file(self):
        """Test parsing non-existent progress file returns empty."""
        non_existent = Path("/fake/path/execution-progress.json")
        progress = ProgressParser.parse(non_existent)

        assert progress is not None
        assert progress.is_running is False  # Empty/idle

    def test_parse_corrupt_json(self, temp_progress_file):
        """Test parsing corrupt JSON returns empty."""
        temp_progress_file.write_text("{ invalid json")

        progress = ProgressParser.parse(temp_progress_file)

        assert progress is not None
        assert progress.is_running is False  # Empty/idle

    def test_parse_partial_data(self, temp_progress_file):
        """Test parsing with missing optional fields."""
        progress_data = {
            "is_running": True,
            "spec_or_fix_name": "test-feature",
            "percentage": 50
        }
        temp_progress_file.write_text(json.dumps(progress_data))

        progress = ProgressParser.parse(temp_progress_file)

        assert progress is not None
        assert progress.is_running is True
        assert progress.spec_or_fix_name == "test-feature"
        assert progress.percentage == 50
        assert progress.current_phase is None  # Optional field
        assert progress.current_subtask is None  # Optional field

    def test_parse_empty_file(self, temp_progress_file):
        """Test parsing empty file returns empty."""
        temp_progress_file.write_text("")

        progress = ProgressParser.parse(temp_progress_file)

        assert progress is not None
        assert progress.is_running is False  # Empty/idle

    def test_parse_with_permission_error(self, temp_progress_file):
        """Test handling of permission errors."""
        progress_data = {"is_running": True}
        temp_progress_file.write_text(json.dumps(progress_data))

        # Make file unreadable (skip on Windows)
        import os
        if os.name != 'nt':
            temp_progress_file.chmod(0o000)
            progress = ProgressParser.parse(temp_progress_file)
            temp_progress_file.chmod(0o644)  # Restore for cleanup

            assert progress is not None
            assert progress.is_running is False  # Returns empty on error

    def test_display_status_idle(self):
        """Test display_status property when idle."""
        progress = ExecutionProgress(is_running=False)

        assert progress.display_status == "Idle"

    def test_display_status_with_action(self):
        """Test display_status property with current_action."""
        progress = ExecutionProgress(
            is_running=True,
            current_action="Writing tests"
        )

        assert progress.display_status == "Writing tests"

    def test_display_status_with_subtask(self):
        """Test display_status property with subtask."""
        progress = ExecutionProgress(
            is_running=True,
            current_parent_task=2,
            current_subtask="Implement parser"
        )

        assert progress.display_status == "Task 2: Implement parser"

    def test_display_status_with_phase(self):
        """Test display_status property with only phase."""
        progress = ExecutionProgress(
            is_running=True,
            current_phase="implementation"
        )

        assert progress.display_status == "Phase: implementation"

    def test_empty_class_method(self):
        """Test ExecutionProgress.empty() class method."""
        progress = ExecutionProgress.empty()

        assert progress is not None
        assert progress.is_running is False
        assert progress.spec_or_fix_name is None
        assert progress.percentage == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
