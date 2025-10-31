"""
Tests for Implementation Reporter Module

Tests implementation report generation, folder creation, and report structure.
"""

import pytest
from pathlib import Path
import json
from datetime import datetime
from lib.yoyo_implementation_reporter import ImplementationReporter


class TestImplementationReporter:
    """Test implementation reporter functionality."""

    @pytest.fixture
    def reporter(self, tmp_path):
        """Create an ImplementationReporter with temporary spec directory."""
        spec_dir = tmp_path / ".yoyo-dev" / "specs" / "2025-10-31-test-spec"
        spec_dir.mkdir(parents=True)
        return ImplementationReporter(spec_dir)

    @pytest.fixture
    def sample_task_group(self):
        """Create a sample task group data."""
        return {
            "group_number": 1,
            "group_name": "Database Schema",
            "tasks": [
                {
                    "number": "1.1",
                    "description": "Write tests for schema",
                    "completed": True
                },
                {
                    "number": "1.2",
                    "description": "Create schema definition",
                    "completed": True
                },
                {
                    "number": "1.3",
                    "description": "Verify tests pass",
                    "completed": True
                }
            ],
            "files_created": [
                "convex/schema.ts",
                "tests/schema.test.ts"
            ],
            "files_modified": [
                "convex/README.md"
            ],
            "start_time": "2025-10-31T10:00:00",
            "end_time": "2025-10-31T10:45:00",
            "agent": "implementer",
            "standards": ["best-practices.md"]
        }

    # ========================================================================
    # Folder Creation Tests
    # ========================================================================

    def test_create_implementation_folder(self, reporter):
        """Test that implementation/ folder is created."""
        reporter.create_implementation_folder()

        impl_folder = reporter.spec_dir / "implementation"
        assert impl_folder.exists()
        assert impl_folder.is_dir()

    def test_implementation_folder_already_exists(self, reporter):
        """Test that creating folder when it exists doesn't error."""
        impl_folder = reporter.spec_dir / "implementation"
        impl_folder.mkdir(parents=True)

        # Should not raise error
        reporter.create_implementation_folder()
        assert impl_folder.exists()

    # ========================================================================
    # Report Generation Tests
    # ========================================================================

    def test_generate_report(self, reporter, sample_task_group):
        """Test generating implementation report for task group."""
        report_path = reporter.generate_report(sample_task_group)

        assert report_path.exists()
        assert report_path.name == "task-group-1.md"

        with open(report_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check required sections
        assert "# Implementation Report: Task Group 1 - Database Schema" in content
        assert "## Overview" in content
        assert "## Approach" in content
        assert "## Files" in content
        assert "## Tests" in content
        assert "## Time" in content

    def test_report_contains_task_details(self, reporter, sample_task_group):
        """Test that report contains all task details."""
        report_path = reporter.generate_report(sample_task_group)

        with open(report_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check task group details
        assert "Database Schema" in content
        assert "implementer" in content
        assert "best-practices.md" in content

        # Check files
        assert "convex/schema.ts" in content
        assert "tests/schema.test.ts" in content
        assert "convex/README.md" in content

    def test_report_contains_subtasks(self, reporter, sample_task_group):
        """Test that report contains all subtasks."""
        report_path = reporter.generate_report(sample_task_group)

        with open(report_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check all subtasks present
        assert "1.1 Write tests for schema" in content
        assert "1.2 Create schema definition" in content
        assert "1.3 Verify tests pass" in content

    def test_report_calculates_duration(self, reporter, sample_task_group):
        """Test that report calculates task duration."""
        report_path = reporter.generate_report(sample_task_group)

        with open(report_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Should calculate 45 minutes
        assert "45 minutes" in content or "0:45" in content

    # ========================================================================
    # Multiple Task Group Tests
    # ========================================================================

    def test_generate_multiple_reports(self, reporter, sample_task_group):
        """Test generating reports for multiple task groups."""
        # Generate first report
        report1 = reporter.generate_report(sample_task_group)

        # Generate second report
        task_group_2 = sample_task_group.copy()
        task_group_2["group_number"] = 2
        task_group_2["group_name"] = "API Endpoints"
        report2 = reporter.generate_report(task_group_2)

        assert report1.name == "task-group-1.md"
        assert report2.name == "task-group-2.md"
        assert report1 != report2

    def test_list_all_reports(self, reporter, sample_task_group):
        """Test listing all generated reports."""
        # Generate multiple reports
        reporter.generate_report(sample_task_group)

        task_group_2 = sample_task_group.copy()
        task_group_2["group_number"] = 2
        reporter.generate_report(task_group_2)

        # List reports
        reports = reporter.list_reports()

        assert len(reports) == 2
        assert any(r.name == "task-group-1.md" for r in reports)
        assert any(r.name == "task-group-2.md" for r in reports)

    # ========================================================================
    # Report Template Tests
    # ========================================================================

    def test_report_template_structure(self, reporter):
        """Test that report template has correct structure."""
        template = reporter.get_report_template()

        required_sections = [
            "# Implementation Report:",
            "## Overview",
            "## Approach",
            "## Files",
            "## Tests",
            "## Challenges",
            "## Time",
            "## Notes"
        ]

        for section in required_sections:
            assert section in template

    def test_report_template_placeholders(self, reporter):
        """Test that report template has placeholders."""
        template = reporter.get_report_template()

        # Check for placeholders
        assert "{group_number}" in template
        assert "{group_name}" in template
        assert "{files_created}" in template
        assert "{files_modified}" in template
        assert "{duration}" in template

    # ========================================================================
    # Edge Cases Tests
    # ========================================================================

    def test_report_with_no_files_created(self, reporter, sample_task_group):
        """Test generating report when no files were created."""
        sample_task_group["files_created"] = []
        report_path = reporter.generate_report(sample_task_group)

        with open(report_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Should handle empty list gracefully
        assert "Files Created" in content or "Created Files" in content

    def test_report_with_no_files_modified(self, reporter, sample_task_group):
        """Test generating report when no files were modified."""
        sample_task_group["files_modified"] = []
        report_path = reporter.generate_report(sample_task_group)

        with open(report_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Should handle empty list gracefully
        assert "Files Modified" in content or "Modified Files" in content

    def test_report_with_no_standards(self, reporter, sample_task_group):
        """Test generating report when no standards applied."""
        sample_task_group["standards"] = []
        report_path = reporter.generate_report(sample_task_group)

        with open(report_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Should handle empty list gracefully
        assert "Standards" in content

    # ========================================================================
    # Validation Tests
    # ========================================================================

    def test_validate_task_group_data(self, reporter):
        """Test validation of task group data."""
        # Valid data
        valid_data = {
            "group_number": 1,
            "group_name": "Test",
            "tasks": [],
            "files_created": [],
            "files_modified": [],
            "agent": "implementer"
        }

        assert reporter.validate_task_group(valid_data) is True

    def test_validate_task_group_missing_fields(self, reporter):
        """Test validation fails with missing required fields."""
        # Missing group_number
        invalid_data = {
            "group_name": "Test",
            "tasks": []
        }

        with pytest.raises(ValueError, match="Missing required field"):
            reporter.validate_task_group(invalid_data)

    # ========================================================================
    # Summary Report Tests
    # ========================================================================

    def test_generate_summary_report(self, reporter, sample_task_group):
        """Test generating summary report for all task groups."""
        # Generate individual reports
        reporter.generate_report(sample_task_group)

        task_group_2 = sample_task_group.copy()
        task_group_2["group_number"] = 2
        task_group_2["group_name"] = "API Endpoints"
        reporter.generate_report(task_group_2)

        # Generate summary
        summary_path = reporter.generate_summary()

        assert summary_path.exists()
        assert summary_path.name == "implementation-summary.md"

        with open(summary_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check summary contains all task groups
        assert "Database Schema" in content
        assert "API Endpoints" in content
        assert ("2 task groups" in content.lower() or "task groups: 2" in content.lower() or
                "total task groups:** 2" in content.lower())

    def test_summary_includes_statistics(self, reporter, sample_task_group):
        """Test that summary includes overall statistics."""
        reporter.generate_report(sample_task_group)
        summary_path = reporter.generate_summary()

        with open(summary_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Should include statistics
        assert "Total Time" in content or "Total Duration" in content
        assert "Files Created" in content
        assert "Files Modified" in content

    # ========================================================================
    # Integration with Execute Tasks Tests
    # ========================================================================

    def test_flag_detection(self, reporter):
        """Test detecting --implementation-reports flag."""
        assert reporter.is_enabled_from_args(["--implementation-reports"]) is True
        assert reporter.is_enabled_from_args([]) is False
        assert reporter.is_enabled_from_args(["--other-flag"]) is False

    def test_config_override(self, reporter, tmp_path):
        """Test that config.yml can enable/disable reports."""
        config_path = tmp_path / ".yoyo-dev" / "config.yml"
        config_path.parent.mkdir(parents=True, exist_ok=True)

        # Write config with implementation_reports: true
        config_content = """
workflows:
  task_execution:
    implementation_reports: true
"""
        config_path.write_text(config_content)

        assert reporter.is_enabled_from_config(config_path) is True
