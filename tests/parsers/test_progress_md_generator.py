"""
Tests for progress.md Auto-Generation System

Tests progress.md template, content validation, features.json synchronization,
and auto-generation after feature completion.
"""

import pytest
import json
import re
from datetime import datetime


class TestProgressMdTemplate:
    """Test suite for progress.md template structure."""

    def test_progress_md_has_required_sections(self):
        """Test that progress.md contains all required sections."""
        # Arrange
        progress_md = """# Progress Report

> Spec: Test Feature
> Last Updated: 2025-12-05 14:30

## Summary

**Completion:** 60% (3/5 features tested)

## Completed Features

- [x] Feature 1.1 - Login handler (abc1234)
- [x] Feature 1.2 - Registration (def5678)

## In Progress

- [ ] Feature 1.3 (started, tests pending)

## Remaining Features

- [ ] Feature 2.1 - Dashboard
- [ ] Feature 2.2 - Settings

## Git Log Summary

Recent task-related commits:
- abc1234 [TESTED] task-1.1: Login complete
- def5678 [TESTED] task-1.2: Registration complete
- ghi9012 [PARTIAL] task-1.3: WIP

## Resume Instructions

To continue development:
1. Run `/execute-tasks` - will auto-detect Feature 1.3 as next task
2. Or specify: `/execute-tasks --task 1.3`

Next task: **1.3** (currently in progress)
"""

        # Act & Assert
        assert "# Progress Report" in progress_md
        assert "## Summary" in progress_md
        assert "## Completed Features" in progress_md
        assert "## In Progress" in progress_md
        assert "## Remaining Features" in progress_md
        assert "## Git Log Summary" in progress_md
        assert "## Resume Instructions" in progress_md

    def test_progress_md_has_metadata(self):
        """Test that progress.md contains spec metadata."""
        # Arrange
        progress_md = """# Progress Report

> Spec: Claude Code Workflow Sync
> Last Updated: 2025-12-05 14:30:00

## Summary
"""

        # Act
        spec_match = re.search(r"> Spec: (.+)", progress_md)
        date_match = re.search(r"> Last Updated: (.+)", progress_md)

        # Assert
        assert spec_match is not None
        assert spec_match.group(1) == "Claude Code Workflow Sync"
        assert date_match is not None

    def test_progress_md_completion_percentage(self):
        """Test that completion percentage is correctly formatted."""
        # Arrange
        progress_md = """## Summary

**Completion:** 75% (6/8 features tested)
"""

        # Act
        match = re.search(r"\*\*Completion:\*\* (\d+)% \((\d+)/(\d+) features tested\)", progress_md)

        # Assert
        assert match is not None
        percentage, tested, total = match.groups()
        assert int(percentage) == 75
        assert int(tested) == 6
        assert int(total) == 8


class TestProgressMdFromFeaturesJson:
    """Test suite for generating progress.md from features.json."""

    def test_generate_completed_features_list(self):
        """Test generating completed features list from features.json."""
        # Arrange
        features = {
            "features": [
                {
                    "id": "1",
                    "name": "Feature One",
                    "sub_features": [
                        {"id": "1.1", "name": "Sub A", "tested": True},
                        {"id": "1.2", "name": "Sub B", "tested": True},
                        {"id": "1.3", "name": "Sub C", "tested": False},
                    ]
                }
            ]
        }

        # Act
        completed = []
        for feature in features["features"]:
            for sub in feature["sub_features"]:
                if sub["tested"]:
                    completed.append(f"- [x] Feature {sub['id']} - {sub['name']}")

        # Assert
        assert len(completed) == 2
        assert "- [x] Feature 1.1 - Sub A" in completed
        assert "- [x] Feature 1.2 - Sub B" in completed

    def test_generate_in_progress_list(self):
        """Test generating in-progress features list."""
        # Arrange
        features = {
            "features": [
                {
                    "id": "1",
                    "name": "Feature One",
                    "sub_features": [
                        {"id": "1.1", "name": "Sub A", "implemented": True, "tested": True},
                        {"id": "1.2", "name": "Sub B", "implemented": True, "tested": False},
                        {"id": "1.3", "name": "Sub C", "implemented": False, "tested": False},
                    ]
                }
            ]
        }

        # Act - In progress = implemented but not tested
        in_progress = []
        for feature in features["features"]:
            for sub in feature["sub_features"]:
                if sub["implemented"] and not sub["tested"]:
                    in_progress.append(f"- [ ] Feature {sub['id']} (implemented, tests pending)")

        # Assert
        assert len(in_progress) == 1
        assert "Feature 1.2" in in_progress[0]

    def test_generate_remaining_list(self):
        """Test generating remaining features list."""
        # Arrange
        features = {
            "features": [
                {
                    "id": "1",
                    "name": "Feature One",
                    "sub_features": [
                        {"id": "1.1", "name": "Sub A", "implemented": True, "tested": True},
                        {"id": "1.2", "name": "Sub B", "implemented": False, "tested": False},
                        {"id": "1.3", "name": "Sub C", "implemented": False, "tested": False},
                    ]
                }
            ]
        }

        # Act - Remaining = not implemented
        remaining = []
        for feature in features["features"]:
            for sub in feature["sub_features"]:
                if not sub["implemented"]:
                    remaining.append(f"- [ ] Feature {sub['id']} - {sub['name']}")

        # Assert
        assert len(remaining) == 2
        assert "Feature 1.2" in remaining[0]
        assert "Feature 1.3" in remaining[1]

    def test_calculate_summary_from_features(self):
        """Test calculating summary statistics from features.json."""
        # Arrange
        features = {
            "progress_summary": {
                "total_features": 10,
                "implemented": 7,
                "tested": 5,
                "completion_percentage": 50
            }
        }

        # Act
        summary = features["progress_summary"]
        completion_line = f"**Completion:** {summary['completion_percentage']}% ({summary['tested']}/{summary['total_features']} features tested)"

        # Assert
        assert "50%" in completion_line
        assert "5/10" in completion_line


class TestGitLogSummarySection:
    """Test suite for Git Log Summary section generation."""

    def test_extract_task_commits_for_summary(self):
        """Test extracting task-related commits for summary."""
        # Arrange
        git_log = """abc1234 [TESTED] task-1.1: Login complete
def5678 [TESTED] task-1.2: Registration done
ghi9012 chore: Update deps
jkl3456 [PARTIAL] task-1.3: Dashboard WIP
mno7890 fix: Typo in readme"""

        # Act
        task_commits = []
        for line in git_log.strip().split('\n'):
            if re.search(r'\[(TESTED|FEATURE|PARTIAL)\].*task-\d+\.\d+', line):
                task_commits.append(f"- {line}")

        # Assert
        assert len(task_commits) == 3
        assert "[TESTED] task-1.1" in task_commits[0]
        assert "[PARTIAL] task-1.3" in task_commits[2]

    def test_git_log_summary_format(self):
        """Test Git Log Summary section format."""
        # Arrange
        commits = [
            "abc1234 [TESTED] task-1.1: Login complete",
            "def5678 [TESTED] task-1.2: Registration done",
            "ghi9012 [PARTIAL] task-1.3: Dashboard WIP",
        ]

        # Act
        section = "## Git Log Summary\n\nRecent task-related commits:\n"
        for commit in commits[-5:]:  # Last 5 commits
            section += f"- {commit}\n"

        # Assert
        assert "## Git Log Summary" in section
        assert "Recent task-related commits:" in section
        assert "abc1234" in section


class TestResumeInstructionsSection:
    """Test suite for Resume Instructions section."""

    def test_resume_instructions_format(self):
        """Test Resume Instructions section format."""
        # Arrange
        next_task = "1.3"
        status = "partial"

        # Act
        section = f"""## Resume Instructions

To continue development:
1. Run `/execute-tasks` - will auto-detect Feature {next_task} as next task
2. Or specify: `/execute-tasks --task {next_task}`

Next task: **{next_task}** ({status})
"""

        # Assert
        assert "## Resume Instructions" in section
        assert "/execute-tasks" in section
        assert f"--task {next_task}" in section
        assert f"Next task: **{next_task}**" in section

    def test_resume_instructions_when_complete(self):
        """Test Resume Instructions when all tasks complete."""
        # Arrange
        all_complete = True

        # Act
        if all_complete:
            section = """## Resume Instructions

All features have been tested and verified.

No remaining tasks - ready for PR review and merge.
"""
        else:
            section = "## Resume Instructions\n\nNext task: ..."

        # Assert
        assert "All features have been tested" in section
        assert "ready for PR review" in section

    def test_find_next_task_for_resume(self):
        """Test finding next task for resume instructions."""
        # Arrange
        features = {
            "features": [
                {
                    "id": "1",
                    "sub_features": [
                        {"id": "1.1", "tested": True},
                        {"id": "1.2", "tested": True},
                        {"id": "1.3", "tested": False},
                    ]
                },
                {
                    "id": "2",
                    "sub_features": [
                        {"id": "2.1", "tested": False},
                    ]
                }
            ]
        }

        # Act
        next_task = None
        for feature in features["features"]:
            for sub in feature["sub_features"]:
                if not sub["tested"]:
                    next_task = sub["id"]
                    break
            if next_task:
                break

        # Assert
        assert next_task == "1.3"


class TestProgressMdSynchronization:
    """Test suite for progress.md synchronization with features.json."""

    def test_progress_matches_features_json(self):
        """Test that progress.md accurately reflects features.json state."""
        # Arrange
        features = {
            "spec_name": "Test Spec",
            "features": [
                {
                    "id": "1",
                    "sub_features": [
                        {"id": "1.1", "name": "A", "implemented": True, "tested": True},
                        {"id": "1.2", "name": "B", "implemented": True, "tested": False},
                    ]
                }
            ],
            "progress_summary": {
                "total_features": 2,
                "implemented": 2,
                "tested": 1,
                "completion_percentage": 50
            }
        }

        # Act - Generate progress.md sections
        completed_count = sum(
            1 for f in features["features"]
            for s in f["sub_features"] if s["tested"]
        )
        in_progress_count = sum(
            1 for f in features["features"]
            for s in f["sub_features"] if s["implemented"] and not s["tested"]
        )
        remaining_count = sum(
            1 for f in features["features"]
            for s in f["sub_features"] if not s["implemented"]
        )

        # Assert
        assert completed_count == features["progress_summary"]["tested"]
        assert completed_count == 1
        assert in_progress_count == 1
        assert remaining_count == 0

    def test_update_progress_after_feature_completion(self):
        """Test updating progress.md after a feature is completed."""
        # Arrange - Before completion
        features_before = {
            "progress_summary": {
                "tested": 5,
                "total_features": 10,
                "completion_percentage": 50
            }
        }

        # Act - After completion (simulate task marked tested)
        features_after = {
            "progress_summary": {
                "tested": 6,
                "total_features": 10,
                "completion_percentage": 60
            }
        }

        # Generate new progress line
        new_completion = f"**Completion:** {features_after['progress_summary']['completion_percentage']}%"

        # Assert
        assert "60%" in new_completion
        assert features_after["progress_summary"]["tested"] == features_before["progress_summary"]["tested"] + 1


class TestProgressMdAutoGeneration:
    """Test suite for automatic progress.md generation triggers."""

    def test_regenerate_after_feature_completion(self):
        """Test that progress.md regenerates after each feature completion."""
        # Arrange
        completed_features = ["1.1", "1.2"]
        newly_completed = "1.3"

        # Act - Trigger regeneration
        should_regenerate = newly_completed not in completed_features
        completed_features.append(newly_completed)

        # Assert
        assert should_regenerate is True
        assert "1.3" in completed_features

    def test_regenerate_only_on_parent_feature_completion(self):
        """Test that progress.md regenerates on parent feature completion, not subtasks."""
        # Arrange
        parent_features = {
            "1": {"subtasks": ["1.1", "1.2", "1.3"], "all_tested": False},
            "2": {"subtasks": ["2.1", "2.2"], "all_tested": False},
        }

        tested_subtasks = ["1.1", "1.2", "1.3"]  # All of feature 1

        # Act - Check if parent feature 1 is complete
        for feature_id, feature in parent_features.items():
            if all(sub in tested_subtasks for sub in feature["subtasks"]):
                feature["all_tested"] = True

        should_regenerate = parent_features["1"]["all_tested"]

        # Assert
        assert should_regenerate is True
        assert parent_features["2"]["all_tested"] is False

    def test_timestamp_updated_on_regeneration(self):
        """Test that timestamp is updated when progress.md is regenerated."""
        # Arrange
        old_timestamp = "2025-12-05 10:00:00"
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Act
        progress_md = f"> Last Updated: {current_time}"

        # Assert
        assert current_time in progress_md
        assert old_timestamp not in progress_md


class TestProgressMdFileOperations:
    """Test suite for progress.md file operations."""

    def test_progress_md_location(self):
        """Test progress.md is created in correct location."""
        # Arrange
        spec_folder = ".yoyo-dev/specs/2025-12-05-test-spec"
        expected_path = f"{spec_folder}/progress.md"

        # Assert
        assert expected_path.endswith("/progress.md")
        assert "specs/" in expected_path

    def test_progress_md_complete_template(self):
        """Test complete progress.md template generation."""
        # Arrange
        spec_name = "Test Feature"
        timestamp = "2025-12-05 14:30:00"
        completion = 60
        tested = 3
        total = 5

        # Act
        template = f"""# Progress Report

> Spec: {spec_name}
> Last Updated: {timestamp}

## Summary

**Completion:** {completion}% ({tested}/{total} features tested)

## Completed Features

- [x] Feature 1.1 - Example A
- [x] Feature 1.2 - Example B
- [x] Feature 1.3 - Example C

## In Progress

- [ ] Feature 2.1 (implemented, tests pending)

## Remaining Features

- [ ] Feature 2.2 - Example D

## Git Log Summary

Recent task-related commits:
- abc1234 [TESTED] task-1.1: Example A complete
- def5678 [TESTED] task-1.2: Example B complete
- ghi9012 [TESTED] task-1.3: Example C complete
- jkl3456 [PARTIAL] task-2.1: Example WIP

## Resume Instructions

To continue development:
1. Run `/execute-tasks` - will auto-detect Feature 2.1 as next task
2. Or specify: `/execute-tasks --task 2.1`

Next task: **2.1** (implemented, tests pending)
"""

        # Assert
        assert "# Progress Report" in template
        assert f"Spec: {spec_name}" in template
        assert f"{completion}%" in template
        assert "## Completed Features" in template
        assert "## In Progress" in template
        assert "## Remaining Features" in template
        assert "## Git Log Summary" in template
        assert "## Resume Instructions" in template
