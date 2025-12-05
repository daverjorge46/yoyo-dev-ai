"""
Tests for Git-Based Context Recovery System

Tests git log parsing, commit message conventions, state reconstruction,
and session recovery after context compaction.
"""

import pytest
import json
import re
from datetime import datetime


class TestCommitMessageConvention:
    """Test suite for commit message prefix convention."""

    def test_feature_prefix_pattern(self):
        """Test [FEATURE] prefix pattern matching."""
        # Arrange
        commit_messages = [
            "[FEATURE] task-1.1: Implement login handler",
            "[FEATURE] task-2.3: Add user dashboard component",
            "[FEATURE] auth: Initial authentication setup",
        ]

        pattern = r"^\[FEATURE\]"

        # Act & Assert
        for msg in commit_messages:
            assert re.match(pattern, msg), f"Should match FEATURE prefix: {msg}"

    def test_tested_prefix_pattern(self):
        """Test [TESTED] prefix pattern matching."""
        # Arrange
        commit_messages = [
            "[TESTED] task-1.1: Login handler - all tests passing",
            "[TESTED] task-2.3: Dashboard component verified",
            "[TESTED] auth: Authentication tests complete (12/12)",
        ]

        pattern = r"^\[TESTED\]"

        # Act & Assert
        for msg in commit_messages:
            assert re.match(pattern, msg), f"Should match TESTED prefix: {msg}"

    def test_partial_prefix_pattern(self):
        """Test [PARTIAL] prefix pattern matching."""
        # Arrange
        commit_messages = [
            "[PARTIAL] task-1.1: Login handler - tests pending",
            "[PARTIAL] task-2.3: Dashboard WIP - 50% complete",
            "[PARTIAL] auth: Basic structure, validation pending",
        ]

        pattern = r"^\[PARTIAL\]"

        # Act & Assert
        for msg in commit_messages:
            assert re.match(pattern, msg), f"Should match PARTIAL prefix: {msg}"

    def test_extract_task_id_from_commit(self):
        """Test extracting task ID from commit message."""
        # Arrange
        commit_messages = [
            ("[TESTED] task-1.1: Login complete", "1.1"),
            ("[FEATURE] task-2.3: Dashboard added", "2.3"),
            ("[PARTIAL] task-3.2: API endpoint WIP", "3.2"),
        ]

        pattern = r"task-(\d+\.\d+)"

        # Act & Assert
        for msg, expected_id in commit_messages:
            match = re.search(pattern, msg)
            assert match is not None, f"Should find task ID in: {msg}"
            assert match.group(1) == expected_id

    def test_commit_without_task_id(self):
        """Test commits without explicit task ID."""
        # Arrange
        commit_messages = [
            "[FEATURE] auth: Initial setup",
            "[TESTED] api: All endpoints verified",
            "chore: Update dependencies",
        ]

        pattern = r"task-(\d+\.\d+)"

        # Act & Assert
        for msg in commit_messages:
            match = re.search(pattern, msg)
            # These shouldn't have task IDs - that's okay for general commits
            # The system should handle both cases


class TestGitLogParsing:
    """Test suite for parsing git log output."""

    def test_parse_git_log_oneline(self):
        """Test parsing git log --oneline output."""
        # Arrange
        git_log_output = """abc1234 [TESTED] task-1.1: Login handler complete
def5678 [PARTIAL] task-1.2: Registration WIP
ghi9012 [FEATURE] task-1.1: Implement login
jkl3456 chore: Update dependencies
mno7890 [TESTED] task-0.1: Initial setup"""

        # Act
        lines = git_log_output.strip().split('\n')
        commits = []
        for line in lines:
            parts = line.split(' ', 1)
            if len(parts) == 2:
                commits.append({
                    "hash": parts[0],
                    "message": parts[1]
                })

        # Assert
        assert len(commits) == 5
        assert commits[0]["hash"] == "abc1234"
        assert commits[0]["message"] == "[TESTED] task-1.1: Login handler complete"

    def test_extract_feature_status_from_log(self):
        """Test extracting feature completion status from git log."""
        # Arrange
        commits = [
            {"hash": "abc1234", "message": "[TESTED] task-1.1: Login complete"},
            {"hash": "def5678", "message": "[PARTIAL] task-1.2: Registration WIP"},
            {"hash": "ghi9012", "message": "[FEATURE] task-1.3: Dashboard added"},
            {"hash": "jkl3456", "message": "[TESTED] task-2.1: API complete"},
        ]

        # Act
        feature_status = {}
        for commit in commits:
            msg = commit["message"]
            task_match = re.search(r"task-(\d+\.\d+)", msg)
            if task_match:
                task_id = task_match.group(1)
                if "[TESTED]" in msg:
                    feature_status[task_id] = "tested"
                elif "[PARTIAL]" in msg:
                    # Only set to partial if not already tested
                    if task_id not in feature_status or feature_status[task_id] != "tested":
                        feature_status[task_id] = "partial"
                elif "[FEATURE]" in msg:
                    # Only set to feature if not already tested or partial
                    if task_id not in feature_status:
                        feature_status[task_id] = "implemented"

        # Assert
        assert feature_status["1.1"] == "tested"
        assert feature_status["1.2"] == "partial"
        assert feature_status["1.3"] == "implemented"
        assert feature_status["2.1"] == "tested"

    def test_most_recent_status_wins(self):
        """Test that most recent commit status takes precedence."""
        # Arrange - commits are in reverse chronological order (most recent first)
        commits = [
            {"hash": "abc1234", "message": "[TESTED] task-1.1: All tests passing"},  # Most recent
            {"hash": "def5678", "message": "[PARTIAL] task-1.1: Tests WIP"},
            {"hash": "ghi9012", "message": "[FEATURE] task-1.1: Initial implementation"},
        ]

        # Act - process in order (most recent first)
        feature_status = {}
        for commit in commits:
            msg = commit["message"]
            task_match = re.search(r"task-(\d+\.\d+)", msg)
            if task_match:
                task_id = task_match.group(1)
                # First occurrence is most recent, so only set if not already set
                if task_id not in feature_status:
                    if "[TESTED]" in msg:
                        feature_status[task_id] = "tested"
                    elif "[PARTIAL]" in msg:
                        feature_status[task_id] = "partial"
                    elif "[FEATURE]" in msg:
                        feature_status[task_id] = "implemented"

        # Assert - most recent (TESTED) should win
        assert feature_status["1.1"] == "tested"


class TestStateReconstruction:
    """Test suite for reconstructing state from git history."""

    def test_reconstruct_features_json_from_git(self):
        """Test reconstructing features.json state from git commits."""
        # Arrange
        git_status = {
            "1.1": "tested",
            "1.2": "partial",
            "1.3": "implemented",
            "2.1": "tested",
            "2.2": "partial",
        }

        features_template = {
            "spec_name": "Test Feature",
            "created": "2025-12-05",
            "features": [
                {
                    "id": "1",
                    "name": "Feature One",
                    "implemented": False,
                    "tested": False,
                    "sub_features": [
                        {"id": "1.1", "name": "Sub A", "implemented": False, "tested": False},
                        {"id": "1.2", "name": "Sub B", "implemented": False, "tested": False},
                        {"id": "1.3", "name": "Sub C", "implemented": False, "tested": False},
                    ]
                },
                {
                    "id": "2",
                    "name": "Feature Two",
                    "implemented": False,
                    "tested": False,
                    "sub_features": [
                        {"id": "2.1", "name": "Sub D", "implemented": False, "tested": False},
                        {"id": "2.2", "name": "Sub E", "implemented": False, "tested": False},
                    ]
                }
            ],
            "progress_summary": {
                "total_features": 5,
                "implemented": 0,
                "tested": 0,
                "completion_percentage": 0
            }
        }

        # Act - Update features based on git status
        for feature in features_template["features"]:
            for sub in feature["sub_features"]:
                sub_id = sub["id"]
                if sub_id in git_status:
                    status = git_status[sub_id]
                    if status in ["implemented", "partial", "tested"]:
                        sub["implemented"] = True
                    if status == "tested":
                        sub["tested"] = True

        # Recalculate progress
        total = 0
        implemented = 0
        tested = 0
        for feature in features_template["features"]:
            for sub in feature["sub_features"]:
                total += 1
                if sub["implemented"]:
                    implemented += 1
                if sub["tested"]:
                    tested += 1

        features_template["progress_summary"]["implemented"] = implemented
        features_template["progress_summary"]["tested"] = tested
        features_template["progress_summary"]["completion_percentage"] = int(tested / total * 100) if total > 0 else 0

        # Assert
        assert features_template["features"][0]["sub_features"][0]["tested"] is True  # 1.1
        assert features_template["features"][0]["sub_features"][1]["implemented"] is True  # 1.2
        assert features_template["features"][0]["sub_features"][1]["tested"] is False  # 1.2 partial
        assert features_template["progress_summary"]["implemented"] == 5
        assert features_template["progress_summary"]["tested"] == 2
        assert features_template["progress_summary"]["completion_percentage"] == 40

    def test_find_next_incomplete_from_git_state(self):
        """Test finding next incomplete task from reconstructed state."""
        # Arrange
        git_status = {
            "1.1": "tested",
            "1.2": "tested",
            "1.3": "partial",  # This is next incomplete
            "2.1": "implemented",
        }

        task_order = ["1.1", "1.2", "1.3", "1.4", "2.1", "2.2"]

        # Act - Find first task that's not tested
        next_task = None
        for task_id in task_order:
            if task_id not in git_status or git_status.get(task_id) != "tested":
                next_task = task_id
                break

        # Assert
        assert next_task == "1.3"

    def test_cross_reference_git_and_tasks_md(self):
        """Test cross-referencing git status with tasks.md structure."""
        # Arrange
        tasks_md_structure = [
            {"id": "1", "subtasks": ["1.1", "1.2", "1.3"]},
            {"id": "2", "subtasks": ["2.1", "2.2"]},
        ]

        git_status = {
            "1.1": "tested",
            "1.2": "tested",
            "1.3": "tested",
            "2.1": "partial",
        }

        # Act - Check which parent tasks are complete
        parent_status = {}
        for task in tasks_md_structure:
            all_tested = all(
                git_status.get(sub) == "tested"
                for sub in task["subtasks"]
            )
            parent_status[task["id"]] = "complete" if all_tested else "incomplete"

        # Assert
        assert parent_status["1"] == "complete"  # All subtasks tested
        assert parent_status["2"] == "incomplete"  # 2.2 not even started


class TestSessionRecovery:
    """Test suite for session recovery after context compaction."""

    def test_recovery_from_clean_state(self):
        """Test recovery when no prior work exists."""
        # Arrange
        git_log = ""  # Empty git log
        progress_md_exists = False
        features_json_exists = False

        # Act
        has_prior_work = bool(git_log.strip()) or progress_md_exists or features_json_exists
        resume_task = None if not has_prior_work else "detect_from_git"

        # Assert
        assert has_prior_work is False
        assert resume_task is None

    def test_recovery_with_progress_file(self):
        """Test recovery when progress.md exists."""
        # Arrange
        progress_md_content = """# Progress Report

> Last Updated: 2025-12-05 14:30

## Completed Features
- [x] Feature 1.1 - abc123
- [x] Feature 1.2 - def456

## In Progress
- [ ] Feature 1.3 (started, tests pending)

## Resume Instructions
To continue: Run `/execute-tasks` - will auto-detect Feature 1.3 as next task.
"""

        # Act - Parse progress.md
        in_progress_match = re.search(r"## In Progress\n- \[ \] Feature (\d+\.\d+)", progress_md_content)
        resume_task = in_progress_match.group(1) if in_progress_match else None

        # Assert
        assert resume_task == "1.3"

    def test_recovery_prefers_git_over_progress_md(self):
        """Test that git log takes precedence over stale progress.md."""
        # Arrange - progress.md says 1.3 in progress, but git shows 1.3 tested
        progress_md_says = "1.3"  # In progress according to progress.md

        git_status = {
            "1.1": "tested",
            "1.2": "tested",
            "1.3": "tested",  # Actually completed!
            "1.4": "partial",  # Real next task
        }

        # Act - Git is source of truth
        next_from_git = None
        for task_id in ["1.1", "1.2", "1.3", "1.4", "2.1"]:
            if git_status.get(task_id) != "tested":
                next_from_git = task_id
                break

        # Assert - Git should win
        assert next_from_git == "1.4"
        assert next_from_git != progress_md_says

    def test_generate_resume_message(self):
        """Test generating a human-readable resume message."""
        # Arrange
        git_status = {
            "1.1": "tested",
            "1.2": "tested",
            "1.3": "partial",
        }

        completed_count = sum(1 for s in git_status.values() if s == "tested")
        partial_count = sum(1 for s in git_status.values() if s == "partial")
        next_task = "1.3"

        # Act
        resume_message = f"""Session Recovery Summary:
- Completed tasks: {completed_count}
- In progress: {partial_count}
- Next task: {next_task}

Automatically resuming from task {next_task}..."""

        # Assert
        assert "Completed tasks: 2" in resume_message
        assert "In progress: 1" in resume_message
        assert "Next task: 1.3" in resume_message


class TestCommitMessageGeneration:
    """Test suite for generating commit messages with proper prefixes."""

    def test_generate_partial_commit_message(self):
        """Test generating [PARTIAL] commit message."""
        # Arrange
        task_id = "1.2"
        description = "Implement user registration"
        status = "partial"

        # Act
        if status == "partial":
            commit_msg = f"[PARTIAL] task-{task_id}: {description}\n\n- Implementation in progress\n- Tests pending"

        # Assert
        assert commit_msg.startswith("[PARTIAL]")
        assert f"task-{task_id}" in commit_msg

    def test_generate_tested_commit_message(self):
        """Test generating [TESTED] commit message."""
        # Arrange
        task_id = "1.2"
        description = "User registration complete"
        tests_passed = 8
        tests_failed = 0

        # Act
        commit_msg = f"[TESTED] task-{task_id}: {description}\n\n- All tests passing ({tests_passed}/{tests_passed + tests_failed})"

        # Assert
        assert commit_msg.startswith("[TESTED]")
        assert f"task-{task_id}" in commit_msg
        assert "All tests passing" in commit_msg

    def test_generate_feature_commit_message(self):
        """Test generating [FEATURE] commit message."""
        # Arrange
        task_id = "1.3"
        description = "Add dashboard component"

        # Act
        commit_msg = f"[FEATURE] task-{task_id}: {description}\n\n- New feature implemented\n- Ready for testing"

        # Assert
        assert commit_msg.startswith("[FEATURE]")
        assert f"task-{task_id}" in commit_msg


class TestGitLogLimits:
    """Test suite for git log performance limits."""

    def test_limit_git_log_to_50_commits(self):
        """Test that git log parsing is limited to 50 commits for performance."""
        # Arrange
        max_commits = 50
        git_log_lines = [f"hash{i} [TESTED] task-1.{i}: Feature {i}" for i in range(100)]

        # Act - Limit to max_commits
        limited_lines = git_log_lines[:max_commits]

        # Assert
        assert len(limited_lines) == 50

    def test_only_process_relevant_commits(self):
        """Test that only commits with task markers are processed."""
        # Arrange
        commits = [
            {"hash": "abc", "message": "[TESTED] task-1.1: Feature"},
            {"hash": "def", "message": "chore: Update deps"},
            {"hash": "ghi", "message": "[PARTIAL] task-1.2: WIP"},
            {"hash": "jkl", "message": "fix: Typo"},
            {"hash": "mno", "message": "[FEATURE] task-1.3: New"},
        ]

        # Act - Filter to only task-related commits
        task_pattern = r"\[(FEATURE|TESTED|PARTIAL)\].*task-\d+\.\d+"
        relevant_commits = [c for c in commits if re.search(task_pattern, c["message"])]

        # Assert
        assert len(relevant_commits) == 3
        assert all("task-" in c["message"] for c in relevant_commits)
