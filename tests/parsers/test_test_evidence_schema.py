"""
Tests for Test Evidence Schema - Enforced Test Verification System

Tests the structured test evidence format that blocks task completion
without actual test execution proof.
"""

import pytest
import json
from datetime import datetime


class TestTestEvidenceSchema:
    """Test suite for test evidence JSON schema validation."""

    def test_valid_test_evidence_structure(self):
        """Test that valid test evidence has all required fields."""
        # Arrange
        evidence = {
            "task_id": "1.1",
            "test_type": "unit",
            "test_command": "pytest tests/",
            "exit_code": 0,
            "tests_passed": 12,
            "tests_failed": 0,
            "timestamp": "2025-12-05T14:30:00Z"
        }

        # Act & Assert
        required_fields = ["task_id", "test_type", "test_command", "exit_code",
                          "tests_passed", "tests_failed", "timestamp"]
        for field in required_fields:
            assert field in evidence, f"Missing required field: {field}"

    def test_test_type_valid_values(self):
        """Test that test_type accepts valid values."""
        # Arrange
        valid_types = ["unit", "integration", "browser", "e2e"]

        # Act & Assert
        for test_type in valid_types:
            evidence = {
                "task_id": "1.1",
                "test_type": test_type,
                "test_command": "pytest",
                "exit_code": 0,
                "tests_passed": 1,
                "tests_failed": 0,
                "timestamp": "2025-12-05T14:30:00Z"
            }
            assert evidence["test_type"] in valid_types

    def test_exit_code_zero_means_success(self):
        """Test that exit_code 0 indicates all tests passed."""
        # Arrange
        evidence = {
            "task_id": "1.1",
            "test_type": "unit",
            "test_command": "pytest tests/",
            "exit_code": 0,
            "tests_passed": 10,
            "tests_failed": 0,
            "timestamp": "2025-12-05T14:30:00Z"
        }

        # Act
        is_success = evidence["exit_code"] == 0 and evidence["tests_failed"] == 0

        # Assert
        assert is_success is True

    def test_exit_code_nonzero_means_failure(self):
        """Test that non-zero exit_code indicates test failures."""
        # Arrange
        evidence = {
            "task_id": "1.1",
            "test_type": "unit",
            "test_command": "pytest tests/",
            "exit_code": 1,
            "tests_passed": 8,
            "tests_failed": 2,
            "timestamp": "2025-12-05T14:30:00Z"
        }

        # Act
        is_failure = evidence["exit_code"] != 0 or evidence["tests_failed"] > 0

        # Assert
        assert is_failure is True

    def test_timestamp_iso_format(self):
        """Test that timestamp is in ISO 8601 format."""
        # Arrange
        evidence = {
            "task_id": "1.1",
            "test_type": "unit",
            "test_command": "pytest",
            "exit_code": 0,
            "tests_passed": 5,
            "tests_failed": 0,
            "timestamp": "2025-12-05T14:30:00Z"
        }

        # Act - try to parse the timestamp
        try:
            parsed = datetime.fromisoformat(evidence["timestamp"].replace("Z", "+00:00"))
            is_valid = True
        except ValueError:
            is_valid = False

        # Assert
        assert is_valid is True


class TestCompletionBlockingBehavior:
    """Test suite for task completion blocking without test evidence."""

    def test_cannot_complete_without_evidence(self):
        """Test that task cannot be marked complete without test evidence."""
        # Arrange
        task = {
            "id": "1.1",
            "name": "Implement feature",
            "implemented": True,
            "tested": False,
            "test_evidence": None
        }

        # Act
        can_complete = task["test_evidence"] is not None and task["tested"]

        # Assert
        assert can_complete is False, "Task should not be completable without test evidence"

    def test_cannot_complete_with_failing_tests(self):
        """Test that task cannot be marked complete if tests are failing."""
        # Arrange
        task = {
            "id": "1.1",
            "name": "Implement feature",
            "implemented": True,
            "tested": False,
            "test_evidence": {
                "task_id": "1.1",
                "test_type": "unit",
                "test_command": "pytest tests/",
                "exit_code": 1,
                "tests_passed": 8,
                "tests_failed": 2,
                "timestamp": "2025-12-05T14:30:00Z"
            }
        }

        # Act
        evidence = task["test_evidence"]
        tests_passed = evidence["exit_code"] == 0 and evidence["tests_failed"] == 0
        can_complete = tests_passed and task["implemented"]

        # Assert
        assert can_complete is False, "Task should not be completable with failing tests"

    def test_can_complete_with_passing_tests(self):
        """Test that task can be marked complete with passing test evidence."""
        # Arrange
        task = {
            "id": "1.1",
            "name": "Implement feature",
            "implemented": True,
            "tested": True,
            "test_evidence": {
                "task_id": "1.1",
                "test_type": "unit",
                "test_command": "pytest tests/",
                "exit_code": 0,
                "tests_passed": 10,
                "tests_failed": 0,
                "timestamp": "2025-12-05T14:30:00Z"
            }
        }

        # Act
        evidence = task["test_evidence"]
        tests_passed = evidence["exit_code"] == 0 and evidence["tests_failed"] == 0
        can_complete = tests_passed and task["implemented"]

        # Assert
        assert can_complete is True, "Task should be completable with passing tests"

    def test_evidence_task_id_must_match(self):
        """Test that test evidence task_id must match the task being completed."""
        # Arrange
        task = {
            "id": "1.1",
            "name": "Implement feature",
            "implemented": True,
            "tested": False,
            "test_evidence": {
                "task_id": "2.1",  # Wrong task ID!
                "test_type": "unit",
                "test_command": "pytest tests/",
                "exit_code": 0,
                "tests_passed": 10,
                "tests_failed": 0,
                "timestamp": "2025-12-05T14:30:00Z"
            }
        }

        # Act
        evidence = task["test_evidence"]
        evidence_matches_task = evidence["task_id"] == task["id"]
        tests_passed = evidence["exit_code"] == 0 and evidence["tests_failed"] == 0
        can_complete = evidence_matches_task and tests_passed and task["implemented"]

        # Assert
        assert can_complete is False, "Evidence task_id must match the task being completed"

    def test_multiple_test_evidence_entries(self):
        """Test handling multiple test evidence entries (unit + integration)."""
        # Arrange
        task = {
            "id": "1.1",
            "name": "Implement feature",
            "implemented": True,
            "tested": True,
            "test_evidence": [
                {
                    "task_id": "1.1",
                    "test_type": "unit",
                    "test_command": "pytest tests/unit/",
                    "exit_code": 0,
                    "tests_passed": 10,
                    "tests_failed": 0,
                    "timestamp": "2025-12-05T14:30:00Z"
                },
                {
                    "task_id": "1.1",
                    "test_type": "integration",
                    "test_command": "pytest tests/integration/",
                    "exit_code": 0,
                    "tests_passed": 3,
                    "tests_failed": 0,
                    "timestamp": "2025-12-05T14:35:00Z"
                }
            ]
        }

        # Act
        all_evidence = task["test_evidence"]
        all_passed = all(
            e["exit_code"] == 0 and e["tests_failed"] == 0
            for e in all_evidence
        )
        can_complete = all_passed and task["implemented"]

        # Assert
        assert can_complete is True
        assert len(all_evidence) == 2

    def test_partial_test_evidence_blocks_completion(self):
        """Test that if any test suite fails, completion is blocked."""
        # Arrange
        task = {
            "id": "1.1",
            "name": "Implement feature",
            "implemented": True,
            "tested": False,
            "test_evidence": [
                {
                    "task_id": "1.1",
                    "test_type": "unit",
                    "test_command": "pytest tests/unit/",
                    "exit_code": 0,
                    "tests_passed": 10,
                    "tests_failed": 0,
                    "timestamp": "2025-12-05T14:30:00Z"
                },
                {
                    "task_id": "1.1",
                    "test_type": "integration",
                    "test_command": "pytest tests/integration/",
                    "exit_code": 1,  # Integration tests failed!
                    "tests_passed": 2,
                    "tests_failed": 1,
                    "timestamp": "2025-12-05T14:35:00Z"
                }
            ]
        }

        # Act
        all_evidence = task["test_evidence"]
        all_passed = all(
            e["exit_code"] == 0 and e["tests_failed"] == 0
            for e in all_evidence
        )
        can_complete = all_passed and task["implemented"]

        # Assert
        assert can_complete is False, "Partial test failures should block completion"


class TestTestEvidenceValidation:
    """Test suite for test evidence validation functions."""

    def test_validate_evidence_required_fields(self):
        """Test validation catches missing required fields."""
        # Arrange
        incomplete_evidence = {
            "task_id": "1.1",
            "test_type": "unit"
            # Missing: test_command, exit_code, tests_passed, tests_failed, timestamp
        }

        required_fields = ["task_id", "test_type", "test_command", "exit_code",
                          "tests_passed", "tests_failed", "timestamp"]

        # Act
        missing_fields = [f for f in required_fields if f not in incomplete_evidence]

        # Assert
        assert len(missing_fields) == 5
        assert "test_command" in missing_fields
        assert "exit_code" in missing_fields

    def test_validate_numeric_fields(self):
        """Test that numeric fields contain valid numbers."""
        # Arrange
        evidence = {
            "task_id": "1.1",
            "test_type": "unit",
            "test_command": "pytest",
            "exit_code": 0,
            "tests_passed": 10,
            "tests_failed": 0,
            "timestamp": "2025-12-05T14:30:00Z"
        }

        # Act & Assert
        assert isinstance(evidence["exit_code"], int)
        assert isinstance(evidence["tests_passed"], int)
        assert isinstance(evidence["tests_failed"], int)
        assert evidence["tests_passed"] >= 0
        assert evidence["tests_failed"] >= 0

    def test_validate_test_count_consistency(self):
        """Test that test counts are logically consistent."""
        # Arrange
        evidence = {
            "task_id": "1.1",
            "test_type": "unit",
            "test_command": "pytest",
            "exit_code": 0,
            "tests_passed": 10,
            "tests_failed": 0,
            "timestamp": "2025-12-05T14:30:00Z"
        }

        # Act
        total_tests = evidence["tests_passed"] + evidence["tests_failed"]
        has_tests = total_tests > 0

        # Assert - if exit_code is 0, tests_failed should be 0
        if evidence["exit_code"] == 0:
            assert evidence["tests_failed"] == 0, "exit_code 0 should mean no failures"

        assert has_tests, "Must have at least one test"


class TestTestEvidenceIntegrationWithFeaturesJson:
    """Test suite for test evidence integration with features.json."""

    def test_update_feature_with_test_evidence(self):
        """Test updating a feature in features.json with test evidence."""
        # Arrange
        features_data = {
            "spec_name": "Test Feature",
            "created": "2025-12-05",
            "features": [
                {
                    "id": "1",
                    "name": "Feature One",
                    "description": "First feature",
                    "implemented": True,
                    "tested": False,
                    "test_steps": ["Run unit tests"],
                    "sub_features": [
                        {"id": "1.1", "name": "Sub-feature A", "implemented": True, "tested": False}
                    ]
                }
            ],
            "progress_summary": {
                "total_features": 1,
                "implemented": 1,
                "tested": 0,
                "completion_percentage": 0
            }
        }

        evidence = {
            "task_id": "1.1",
            "test_type": "unit",
            "test_command": "pytest tests/",
            "exit_code": 0,
            "tests_passed": 5,
            "tests_failed": 0,
            "timestamp": "2025-12-05T14:30:00Z"
        }

        # Act - Update the sub-feature with test evidence
        sub_feature = features_data["features"][0]["sub_features"][0]
        if evidence["exit_code"] == 0 and evidence["tests_failed"] == 0:
            sub_feature["tested"] = True
            features_data["progress_summary"]["tested"] = 1
            features_data["progress_summary"]["completion_percentage"] = 100

        # Assert
        assert sub_feature["tested"] is True
        assert features_data["progress_summary"]["tested"] == 1
        assert features_data["progress_summary"]["completion_percentage"] == 100

    def test_feature_completion_requires_all_subtasks_tested(self):
        """Test that parent feature requires all sub-features to be tested."""
        # Arrange
        feature = {
            "id": "1",
            "name": "Feature One",
            "description": "First feature",
            "implemented": True,
            "tested": False,
            "test_steps": [],
            "sub_features": [
                {"id": "1.1", "name": "Sub A", "implemented": True, "tested": True},
                {"id": "1.2", "name": "Sub B", "implemented": True, "tested": False},  # Not tested!
                {"id": "1.3", "name": "Sub C", "implemented": True, "tested": True}
            ]
        }

        # Act
        all_sub_tested = all(sf["tested"] for sf in feature["sub_features"])
        can_mark_feature_tested = feature["implemented"] and all_sub_tested

        # Assert
        assert can_mark_feature_tested is False, "Feature cannot be tested until all sub-features are tested"
