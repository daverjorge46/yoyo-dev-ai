"""
Tests for TaskParser service.

Tests parsing of tasks.md and MASTER-TASKS.md files with various formats.
"""

import pytest
from pathlib import Path
from lib.yoyo_tui.services.task_parser import TaskParser
from lib.yoyo_tui.models import TaskData, ParentTask, Subtask


class TestTaskParser:
    """Test suite for TaskParser."""

    def test_parse_empty_file(self, tmp_path):
        """Test parsing an empty task file."""
        task_file = tmp_path / "tasks.md"
        task_file.write_text("")

        result = TaskParser.parse(task_file)

        assert result.total_tasks == 0
        assert result.completed_tasks == 0
        assert result.total_subtasks == 0
        assert result.completed_subtasks == 0
        assert result.progress == 0

    def test_parse_nonexistent_file(self, tmp_path):
        """Test parsing a file that doesn't exist."""
        task_file = tmp_path / "nonexistent.md"

        result = TaskParser.parse(task_file)

        assert result == TaskData.empty()

    def test_parse_single_task_no_subtasks(self, tmp_path):
        """Test parsing a single parent task with no subtasks."""
        task_file = tmp_path / "tasks.md"
        task_file.write_text("""
## Task 1: Create database schema

**Dependencies:** None
""")

        result = TaskParser.parse(task_file)

        assert result.total_tasks == 1
        assert result.completed_tasks == 0
        assert len(result.parent_tasks) == 1
        assert result.parent_tasks[0].name == "Create database schema"
        assert result.parent_tasks[0].number == 1

    def test_parse_task_with_subtasks(self, tmp_path):
        """Test parsing tasks with completed and incomplete subtasks."""
        task_file = tmp_path / "tasks.md"
        task_file.write_text("""
## Task 1: Create database schema

- [x] 1.1 Write tests for schema
- [x] 1.2 Implement schema
- [ ] 1.3 Run migrations
- [ ] 1.4 Verify tests pass
""")

        result = TaskParser.parse(task_file)

        assert result.total_tasks == 1
        assert result.total_subtasks == 4
        assert result.completed_subtasks == 2
        assert result.progress == 50
        assert len(result.parent_tasks[0].subtasks) == 4
        assert result.parent_tasks[0].subtasks[0].completed is True
        assert result.parent_tasks[0].subtasks[2].completed is False

    def test_parse_completed_parent_task(self, tmp_path):
        """Test parsing a completed parent task (marked with ✅)."""
        task_file = tmp_path / "tasks.md"
        task_file.write_text("""
## Task 1: Create database schema ✅

- [x] 1.1 Write tests
- [x] 1.2 Implement
""")

        result = TaskParser.parse(task_file)

        assert result.completed_tasks == 1
        assert result.parent_tasks[0].completed is True

    def test_parse_multiple_tasks(self, tmp_path):
        """Test parsing multiple parent tasks."""
        task_file = tmp_path / "tasks.md"
        task_file.write_text("""
## Task 1: Database schema ✅

- [x] 1.1 Write tests
- [x] 1.2 Implement

## Task 2: API endpoints

- [x] 2.1 Write tests
- [ ] 2.2 Implement

## Task 3: Frontend

- [ ] 3.1 Write tests
- [ ] 3.2 Implement
""")

        result = TaskParser.parse(task_file)

        assert result.total_tasks == 3
        assert result.completed_tasks == 1
        assert result.total_subtasks == 6
        assert result.completed_subtasks == 3
        assert result.progress == 50

    def test_parse_with_header_metadata(self, tmp_path):
        """Test parsing with header metadata (spec name, created date)."""
        task_file = tmp_path / ".yoyo-dev" / "specs" / "2025-10-11-feature-name" / "tasks.md"
        task_file.parent.mkdir(parents=True, exist_ok=True)
        task_file.write_text("""
# Tasks Checklist

> **Spec:** feature-name
> **Created:** 2025-10-11
> **Type:** Major Feature

## Task 1: Implement feature

- [x] 1.1 Write tests
- [ ] 1.2 Implement
""")

        result = TaskParser.parse(task_file)

        assert result.file_path == task_file
        assert result.task_name == "2025-10-11-feature-name"
        assert result.total_tasks == 1
        assert result.total_subtasks == 2

    def test_calculate_progress_no_subtasks(self, tmp_path):
        """Test progress calculation when no subtasks exist."""
        task_file = tmp_path / "tasks.md"
        task_file.write_text("""
## Task 1: Create database schema ✅
""")

        result = TaskParser.parse(task_file)

        # If parent task is completed but no subtasks, progress should be 100
        assert result.progress == 100

    def test_calculate_progress_partial_completion(self, tmp_path):
        """Test progress calculation with partial completion."""
        task_file = tmp_path / "tasks.md"
        task_file.write_text("""
## Task 1: Feature A

- [x] 1.1 Test
- [x] 1.2 Implement
- [ ] 1.3 Verify

## Task 2: Feature B

- [ ] 2.1 Test
- [ ] 2.2 Implement
""")

        result = TaskParser.parse(task_file)

        # 2 completed out of 5 total = 40%
        assert result.progress == 40

    def test_parse_malformed_task_numbers(self, tmp_path):
        """Test parsing tasks with malformed numbering."""
        task_file = tmp_path / "tasks.md"
        task_file.write_text("""
## Task 1: First task

- [x] Test
- [ ] Implement

## Task ABC: Bad number

- [ ] Something
""")

        result = TaskParser.parse(task_file)

        # Should still parse, but second task might have number 0 or default
        assert result.total_tasks >= 1
        assert len(result.parent_tasks) >= 1

    def test_parse_subtask_text_extraction(self, tmp_path):
        """Test that subtask text is extracted correctly."""
        task_file = tmp_path / "tasks.md"
        task_file.write_text("""
## Task 1: Database

- [x] 1.1 Write tests for schema validation
- [ ] 1.2 Implement schema with TypeScript types
""")

        result = TaskParser.parse(task_file)

        assert result.parent_tasks[0].subtasks[0].text == "1.1 Write tests for schema validation"
        assert result.parent_tasks[0].subtasks[1].text == "1.2 Implement schema with TypeScript types"

    def test_parse_parent_task_progress_property(self, tmp_path):
        """Test that ParentTask.progress property calculates correctly."""
        task_file = tmp_path / "tasks.md"
        task_file.write_text("""
## Task 1: Database

- [x] 1.1 Write tests
- [x] 1.2 Implement
- [ ] 1.3 Verify
- [ ] 1.4 Deploy
""")

        result = TaskParser.parse(task_file)

        parent = result.parent_tasks[0]
        assert parent.progress == 50  # 2/4 = 50%

    def test_parse_is_complete_property(self, tmp_path):
        """Test TaskData.is_complete property."""
        # Test incomplete
        task_file = tmp_path / "tasks.md"
        task_file.write_text("""
## Task 1: Database

- [x] 1.1 Test
- [ ] 1.2 Implement
""")

        result = TaskParser.parse(task_file)
        assert result.is_complete is False

        # Test complete
        task_file.write_text("""
## Task 1: Database

- [x] 1.1 Test
- [x] 1.2 Implement
""")

        result = TaskParser.parse(task_file)
        assert result.is_complete is True
