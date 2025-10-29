"""
Unit Tests for FixParser

Tests fix folder parsing with defensive error handling.
"""

import json
from pathlib import Path
import pytest
import tempfile
import shutil

from lib.yoyo_tui.services.fix_parser import FixParser
from lib.yoyo_tui.models import FixData


class TestFixParser:
    """Test suite for FixParser."""

    @pytest.fixture
    def fixtures_dir(self):
        """Get path to test fixtures directory."""
        return Path(__file__).parent / "fixtures"

    @pytest.fixture
    def valid_fix_dir(self, fixtures_dir):
        """Get path to valid fix fixture."""
        return fixtures_dir / "fixes" / "2025-10-16-test-fix"

    @pytest.fixture
    def temp_fix_dir(self):
        """Create temporary fix directory for testing."""
        temp_dir = tempfile.mkdtemp()
        fix_dir = Path(temp_dir) / "2025-10-22-temp-fix"
        fix_dir.mkdir(parents=True)
        yield fix_dir
        shutil.rmtree(temp_dir)

    def test_parse_valid_fix(self, valid_fix_dir):
        """Test parsing a valid fix with all files."""
        fix_data = FixParser.parse(valid_fix_dir)

        assert fix_data is not None
        assert fix_data.name == "test-fix"
        assert fix_data.folder_path == valid_fix_dir
        assert fix_data.created_date == "2025-10-16"
        assert fix_data.title == "Fix Analysis - Test Fix"
        assert "parser" in fix_data.problem_summary.lower()
        assert fix_data.status == "fixing"
        assert fix_data.progress > 0
        assert fix_data.total_tasks == 2
        assert fix_data.completed_tasks == 0

    def test_parse_missing_folder(self):
        """Test parsing non-existent fix folder returns None."""
        non_existent = Path("/fake/path/2025-10-16-missing")
        fix_data = FixParser.parse(non_existent)

        assert fix_data is None

    def test_parse_missing_analysis_md(self, temp_fix_dir):
        """Test parsing fix without analysis.md returns None."""
        # Create only state.json
        state_file = temp_fix_dir / "state.json"
        state_file.write_text(json.dumps({
            "fix_name": "temp-fix",
            "tasks_created": "2025-10-22",
            "current_phase": "pending"
        }))

        fix_data = FixParser.parse(temp_fix_dir)

        assert fix_data is None

    def test_parse_corrupt_state_json(self, temp_fix_dir):
        """Test parsing fix with corrupt state.json still works."""
        # Create analysis.md
        analysis_file = temp_fix_dir / "analysis.md"
        analysis_file.write_text("# Fix Analysis\n\n## Problem Summary\n\nBug found.")

        # Create corrupt state.json
        state_file = temp_fix_dir / "state.json"
        state_file.write_text("{ invalid json")

        fix_data = FixParser.parse(temp_fix_dir)

        # Should still parse with defaults
        assert fix_data is not None
        assert fix_data.name == "temp-fix"
        assert fix_data.status == "pending"  # Default
        assert fix_data.progress == 0  # Default

    def test_parse_missing_tasks_md(self, temp_fix_dir):
        """Test parsing fix without tasks.md still works."""
        # Create analysis.md
        analysis_file = temp_fix_dir / "analysis.md"
        analysis_file.write_text("# Fix\n\n## Problem Summary\n\nIssue here.")

        # Create state.json
        state_file = temp_fix_dir / "state.json"
        state_file.write_text(json.dumps({
            "fix_name": "temp-fix",
            "tasks_created": "2025-10-22",
            "current_phase": "pending"
        }))

        fix_data = FixParser.parse(temp_fix_dir)

        # Should parse with zero tasks
        assert fix_data is not None
        assert fix_data.total_tasks == 0
        assert fix_data.completed_tasks == 0
        assert fix_data.progress == 0

    def test_extract_title_from_analysis_md(self, temp_fix_dir):
        """Test extracting title from analysis.md."""
        analysis_file = temp_fix_dir / "analysis.md"
        analysis_file.write_text("# My Fix Title\n\n## Problem Summary\n\nProblem here.")

        state_file = temp_fix_dir / "state.json"
        state_file.write_text(json.dumps({
            "fix_name": "temp-fix",
            "tasks_created": "2025-10-22"
        }))

        fix_data = FixParser.parse(temp_fix_dir)

        assert fix_data is not None
        assert fix_data.title == "My Fix Title"

    def test_extract_title_no_h1(self, temp_fix_dir):
        """Test fix without H1 uses folder name as title."""
        analysis_file = temp_fix_dir / "analysis.md"
        analysis_file.write_text("## Problem Summary\n\nNo H1 heading.")

        state_file = temp_fix_dir / "state.json"
        state_file.write_text(json.dumps({
            "fix_name": "temp-fix",
            "tasks_created": "2025-10-22"
        }))

        fix_data = FixParser.parse(temp_fix_dir)

        assert fix_data is not None
        assert fix_data.title == "temp-fix"  # Falls back to folder name

    def test_extract_problem_summary(self, valid_fix_dir):
        """Test extracting problem summary from analysis.md."""
        fix_data = FixParser.parse(valid_fix_dir)

        assert fix_data is not None
        assert "parser" in fix_data.problem_summary.lower()
        assert len(fix_data.problem_summary) > 0

    def test_extract_problem_summary_missing(self, temp_fix_dir):
        """Test fix without Problem Summary section."""
        analysis_file = temp_fix_dir / "analysis.md"
        analysis_file.write_text("# Fix\n\nNo problem summary section.")

        state_file = temp_fix_dir / "state.json"
        state_file.write_text(json.dumps({
            "fix_name": "temp-fix",
            "tasks_created": "2025-10-22"
        }))

        fix_data = FixParser.parse(temp_fix_dir)

        assert fix_data is not None
        assert fix_data.problem_summary == ""  # Empty if not found

    def test_extract_date_from_folder_name(self, valid_fix_dir):
        """Test date extraction from folder name."""
        fix_data = FixParser.parse(valid_fix_dir)

        assert fix_data is not None
        assert fix_data.created_date == "2025-10-16"

    def test_extract_name_from_folder(self, valid_fix_dir):
        """Test clean name extraction (no date prefix)."""
        fix_data = FixParser.parse(valid_fix_dir)

        assert fix_data is not None
        assert fix_data.name == "test-fix"
        assert fix_data.folder_name == "2025-10-16-test-fix"

    def test_parse_with_permission_error(self, temp_fix_dir):
        """Test handling of permission errors."""
        # Create analysis.md
        analysis_file = temp_fix_dir / "analysis.md"
        analysis_file.write_text("# Fix\n\n## Problem Summary\n\nIssue.")

        # Make directory unreadable (skip on Windows)
        import os
        if os.name != 'nt':
            temp_fix_dir.chmod(0o000)
            fix_data = FixParser.parse(temp_fix_dir)
            temp_fix_dir.chmod(0o755)  # Restore for cleanup

            assert fix_data is None

    def test_status_from_state_json(self, temp_fix_dir):
        """Test status extraction from state.json."""
        analysis_file = temp_fix_dir / "analysis.md"
        analysis_file.write_text("# Fix\n\n## Problem Summary\n\nBug.")

        state_file = temp_fix_dir / "state.json"
        state_file.write_text(json.dumps({
            "fix_name": "temp-fix",
            "tasks_created": "2025-10-22",
            "current_phase": "fixing"
        }))

        fix_data = FixParser.parse(temp_fix_dir)

        assert fix_data is not None
        assert fix_data.status == "fixing"

    def test_progress_from_tasks(self, valid_fix_dir):
        """Test progress calculation from tasks.md."""
        fix_data = FixParser.parse(valid_fix_dir)

        assert fix_data is not None
        # Tasks fixture has 1 completed subtask out of 5
        assert fix_data.progress == 20
        assert fix_data.total_tasks == 2
        assert fix_data.completed_tasks == 0  # No parent tasks fully complete


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
