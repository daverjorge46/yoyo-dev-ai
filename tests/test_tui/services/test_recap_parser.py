"""
Tests for RecapParser service.

Tests extraction of PR URLs and metadata from recap markdown files.
"""

import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from lib.yoyo_tui.services.recap_parser import RecapParser, RecapData


class TestRecapParser:
    """Test suite for RecapParser."""

    def test_recap_parser_initialization(self):
        """Test RecapParser initializes correctly."""
        parser = RecapParser()

        assert parser is not None

    def test_parse_recap_file_extracts_pr_url(self):
        """Test parse_recap_file extracts GitHub PR URL from content."""
        parser = RecapParser()

        # Mock file content with PR URL
        content = """
# Fix Recap: Feature Name

**Date:** 2025-10-17
**Status:** ✅ Completed

## Summary

Some feature description here.

## PR Link

https://github.com/user/repo/pull/123

## Changes Made

- Change 1
- Change 2
"""

        result = parser.parse_recap_file(content)

        assert isinstance(result, RecapData)
        assert result.pr_url == "https://github.com/user/repo/pull/123"

    def test_parse_recap_file_extracts_pr_url_from_pr_line(self):
        """Test parse_recap_file extracts PR URL from 'PR:' line format."""
        parser = RecapParser()

        content = """
# Feature Recap

Some content.

PR: https://github.com/user/repo/pull/456

More content.
"""

        result = parser.parse_recap_file(content)

        assert result.pr_url == "https://github.com/user/repo/pull/456"

    def test_parse_recap_file_extracts_pr_url_from_markdown_link(self):
        """Test parse_recap_file extracts PR URL from markdown link format."""
        parser = RecapParser()

        content = """
# Recap

[PR #789](https://github.com/user/repo/pull/789)
"""

        result = parser.parse_recap_file(content)

        assert result.pr_url == "https://github.com/user/repo/pull/789"

    def test_parse_recap_file_handles_no_pr_url(self):
        """Test parse_recap_file handles files without PR URLs."""
        parser = RecapParser()

        content = """
# Recap

No PR URL in this file.
Just some text content.
"""

        result = parser.parse_recap_file(content)

        assert result.pr_url is None

    def test_parse_recap_file_extracts_title(self):
        """Test parse_recap_file extracts title from first heading."""
        parser = RecapParser()

        content = """
# Fix Recap: TUI Improvements

Some content here.
"""

        result = parser.parse_recap_file(content)

        assert result.title == "Fix Recap: TUI Improvements"

    def test_parse_recap_file_extracts_date(self):
        """Test parse_recap_file extracts date from file content."""
        parser = RecapParser()

        content = """
# Feature Recap

**Date:** 2025-10-17
**Status:** Completed
"""

        result = parser.parse_recap_file(content)

        assert result.date == "2025-10-17"

    def test_parse_recap_file_extracts_status(self):
        """Test parse_recap_file extracts status from file content."""
        parser = RecapParser()

        content = """
# Recap

**Status:** ✅ Completed
**Date:** 2025-10-17
"""

        result = parser.parse_recap_file(content)

        assert "Completed" in result.status

    def test_parse_recap_file_handles_multiple_pr_urls(self):
        """Test parse_recap_file extracts first PR URL when multiple exist."""
        parser = RecapParser()

        content = """
# Recap

PR: https://github.com/user/repo/pull/100

Related PR: https://github.com/user/repo/pull/101
"""

        result = parser.parse_recap_file(content)

        # Should extract first PR URL
        assert result.pr_url == "https://github.com/user/repo/pull/100"

    def test_parse_recap_file_handles_empty_content(self):
        """Test parse_recap_file handles empty file content."""
        parser = RecapParser()

        content = ""

        result = parser.parse_recap_file(content)

        assert result.pr_url is None
        assert result.title == ""
        assert result.date is None
        assert result.status is None

    def test_parse_recap_file_ignores_inline_github_links(self):
        """Test parse_recap_file ignores non-PR GitHub links."""
        parser = RecapParser()

        content = """
# Recap

See the repo: https://github.com/user/repo
Check the issue: https://github.com/user/repo/issues/123

No PR link here.
"""

        result = parser.parse_recap_file(content)

        # Should not extract non-PR URLs
        assert result.pr_url is None

    def test_parse_recap_from_path_reads_file(self):
        """Test parse_recap_from_path reads file and parses content."""
        parser = RecapParser()

        mock_path = Path("/test/recap.md")
        mock_content = """
# Recap

PR: https://github.com/user/repo/pull/123
"""

        with patch.object(Path, 'read_text') as mock_read:
            mock_read.return_value = mock_content

            result = parser.parse_recap_from_path(mock_path)

            assert result.pr_url == "https://github.com/user/repo/pull/123"
            mock_read.assert_called_once()

    def test_parse_recap_from_path_handles_file_not_found(self):
        """Test parse_recap_from_path handles missing files gracefully."""
        parser = RecapParser()

        mock_path = Path("/nonexistent/recap.md")

        with patch.object(Path, 'read_text') as mock_read:
            mock_read.side_effect = FileNotFoundError("File not found")

            result = parser.parse_recap_from_path(mock_path)

            # Should return empty RecapData
            assert result.pr_url is None

    def test_parse_recap_from_path_handles_read_errors(self):
        """Test parse_recap_from_path handles file read errors."""
        parser = RecapParser()

        mock_path = Path("/test/corrupted.md")

        with patch.object(Path, 'read_text') as mock_read:
            mock_read.side_effect = IOError("Permission denied")

            result = parser.parse_recap_from_path(mock_path)

            # Should return empty RecapData
            assert result.pr_url is None

    def test_recap_data_dataclass_attributes(self):
        """Test RecapData dataclass has all required attributes."""
        recap = RecapData(
            title="Test Recap",
            date="2025-10-17",
            status="Completed",
            pr_url="https://github.com/user/repo/pull/123"
        )

        assert recap.title == "Test Recap"
        assert recap.date == "2025-10-17"
        assert recap.status == "Completed"
        assert recap.pr_url == "https://github.com/user/repo/pull/123"

    def test_extract_pr_url_regex_patterns(self):
        """Test various PR URL patterns are recognized."""
        parser = RecapParser()

        test_cases = [
            # Standard PR link
            "PR: https://github.com/user/repo/pull/123",
            # Markdown link
            "[PR #123](https://github.com/user/repo/pull/123)",
            # Direct link
            "https://github.com/user/repo/pull/123",
            # Pull request text
            "Pull Request: https://github.com/user/repo/pull/123",
            # GitHub PR link
            "GitHub PR: https://github.com/user/repo/pull/123",
        ]

        for content in test_cases:
            result = parser.parse_recap_file(content)
            assert result.pr_url == "https://github.com/user/repo/pull/123", \
                f"Failed to extract PR from: {content}"

    def test_parse_recap_file_extracts_title_without_hash(self):
        """Test parse_recap_file removes leading # from title."""
        parser = RecapParser()

        content = "# My Feature Title\n\nContent here."

        result = parser.parse_recap_file(content)

        # Should remove leading # and whitespace
        assert result.title == "My Feature Title"
        assert not result.title.startswith("#")

    def test_parse_recap_file_handles_multiple_headings(self):
        """Test parse_recap_file uses first heading as title."""
        parser = RecapParser()

        content = """
# First Heading

Some content.

## Second Heading

More content.
"""

        result = parser.parse_recap_file(content)

        assert result.title == "First Heading"

    def test_parse_recap_file_date_formats(self):
        """Test parse_recap_file recognizes various date formats."""
        parser = RecapParser()

        test_cases = [
            ("**Date:** 2025-10-17", "2025-10-17"),
            ("Date: 2025-10-17", "2025-10-17"),
            ("**Created:** 2025-10-17", "2025-10-17"),
            ("Created: 2025-10-17", "2025-10-17"),
        ]

        for content, expected_date in test_cases:
            result = parser.parse_recap_file(content)
            assert result.date == expected_date, \
                f"Failed to extract date from: {content}"

    def test_parse_recap_file_status_formats(self):
        """Test parse_recap_file recognizes various status formats."""
        parser = RecapParser()

        test_cases = [
            "**Status:** ✅ Completed",
            "Status: Completed",
            "**Status:** In Progress",
            "Status: ✅ Done",
        ]

        for content in test_cases:
            result = parser.parse_recap_file(content)
            assert result.status is not None, \
                f"Failed to extract status from: {content}"

    def test_parse_multiple_recap_files(self):
        """Test parsing multiple recap files in batch."""
        parser = RecapParser()

        files = [
            ("recap1.md", "PR: https://github.com/user/repo/pull/1"),
            ("recap2.md", "PR: https://github.com/user/repo/pull/2"),
            ("recap3.md", "PR: https://github.com/user/repo/pull/3"),
        ]

        results = []
        for filename, content in files:
            result = parser.parse_recap_file(content)
            results.append(result)

        # Should parse all files
        assert len(results) == 3
        assert results[0].pr_url == "https://github.com/user/repo/pull/1"
        assert results[1].pr_url == "https://github.com/user/repo/pull/2"
        assert results[2].pr_url == "https://github.com/user/repo/pull/3"

    def test_recap_data_defaults(self):
        """Test RecapData has sensible defaults for optional fields."""
        recap = RecapData(
            title="Test",
            date=None,
            status=None,
            pr_url=None
        )

        assert recap.title == "Test"
        assert recap.date is None
        assert recap.status is None
        assert recap.pr_url is None


class TestRecapParserEdgeCases:
    """Test suite for RecapParser edge cases."""

    def test_handles_malformed_markdown(self):
        """Test parser handles malformed markdown gracefully."""
        parser = RecapParser()

        content = """
# Unclosed heading

**Bold without close

[Link without close

PR: https://github.com/user/repo/pull/123
"""

        # Should not raise exception
        result = parser.parse_recap_file(content)

        # Should still extract PR URL
        assert result.pr_url == "https://github.com/user/repo/pull/123"

    def test_handles_unicode_content(self):
        """Test parser handles unicode characters."""
        parser = RecapParser()

        content = """
# Feature 🚀 - Chinese: 中文, Japanese: 日本語

**Status:** ✅ Completed

PR: https://github.com/user/repo/pull/123
"""

        result = parser.parse_recap_file(content)

        assert "🚀" in result.title
        assert result.pr_url == "https://github.com/user/repo/pull/123"

    def test_handles_very_large_files(self):
        """Test parser handles large recap files efficiently."""
        parser = RecapParser()

        # Simulate large file (10000 lines)
        content = "# Large Recap\n\n" + ("Content line\n" * 10000)
        content += "\nPR: https://github.com/user/repo/pull/123"

        result = parser.parse_recap_file(content)

        assert result.pr_url == "https://github.com/user/repo/pull/123"

    def test_handles_pr_url_with_query_params(self):
        """Test parser handles PR URLs with query parameters."""
        parser = RecapParser()

        content = "PR: https://github.com/user/repo/pull/123?foo=bar#section"

        result = parser.parse_recap_file(content)

        # Should extract full URL
        assert "pull/123" in result.pr_url

    def test_handles_case_insensitive_pr_patterns(self):
        """Test parser recognizes PR patterns case-insensitively."""
        parser = RecapParser()

        test_cases = [
            "pr: https://github.com/user/repo/pull/123",
            "PR: https://github.com/user/repo/pull/123",
            "Pr: https://github.com/user/repo/pull/123",
            "pull request: https://github.com/user/repo/pull/123",
            "Pull Request: https://github.com/user/repo/pull/123",
        ]

        for content in test_cases:
            result = parser.parse_recap_file(content)
            assert result.pr_url is not None, \
                f"Failed to extract PR from: {content}"


class TestRecapParserIntegration:
    """Integration tests for RecapParser with real file system."""

    def test_parse_real_recap_file(self, tmp_path):
        """Test parsing actual recap file structure."""
        parser = RecapParser()

        # Create realistic recap file
        recap_file = tmp_path / "2025-10-17-feature.md"
        recap_file.write_text("""
# Fix Recap: Feature Implementation

**Date:** 2025-10-17
**Fix Name:** feature-implementation
**Status:** ✅ Completed (5/5 tasks)
**Execution Time:** ~2 hours

## 🎯 Objective

Implement new feature with full test coverage.

## 📋 Summary

Successfully implemented feature with:
- Component A
- Component B
- Full test coverage

## 🚀 What Was Built

### Task 1: Component A ✅
- Created component
- Added tests
- Integrated with system

### Task 2: Component B ✅
- Created component
- Added tests

## 📊 Technical Implementation

### Files Created (3)
1. `src/component_a.py`
2. `src/component_b.py`
3. `tests/test_components.py`

### Git Commits (2)
1. `abc123` - feat: Add component A
2. `def456` - feat: Add component B

## 🎉 Outcome

Feature complete and shipped!

---

**PR Link:** https://github.com/user/repo/pull/999

**Total Implementation Time:** ~2 hours
**Lines of Code:** ~500 new
""")

        result = parser.parse_recap_from_path(recap_file)

        assert result.title == "Fix Recap: Feature Implementation"
        assert result.date == "2025-10-17"
        assert "Completed" in result.status
        assert result.pr_url == "https://github.com/user/repo/pull/999"
