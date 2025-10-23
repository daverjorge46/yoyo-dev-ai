"""
Unit Tests for SpecParser

Tests spec folder parsing with defensive error handling.
"""

import json
from pathlib import Path
import pytest
import tempfile
import shutil

from lib.yoyo_tui.services.spec_parser import SpecParser
from lib.yoyo_tui.models import SpecData


class TestSpecParser:
    """Test suite for SpecParser."""

    @pytest.fixture
    def fixtures_dir(self):
        """Get path to test fixtures directory."""
        return Path(__file__).parent / "fixtures"

    @pytest.fixture
    def valid_spec_dir(self, fixtures_dir):
        """Get path to valid spec fixture."""
        return fixtures_dir / "specs" / "2025-10-15-test-feature"

    @pytest.fixture
    def temp_spec_dir(self):
        """Create temporary spec directory for testing."""
        temp_dir = tempfile.mkdtemp()
        spec_dir = Path(temp_dir) / "2025-10-20-temp-spec"
        spec_dir.mkdir(parents=True)
        yield spec_dir
        shutil.rmtree(temp_dir)

    def test_parse_valid_spec(self, valid_spec_dir):
        """Test parsing a valid spec with all files."""
        spec_data = SpecParser.parse(valid_spec_dir)

        assert spec_data is not None
        assert spec_data.name == "test-feature"
        assert spec_data.folder_path == valid_spec_dir
        assert spec_data.created_date == "2025-10-15"
        assert spec_data.title == "Test Feature Specification"
        assert spec_data.status == "implementation"
        assert spec_data.progress > 0
        assert spec_data.total_tasks == 3
        assert spec_data.completed_tasks == 0  # No parent tasks fully complete
        assert spec_data.has_technical_spec is True
        assert spec_data.has_database_schema is True
        assert spec_data.has_api_spec is True

    def test_parse_missing_folder(self):
        """Test parsing non-existent spec folder returns None."""
        non_existent = Path("/fake/path/2025-10-15-missing")
        spec_data = SpecParser.parse(non_existent)

        assert spec_data is None

    def test_parse_missing_spec_md(self, temp_spec_dir):
        """Test parsing spec without spec.md returns None."""
        # Create only state.json
        state_file = temp_spec_dir / "state.json"
        state_file.write_text(json.dumps({
            "spec_name": "temp-spec",
            "spec_created": "2025-10-20",
            "current_phase": "pending"
        }))

        spec_data = SpecParser.parse(temp_spec_dir)

        assert spec_data is None

    def test_parse_corrupt_state_json(self, temp_spec_dir):
        """Test parsing spec with corrupt state.json still works."""
        # Create spec.md
        spec_file = temp_spec_dir / "spec.md"
        spec_file.write_text("# Test Spec\n\nThis is a test.")

        # Create corrupt state.json
        state_file = temp_spec_dir / "state.json"
        state_file.write_text("{ invalid json")

        spec_data = SpecParser.parse(temp_spec_dir)

        # Should still parse with defaults
        assert spec_data is not None
        assert spec_data.name == "temp-spec"
        assert spec_data.status == "pending"  # Default
        assert spec_data.progress == 0  # Default

    def test_parse_missing_tasks_md(self, temp_spec_dir):
        """Test parsing spec without tasks.md still works."""
        # Create spec.md
        spec_file = temp_spec_dir / "spec.md"
        spec_file.write_text("# Test Spec\n\nThis is a test.")

        # Create state.json
        state_file = temp_spec_dir / "state.json"
        state_file.write_text(json.dumps({
            "spec_name": "temp-spec",
            "spec_created": "2025-10-20",
            "current_phase": "pending"
        }))

        spec_data = SpecParser.parse(temp_spec_dir)

        # Should parse with zero tasks
        assert spec_data is not None
        assert spec_data.total_tasks == 0
        assert spec_data.completed_tasks == 0
        assert spec_data.progress == 0

    def test_parse_sub_specs_detection(self, valid_spec_dir):
        """Test detection of sub-spec files."""
        spec_data = SpecParser.parse(valid_spec_dir)

        assert spec_data is not None
        assert spec_data.has_technical_spec is True
        assert spec_data.has_database_schema is True
        assert spec_data.has_api_spec is True

    def test_parse_no_sub_specs(self, temp_spec_dir):
        """Test spec without sub-specs."""
        # Create minimal spec
        spec_file = temp_spec_dir / "spec.md"
        spec_file.write_text("# Minimal Spec\n\nNo sub-specs.")

        state_file = temp_spec_dir / "state.json"
        state_file.write_text(json.dumps({
            "spec_name": "temp-spec",
            "spec_created": "2025-10-20",
            "current_phase": "pending"
        }))

        spec_data = SpecParser.parse(temp_spec_dir)

        assert spec_data is not None
        assert spec_data.has_technical_spec is False
        assert spec_data.has_database_schema is False
        assert spec_data.has_api_spec is False

    def test_extract_title_from_spec_md(self, temp_spec_dir):
        """Test extracting title from spec.md."""
        spec_file = temp_spec_dir / "spec.md"
        spec_file.write_text("# My Feature Title\n\nContent here.")

        state_file = temp_spec_dir / "state.json"
        state_file.write_text(json.dumps({
            "spec_name": "temp-spec",
            "spec_created": "2025-10-20"
        }))

        spec_data = SpecParser.parse(temp_spec_dir)

        assert spec_data is not None
        assert spec_data.title == "My Feature Title"

    def test_extract_title_no_h1(self, temp_spec_dir):
        """Test spec without H1 uses folder name as title."""
        spec_file = temp_spec_dir / "spec.md"
        spec_file.write_text("No heading here.")

        state_file = temp_spec_dir / "state.json"
        state_file.write_text(json.dumps({
            "spec_name": "temp-spec",
            "spec_created": "2025-10-20"
        }))

        spec_data = SpecParser.parse(temp_spec_dir)

        assert spec_data is not None
        assert spec_data.title == "temp-spec"  # Falls back to folder name

    def test_extract_date_from_folder_name(self, valid_spec_dir):
        """Test date extraction from folder name."""
        spec_data = SpecParser.parse(valid_spec_dir)

        assert spec_data is not None
        assert spec_data.created_date == "2025-10-15"

    def test_extract_name_from_folder(self, valid_spec_dir):
        """Test clean name extraction (no date prefix)."""
        spec_data = SpecParser.parse(valid_spec_dir)

        assert spec_data is not None
        assert spec_data.name == "test-feature"
        assert spec_data.folder_name == "2025-10-15-test-feature"

    def test_parse_with_permission_error(self, temp_spec_dir):
        """Test handling of permission errors."""
        # Create spec.md
        spec_file = temp_spec_dir / "spec.md"
        spec_file.write_text("# Test\n\nContent.")

        # Make directory unreadable (skip on Windows)
        import os
        if os.name != 'nt':
            temp_spec_dir.chmod(0o000)
            spec_data = SpecParser.parse(temp_spec_dir)
            temp_spec_dir.chmod(0o755)  # Restore for cleanup

            assert spec_data is None

    def test_status_from_state_json(self, temp_spec_dir):
        """Test status extraction from state.json."""
        spec_file = temp_spec_dir / "spec.md"
        spec_file.write_text("# Test\n")

        state_file = temp_spec_dir / "state.json"
        state_file.write_text(json.dumps({
            "spec_name": "temp-spec",
            "spec_created": "2025-10-20",
            "current_phase": "implementation"
        }))

        spec_data = SpecParser.parse(temp_spec_dir)

        assert spec_data is not None
        assert spec_data.status == "implementation"

    def test_progress_from_tasks(self, valid_spec_dir):
        """Test progress calculation from tasks.md."""
        spec_data = SpecParser.parse(valid_spec_dir)

        assert spec_data is not None
        # Tasks fixture has 2 completed subtasks out of 10
        assert spec_data.progress == 20
        assert spec_data.total_tasks == 3
        assert spec_data.completed_tasks == 0  # No parent tasks fully complete


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
