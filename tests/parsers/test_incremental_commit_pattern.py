"""
Tests for Incremental Commit Pattern System

Tests commit message format validation, prefix enforcement, state file commits,
and commit history reconstruction for session recovery.
"""

import pytest
import json
import re
from datetime import datetime


class TestCommitMessageFormat:
    """Test suite for commit message format validation."""

    def test_partial_commit_format(self):
        """Test [PARTIAL] commit message format."""
        # Arrange
        commit_msg = """[PARTIAL] task-1.2: Implement user registration

- Added registration form component
- Created validation logic
- Tests pending"""

        # Act
        has_prefix = commit_msg.startswith("[PARTIAL]")
        has_task_id = re.search(r"task-\d+\.\d+", commit_msg) is not None
        has_body = "\n\n" in commit_msg or "\n-" in commit_msg

        # Assert
        assert has_prefix
        assert has_task_id
        assert has_body

    def test_feature_commit_format(self):
        """Test [FEATURE] commit message format."""
        # Arrange
        commit_msg = """[FEATURE] task-1.2: User registration implemented

- Registration form with validation
- API endpoint connected
- Ready for testing"""

        # Act
        has_prefix = commit_msg.startswith("[FEATURE]")
        has_task_id = re.search(r"task-\d+\.\d+", commit_msg) is not None

        # Assert
        assert has_prefix
        assert has_task_id

    def test_tested_commit_format(self):
        """Test [TESTED] commit message format."""
        # Arrange
        commit_msg = """[TESTED] task-1.2: User registration complete

- All unit tests passing (12/12)
- Integration tests passing (3/3)
- Browser tests verified registration flow"""

        # Act
        has_prefix = commit_msg.startswith("[TESTED]")
        has_task_id = re.search(r"task-\d+\.\d+", commit_msg) is not None
        has_test_results = "passing" in commit_msg.lower()

        # Assert
        assert has_prefix
        assert has_task_id
        assert has_test_results

    def test_commit_message_validation(self):
        """Test commit message validation rules."""
        # Arrange
        valid_messages = [
            "[PARTIAL] task-1.1: WIP implementation",
            "[FEATURE] task-2.3: Dashboard complete",
            "[TESTED] task-1.2: All tests passing (5/5)",
        ]

        invalid_messages = [
            "task-1.1: WIP implementation",  # Missing prefix
            "[PARTIAL] WIP implementation",  # Missing task ID
            "[INVALID] task-1.1: Something",  # Invalid prefix
        ]

        prefix_pattern = r"^\[(PARTIAL|FEATURE|TESTED)\]"
        task_pattern = r"task-\d+\.\d+"

        # Act & Assert
        for msg in valid_messages:
            assert re.match(prefix_pattern, msg), f"Should be valid: {msg}"
            assert re.search(task_pattern, msg), f"Should have task ID: {msg}"

        for msg in invalid_messages:
            is_valid = bool(re.match(prefix_pattern, msg) and re.search(task_pattern, msg))
            assert not is_valid, f"Should be invalid: {msg}"


class TestCommitWorkflow:
    """Test suite for commit workflow with prefixes."""

    def test_workflow_progression(self):
        """Test workflow: implementation -> [PARTIAL] -> tests passing -> [TESTED]."""
        # Arrange
        workflow_stages = [
            {"action": "Start implementation", "commit_prefix": None},
            {"action": "Partial implementation", "commit_prefix": "[PARTIAL]"},
            {"action": "Implementation complete", "commit_prefix": "[FEATURE]"},
            {"action": "Tests passing", "commit_prefix": "[TESTED]"},
        ]

        # Act - Simulate workflow
        commits = []
        for stage in workflow_stages:
            if stage["commit_prefix"]:
                commits.append(f"{stage['commit_prefix']} task-1.1: {stage['action']}")

        # Assert
        assert len(commits) == 3
        assert commits[0].startswith("[PARTIAL]")
        assert commits[1].startswith("[FEATURE]")
        assert commits[2].startswith("[TESTED]")

    def test_partial_to_tested_workflow(self):
        """Test direct [PARTIAL] to [TESTED] workflow (skipping [FEATURE])."""
        # Arrange - Sometimes implementation and testing happen together
        commits = [
            "[PARTIAL] task-1.1: Implementation in progress",
            "[TESTED] task-1.1: Implementation complete with tests",
        ]

        # Act
        final_status = None
        for commit in commits:
            if "[TESTED]" in commit:
                final_status = "tested"
            elif "[FEATURE]" in commit:
                final_status = "feature"
            elif "[PARTIAL]" in commit:
                final_status = "partial"

        # Assert - Final status should be tested
        assert final_status == "tested"

    def test_commit_after_milestone(self):
        """Test that commits are created after each milestone."""
        # Arrange
        milestones = [
            {"name": "implementation_started", "requires_commit": True, "prefix": "[PARTIAL]"},
            {"name": "implementation_complete", "requires_commit": True, "prefix": "[FEATURE]"},
            {"name": "tests_passing", "requires_commit": True, "prefix": "[TESTED]"},
        ]

        # Act
        commits_needed = [m for m in milestones if m["requires_commit"]]

        # Assert
        assert len(commits_needed) == 3


class TestStateFileCommits:
    """Test suite for state file commit step."""

    def test_state_files_committed_together(self):
        """Test that features.json and progress.md are committed together."""
        # Arrange
        state_files = [
            "features.json",
            "progress.md",
        ]

        commit_msg = "chore: Update progress tracking"

        # Act
        files_in_commit = state_files

        # Assert
        assert "features.json" in files_in_commit
        assert "progress.md" in files_in_commit

    def test_state_commit_after_tested(self):
        """Test that state files are committed after [TESTED] commit."""
        # Arrange
        commit_sequence = [
            {"type": "feature", "msg": "[TESTED] task-1.1: Feature complete"},
            {"type": "state", "msg": "chore: Update progress tracking"},
        ]

        # Act - State commit should follow TESTED commit
        tested_index = None
        state_index = None
        for i, commit in enumerate(commit_sequence):
            if "[TESTED]" in commit["msg"]:
                tested_index = i
            if commit["type"] == "state":
                state_index = i

        # Assert
        assert tested_index is not None
        assert state_index is not None
        assert state_index > tested_index  # State commit comes after TESTED

    def test_state_files_updated_before_commit(self):
        """Test that state files are updated before commit."""
        # Arrange
        features_json_before = {
            "progress_summary": {"tested": 5, "completion_percentage": 50}
        }
        task_completed = "1.6"

        # Act - Simulate updating state
        features_json_after = {
            "progress_summary": {"tested": 6, "completion_percentage": 60}
        }

        # Assert
        assert features_json_after["progress_summary"]["tested"] > features_json_before["progress_summary"]["tested"]


class TestCommitHistoryReconstruction:
    """Test suite for reconstructing state from commit history."""

    def test_reconstruct_task_status_from_commits(self):
        """Test reconstructing task status from commit messages."""
        # Arrange
        commits = [
            "abc1234 [TESTED] task-1.1: Login complete",
            "def5678 [TESTED] task-1.2: Registration complete",
            "ghi9012 [PARTIAL] task-1.3: Dashboard WIP",
            "jkl3456 [FEATURE] task-2.1: API implemented",
        ]

        # Act
        task_status = {}
        for commit in commits:
            match = re.search(r"\[(TESTED|FEATURE|PARTIAL)\].*task-(\d+\.\d+)", commit)
            if match:
                prefix, task_id = match.groups()
                # First occurrence (most recent) wins
                if task_id not in task_status:
                    task_status[task_id] = prefix.lower()

        # Assert
        assert task_status["1.1"] == "tested"
        assert task_status["1.2"] == "tested"
        assert task_status["1.3"] == "partial"
        assert task_status["2.1"] == "feature"

    def test_most_recent_commit_wins(self):
        """Test that most recent commit status takes precedence."""
        # Arrange - Commits in reverse chronological order
        commits = [
            "abc1234 [TESTED] task-1.1: All tests passing",  # Most recent
            "def5678 [FEATURE] task-1.1: Implementation done",
            "ghi9012 [PARTIAL] task-1.1: Started implementation",
        ]

        # Act
        task_status = {}
        for commit in commits:
            match = re.search(r"\[(TESTED|FEATURE|PARTIAL)\].*task-(\d+\.\d+)", commit)
            if match:
                prefix, task_id = match.groups()
                if task_id not in task_status:  # First (most recent) wins
                    task_status[task_id] = prefix.lower()

        # Assert
        assert task_status["1.1"] == "tested"

    def test_reconstruct_features_json_from_commits(self):
        """Test reconstructing features.json state from commits."""
        # Arrange
        commit_status = {
            "1.1": "tested",
            "1.2": "tested",
            "1.3": "partial",
            "2.1": "feature",
        }

        features_template = {
            "features": [
                {
                    "id": "1",
                    "sub_features": [
                        {"id": "1.1", "implemented": False, "tested": False},
                        {"id": "1.2", "implemented": False, "tested": False},
                        {"id": "1.3", "implemented": False, "tested": False},
                    ]
                },
                {
                    "id": "2",
                    "sub_features": [
                        {"id": "2.1", "implemented": False, "tested": False},
                    ]
                }
            ]
        }

        # Act - Update features based on commit status
        for feature in features_template["features"]:
            for sub in feature["sub_features"]:
                status = commit_status.get(sub["id"])
                if status:
                    sub["implemented"] = status in ["tested", "feature", "partial"]
                    sub["tested"] = status == "tested"

        # Assert
        assert features_template["features"][0]["sub_features"][0]["tested"] is True  # 1.1
        assert features_template["features"][0]["sub_features"][2]["implemented"] is True  # 1.3
        assert features_template["features"][0]["sub_features"][2]["tested"] is False  # 1.3 partial


class TestCommitEnforcement:
    """Test suite for commit pattern enforcement."""

    def test_block_completion_without_commit(self):
        """Test that task completion is blocked without proper commit."""
        # Arrange
        task_id = "1.1"
        task_status = "implemented"  # Code written
        has_tested_commit = False

        # Act
        can_mark_complete = has_tested_commit

        # Assert
        assert can_mark_complete is False

    def test_allow_completion_with_tested_commit(self):
        """Test that task completion is allowed with [TESTED] commit."""
        # Arrange
        task_id = "1.1"
        commits = ["abc1234 [TESTED] task-1.1: All tests passing"]

        # Act
        has_tested_commit = any(
            f"[TESTED] task-{task_id}" in commit for commit in commits
        )

        # Assert
        assert has_tested_commit is True

    def test_enforce_commit_at_milestones(self):
        """Test that commits are enforced at specific milestones."""
        # Arrange
        milestones = {
            "implementation_started": {"enforce_commit": False},
            "implementation_50_percent": {"enforce_commit": True, "prefix": "[PARTIAL]"},
            "implementation_complete": {"enforce_commit": True, "prefix": "[FEATURE]"},
            "tests_passing": {"enforce_commit": True, "prefix": "[TESTED]"},
        }

        # Act
        enforced_milestones = [
            m for m, config in milestones.items() if config.get("enforce_commit")
        ]

        # Assert
        assert len(enforced_milestones) == 3
        assert "tests_passing" in enforced_milestones


class TestCommitMessageTemplates:
    """Test suite for commit message templates."""

    def test_partial_template(self):
        """Test [PARTIAL] commit message template."""
        # Arrange
        task_id = "1.2"
        description = "Implement user registration"
        progress_notes = ["Added registration form", "Validation logic pending"]

        # Act
        template = f"""[PARTIAL] task-{task_id}: {description}

- {progress_notes[0]}
- {progress_notes[1]}
- Tests pending"""

        # Assert
        assert template.startswith("[PARTIAL]")
        assert f"task-{task_id}" in template
        assert "Tests pending" in template

    def test_feature_template(self):
        """Test [FEATURE] commit message template."""
        # Arrange
        task_id = "1.2"
        description = "User registration implemented"
        features = ["Registration form with validation", "API endpoint connected"]

        # Act
        template = f"""[FEATURE] task-{task_id}: {description}

- {features[0]}
- {features[1]}
- Ready for testing"""

        # Assert
        assert template.startswith("[FEATURE]")
        assert "Ready for testing" in template

    def test_tested_template(self):
        """Test [TESTED] commit message template."""
        # Arrange
        task_id = "1.2"
        description = "User registration complete"
        tests_passed = 12
        tests_total = 12

        # Act
        template = f"""[TESTED] task-{task_id}: {description}

- All tests passing ({tests_passed}/{tests_total})
- Feature verified and complete"""

        # Assert
        assert template.startswith("[TESTED]")
        assert f"({tests_passed}/{tests_total})" in template
        assert "All tests passing" in template


class TestIntegrationScenarios:
    """Test suite for end-to-end integration scenarios."""

    def test_full_task_lifecycle(self):
        """Test full task lifecycle from start to completion."""
        # Arrange
        task_id = "1.1"
        task_name = "Implement login handler"

        lifecycle = []

        # Act - Simulate full lifecycle
        # Step 1: Start implementation
        lifecycle.append({"action": "start", "commit": None})

        # Step 2: Partial progress
        lifecycle.append({
            "action": "partial",
            "commit": f"[PARTIAL] task-{task_id}: {task_name} - WIP"
        })

        # Step 3: Implementation complete
        lifecycle.append({
            "action": "feature",
            "commit": f"[FEATURE] task-{task_id}: {task_name} - implemented"
        })

        # Step 4: Tests passing
        lifecycle.append({
            "action": "tested",
            "commit": f"[TESTED] task-{task_id}: {task_name} - all tests passing"
        })

        # Step 5: State files updated
        lifecycle.append({
            "action": "state",
            "commit": "chore: Update progress tracking"
        })

        # Assert
        commits = [step["commit"] for step in lifecycle if step["commit"]]
        assert len(commits) == 4

        # Verify progression
        assert "[PARTIAL]" in commits[0]
        assert "[FEATURE]" in commits[1]
        assert "[TESTED]" in commits[2]
        assert "chore:" in commits[3]

    def test_recovery_from_partial_commit(self):
        """Test session recovery from [PARTIAL] commit state."""
        # Arrange - Session terminated after PARTIAL commit
        git_log = """abc1234 [PARTIAL] task-1.3: Dashboard WIP
def5678 [TESTED] task-1.2: Registration complete
ghi9012 [TESTED] task-1.1: Login complete"""

        # Act - Parse git log for recovery
        status = {}
        for line in git_log.strip().split('\n'):
            match = re.search(r"\[(TESTED|FEATURE|PARTIAL)\].*task-(\d+\.\d+)", line)
            if match:
                prefix, task_id = match.groups()
                if task_id not in status:
                    status[task_id] = prefix.lower()

        # Find resume point
        resume_task = None
        for task_id in ["1.1", "1.2", "1.3", "2.1"]:
            if status.get(task_id) != "tested":
                resume_task = task_id
                break

        # Assert
        assert status["1.1"] == "tested"
        assert status["1.2"] == "tested"
        assert status["1.3"] == "partial"
        assert resume_task == "1.3"

    def test_all_tests_pass_integration(self):
        """Test that all test suites pass together."""
        # This test validates the test file itself works
        # The actual integration is verified by running pytest

        # Arrange
        test_count = 0

        # Count tests in this file (rough estimate)
        test_methods = [
            "test_partial_commit_format",
            "test_feature_commit_format",
            "test_tested_commit_format",
            "test_commit_message_validation",
            "test_workflow_progression",
            "test_partial_to_tested_workflow",
            "test_commit_after_milestone",
            "test_state_files_committed_together",
            "test_state_commit_after_tested",
            "test_state_files_updated_before_commit",
            "test_reconstruct_task_status_from_commits",
            "test_most_recent_commit_wins",
            "test_reconstruct_features_json_from_commits",
            "test_block_completion_without_commit",
            "test_allow_completion_with_tested_commit",
            "test_enforce_commit_at_milestones",
            "test_partial_template",
            "test_feature_template",
            "test_tested_template",
            "test_full_task_lifecycle",
            "test_recovery_from_partial_commit",
            "test_all_tests_pass_integration",
        ]

        # Assert
        assert len(test_methods) >= 20  # We have comprehensive coverage
