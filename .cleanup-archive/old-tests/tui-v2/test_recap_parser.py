"""
Unit Tests for RecapParser

Tests recap file parsing with defensive error handling.
"""

from pathlib import Path
import pytest
import tempfile
import shutil

from lib.yoyo_tui.services.recap_parser import RecapParser
from lib.yoyo_tui.models import RecapData


class TestRecapParser:
    """Test suite for RecapParser."""

    @pytest.fixture
    def fixtures_dir(self):
        """Get path to test fixtures directory."""
        return Path(__file__).parent / "fixtures"

    @pytest.fixture
    def valid_recap_file(self, fixtures_dir):
        """Get path to valid recap fixture."""
        return fixtures_dir / "recaps" / "2025-10-17-test-recap.md"

    @pytest.fixture
    def temp_recap_file(self):
        """Create temporary recap file for testing."""
        temp_dir = tempfile.mkdtemp()
        recap_file = Path(temp_dir) / "2025-10-23-temp-recap.md"
        yield recap_file
        shutil.rmtree(temp_dir)

    def test_parse_valid_recap(self, valid_recap_file):
        """Test parsing a valid recap file."""
        recap_data = RecapParser.parse(valid_recap_file)

        assert recap_data is not None
        assert recap_data.name == "test-recap"
        assert recap_data.file_path == valid_recap_file
        assert recap_data.created_date == "2025-10-17"
        assert recap_data.title == "Recap: Test Feature Implementation"
        assert len(recap_data.summary) > 0
        assert "test feature" in recap_data.summary.lower()
        assert recap_data.patterns_extracted == 2

    def test_parse_missing_file(self):
        """Test parsing non-existent recap file returns None."""
        non_existent = Path("/fake/path/2025-10-17-missing.md")
        recap_data = RecapParser.parse(non_existent)

        assert recap_data is None

    def test_extract_title_from_recap(self, temp_recap_file):
        """Test extracting title from recap file."""
        temp_recap_file.write_text("# Recap: My Feature\n\nSummary here.")

        recap_data = RecapParser.parse(temp_recap_file)

        assert recap_data is not None
        assert recap_data.title == "Recap: My Feature"

    def test_extract_title_no_h1(self, temp_recap_file):
        """Test recap without H1 uses file name as title."""
        temp_recap_file.write_text("## Summary\n\nNo H1 heading.")

        recap_data = RecapParser.parse(temp_recap_file)

        assert recap_data is not None
        assert recap_data.title == "temp-recap"  # Falls back to file name

    def test_extract_summary(self, valid_recap_file):
        """Test extracting summary from recap file."""
        recap_data = RecapParser.parse(valid_recap_file)

        assert recap_data is not None
        assert len(recap_data.summary) > 0
        assert "test feature" in recap_data.summary.lower()

    def test_extract_summary_missing(self, temp_recap_file):
        """Test recap without Summary section."""
        temp_recap_file.write_text("# Recap\n\nNo summary section.")

        recap_data = RecapParser.parse(temp_recap_file)

        assert recap_data is not None
        assert recap_data.summary == ""  # Empty if not found

    def test_count_patterns_extracted(self, valid_recap_file):
        """Test counting patterns extracted from recap."""
        recap_data = RecapParser.parse(valid_recap_file)

        assert recap_data is not None
        assert recap_data.patterns_extracted == 2

    def test_count_patterns_none(self, temp_recap_file):
        """Test recap with no patterns."""
        temp_recap_file.write_text("# Recap\n\n## Summary\n\nNo patterns.")

        recap_data = RecapParser.parse(temp_recap_file)

        assert recap_data is not None
        assert recap_data.patterns_extracted == 0

    def test_extract_date_from_file_name(self, valid_recap_file):
        """Test date extraction from file name."""
        recap_data = RecapParser.parse(valid_recap_file)

        assert recap_data is not None
        assert recap_data.created_date == "2025-10-17"

    def test_extract_name_from_file(self, valid_recap_file):
        """Test clean name extraction (no date prefix)."""
        recap_data = RecapParser.parse(valid_recap_file)

        assert recap_data is not None
        assert recap_data.name == "test-recap"
        assert recap_data.file_name == "2025-10-17-test-recap.md"

    def test_parse_with_permission_error(self, temp_recap_file):
        """Test handling of permission errors."""
        temp_recap_file.write_text("# Recap\n\n## Summary\n\nContent.")

        # Make file unreadable (skip on Windows)
        import os
        if os.name != 'nt':
            temp_recap_file.chmod(0o000)
            recap_data = RecapParser.parse(temp_recap_file)
            temp_recap_file.chmod(0o644)  # Restore for cleanup

            assert recap_data is None

    def test_empty_file(self, temp_recap_file):
        """Test parsing empty recap file."""
        temp_recap_file.write_text("")

        recap_data = RecapParser.parse(temp_recap_file)

        # Should still parse with defaults
        assert recap_data is not None
        assert recap_data.title == "temp-recap"
        assert recap_data.summary == ""
        assert recap_data.patterns_extracted == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
